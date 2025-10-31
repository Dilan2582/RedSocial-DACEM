// config/env.js
require('dotenv').config();

function need(k){ const v = process.env[k]; if(!v) throw new Error(`Falta variable ${k}`); return v; }
function cleanBase(b){
  if(!b) return '';
  let base = String(b).trim();
  // quita slash final si existe
  if(base.endsWith('/')) base = base.slice(0, -1);
  return base;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3900),
  jwtSecret: need('JWT_SECRET'),

  aws: {
    region: need('AWS_REGION'),
    bucket: need('S3_BUCKET'),
    accessKeyId: need('AWS_ACCESS_KEY_ID'),
    secretAccessKey: need('AWS_SECRET_ACCESS_KEY'),
    // admite S3_PUBLIC_BASE_URL o S3_PUBLIC_BASE
    publicBaseUrl: cleanBase(process.env.S3_PUBLIC_BASE_URL || process.env.S3_PUBLIC_BASE || ''),
    prefixes: {
      avatars: process.env.S3_UPLOAD_PREFIX_AVATARS || 'avatars/',
      banners: process.env.S3_UPLOAD_PREFIX_BANNERS || 'banners/',
      posts:   process.env.S3_UPLOAD_PREFIX_POSTS   || 'posts/',
    },
  },

  upload: {
    maxMB: Number(process.env.IMAGE_MAX_MB || 10),
    allowed: (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/webp').split(','),
  },
};

module.exports = { env };
