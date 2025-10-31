// services/s3.js (extensión)
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { env } = require('../config/env');

const s3 = new S3Client({
  region: env.aws.region,
  credentials: {
    accessKeyId: env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey,
  },
});

function buildPostKey(userId, postId, name) {
  // name: 'original.jpg' | 'thumb.jpg' | 't1.jpg' | ...
  return `${env.aws.prefixes.posts}${userId}/${postId}/${name}`;
}

async function uploadBuffer({ Key, Body, ContentType, CacheControl = 'public, max-age=31536000, immutable' }) {
  await s3.send(new PutObjectCommand({
    Bucket: env.aws.bucket,
    Key, Body, ContentType, CacheControl
  }));
  return Key;
}

function publicUrl(key) {
  if (env.aws.publicBaseUrl) return `${env.aws.publicBaseUrl}${key}`;
  // fallback URL directa de S3
  return `https://${env.aws.bucket}.s3.${env.aws.region}.amazonaws.com/${key}`;
}

module.exports = { s3, buildPostKey, uploadBuffer, publicUrl };
