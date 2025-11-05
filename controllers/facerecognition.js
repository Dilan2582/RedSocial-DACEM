const AWS = require('aws-sdk');
const { env } = require('../config/env');

// Configurar AWS SDK con credenciales explícitas
const rekognition = new AWS.Rekognition({
  region: env.aws.region,
  accessKeyId: env.aws.accessKeyId,
  secretAccessKey: env.aws.secretAccessKey
});

// Analizar rostro y obtener características
exports.analyzeFace = async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ ok: false, message: 'Image URL requerida' });
    }

    console.log('🔍 Analizando imagen:', imageUrl);
    console.log('🌍 AWS Region:', env.aws.region);
    console.log('👤 AWS User:', env.aws.accessKeyId ? env.aws.accessKeyId.substring(0, 10) + '***' : 'NO CONFIGURADO');

    // Descargar la imagen
    const imageBuffer = await downloadImage(imageUrl);

    // Detectar rostros
    const params = {
      Image: {
        Bytes: imageBuffer
      },
      Attributes: ['ALL']
    };

    console.log('📡 Llamando a AWS Rekognition...');
    const response = await rekognition.detectFaces(params).promise();
    console.log('✅ Respuesta de Rekognition - Rostros detectados:', response.FaceDetails.length);

    if (!response.FaceDetails || response.FaceDetails.length === 0) {
      return res.json({
        ok: true,
        facesDetected: 0,
        message: 'No se detectaron rostros en la imagen'
      });
    }

    // Procesar cada rostro detectado
    const facesData = response.FaceDetails.map((face, index) => ({
      faceNumber: index + 1,
      confidence: Math.round(face.Confidence),
      ageRange: face.AgeRange ? {
        low: face.AgeRange.Low,
        high: face.AgeRange.High
      } : null,
      gender: face.Gender ? {
        value: face.Gender.Value,
        confidence: Math.round(face.Gender.Confidence)
      } : null,
      emotions: face.Emotions ? face.Emotions.map(e => ({
        type: e.Type,
        confidence: Math.round(e.Confidence)
      })).sort((a, b) => b.confidence - a.confidence) : [],
      eyeglasses: face.Eyeglasses ? {
        present: face.Eyeglasses.Value,
        confidence: Math.round(face.Eyeglasses.Confidence)
      } : null,
      sunglasses: face.Sunglasses ? {
        present: face.Sunglasses.Value,
        confidence: Math.round(face.Sunglasses.Confidence)
      } : null,
      beard: face.Beard ? {
        present: face.Beard.Value,
        confidence: Math.round(face.Beard.Confidence)
      } : null,
      mustache: face.Mustache ? {
        present: face.Mustache.Value,
        confidence: Math.round(face.Mustache.Confidence)
      } : null,
      mouthOpen: face.MouthOpen ? {
        present: face.MouthOpen.Value,
        confidence: Math.round(face.MouthOpen.Confidence)
      } : null,
      eyesOpen: face.EyesOpen ? {
        present: face.EyesOpen.Value,
        confidence: Math.round(face.EyesOpen.Confidence)
      } : null,
      smiling: face.Smile ? {
        present: face.Smile.Value,
        confidence: Math.round(face.Smile.Confidence)
      } : null,
      landmarks: face.Landmarks ? face.Landmarks.slice(0, 5).map(l => ({
        type: l.Type,
        position: { x: Math.round(l.X * 100), y: Math.round(l.Y * 100) }
      })) : []
    }));

    res.json({
      ok: true,
      facesDetected: response.FaceDetails.length,
      faces: facesData
    });

  } catch (error) {
    console.error('❌ Error analizando rostro:', error.code || error.message);
    
    // Si es error de permisos de IAM
    if (error.code === 'AccessDenied' || error.code === 'AccessDeniedException' || error.message.includes('not authorized')) {
      console.error('⚠️ PERMISO DENEGADO: El usuario AWS no tiene permiso para rekognition:DetectFaces');
      console.error('📋 Asegúrate de que la IAM policy del usuario incluya: "rekognition:DetectFaces"');
      
      return res.status(403).json({
        ok: false,
        message: 'Permisos insuficientes en AWS IAM para rekognition:DetectFaces',
        hint: 'Configura los permisos en la consola de AWS IAM',
        error: error.message
      });
    }

    res.status(500).json({
      ok: false,
      message: 'Error al analizar rostro: ' + error.message,
      code: error.code
    });
  }
};

// Descargar imagen desde URL
async function downloadImage(imageUrl) {
  try {
    const https = require('https');
    const http = require('http');

    return new Promise((resolve, reject) => {
      const protocol = imageUrl.startsWith('https') ? https : http;

      protocol.get(imageUrl, (response) => {
        const chunks = [];

        response.on('data', (chunk) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        response.on('error', reject);
      }).on('error', reject);
    });
  } catch (error) {
    throw new Error('No se pudo descargar la imagen: ' + error.message);
  }
}
