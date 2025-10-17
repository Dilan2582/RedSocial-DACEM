// routes/user.js
const express = require('express');
const router  = express.Router();

const auth = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { verifyRecaptcha } = require('../middlewares/recaptcha');

const C = require('../controllers/user');
const { googleLogin } = require('../controllers/auth');

// Públicas (con captcha)
router.post('/register', verifyRecaptcha, C.register);
router.post('/login',    verifyRecaptcha, C.login);

// Google Sign-In
router.post('/google-login', googleLogin);

// Avatar (leer desde GridFS cuando corresponda)
router.get('/avatar/:id', C.streamAvatar);

// Protegidas
router.get('/me',           auth, C.me);
router.put('/update',       auth, C.update);
router.get('/others',       auth, C.listOthers);
router.get('/:id/public',   auth, C.publicProfile);
router.post('/me/avatar',   auth, upload.single('avatar'), C.updateAvatar);

module.exports = router;
