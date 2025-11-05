const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const faceRecognitionController = require('../controllers/facerecognition');

// Analizar rostro en imagen
router.post('/analyze', auth, faceRecognitionController.analyzeFace);

module.exports = router;
