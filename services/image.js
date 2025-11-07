// services/image.js
const sharp = require('sharp');

/**
 * Lee los metadatos de una imagen
 * @param {Buffer} buffer - Buffer de la imagen
 * @returns {Object} Metadata con width, height, mime
 */
async function readMeta(buffer) {
  const m = await sharp(buffer).metadata();
  return { 
    width: m.width || 0, 
    height: m.height || 0, 
    mime: m.format ? `image/${m.format}` : 'image/jpeg' 
  };
}

/**
 * Genera thumbnail optimizado para web (640px ancho máximo)
 * @param {Buffer} buffer - Buffer de la imagen original
 * @returns {Buffer} Imagen redimensionada en formato JPEG
 */
async function makeThumb(buffer) {
  return sharp(buffer)
    .resize({ width: 640, withoutEnlargement: true })
    .jpeg({ quality: 78, progressive: true })
    .toBuffer();
}

/**
 * TRANSFORMACIÓN 1: Blanco y Negro (Grayscale)
 * Remueve toda la saturación de color
 * @param {Buffer} buffer - Buffer de la imagen original
 * @returns {Buffer} Imagen en blanco y negro
 */
async function varT1(buffer) {
  return sharp(buffer)
    .grayscale()
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
}

/**
 * TRANSFORMACIÓN 2: Sepia (Tono Vintage)
 * Aplica efecto sepia cálido tipo fotografía antigua
 * @param {Buffer} buffer - Buffer de la imagen original
 * @returns {Buffer} Imagen con efecto sepia
 */
async function varT2(buffer) {
  return sharp(buffer)
    .modulate({ saturation: 0.5, brightness: 1.1 })
    .tint({ r: 112, g: 66, b: 20 })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
}

/**
 * TRANSFORMACIÓN 3: Blur Artístico
 * Aplica desenfoque suave para efecto bokeh/dreamy
 * @param {Buffer} buffer - Buffer de la imagen original
 * @returns {Buffer} Imagen con desenfoque
 */
async function varT3(buffer) {
  return sharp(buffer)
    .blur(3)
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
}

/**
 * TRANSFORMACIÓN 4: Ampliación (Upscale 2x)
 * Aumenta el tamaño de la imagen al doble con interpolación
 * @param {Buffer} buffer - Buffer de la imagen original
 * @returns {Buffer} Imagen ampliada
 */
async function varT4(buffer) {
  const meta = await sharp(buffer).metadata();
  const newWidth = Math.min(meta.width * 2, 4096); // Límite 4K
  
  return sharp(buffer)
    .resize({ width: newWidth, kernel: 'lanczos3' })
    .jpeg({ quality: 90, progressive: true })
    .toBuffer();
}

/**
 * Procesa todas las transformaciones en paralelo
 * @param {Buffer} buffer - Buffer de la imagen original
 * @returns {Object} Objeto con todos los buffers transformados
 */
async function processAllTransformations(buffer) {
  console.log('🎨 Iniciando transformaciones automáticas...');
  const start = Date.now();
  
  const [thumb, t1, t2, t3, t4] = await Promise.all([
    makeThumb(buffer),
    varT1(buffer),
    varT2(buffer),
    varT3(buffer),
    varT4(buffer)
  ]);
  
  const elapsed = Date.now() - start;
  console.log(`✅ Transformaciones completadas en ${elapsed}ms`);
  
  return { thumb, t1, t2, t3, t4 };
}

module.exports = { 
  readMeta, 
  makeThumb, 
  varT1, 
  varT2, 
  varT3,
  varT4,
  processAllTransformations 
};
