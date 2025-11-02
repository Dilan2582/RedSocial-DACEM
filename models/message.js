// models/message.js
const { Schema, model, Types } = require('mongoose');

const MessageSchema = new Schema({
  conversationId: {
    type: Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  senderId: {
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Índice compuesto para búsquedas eficientes
MessageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = model('Message', MessageSchema);
