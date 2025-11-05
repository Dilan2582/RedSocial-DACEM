const Notification = require('../models/notification');
const User = require('../models/user');
const Post = require('../models/post');

// Obtener notificaciones del usuario
exports.getNotifications = async (req, res) => {
  try {
    const { type, unreadOnly } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Construir filtro
    const filter = { recipient: req.user.id };
    
    if (type && ['like', 'comment', 'follow_request', 'follow_accepted'].includes(type)) {
      filter.type = type;
    }
    
    if (unreadOnly === 'true') {
      filter.read = false;
    }

    // Obtener notificaciones
    const notifications = await Notification.find(filter)
      .populate('sender', 'firstName lastName nickname avatar')
      .populate('post', 'image')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Contar total
    const total = await Notification.countDocuments(filter);
    
    // Contar no leídas
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      read: false
    });

    res.json({
      ok: true,
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ ok: false, message: 'Error al obtener notificaciones' });
  }
};

// Marcar notificación como leída
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ ok: false, message: 'Notificación no encontrada' });
    }

    res.json({ ok: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ ok: false, message: 'Error al marcar notificación' });
  }
};

// Marcar todas como leídas
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { read: true }
    );

    res.json({ ok: true, message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ ok: false, message: 'Error al marcar notificaciones' });
  }
};

// Eliminar notificación
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ ok: false, message: 'Notificación no encontrada' });
    }

    res.json({ ok: true, message: 'Notificación eliminada' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ ok: false, message: 'Error al eliminar notificación' });
  }
};

// Función helper para crear notificación
exports.createNotification = async (recipientId, senderId, type, data = {}) => {
  try {
    // No crear notificación si el usuario se notifica a sí mismo
    if (recipientId.toString() === senderId.toString()) {
      return null;
    }

    // Verificar si ya existe una notificación similar reciente (últimos 5 minutos)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existing = await Notification.findOne({
      recipient: recipientId,
      sender: senderId,
      type,
      post: data.postId,
      createdAt: { $gte: fiveMinutesAgo }
    });

    if (existing) {
      return existing; // No duplicar
    }

    const notificationData = {
      recipient: recipientId,
      sender: senderId,
      type
    };

    if (data.postId) {
      notificationData.post = data.postId;
    }

    if (data.commentId) {
      notificationData.comment = data.commentId;
    }

    if (data.commentText) {
      notificationData.commentText = data.commentText.substring(0, 100);
    }

    const notification = await Notification.create(notificationData);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Obtener contador de notificaciones no leídas
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user.id,
      read: false
    });

    res.json({ ok: true, count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ ok: false, message: 'Error al obtener contador' });
  }
};
