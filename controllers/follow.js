// controllers/follow.js
const { Types } = require('mongoose');
const Follow = require('../models/follow');
const User   = require('../models/user');

// Proyección "segura" de usuarios (ajusta a tus campos)
const USER_PUBLIC = 'firstName lastName nickname avatar banner isVerified';

const safeUser = (u) => ({
  id: String(u._id),
  firstName: u.firstName || '',
  lastName:  u.lastName  || '',
  nickname:  u.nickname  || '',
  avatar:    u.avatar    || null,
  banner:    u.banner    || null,
  isVerified: !!u.isVerified,
});

// POST /api/follow/:id  (seguir)
async function followUser(req, res) {
  try {
    const me = req.user.id || req.user.sub;
    const targetId = req.params.id;

    if (!Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ ok:false, message:'ID inválido' });
    }
    if (targetId === me) {
      return res.status(400).json({ ok:false, message:'No puedes seguirte a ti mismo' });
    }

    const exists = await User.findById(targetId).select('_id').lean();
    if (!exists) return res.status(404).json({ ok:false, message:'Usuario no existe' });

    await Follow.updateOne({ user: me, followed: targetId }, {}, { upsert: true });
    return res.status(201).json({ ok:true, following:true, message:'Ahora sigues a este usuario' });
  } catch (e) {
    return res.status(500).json({ ok:false, message:'Error al seguir', error: e.message });
  }
}

// DELETE /api/follow/:id  (dejar de seguir)
async function unfollowUser(req, res) {
  try {
    const me = req.user.id || req.user.sub;
    const targetId = req.params.id;

    await Follow.deleteOne({ user: me, followed: targetId });
    return res.status(200).json({ ok:true, following:false, message:'Has dejado de seguir' });
  } catch (e) {
    return res.status(500).json({ ok:false, message:'Error al dejar de seguir', error: e.message });
  }
}

// POST /api/follow/toggle/:id  (alternar seguir/dejar de seguir)
async function toggleFollow(req, res) {
  try {
    const me = req.user.id || req.user.sub;
    const targetId = req.params.id;

    if (targetId === me) {
      return res.status(400).json({ ok:false, message:'No puedes seguirte a ti mismo' });
    }

    const found = await Follow.findOne({ user: me, followed: targetId }).lean();
    if (found) {
      await Follow.deleteOne({ _id: found._id });
      return res.json({ ok:true, following:false });
    } else {
      const exists = await User.findById(targetId).select('_id').lean();
      if (!exists) return res.status(404).json({ ok:false, message:'Usuario no existe' });

      await Follow.create({ user: me, followed: targetId });
      return res.json({ ok:true, following:true });
    }
  } catch (e) {
    return res.status(500).json({ ok:false, message:'Error al alternar follow', error:e.message });
  }
}

// GET /api/follow/:id/followers?limit=20&cursor=ISO
// Lista quienes SIGUEN a :id (followers)
async function listFollowers(req, res) {
  try {
    const targetId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
    const cursor = req.query.cursor ? new Date(req.query.cursor) : null;

    const q = { followed: targetId };
    if (cursor && !isNaN(cursor)) q.createdAt = { $lt: cursor };

    const rows = await Follow.find(q)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('user', USER_PUBLIC)
      .lean();

    const users = rows.map(r => safeUser(r.user));
    const nextCursor = rows.length ? rows[rows.length - 1].createdAt.toISOString() : null;

    return res.json({ ok:true, users, nextCursor });
  } catch (e) {
    return res.status(500).json({ ok:false, message:'Error listando followers', error:e.message });
  }
}

// GET /api/follow/:id/following?limit=20&cursor=ISO
// Lista a quiénes SIGUE :id (following)
async function listFollowing(req, res) {
  try {
    const targetId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
    const cursor = req.query.cursor ? new Date(req.query.cursor) : null;

    const q = { user: targetId };
    if (cursor && !isNaN(cursor)) q.createdAt = { $lt: cursor };

    const rows = await Follow.find(q)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('followed', USER_PUBLIC)
      .lean();

    const users = rows.map(r => safeUser(r.followed));
    const nextCursor = rows.length ? rows[rows.length - 1].createdAt.toISOString() : null;

    return res.json({ ok:true, users, nextCursor });
  } catch (e) {
    return res.status(500).json({ ok:false, message:'Error listando following', error:e.message });
  }
}

module.exports = {
  followUser,
  unfollowUser,
  toggleFollow,
  listFollowers,
  listFollowing,
};
