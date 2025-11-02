// services/vision.js
const {
  RekognitionClient,
  DetectLabelsCommand,
  DetectModerationLabelsCommand,
  DetectFacesCommand
} = require("@aws-sdk/client-rekognition");
const { env } = require('../config/env');

const client = new RekognitionClient({ region: env.aws.region });

/**
 * Analiza una imagen en S3 con AWS Rekognition
 * OPTIMIZADO: Primero detecta labels, solo analiza caras si encuentra "Person"
 * @param {object} options - { bucket, key, skipFaces }
 */
async function analyzeS3Image({ bucket, key, skipFaces = false }) {
  const Image = { S3Object: { Bucket: bucket, Name: key } };
  
  console.log('🔍 [Rekognition] Iniciando análisis...');
  
  // PASO 1: Siempre detectar labels y moderación (son baratas y útiles)
  const [labelsRes, modRes] = await Promise.all([
    client.send(new DetectLabelsCommand({ Image, MaxLabels: 15, MinConfidence: 80 })),
    client.send(new DetectModerationLabelsCommand({ Image, MinConfidence: 80 }))
  ]);

  const tags = (labelsRes.Labels || []).map(l => l.Name).slice(0, 10);
  const nsfw = (modRes.ModerationLabels || []).length > 0;
  
  console.log(`   ✅ Labels: ${tags.length} tags detectados`);
  console.log(`   ✅ Moderación: ${nsfw ? 'NSFW' : 'Seguro'}`);

  let faceCount = 0;
  let faceDetails = [];

  // PASO 2: Solo analizar caras si:
  // - No se pidió saltarlo
  // - Y la imagen contiene "Person", "Human", "Face" o "People"
  const hasPersonTags = tags.some(tag => 
    ['Person', 'Human', 'Face', 'People', 'Portrait', 'Selfie'].includes(tag)
  );

  if (!skipFaces && hasPersonTags) {
    console.log('   🔍 Detectadas personas, analizando rostros...');
    const facesRes = await client.send(
      new DetectFacesCommand({ Image, Attributes: ["ALL"] }) // ALL para obtener más info
    );
    faceDetails = facesRes.FaceDetails || [];
    faceCount = faceDetails.length;
    console.log(`   ✅ Caras: ${faceCount} rostro(s) encontrado(s)`);
  } else {
    console.log(`   ⏭️  Sin personas detectadas, saltando análisis facial (ahorro 1 llamada)`);
  }

  return {
    tags,
    nsfw,
    faceCount,
    raw: {
      labels: labelsRes.Labels,
      moderation: modRes.ModerationLabels,
      faces: faceDetails
    }
  };
}

/**
 * Versión económica: Solo labels básicos, sin moderación ni caras
 */
async function analyzeS3ImageLite({ bucket, key }) {
  const Image = { S3Object: { Bucket: bucket, Name: key } };
  
  console.log('🔍 [Rekognition Lite] Análisis básico...');
  
  const labelsRes = await client.send(
    new DetectLabelsCommand({ Image, MaxLabels: 10, MinConfidence: 85 })
  );

  const tags = (labelsRes.Labels || []).map(l => l.Name);
  
  console.log(`   ✅ ${tags.length} tags detectados (modo económico)`);

  return {
    tags,
    nsfw: false,
    faceCount: 0,
    raw: { labels: labelsRes.Labels }
  };
}

module.exports = { analyzeS3Image, analyzeS3ImageLite };
