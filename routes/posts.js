const express = require('express');
const { env } = require('../config/env');
const ctrl = require('../controllers/posts');
const auth = require('../middlewares/auth');
const ensureAuth = auth.ensureAuth || auth;

// usa el middleware centralizado
const { upload } = require('../middlewares/upload');

const router = express.Router();
router.post('/', ensureAuth, upload.single('image'), ctrl.createPost);
// ...
router.get('/:id/analysis', ensureAuth, ctrl.getAnalysis);

module.exports = router;
