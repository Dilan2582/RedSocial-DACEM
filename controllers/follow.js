const Follow = require('../models/follow.js');
const User = require('../models/user.js');

// POST /api/follow/:id  (seguir)
const followUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    const me = req.user.sub;
    if (targetId === me) return res.status(400).json({ ok:false, message:'No puedes seguirte a ti mismo' });

    const exists = await User.findById(targetId).select('_id');
    if (!exists) return res.status(404).json({ ok:false, message:'Usuario no existe' });

    await Follow.updateOne({ user: me, followed: targetId }, {}, { upsert: true });
    return res.status(201).json({ ok:true, message:'Ahora sigues a este usuario' });
  } catch (e) {
    return res.status(500).json({ ok:false, message:'Error al seguir', error:e.message });
  }
};

// DELETE /api/follow/:id  (dejar de seguir)
const unfollowUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    const me = req.user.sub;
    await Follow.deleteOne({ user: me, followed: targetId });
    return res.status(200).json({ ok:true, message:'Has dejado de seguir' });
  } catch (e) {
    return res.status(500).json({ ok:false, message:'Error al dejar de seguir', error:e.message });
  }
};

module.exports = { followUser, unfollowUser };
