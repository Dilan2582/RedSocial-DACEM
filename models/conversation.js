// models/conversation.js
const { Schema, model, Types } = require('mongoose');

const ConversationSchema = new Schema({
  participants: [{
    type: Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: Types.ObjectId,
    ref: 'Message'
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índice para búsquedas rápidas de conversaciones por participantes
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });

// Método para verificar si un usuario es parte de la conversación
ConversationSchema.methods.hasParticipant = function(userId) {
  return this.participants.some(p => p.toString() === userId.toString());
};

module.exports = model('Conversation', ConversationSchema);
