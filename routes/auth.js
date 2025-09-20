// routes/auth.js
const express = require('express');
const { googleLogin } = require('../controllers/auth');
const router = express.Router();

router.post('/google', googleLogin);

module.exports = router;
