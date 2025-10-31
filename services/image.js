// services/image.js
const sharp = require('sharp');

async function readMeta(buffer) {
  const m = await sharp(buffer).metadata();
  return { width: m.width || 0, height: m.height || 0, mime: m.format ? `image/${m.format}` : 'image/jpeg' };
}

async function makeThumb(buffer) {
  return sharp(buffer).resize({ width: 640, withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer();
}

async function varT1(buffer) {           // B/N
  return sharp(buffer).grayscale().jpeg({ quality: 82 }).toBuffer();
}
async function varT2(buffer) {           // Sepia aproximado
  return sharp(buffer).modulate({ saturation: 0.6, hue: 30 }).tint({ r: 112, g: 66, b: 20 }).jpeg({ quality: 82 }).toBuffer();
}
async function varT3(buffer) {           // Suave desenfoque
  return sharp(buffer).blur(2).jpeg({ quality: 82 }).toBuffer();
}

module.exports = { readMeta, makeThumb, varT1, varT2, varT3 };
