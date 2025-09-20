// models/follow.js
const mongoose = require('mongoose');

const FollowSchema = new mongoose.Schema(
  {
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    followed: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// índice único para una sola relación user→followed
FollowSchema.index({ user: 1, followed: 1 }, { unique: true });

// 👇 evita OverwriteModelError si el archivo se evalúa 2 veces
module.exports = mongoose.models.Follow || mongoose.model('Follow', FollowSchema);

