// controllers/follow.js
const { Types } = require('mongoose');
const Follow = require('../models/follow');
const User   = require('../models/user');
const Notification = require('../models/notification');

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

// POST /api/follow/:id  (enviar solicitud de seguimiento)
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

    // Crear o actualizar solicitud con estado 'pending'
    const followRequest = await Follow.findOneAndUpdate(
      { user: me, followed: targetId },
      { status: 'pending' },
      { upsert: true, new: true }
    );

    // Crear notificación de solicitud de seguimiento
    await Notification.create({
      recipient: targetId, // Usuario que recibe la notificación
      sender: me,
      type: 'follow_request',
      post: null,
      read: false
    });

    return res.status(201).json({ 
      ok:true, 
      following: false, 
      pending: true,
      message:'Solicitud de seguimiento enviada' 
    });
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
      
      // Eliminar notificaciones relacionadas
      try {
        await Notification.deleteMany({
          $or: [
            { recipient: targetId, sender: me, type: 'follow_request' },
            { recipient: me, sender: targetId, type: 'follow_accepted' }
          ]
        });
      } catch (err) {
        console.error('Error eliminando notificaciones de follow:', err);
      }
      
      return res.json({ ok:true, following:false, pending:false });
    } else {
      const exists = await User.findById(targetId).select('_id').lean();
      if (!exists) return res.status(404).json({ ok:false, message:'Usuario no existe' });

      // Crear solicitud pendiente
      await Follow.create({ user: me, followed: targetId, status: 'pending' });
      
      // Crear notificación de solicitud de seguimiento
      try {
        await Notification.create({
          recipient: targetId,
          sender: me,
          type: 'follow_request',
          post: null,
          read: false
        });
      } catch (err) {
        console.error('Error creando notificación de follow:', err);
      }
      
      return res.json({ ok:true, following:false, pending:true });
    }
  } catch (e) {
    return res.status(500).json({ ok:false, message:'Error al alternar follow', error:e.message });
  }
}

// GET /api/follow/:id/followers?limit=20&cursor=ISO
// Lista quienes SIGUEN a :id (followers) - solo aceptados
async function listFollowers(req, res) {
  try {
    const targetId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
    const cursor = req.query.cursor ? new Date(req.query.cursor) : null;

    const q = { followed: targetId, status: 'accepted' };
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
// Lista a quiénes SIGUE :id (following) - solo aceptados
async function listFollowing(req, res) {
  try {
    const targetId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
    const cursor = req.query.cursor ? new Date(req.query.cursor) : null;

    const q = { user: targetId, status: 'accepted' };
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

// POST /api/follow/:id/accept (aceptar solicitud de seguimiento)
async function acceptFollowRequest(req, res) {
  try {
    const me = req.user.id || req.user.sub;
    const requesterId = req.params.id; // ID del usuario que envió la solicitud

    // Buscar la solicitud pendiente
    const followRequest = await Follow.findOne({
      user: requesterId,
      followed: me,
      status: 'pending'
    });

    if (!followRequest) {
      return res.status(404).json({ ok: false, message: 'No se encontró solicitud pendiente' });
    }

    // Actualizar estado a 'accepted'
    followRequest.status = 'accepted';
    await followRequest.save();

    // Eliminar notificación de solicitud y crear notificación de aceptación
    await Notification.deleteOne({
      recipient: me,
      sender: requesterId,
      type: 'follow_request'
    });

    await Notification.create({
      recipient: requesterId,
      sender: me,
      type: 'follow_accepted',
      post: null,
      read: false
    });

    return res.json({ ok: true, message: 'Solicitud aceptada' });
  } catch (e) {
    return res.status(500).json({ ok: false, message: 'Error al aceptar solicitud', error: e.message });
  }
}

// POST /api/follow/:id/reject (rechazar solicitud de seguimiento)
async function rejectFollowRequest(req, res) {
  try {
    const me = req.user.id || req.user.sub;
    const requesterId = req.params.id;

    // Buscar la solicitud pendiente
    const followRequest = await Follow.findOne({
      user: requesterId,
      followed: me,
      status: 'pending'
    });

    if (!followRequest) {
      return res.status(404).json({ ok: false, message: 'No se encontró solicitud pendiente' });
    }

    // Eliminar la solicitud
    await Follow.deleteOne({ _id: followRequest._id });

    // Eliminar notificación de solicitud
    await Notification.deleteOne({
      recipient: me,
      sender: requesterId,
      type: 'follow_request'
    });

    return res.json({ ok: true, message: 'Solicitud rechazada' });
  } catch (e) {
    return res.status(500).json({ ok: false, message: 'Error al rechazar solicitud', error: e.message });
  }
}

// GET /api/follow/requests (obtener solicitudes pendientes)
async function getFollowRequests(req, res) {
  try {
    const me = req.user.id || req.user.sub;

    const requests = await Follow.find({
      followed: me,
      status: 'pending'
    })
      .populate('user', USER_PUBLIC)
      .sort({ createdAt: -1 })
      .lean();

    const users = requests.map(r => ({
      ...safeUser(r.user),
      requestDate: r.createdAt
    }));

    return res.json({ ok: true, requests: users });
  } catch (e) {
    return res.status(500).json({ ok: false, message: 'Error al obtener solicitudes', error: e.message });
  }
}

module.exports = {
  followUser,
  unfollowUser,
  toggleFollow,
  listFollowers,
  listFollowing,
  acceptFollowRequest,
  rejectFollowRequest,
  getFollowRequests,
};
