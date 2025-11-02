// services/faceapi.js
const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');

// Configurar canvas para face-api
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;

/**
 * Carga los modelos de face-api.js
 * Usa los modelos tiny para mejor rendimiento
 */
async function loadModels() {
  if (modelsLoaded) return;
  
  const modelPath = path.join(__dirname, '../models/face-api');
  
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath),
      faceapi.nets.ageGenderNet.loadFromDisk(modelPath),
      faceapi.nets.faceExpressionNet.loadFromDisk(modelPath),
      faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath)
    ]);
    
    modelsLoaded = true;
    console.log('✅ [Face-API] Modelos cargados');
  } catch (error) {
    console.error('❌ [Face-API] Error cargando modelos:', error.message);
    throw error;
  }
}

/**
 * Analiza un buffer de imagen con face-api.js
 * @param {Buffer} buffer - Buffer de la imagen
 * @returns {Promise<object>} Resultados del análisis
 */
async function analyzeFaces(buffer) {
  try {
    // Asegurar que los modelos estén cargados
    await loadModels();
    
    // Crear imagen desde buffer
    const img = new Image();
    img.src = buffer;
    
    // Detectar rostros con edad, género y expresiones
    const detections = await faceapi
      .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withAgeAndGender()
      .withFaceExpressions();
    
    if (!detections || detections.length === 0) {
      return {
        faceCount: 0,
        faces: [],
        analyzed: true,
        timestamp: new Date()
      };
    }
    
    // Procesar resultados
    const faces = detections.map((detection, index) => {
      const box = detection.detection.box;
      const expressions = detection.expressions;
      
      // Obtener expresión dominante
      let maxExpression = 'neutral';
      let maxValue = 0;
      for (const [expr, value] of Object.entries(expressions)) {
        if (value > maxValue) {
          maxValue = value;
          maxExpression = expr;
        }
      }
      
      return {
        id: index + 1,
        boundingBox: {
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height)
        },
        age: Math.round(detection.age),
        gender: detection.gender,
        genderProbability: Math.round(detection.genderProbability * 100) / 100,
        expression: maxExpression,
        expressionConfidence: Math.round(maxValue * 100) / 100,
        allExpressions: Object.entries(expressions).map(([name, value]) => ({
          name,
          confidence: Math.round(value * 100) / 100
        })).sort((a, b) => b.confidence - a.confidence)
      };
    });
    
    console.log(`✅ [Face-API] Detectados ${faces.length} rostro(s)`);
    
    return {
      faceCount: faces.length,
      faces,
      analyzed: true,
      timestamp: new Date()
    };
    
  } catch (error) {
    console.error('❌ [Face-API] Error en análisis:', error.message);
    return {
      faceCount: 0,
      faces: [],
      analyzed: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * Compara resultados de face-api con Rekognition
 * @param {object} faceApiData - Resultados de face-api
 * @param {object} rekognitionData - Resultados de Rekognition
 * @returns {object} Comparación de ambos análisis
 */
function compareAnalysis(faceApiData, rekognitionData) {
  if (!faceApiData || !rekognitionData) {
    return null;
  }
  
  return {
    faceCount: {
      faceApi: faceApiData.faceCount || 0,
      rekognition: rekognitionData.faceCount || 0,
      match: (faceApiData.faceCount || 0) === (rekognitionData.faceCount || 0)
    },
    tags: rekognitionData.tags || [],
    nsfw: rekognitionData.nsfw || false,
    analysis: {
      faceApi: {
        faces: faceApiData.faces || [],
        timestamp: faceApiData.timestamp
      },
      rekognition: {
        faces: rekognitionData.faces || [],
        timestamp: rekognitionData.timestamp
      }
    }
  };
}

module.exports = {
  loadModels,
  analyzeFaces,
  compareAnalysis
};
