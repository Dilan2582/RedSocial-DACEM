// middlewares/upload.js
const multer = require('multer');

// Buffer en memoria: procesamos con sharp y subimos a S3 (no escribimos a disco)
const storage = multer.memoryStorage();

// Tipos permitidos (imágenes + video mp4 básico)
const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
];

const upload = multer({
  storage,
  // Límite razonable para imágenes y videos cortos (ajusta si necesitas)
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (req, file, cb) => {
    const ok = ALLOWED_MIME.includes(file.mimetype);
    cb(ok ? null : new Error('Tipo de archivo no permitido'), ok);
  },
});

module.exports = { upload };
