// controllers/user.js
const bcrypt = require('bcrypt');
const path   = require('path');
const fs     = require('fs');
const sharp  = require('sharp');
const { Types } = require('mongoose');

const User   = require('../models/user');
const Follow = require('../models/follow');
const { createToken } = require('../services/jwt');

// GridFS (para avatar si usas gridfs)
const { getBucket } = require('../services/gridfs');

// S3 (para banner u otros uploads a nube)
const { putPublicObject } = require('../services/s3');

// ===== Config de almacenamiento de avatares =====
// AVATAR_STORAGE = 'gridfs' | 'disk'
const STORAGE = (process.env.AVATAR_STORAGE || 'gridfs').toLowerCase();

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

/* ===================== AVATAR (disk o gridfs) ===================== */
async function updateAvatar(req, res) {
  try {
    if (!req.file) return res.status(400).json({ ok:false, message:'No se envió imagen' });

    const userId = req.user.id || req.user.sub;
    const user   = await User.findById(userId);
    if (!user) return res.status(404).json({ ok:false, message:'Usuario no encontrado' });

    const webpBuffer = await sharp(req.file.buffer)
      .rotate()
      .resize(256, 256, { fit:'cover' })
      .webp({ quality:85 })
      .toBuffer();

    // Elimina avatar anterior
    try {
      if (user.avatar?.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, '..', user.avatar);
        fs.rmSync(oldPath, { force:true });
      } else if (user.avatar?.startsWith('/api/user/avatar/')) {
        const oldId = user.avatar.split('/').pop();
        await getBucket().delete(new Types.ObjectId(oldId));
      }
    } catch { /* ignore */ }

    if (STORAGE === 'disk') {
      const avatarsDir = path.join(__dirname, '..', 'uploads', 'avatars');
      fs.mkdirSync(avatarsDir, { recursive:true });
      const filename = `${userId}-${Date.now()}.webp`;
      fs.writeFileSync(path.join(avatarsDir, filename), webpBuffer);
      user.avatar = `/uploads/avatars/${filename}`;
    } else {
      const filename = `${userId}-${Date.now()}.webp`;
      const uploadStream = getBucket().openUploadStream(filename, {
        contentType: 'image/webp',
        metadata: { userId }
      });
      await new Promise((resolve, reject) => {
        uploadStream.end(webpBuffer, err => err ? reject(err) : resolve());
      });
      user.avatar = `/api/user/avatar/${uploadStream.id.toString()}`;
    }

    await user.save();
    res.json({ ok:true, avatar: user.avatar });
  } catch (e) {
    console.error('[avatar]', e);
    res.status(500).json({ ok:false, message:'Error subiendo imagen' });
  }
}

async function streamAvatar(req, res) {
  try {
    const fileId = new Types.ObjectId(req.params.id);
    res.set('Content-Type', 'image/webp');
    getBucket().openDownloadStream(fileId)
      .on('error', () => res.sendStatus(404))
      .pipe(res);
  } catch {
    res.sendStatus(404);
  }
}

/* ===================== BANNER (S3) ===================== */
async function updateBanner(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ ok:false, message:'No autorizado' });
    if (!req.file)    return res.status(400).json({ ok:false, message:'Sin archivo' });

    const out = await sharp(req.file.buffer, { limitInputPixels: false })
      .resize({ width: 1500, height: 500, fit: 'cover', position: 'attention' })
      .webp({ quality: 85 })
      .toBuffer();

    const Key = `users/${req.user.id}/banner/${Date.now()}.webp`;
    const url = await putPublicObject({ Key, Body: out, ContentType: 'image/webp' });

    await User.findByIdAndUpdate(req.user.id, { banner: url });
    res.json({ ok:true, banner: url });
  } catch (e) {
    console.error('[banner]', e);
    res.status(500).json({ ok:false, message:'Error subiendo banner' });
  }
}


/* ===================== AUTH & PERFIL ===================== */
async function register(req, res) {
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
}

async function login(req, res) {
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
}

async function me(req, res) {
  try {
    const uid = req.user?.id || req.user?.sub;
    const user = await User.findById(uid).select(publicUserProjection);
    if (!user) return res.status(404).json({ ok:false, message:'Usuario no encontrado' });

    const [followers, following] = await Promise.all([ countFollowers(uid), countFollowing(uid) ]);
    return res.status(200).json({ ok:true, user, counts:{ followers, following } });
  } catch (e) {
    return res.status(500).json({ ok:false, message:'Error', error: e.message });
  }
}

async function update(req, res) {
  try {
    const uid = req.user?.id || req.user?.sub;
    const { firstName, lastName, nickname, email, password } = pickUserFieldsFromBody(req.body);
    const updates = {};
    const bio = typeof req.body.bio === 'string' ? req.body.bio.trim() : '';

    // Campos simples
    if (firstName) updates.firstName = firstName;
    if (lastName)  updates.lastName  = lastName;

    // Nickname con validaciones
    if (nickname) {
      if (!nickValid(nickname)) {
        return res.status(400).json({ ok:false, message:'Apodo inválido (3-20, letras/números/._-)' });
      }
      const taken = await User.findOne({ nickname: nickname.toLowerCase(), _id: { $ne: uid } }).lean();
      if (taken) {
        return res.status(409).json({ ok:false, message:'Ese apodo ya está en uso' });
      }
      updates.nickname = nickname.toLowerCase();
    }

    // Email con validaciones
    if (email) {
      if (!emailValid(email)) {
        return res.status(400).json({ ok:false, message:'Email inválido' });
      }
      const taken = await User.findOne({ email: email.toLowerCase(), _id: { $ne: uid } }).lean();
      if (taken) {
        return res.status(409).json({ ok:false, message:'Ese email ya está en uso' });
      }
      updates.email = email.toLowerCase();
    }

    // Password
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ ok:false, message:'Password mínimo 6 caracteres' });
      }
      updates.password = await bcrypt.hash(password, 10);
    }

    // Bio (opcional)
    if (bio || ('bio' in req.body)) {
      updates.bio = (bio || '').slice(0, 240);
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
}


async function listOthers(req, res) {
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
}

async function publicProfile(req, res) {
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
}

// ---- re-export handler Google (si lo tienes) ----
const { googleLogin } = require('./auth');

module.exports = {
  // auth + perfil
  register,
  login,
  me,
  update,
  listOthers,
  publicProfile,

  // avatar
  updateAvatar,
  streamAvatar,

  // banner (S3)
  updateBanner,

  // google
  googleLogin,
};
