const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const notificationsController = require('../controllers/notifications');

// Obtener contador de no leídas (debe ir antes de las rutas con parámetros)
router.get('/unread-count', auth, notificationsController.getUnreadCount);

// Marcar todas como leídas (debe ir antes de las rutas con parámetros)
router.patch('/mark-all-read', auth, notificationsController.markAllAsRead);

// Obtener notificaciones
router.get('/', auth, notificationsController.getNotifications);

// Marcar notificación como leída
router.patch('/:id/read', auth, notificationsController.markAsRead);

// Eliminar notificación
router.delete('/:id', auth, notificationsController.deleteNotification);

module.exports = router;
