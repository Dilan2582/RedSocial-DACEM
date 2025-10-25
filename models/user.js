// models/user.js
const { Schema, model } = require('mongoose');

const UserSchema = new Schema({
  firstName: String,
  lastName: String,
  nickname: { type: String, required: true, unique: true, trim: true, lowercase: true },
  email:    { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: String,

  avatar: String,
  banner: String,                 // <--- asegúrate de tenerlo
  bio:    { type: String, default: '' }, // <--- y este también

  isVerified: { type: Boolean, default: false },
  role:       { type: String,   default: 'user' }
}, { timestamps: true });

module.exports = model('User', UserSchema);
