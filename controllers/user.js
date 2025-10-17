// controllers/user.js
const bcrypt = require('bcrypt');
const path   = require('path');
const fs     = require('fs');
const sharp  = require('sharp');

const User   = require('../models/user');
const Follow = require('../models/follow');
const { createToken } = require('../services/jwt');

// ==== Cloudinary opcional ====
let useCloud = false;
let cloudinary = null;
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  useCloud = true;
}

// ---- helpers ----
const normStr   = (v, def='') => (typeof v === 'string' ? v : (v ?? def)).toString().trim();
const emailValid= (e) => /.+@.+\..+/.test(e);
const nickValid = (n) => /^[a-z0-9._-]{3,20}$/i.test(n);
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
  let lastName  = normStr(body.lastName)  || normStr(body.surname) || normStr(body.last_name) || '';
  let nickname  = normStr(body.nickname)  || normStr(body.nick) || normStr(body.username);
  let email     = normStr(body.email)     || normStr(body.mail);
  let password  = typeof body.password === 'string' ? body.password : normStr(body.pass);

  email = email.toLowerCase();
  nickname = nickname.toLowerCase();
  return { firstName, lastName, nickname, email, password };
}

// ==== subir avatar ====
exports.updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok:false, message:'No se envió imagen' });
    }

    const userId = req.user?.id || req.user?.sub;
    if (!userId) return res.status(401).json({ ok:false, message:'No autorizado' });

    // Redimensiona/convierte
    const processed = await sharp(req.file.buffer)
      .rotate()
      .resize(256, 256, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();

    let newUrl = null;

    if (useCloud) {
      // Subida a Cloudinary
      newUrl = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'dacem/avatars', public_id: `${userId}-${Date.now()}`, resource_type: 'image' },
          (err, result) => err ? reject(err) : resolve(result.secure_url)
        );
        stream.end(processed);
      });
    } else {
      // Guardar a disco local
      const avatarsDir = path.join(__dirname, '..', 'uploads', 'avatars');
      fs.mkdirSync(avatarsDir, { recursive: true });
      const filename = `${userId}-${Date.now()}.webp`;
      const outPath = path.join(avatarsDir, filename);
      await fs.promises.writeFile(outPath, processed);
      newUrl = `/uploads/avatars/${filename}`;
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok:false, message:'Usuario no encontrado' });

    // Si tenías archivos viejos locales y quieres limpiar:
    if (!useCloud && user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
      const oldPath = path.join(__dirname, '..', user.avatar);
      fs.rm(oldPath, { force: true }, () => {});
    }

    user.avatar = newUrl;
    await user.save();

    res.json({ ok:true, avatar: user.avatar });
  } catch (e) {
    console.error('[avatar] ', e);
    res.status(500).json({ ok:false, message:'Error subiendo imagen' });
  }
};

// ==== register ====
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

// ==== login ====
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

// ==== me ====
const me = async (req, res) => {
  try {
    const uid = req.user?.id || req.user?.sub;
    const user = await User.findById(uid).select(publicUserProjection);
    if (!user) return res.status(404).json({ ok:false, message:'Usuario no encontrado' });

    const [followers, following] = await Promise.all([ countFollowers(uid), countFollowing(uid) ]);
    return res.status(200).json({ ok:true, user, counts:{ followers, following } });
  } catch (e) {
    return res.status(500).json({ ok:false, message:'Error', error: e.message });
  }
};

// ==== update ====
const update = async (req, res) => {
  try {
    const uid = req.user?.id || req.user?.sub;
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

// ==== others ====
const listOthers = async (req, res) => {
  try {
    const uid = req.user?.id || req.user?.sub;
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

// ==== public profile ====
const publicProfile = async (req, res) => {
  try {
    const uid = req.user?.id || req.user?.sub;
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

// ---- re-export handler Google (si lo tienes) ----
const { googleLogin } = require('./auth');

module.exports = {
  register,
  login,
  me,
  update,
  listOthers,
  publicProfile,
  updateAvatar: exports.updateAvatar,
  googleLogin,
};
