// middlewares/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

function auth(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7).trim() : h.trim();
    if (!token) return res.status(401).json({ ok:false, message:'Falta token' });

    const payload = jwt.verify(token, JWT_SECRET);
    const id = payload.id || payload._id || payload.uid || payload.sub;
    if (!id) return res.status(401).json({ ok:false, message:'Token sin id' });

    req.user = { ...payload, id, sub: id };
    next();
  } catch {
    res.status(401).json({ ok:false, message:'Token inválido' });
  }
}

const ensureAuth = auth;
module.exports = { auth, ensureAuth };
