// models/post.js
const { Schema, model, Types } = require('mongoose');

const MediaSchema = new Schema({
  keyOriginal: { type: String, required: true },
  keyThumb:    { type: String, required: true },
  variants: {
    t1: { type: String, required: true }, // ej. B/N
    t2: { type: String, required: true }, // ej. Sepia
    t3: { type: String, required: true }, // ej. Blur
  },
  width: Number,
  height: Number,
  mime: String,
  size: Number
}, { _id: false });

const PostSchema = new Schema({
  userId:   { type: Types.ObjectId, ref: 'User', required: true, index: true },
  caption:  { type: String, default: '' },
  media:    { type: MediaSchema, required: true },
  counts:   {
    likes:    { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
  },
  tags:       [{ type: String, index: true }],
  nsfw:       { type: Boolean, default: false, index: true },
  faceCount:  { type: Number, default: 0 },
  visionRaw:  { type: Object },  // AWS Rekognition
  faceApiData: { type: Object }, // Face-API.js (local, gratis)
  status:   { type: String, enum: ['processing', 'ready'], default: 'ready' },
  createdAt:{ type: Date, default: Date.now, index: true }
});

PostSchema.index({ userId: 1, createdAt: -1 });



module.exports = model('Post', PostSchema);
