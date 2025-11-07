// controllers/messages.js
const { Types } = require('mongoose');
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const User = require('../models/user');

function ensureAuthUser(req) {
  if (!req.user || !req.user.id) throw new Error('NO_AUTH');
  return req.user.id;
}

/* ----------------------------- LISTAR CONVERSACIONES ----------------------------- */
async function getConversations(req, res) {
  try {
    const userId = ensureAuthUser(req);
    
    const conversations = await Conversation.find({
      participants: userId
    })
      .populate('participants', 'nick nickname firstName lastName name image avatar')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 })
      .limit(50);
    
    // Formatear conversaciones con información del otro usuario
    const formatted = conversations.map(conv => {
      const otherUser = conv.participants.find(p => p._id.toString() !== userId);
      
      return {
        id: conv._id,
        user: {
          id: otherUser._id,
          nick: otherUser.nick || otherUser.nickname,
          nickname: otherUser.nickname || otherUser.nick,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          name: otherUser.name,
          image: otherUser.image || otherUser.avatar
        },
        lastMessage: conv.lastMessage ? {
          content: conv.lastMessage.content,
          createdAt: conv.lastMessage.createdAt,
          read: conv.lastMessage.read,
          isMine: conv.lastMessage.senderId.toString() === userId
        } : null,
        lastMessageAt: conv.lastMessageAt
      };
    });
    
    res.json({ ok: true, conversations: formatted });
  } catch (err) {
    console.error('Error en getConversations:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
}

/* ----------------------------- OBTENER O CREAR CONVERSACIÓN ----------------------------- */
async function getOrCreateConversation(req, res) {
  try {
    const userId = ensureAuthUser(req);
    const { recipientId } = req.params;
    
    if (!recipientId || !Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ ok: false, message: 'recipientId inválido' });
    }
    
    if (userId === recipientId) {
      return res.status(400).json({ ok: false, message: 'No puedes chatear contigo mismo' });
    }
    
    // Verificar que el destinatario existe
    const recipient = await User.findById(recipientId).select('nick nickname firstName lastName name image avatar');
    if (!recipient) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }
    
    // Buscar conversación existente (debe incluir ambos usuarios)
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, recipientId] }
    }).populate('participants', 'nick nickname firstName lastName name image avatar');
    
    // Si no existe, crear una nueva
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, recipientId],
        lastMessageAt: new Date()
      });
      
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'nick nickname firstName lastName name image avatar');
    }
    
    // Formatear respuesta
    const otherUser = conversation.participants.find(p => p._id.toString() !== userId);
    
    res.json({
      ok: true,
      conversation: {
        id: conversation._id,
        user: {
          id: otherUser._id,
          nick: otherUser.nick || otherUser.nickname,
          nickname: otherUser.nickname || otherUser.nick,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          name: otherUser.name,
          image: otherUser.image || otherUser.avatar
        }
      }
    });
  } catch (err) {
    console.error('Error en getOrCreateConversation:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
}

/* ----------------------------- OBTENER MENSAJES DE UNA CONVERSACIÓN ----------------------------- */
async function getMessages(req, res) {
  try {
    const userId = ensureAuthUser(req);
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before; // Timestamp para paginación
    
    if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ ok: false, message: 'conversationId inválido' });
    }
    
    // Verificar que el usuario es parte de la conversación
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ ok: false, message: 'Conversación no encontrada' });
    }
    
    if (!conversation.hasParticipant(userId)) {
      return res.status(403).json({ ok: false, message: 'No autorizado' });
    }
    
    // Construir query con paginación
    const query = { conversationId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }
    
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('senderId', 'nick nickname firstName lastName name image avatar');
    
    // Formatear mensajes
    const formatted = messages.reverse().map(msg => ({
      id: msg._id,
      content: msg.content,
      sender: {
        id: msg.senderId._id,
        nick: msg.senderId.nick || msg.senderId.nickname,
        nickname: msg.senderId.nickname || msg.senderId.nick,
        firstName: msg.senderId.firstName,
        lastName: msg.senderId.lastName,
        name: msg.senderId.name,
        image: msg.senderId.image || msg.senderId.avatar
      },
      isMine: msg.senderId._id.toString() === userId,
      read: msg.read,
      createdAt: msg.createdAt
    }));
    
    res.json({ ok: true, messages: formatted });
  } catch (err) {
    console.error('Error en getMessages:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
}

/* ----------------------------- ENVIAR MENSAJE ----------------------------- */
async function sendMessage(req, res) {
  try {
    const userId = ensureAuthUser(req);
    const { conversationId } = req.params;
    const { content } = req.body;
    
    if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ ok: false, message: 'conversationId inválido' });
    }
    
    if (!content || !content.trim()) {
      return res.status(400).json({ ok: false, message: 'El mensaje no puede estar vacío' });
    }
    
    // Verificar que el usuario es parte de la conversación
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ ok: false, message: 'Conversación no encontrada' });
    }
    
    if (!conversation.hasParticipant(userId)) {
      return res.status(403).json({ ok: false, message: 'No autorizado' });
    }
    
    // Crear mensaje
    const message = await Message.create({
      conversationId,
      senderId: userId,
      content: content.trim()
    });
    
    // Actualizar conversación con el último mensaje
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageAt: message.createdAt
    });
    
    // Poblar sender para la respuesta
    await message.populate('senderId', 'nick image');
    
    res.json({
      ok: true,
      message: {
        id: message._id,
        content: message.content,
        sender: {
          id: message.senderId._id,
          nick: message.senderId.nick,
          image: message.senderId.image
        },
        isMine: true,
        read: message.read,
        createdAt: message.createdAt
      }
    });
  } catch (err) {
    console.error('Error en sendMessage:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
}

/* ----------------------------- MARCAR MENSAJES COMO LEÍDOS ----------------------------- */
async function markAsRead(req, res) {
  try {
    const userId = ensureAuthUser(req);
    const { conversationId } = req.params;
    
    if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ ok: false, message: 'conversationId inválido' });
    }
    
    // Verificar que el usuario es parte de la conversación
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ ok: false, message: 'Conversación no encontrada' });
    }
    
    if (!conversation.hasParticipant(userId)) {
      return res.status(403).json({ ok: false, message: 'No autorizado' });
    }
    
    // Marcar como leídos todos los mensajes que no son míos
    const result = await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: userId },
        read: false
      },
      {
        $set: { read: true, readAt: new Date() }
      }
    );
    
    res.json({ ok: true, updated: result.modifiedCount });
  } catch (err) {
    console.error('Error en markAsRead:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
}

/* ----------------------------- OBTENER CONTADOR DE MENSAJES NO LEÍDOS ----------------------------- */
async function getUnreadCount(req, res) {
  try {
    const userId = ensureAuthUser(req);
    
    // Obtener todas las conversaciones del usuario
    const conversations = await Conversation.find({
      participants: userId
    }).select('_id');
    
    const conversationIds = conversations.map(c => c._id);
    
    // Contar mensajes no leídos en todas las conversaciones
    const unreadCount = await Message.countDocuments({
      conversationId: { $in: conversationIds },
      senderId: { $ne: userId },
      read: false
    });
    
    res.json({ ok: true, unreadCount });
  } catch (err) {
    console.error('Error en getUnreadCount:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
}

/* ----------------------------- ELIMINAR CONVERSACIÓN ----------------------------- */
async function deleteConversation(req, res) {
  try {
    const userId = ensureAuthUser(req);
    const { conversationId } = req.params;
    
    if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ ok: false, message: 'ID de conversación inválido' });
    }
    
    // Verificar que el usuario es parte de la conversación
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ ok: false, message: 'Conversación no encontrada' });
    }
    
    if (!conversation.hasParticipant(userId)) {
      return res.status(403).json({ ok: false, message: 'No tienes permiso para eliminar esta conversación' });
    }
    
    // Eliminar todos los mensajes de la conversación
    await Message.deleteMany({ conversationId });
    
    // Eliminar la conversación
    await Conversation.findByIdAndDelete(conversationId);
    
    res.json({ ok: true, message: 'Conversación eliminada correctamente' });
  } catch (err) {
    console.error('Error en deleteConversation:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
}

module.exports = {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markAsRead,
  getUnreadCount,
  deleteConversation
};
