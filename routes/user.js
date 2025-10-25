// routes/user.js
const express = require('express');
const router = express.Router();

const C = require('../controllers/user');


const { googleLogin } = require('../controllers/auth');

const auth = require('../middlewares/auth');          
const { upload } = require('../middlewares/upload');   
const { verifyRecaptcha } = require('../middlewares/recaptcha'); 

// Públicas (con captcha)
router.post('/register', verifyRecaptcha, C.register);
router.post('/login',    verifyRecaptcha, C.login);

// Avatar (stream desde GridFS) — poner antes de '/:id/public'
router.get('/avatar/:id', C.streamAvatar);

// Protegidas
router.get('/me',         auth, C.me);
router.put('/update',     auth, C.update);
router.get('/others',     auth, C.listOthers);
router.get('/:id/public', auth, C.publicProfile);

// Subidas
router.post('/me/avatar', auth, upload.single('avatar'), C.updateAvatar);
router.put('/me/banner',  auth, upload.single('banner'), C.updateBanner);

module.exports = router;
