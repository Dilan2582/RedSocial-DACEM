const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // legacy para tu UI (opcional)
  name:      { type: String, default: '' },

  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: true, trim: true },

  nickname:  { type: String, required: true, unique: true, trim: true, lowercase: true },
  email:     { type: String, required: true, unique: true, trim: true, lowercase: true },

  password:  { type: String, required: true },
  role:      { type: String, default: 'user' },
  image:     { type: String, default: '' },
  created_at:{ type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);

