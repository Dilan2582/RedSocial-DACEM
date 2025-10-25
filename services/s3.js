const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const region = process.env.AWS_REGION;
const bucket = process.env.S3_BUCKET;

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const publicUrl = (Key) => `https://${bucket}.s3.${region}.amazonaws.com/${Key}`;

async function putPublicObject({ Key, Body, ContentType, CacheControl = "public, max-age=31536000" }) {
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key, Body, ContentType, CacheControl }));
  return publicUrl(Key);
}

async function deleteObject(Key) {
  return s3.send(new DeleteObjectCommand({ Bucket: bucket, Key }));
}

module.exports = { putPublicObject, deleteObject, publicUrl };
