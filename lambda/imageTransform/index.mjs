// lambda/imageTransform/index.mjs
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

// AWS Lambda proporciona AWS_REGION automáticamente
const s3Client = new S3Client({});

/**
 * Lambda Function para transformar imágenes automáticamente
 * Trigger: S3 ObjectCreated en carpeta "posts/"
 */
export const handler = async (event) => {
  console.log('🚀 Lambda triggered:', JSON.stringify(event, null, 2));

  try {
    // Obtener información del evento S3
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    // Solo procesar archivos "original.*" en carpeta posts/
    if (!key.includes('posts/') || !key.includes('original.')) {
      console.log('⏭️  Archivo ignorado (no es original):', key);
      return { statusCode: 200, body: 'Skipped' };
    }

    console.log(`📥 Descargando: ${bucket}/${key}`);

    // Descargar imagen original de S3
    const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3Client.send(getCommand);
    const imageBuffer = await streamToBuffer(response.Body);

    console.log(`📸 Imagen descargada: ${(imageBuffer.length / 1024).toFixed(2)} KB`);

    // Extraer path base (sin "original.ext")
    const basePath = key.replace(/original\.\w+$/, '');

    // Generar todas las transformaciones en paralelo
    console.log('🎨 Generando 4 transformaciones...');
    const [thumb, t1, t2, t3, t4] = await Promise.all([
      makeThumb(imageBuffer),
      makeBlackWhite(imageBuffer),
      makeSepia(imageBuffer),
      makeBlur(imageBuffer),
      makeUpscale(imageBuffer)
    ]);

    // Subir todas las transformaciones a S3 en paralelo
    console.log('☁️  Subiendo 5 transformaciones a S3...');
    await Promise.all([
      uploadToS3(bucket, `${basePath}thumb.jpg`, thumb),
      uploadToS3(bucket, `${basePath}t1_bw.jpg`, t1),
      uploadToS3(bucket, `${basePath}t2_sepia.jpg`, t2),
      uploadToS3(bucket, `${basePath}t3_blur.jpg`, t3),
      uploadToS3(bucket, `${basePath}t4_upscale.jpg`, t4)
    ]);

    console.log('✅ Transformaciones completadas y subidas');

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Transformaciones completadas',
        originalKey: key,
        transformations: [
          `${basePath}thumb.jpg`,
          `${basePath}t1_bw.jpg`,
          `${basePath}t2_sepia.jpg`,
          `${basePath}t3_blur.jpg`,
          `${basePath}t4_upscale.jpg`
        ]
      })
    };
  } catch (error) {
    console.error('❌ Error en Lambda:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// ==================== TRANSFORMACIONES ====================

async function makeThumb(buffer) {
  return sharp(buffer)
    .resize({ width: 640, withoutEnlargement: true })
    .jpeg({ quality: 78, progressive: true })
    .toBuffer();
}

async function makeBlackWhite(buffer) {
  return sharp(buffer)
    .grayscale()
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
}

async function makeSepia(buffer) {
  return sharp(buffer)
    .modulate({ saturation: 0.5, brightness: 1.1 })
    .tint({ r: 112, g: 66, b: 20 })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
}

async function makeBlur(buffer) {
  return sharp(buffer)
    .blur(3)
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
}

async function makeUpscale(buffer) {
  const meta = await sharp(buffer).metadata();
  const newWidth = Math.min(meta.width * 2, 4096);
  
  return sharp(buffer)
    .resize({ width: newWidth, kernel: 'lanczos3' })
    .jpeg({ quality: 90, progressive: true })
    .toBuffer();
}

// ==================== HELPERS ====================

async function uploadToS3(bucket, key, buffer) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: 'image/jpeg'
  });
  await s3Client.send(command);
  console.log(`✅ Uploaded: ${key}`);
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
