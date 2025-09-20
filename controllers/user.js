// controllers/user.js
const bcrypt = require('bcrypt');
const User = require('../models/user');
const Follow = require('../models/follow');
const { createToken } = require('../services/jwt');

// ---- helpers ----
const normStr = (v, def = '') => (typeof v === 'string' ? v : (v ?? '')).toString().trim();
const emailValid = (e) => /.+@.+\..+/.test(e);
const nickValid  = (n) => /^[a-z0-9._-]{3,20}$/i.test(n);
const publicUserProjection = '-password -__v';

async function countFollowers(userId) {
  try { return await Follow.countDocuments({ followed: userId }); } catch { return 0; }
}
async function countFollowing(userId) {
  try { return await Follow.countDocuments({ user: userId }); } catch { return 0; }
}
async function amIFollowing(meId, otherId) {
  try { return !!(await Follow.exists({ user: meId, followed: otherId })); } catch { return false; }
}

function pickUserFieldsFromBody(body = {}) {
  let firstName = normStr(body.firstName) || normStr(body.name);
  let lastName  = normStr(body.lastName)  || normStr(body.surname) || normStr(body.last_name) || 'N/A';
  let nickname  = normStr(body.nickname)  || normStr(body.nick) || normStr(body.username);
  let email     = normStr(body.email)     || normStr(body.mail);
  let password  = typeof body.password === 'string' ? body.password : normStr(body.pass);

  email = email.toLowerCase();
  nickname = nickname.toLowerCase();
  return { firstName, lastName, nickname, email, password };
}

// ---- controllers ----

// POST /api/user/register
const register = async (req, res) => {
  try {
    const { firstName, lastName, nickname, email, password } = pickUserFieldsFromBody(req.body);

    if (!firstName || !lastName || !nickname || !email || !password) {
      return res.status(400).json({ ok:false, message:'Todos los campos son obligatorios' });
    }
    if (!nickValid(nickname)) {
      return res.status(400).json({ ok:false, message:'Apodo inválido (3-20, letras/números/._-)' });
    }
    if (!emailValid(email)) {
      return res.status(400).json({ ok:false, message:'Email inválido' });
    }
    if (password.length < 6) {
      return res.status(400).json({ ok:false, message:'Password mínimo 6 caracteres' });
    }

    const exists = await User.findOne({ $or: [{ email }, { nickname }] }).lean();
    if (exists) {
      return res.status(409).json({ ok:false, message:'Email o apodo ya están en uso' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName, lastName, nickname, email, password: hash, role:'user'
    });

    const token = createToken(user);
    const safe = user.toObject(); delete safe.password;
    return res.status(201).json({ ok:true, user: safe, token });
  } catch (e) {
    return res.status(500).json({ ok:false, message:'Error al registrar', error: e.message });
  }
};

// POST /api/user/login  (identifier = email o nickname)
const login = async (req, res) => {
  try {
    let identifier = normStr(req.body?.identifier);
    const password = normStr(req.body?.password);
    if (!identifier) identifier = normStr(req.body?.email) || normStr(req.body?.nickname);

    if (!identifier || !password) {
      return res.status(400).json({ ok:false, message:'Faltan credenciales' });
    }

    const isEmail = emailValid(identifier);
    const query = isEmail ? { email: identifier.toLowerCase() } : { nickname: identifier.toLowerCase() };

    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ ok:false, message:'Usuario no encontrado' });

    const okPass = await bcrypt.compare(password, user.password || '');
    if (!okPass) return res.status(401).json({ ok:false, message:'Credenciales inválidas' });

    const token = createToken(user);
    const safe = user.toObject(); delete safe.password;
    return res.status(200).json({ ok:true, token, user: safe });
  } catch (e) {
    return res.status(500).json({ ok:false, message:'Error al autenticar', error: e.message });
  }
};

// GET /api/user/me
const me = async (req, res) => {
  try {
    const uid = req.user?.sub;
    const user = await User.findById(uid).select(publicUserProjection);
    if (!user) return res.status(404).json({ ok:false, message:'Usuario no encontrado' });

    const [followers, following] = await Promise.all([ countFollowers(uid), countFollowing(uid) ]);
    return res.status(200).json({ ok:true, user, counts:{ followers, following } });
  } catch (e) {
    return res.status(500).json({ ok:false, message:'Error', error: e.message });
  }
};

// PUT /api/user/update
const update = async (req, res) => {
  try {
    const uid = req.user?.sub;
    const { firstName, lastName, nickname, email, password } = pickUserFieldsFromBody(req.body);
    const updates = {};

    if (firstName) updates.firstName = firstName;
    if (lastName)  updates.lastName  = lastName;

    if (nickname) {
      if (!nickValid(nickname)) return res.status(400).json({ ok:false, message:'Apodo inválido (3-20, letras/números/._-)' });
      const taken = await User.findOne({ nickname, _id: { $ne: uid } }).lean();
      if (taken) return res.status(409).json({ ok:false, message:'Ese apodo ya está en uso' });
      updates.nickname = nickname.toLowerCase();
    }

    if (email) {
      if (!emailValid(email)) return res.status(400).json({ ok:false, message:'Email inválido' });
      const taken = await User.findOne({ email: email.toLowerCase(), _id: { $ne: uid } }).lean();
      if (taken) return res.status(409).json({ ok:false, message:'Ese email ya está en uso' });
      updates.email = email.toLowerCase();
    }

    if (password) {
      if (password.length < 6) return res.status(400).json({ ok:false, message:'Password mínimo 6 caracteres' });
      updates.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ ok:false, message:'No hay cambios válidos' });
    }

    await User.findByIdAndUpdate(uid, updates);
    const user = await User.findById(uid).select(publicUserProjection);
    return res.status(200).json({ ok:true, message:'Perfil actualizado', user });
  } catch (e) {
    return res.status(500).json({ ok:false, message:'Error al actualizar perfil', error: e.message });
  }
};

// GET /api/user/others
const listOthers = async (req, res) => {
  try {
    const uid = req.user?.sub;
    const users = await User.find({ _id: { $ne: uid } })
      .select(publicUserProjection).limit(100).lean();

    const followingDocs = await Follow.find({ user: uid }).select('followed').lean();
    const followingSet = new Set(followingDocs.map(f => String(f.followed)));

    const enriched = users.map(u => ({ ...u, isFollowing: followingSet.has(String(u._id)) }));
    return res.status(200).json({ ok:true, users: enriched });
  } catch (e) {
    return res.status(500).json({ ok:false, message:'Error al listar usuarios', error: e.message });
  }
};

// GET /api/user/:id/public
const publicProfile = async (req, res) => {
  try {
    const uid = req.user?.sub;
    const otherId = req.params.id;

    const user = await User.findById(otherId).select(publicUserProjection).lean();
    if (!user) return res.status(404).json({ ok:false, message:'Usuario no encontrado' });

    const [followers, following, iFollow] = await Promise.all([
      countFollowers(otherId),
      countFollowing(otherId),
      amIFollowing(uid, otherId),
    ]);

    return res.status(200).json({
      ok:true, user, counts:{ followers, following }, isFollowing: iFollow
    });
  } catch (e) {
    return res.status(500).json({ ok:false, message:'Error al obtener perfil', error: e.message });
  }
};

// ---- re-export del handler de Google para alias /api/user/google-login ----
const { googleLogin } = require('./auth');

module.exports = {
  register,
  login,
  me,
  update,
  listOthers,
  publicProfile,
  // Alias (apunta al mismo handler que /api/auth/google)
  googleLogin,
};
