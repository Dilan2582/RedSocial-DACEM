const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  // Usuario que recibe la notificación
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Usuario que genera la notificación
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Tipo de notificación
  type: {
    type: String,
    enum: ['like', 'comment', 'follow_request', 'follow_accepted'],
    required: true,
    index: true
  },
  
  // Post relacionado (para likes y comentarios)
  post: {
    type: Schema.Types.ObjectId,
    ref: 'Post'
  },
  
  // Comentario relacionado (si es notificación de comentario)
  comment: {
    type: Schema.Types.ObjectId,
    ref: 'Comment'
  },
  
  // Contenido del comentario (para preview)
  commentText: {
    type: String,
    maxlength: 100
  },
  
  // Estado de lectura
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Timestamp
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Índice compuesto para consultas eficientes
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
