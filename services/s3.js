// services/s3.js
const { env } = require('../config/env');

let _awsMod = null;
async function aws() {
  if (_awsMod) return _awsMod;
  _awsMod = await import('@aws-sdk/client-s3'); // ESM dinámico
  return _awsMod;
}

let _client = null;
async function getS3Client() {
  if (_client) return _client;
  const { S3Client } = await aws();
  _client = new S3Client({
    region: env.aws.region,
    credentials: {
      accessKeyId: env.aws.accessKeyId,
      secretAccessKey: env.aws.secretAccessKey,
    },
  });
  return _client;
}

// Ensambla URL pública (igual que antes)
function buildPublicUrlFromKey(key) {
  if (env.aws.publicBaseUrl) {
    const base = env.aws.publicBaseUrl.endsWith('/')
      ? env.aws.publicBaseUrl
      : env.aws.publicBaseUrl + '/';
    return base + key;
  }
  return `https://${env.aws.bucket}.s3.${env.aws.region}.amazonaws.com/${key}`;
}

function buildPostKey(userId, postId, name) {
  return `${env.aws.prefixes.posts}${userId}/${postId}/${name}`;
}

async function uploadBuffer({
  Key,
  Body,
  ContentType,
  CacheControl = 'public, max-age=31536000, immutable',
}) {
  const client = await getS3Client();
  const { PutObjectCommand } = await aws();
  await client.send(new PutObjectCommand({
    Bucket: env.aws.bucket,
    Key,
    Body,
    ContentType,
    CacheControl,
  }));
  return Key;
}

async function putPublicObject({
  Key,
  Body,
  ContentType = 'application/octet-stream',
  CacheControl = 'public, max-age=31536000, immutable',
}) {
  const client = await getS3Client();
  const { PutObjectCommand } = await aws();
  await client.send(new PutObjectCommand({
    Bucket: env.aws.bucket,
    Key,
    Body,
    ContentType,
    CacheControl,
  }));
  return buildPublicUrlFromKey(Key);
}

function publicUrl(key) {
  return buildPublicUrlFromKey(key);
}

module.exports = {
  buildPostKey,
  uploadBuffer,
  putPublicObject,
  publicUrl,
};
