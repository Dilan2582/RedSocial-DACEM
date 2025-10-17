// middlewares/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

function auth(req, res, next) {
  try {
    // Soporta "Bearer <token>" o solo "<token>"
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : h.trim();

    if (!token) {
      return res.status(401).json({ ok: false, message: 'Falta token' });
    }

    // Verifica y decodifica
    const payload = jwt.verify(token, JWT_SECRET);

    // Toma el id que traiga tu payload
    const id = payload.id || payload._id || payload.uid || payload.sub;
    if (!id) {
      return res.status(401).json({ ok: false, message: 'Token sin id' });
    }

    // Lo dejamos disponible para controladores
    req.user = { id, ...payload };
    return next();
  } catch (e) {
    return res.status(401).json({ ok: false, message: 'Token inválido' });
  }
}

module.exports = auth;
