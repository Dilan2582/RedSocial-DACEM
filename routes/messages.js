// routes/messages.js
const { Router } = require('express');
const router = Router();
const ctrl = require('../controllers/messages');
const { ensureAuth } = require('../middlewares/auth');

// Todas las rutas requieren autenticación
router.use(ensureAuth);

// GET /api/messages - Listar conversaciones del usuario
router.get('/', ctrl.getConversations);

// GET /api/messages/unread-count - Contador de mensajes no leídos
router.get('/unread-count', ctrl.getUnreadCount);

// GET /api/messages/conversation/:recipientId - Obtener o crear conversación con un usuario
router.get('/conversation/:recipientId', ctrl.getOrCreateConversation);

// GET /api/messages/:conversationId - Obtener mensajes de una conversación
router.get('/:conversationId', ctrl.getMessages);

// POST /api/messages/:conversationId - Enviar mensaje en una conversación
router.post('/:conversationId', ctrl.sendMessage);

// PUT /api/messages/:conversationId/read - Marcar mensajes como leídos
router.put('/:conversationId/read', ctrl.markAsRead);

// DELETE /api/messages/conversation/:conversationId - Eliminar una conversación
router.delete('/conversation/:conversationId', ctrl.deleteConversation);

module.exports = router;
