// middlewares/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    return res.status(401).json({ ok: false, message: 'Falta token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Aceptamos distintas variantes por compatibilidad, pero priorizamos "id"
    const id = String(decoded.id || decoded.sub || decoded._id || decoded.uid || '');
    if (!id) {
      return res.status(401).json({ ok: false, message: 'Token inválido (sin id)' });
    }

    // Solo ponemos lo mínimo confiable en req.user
    req.user = { id };
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, message: 'Token inválido' });
  }
}

module.exports = { auth, ensureAuth: auth };
