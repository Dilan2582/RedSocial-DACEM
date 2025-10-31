// models/like.js
const { Schema, model, Types } = require('mongoose');

const LikeSchema = new Schema({
  postId:   { type: Types.ObjectId, ref: 'Post', required: true, index: true },
  userId:   { type: Types.ObjectId, ref: 'User', required: true, index: true },
  createdAt:{ type: Date, default: Date.now }
});
LikeSchema.index({ postId: 1, userId: 1 }, { unique: true });

module.exports = model('Like', LikeSchema);
