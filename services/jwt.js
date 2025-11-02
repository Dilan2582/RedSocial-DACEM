// services/jwt.js
const jwt = require('jsonwebtoken');

const JWT_SECRET  = process.env.JWT_SECRET || 'dev-secret';
const EXPIRES_IN  = '30d'; // duración del token

function createToken(user) {
  const uid = String(user._id || user.id);

  // Guardamos un "id" canónico y, opcionalmente, datos útiles no sensibles
  const payload = {
    id: uid,                       // <-- clave canónica que leerá el middleware
    email: user.email,
    nickname: user.nickname,
    role: user.role || 'user',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: EXPIRES_IN,
    subject: uid,                  // opcional, redundante con "id"
  });
}

module.exports = { createToken };
