// middlewares/auth.js
const jwt = require('jwt-simple');
const moment = require('moment');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
  try {
    // 1) Header
    const auth = req.headers.authorization || '';
    if (!auth) return res.status(401).json({ ok: false, message: 'Falta token' });

    // Soportar "Bearer <token>" o solo "<token>"
    const parts = auth.split(' ');
    const token = parts.length === 2 ? parts[1] : parts[0];

    // 2) Decodificar
    const payload = jwt.decode(token, JWT_SECRET);

    // 3) Expiración (opcional si pones exp en el token)
    if (payload.exp && payload.exp <= moment().unix()) {
      return res.status(401).json({ ok: false, message: 'Token expirado' });
    }

    // 4) Adjuntar usuario al request
    req.user = {
      sub: payload.sub,
      role: payload.role || 'user',
    };

    return next();
  } catch (e) {
    return res.status(401).json({ ok: false, message: 'Token inválido' });
  }
};
