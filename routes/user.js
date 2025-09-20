const express = require('express');
const C = require('../controllers/user');
const auth = require('../middlewares/auth');
const router = express.Router();
const { googleLogin } = require('../controllers/auth');
const UserController = require('../controllers/user'); // ajusta a tu controlador real
const { verifyRecaptcha } = require('../middlewares/recaptcha');


router.post('/register', verifyRecaptcha, UserController.register);
router.post('/login', verifyRecaptcha, UserController.login);
router.post('/register', C.register);
router.post('/login', C.login);
router.get('/me', UserController.me);
router.put('/update', UserController.update);
router.get('/others', auth, C.listOthers);
router.get('/:id/public', auth, C.publicProfile);
router.post('/google', googleLogin);
router.post('/google-login', C.googleLogin)

module.exports = router;