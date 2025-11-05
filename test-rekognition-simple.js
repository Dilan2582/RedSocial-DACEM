// Test simple de Rekognition
require('dotenv').config();
const { RekognitionClient, DetectLabelsCommand } = require("@aws-sdk/client-rekognition");
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({ 
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const rekClient = new RekognitionClient({ 
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function testRekognition() {
  console.log('🔍 Testing AWS Rekognition...');
  console.log('📍 Region:', process.env.AWS_REGION);
  console.log('🪣 Bucket:', process.env.S3_BUCKET);
  console.log('🔑 Access Key:', process.env.AWS_ACCESS_KEY_ID?.substring(0, 10) + '***');
  console.log('⚙️  Rekognition Enabled:', process.env.REKOGNITION_ENABLED);
  console.log('⚙️  Rekognition Mode:', process.env.REKOGNITION_MODE);
  
  // Primero, buscar una imagen en S3
  try {
    console.log('\n📂 Buscando imágenes en S3...');
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET,
      Prefix: 'posts/',
      MaxKeys: 10
    });
    
    const listResponse = await s3Client.send(listCommand);
    
    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log('\n⚠️  No hay imágenes en S3 aún.');
      console.log('💡 Sube una imagen desde la app primero.');
      return;
    }
    
    // Buscar la primera imagen original.jpg o original.jpeg
    const originalImage = listResponse.Contents.find(obj => 
      obj.Key.includes('original.jpg') || obj.Key.includes('original.jpeg')
    );
    
    if (!originalImage) {
      console.log('\n⚠️  No se encontró ninguna imagen original.jpg');
      console.log('📋 Imágenes disponibles:');
      listResponse.Contents.forEach(obj => console.log('  -', obj.Key));
      return;
    }
    
    console.log('✅ Imagen encontrada:', originalImage.Key);
    
    // Ahora probar Rekognition
    const testImage = {
      S3Object: {
        Bucket: process.env.S3_BUCKET,
        Name: originalImage.Key
      }
    };

    console.log('\n📡 Llamando a DetectLabels...');
    const command = new DetectLabelsCommand({
      Image: testImage,
      MaxLabels: 10,
      MinConfidence: 70
    });
    
    const response = await rekClient.send(command);
    
    console.log('\n✅ ¡Rekognition funciona!');
    console.log('📊 Labels detectados:', response.Labels?.length || 0);
    
    if (response.Labels && response.Labels.length > 0) {
      console.log('\n🏷️  Top 5 Labels:');
      response.Labels.slice(0, 5).forEach((label, i) => {
        console.log(`  ${i + 1}. ${label.Name} (${Math.round(label.Confidence)}% confianza)`);
      });
    }
    
    console.log('\n✅ Todo correcto! Rekognition está configurado y funcionando.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Error name:', error.name);
    
    if (error.name === 'AccessDeniedException') {
      console.log('\n⚠️  PROBLEMA: No tienes permisos de Rekognition.');
      console.log('📝 Solución: Ve a AWS IAM y agrega la política AmazonRekognitionReadOnlyAccess al usuario.');
    } else if (error.name === 'InvalidS3ObjectException') {
      console.log('\n⚠️  No se puede acceder a la imagen en S3.');
      console.log('💡 Verifica que la imagen exista y tengas permisos de lectura.');
    }
  }
}

testRekognition();
