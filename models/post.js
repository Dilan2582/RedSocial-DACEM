// models/post.js
const { Schema, model, Types } = require('mongoose');

const MediaSchema = new Schema({
  keyOriginal: { type: String, required: true },
  keyThumb:    { type: String, required: true },
  selectedFilter: { type: String, default: 'original' }, // Filtro elegido por el usuario
  variants: {
    t1: { type: String, required: false },  // Blanco y Negro
    t2: { type: String, required: false },  // Sepia
    t3: { type: String, required: false },  // Blur
    t4: { type: String, required: false },  // Ampliación 2x
    t5: { type: String, required: false },  // Bright
    t6: { type: String, required: false },  // Dark
    t7: { type: String, required: false },  // Vibrant
    t8: { type: String, required: false },  // Warm
    t9: { type: String, required: false },  // Cool
    t10: { type: String, required: false }, // Invert
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
