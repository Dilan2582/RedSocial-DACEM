// routes/auth.js
const router = require('express').Router();
const { googleLogin } = require('../controllers/auth');

router.post('/google', googleLogin);

module.exports = router;
