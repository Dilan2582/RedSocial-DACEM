// routes/posts.js
const express = require('express');
const multer = require('multer');
const { env } = require('../config/env');
const ctrl = require('../controllers/posts');

// Usa tu middleware real; ajusta el nombre si es distinto
const auth = require('../middlewares/auth'); // ej. exporta ensureAuth
const ensureAuth = auth.ensureAuth || auth;  // fallback

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.upload.maxMB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!env.upload.allowed.includes(file.mimetype)) {
      return cb(new Error('MIME no permitido'));
    }
    cb(null, true);
  }
});

const router = express.Router();
router.post('/', ensureAuth, upload.single('image'), ctrl.createPost);
router.get('/', ensureAuth, ctrl.getFeed);
router.get('/:id', ensureAuth, ctrl.getPostById);
router.post('/:id/likes/toggle', ensureAuth, ctrl.toggleLike);
router.get('/:id/comments', ensureAuth, ctrl.listComments);
router.post('/:id/comments', ensureAuth, ctrl.addComment);

module.exports = router;
