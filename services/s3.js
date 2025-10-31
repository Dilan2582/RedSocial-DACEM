// services/s3.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { env } = require('../config/env');

const s3 = new S3Client({
  region: env.aws.region,
  credentials: {
    accessKeyId: env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey,
  },
});

// Ensambla la URL pública desde base + key, con fallback al dominio de S3
function buildPublicUrlFromKey(key) {
  if (env.aws.publicBaseUrl) {
    const base = env.aws.publicBaseUrl.endsWith('/')
      ? env.aws.publicBaseUrl
      : env.aws.publicBaseUrl + '/';
    return base + key;
  }
  return `https://${env.aws.bucket}.s3.${env.aws.region}.amazonaws.com/${key}`;
}

// Para posts (ya lo usas)
function buildPostKey(userId, postId, name) {
  return `${env.aws.prefixes.posts}${userId}/${postId}/${name}`;
}

// Sube un buffer (posts, etc.)
async function uploadBuffer({
  Key,
  Body,
  ContentType,
  CacheControl = 'public, max-age=31536000, immutable',
}) {
  await s3.send(new PutObjectCommand({
    Bucket: env.aws.bucket,
    Key,
    Body,
    ContentType,
    CacheControl,
  }));
  return Key;
}

// Sube y devuelve URL pública (lo usa el banner)
async function putPublicObject({
  Key,
  Body,
  ContentType = 'application/octet-stream',
  CacheControl = 'public, max-age=31536000, immutable',
}) {
  await s3.send(new PutObjectCommand({
    Bucket: env.aws.bucket,
    Key,
    Body,
    ContentType,
    CacheControl,
    // Nota: no es necesario ACL si tu bucket policy ya permite GetObject público.
    // ACL: 'public-read',
  }));
  return buildPublicUrlFromKey(Key);
}

// Devuelve URL pública desde un key
function publicUrl(key) {
  return buildPublicUrlFromKey(key);
}

module.exports = {
  s3,
  buildPostKey,
  uploadBuffer,
  putPublicObject,
  publicUrl,
};

// 4) Sube todo a S3
await Promise.all([
  uploadBuffer({ Key: keyOriginal, Body: buffer,   ContentType: meta.mime }),
  uploadBuffer({ Key: keyThumb,    Body: thumbBuf, ContentType: 'image/jpeg' }),
  uploadBuffer({ Key: keyT1,       Body: t1Buf,    ContentType: 'image/jpeg' }),
  uploadBuffer({ Key: keyT2,       Body: t2Buf,    ContentType: 'image/jpeg' }),
  uploadBuffer({ Key: keyT3,       Body: t3Buf,    ContentType: 'image/jpeg' }),
]);

// 4.5) *** NUEVO: Análisis de visión sobre el ORIGINAL ***
const analysis = await analyzeS3Image({
  bucket: env.aws.bucket,
  key: keyOriginal
});

// 5) Crea el documento completo
const post = await Post.create({
  _id: postId,
  userId: new Types.ObjectId(userId),
  caption: (req.body.caption || '').trim(),
  media: {
    keyOriginal,
    keyThumb,
    variants: { t1: keyT1, t2: keyT2, t3: keyT3 },
    width: meta.width,
    height: meta.height,
    mime: meta.mime,
    size: buffer.length
  },
  // *** NUEVO: guarda resultados de visión ***
  tags: analysis.tags,
  nsfw: analysis.nsfw,
  faceCount: analysis.faceCount,
  visionRaw: analysis.raw,

  status: 'ready'
});

res.json({
  ok: true,
  post: {
    // ...
    tags: post.tags,
    nsfw: post.nsfw,
    faceCount: post.faceCount,
    // ...
  }
});
