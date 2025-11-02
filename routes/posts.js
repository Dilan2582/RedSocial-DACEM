const express = require('express');
const { env } = require('../config/env');
const ctrl = require('../controllers/posts');
const auth = require('../middlewares/auth');
const ensureAuth = auth.ensureAuth || auth;

// usa el middleware centralizado
const { upload } = require('../middlewares/upload');

const router = express.Router();

// Obtener feed de posts (con paginación)
router.get('/', ensureAuth, ctrl.getFeed);

// Crear un nuevo post
router.post('/', ensureAuth, upload.single('image'), ctrl.createPost);

// Obtener un post específico
router.get('/:id', ensureAuth, ctrl.getPostById);

// Toggle like en un post
router.post('/:id/likes/toggle', ensureAuth, ctrl.toggleLike);

// Obtener comentarios de un post
router.get('/:id/comments', ensureAuth, ctrl.listComments);

// Agregar comentario a un post
router.post('/:id/comments', ensureAuth, ctrl.addComment);

// Análisis de imagen
router.get('/:id/analysis', ensureAuth, ctrl.getAnalysis);

module.exports = router;
