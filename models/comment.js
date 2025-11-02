// models/comment.js
const { Schema, model, Types } = require('mongoose');

const CommentSchema = new Schema({
  postId:   { type: Types.ObjectId, ref: 'Post', required: true, index: true },
  userId:   { type: Types.ObjectId, ref: 'User', required: true },
  text:     { type: String, required: true, trim: true, maxlength: 500 },
  createdAt:{ type: Date, default: Date.now, index: true }
});

CommentSchema.index({ postId: 1, createdAt: -1 });

module.exports = model('Comment', CommentSchema);
