const express = require('express');
const C = require('../controllers/user');
const auth = require('../middlewares/auth');
const router = express.Router();
const { googleLogin } = require('../controllers/auth');


router.post('/register', C.register);
router.post('/login', C.login);
router.get('/me', auth, C.me);
router.put('/update', auth, C.update);
router.get('/others', auth, C.listOthers);
router.get('/:id/public', auth, C.publicProfile);
router.post('/google', googleLogin);
router.post('/google-login', C.googleLogin)

module.exports = router;