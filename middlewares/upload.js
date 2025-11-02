// middlewares/upload.js
const multer = require('multer');
const { env } = require('../config/env');

const storage = multer.memoryStorage();
const allowed = new Set(env.upload.allowed); // del .env
// Si quieres permitir mp4 además:
allowed.add('video/mp4');

const upload = multer({
  storage,
  limits: { fileSize: env.upload.maxMB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowed.has(file.mimetype)) {
      return cb(new Error('Tipo de archivo no permitido'));
    }
    cb(null, true);
  },
});

module.exports = { upload };
