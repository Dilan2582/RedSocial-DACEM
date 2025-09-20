// controllers/auth.js
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/user');           // Asegúrate de que la ruta/casing coincide con tu proyecto
const { createToken } = require('../services/jwt');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * POST /api/auth/google
 * body: { id_token }
 */
const googleLogin = async (req, res) => {
  try {
    const { id_token } = req.body || {};
    if (!id_token) {
      return res.status(400).json({ ok: false, message: 'Falta id_token' });
    }

    // 1) Verificar token de Google
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    // Datos útiles
    const {
      sub,                // id único de Google
      email,
      email_verified,
      name,
      given_name,
      family_name,
      picture
    } = payload;

    if (!email_verified) {
      return res.status(401).json({ ok: false, message: 'Email no verificado por Google' });
    }

    // 2) Buscar usuario por providerId o email
    let user =
      (await User.findOne({ provider: 'google', providerId: sub })) ||
      (await User.findOne({ email: (email || '').toLowerCase() }));

    // 3) Crear si no existe
    if (!user) {
      const firstName = given_name || name?.split(' ')?.[0] || 'Usuario';
      const lastName = family_name || name?.split(' ')?.slice(1).join(' ') || '';
      const nicknameBase = (email || '').split('@')[0] || `user${Date.now()}`;
      let nickname = nicknameBase.toLowerCase();

      // garantizar apodo único
      const existsNick = await User.exists({ nickname });
      if (existsNick) nickname = `${nickname}-${Date.now().toString().slice(-4)}`;

      user = await User.create({
        firstName,
        lastName,
        nickname,
        email: (email || '').toLowerCase(),
        image: picture || '',
        provider: 'google',
        providerId: sub,
        // placeholder: no se usa para login con Google
        password: ':)'
      });
    } else {
      // Si existe pero no tiene providerId y el email coincide, enlazar
      if (user.provider !== 'google') {
        user.provider = 'google';
        user.providerId = sub;
        if (!user.image && picture) user.image = picture;
        await user.save();
      }
    }

    // 4) Emitir token propio
    const token = createToken(user);
    const safe = user.toObject();
    delete safe.password;

    return res.status(200).json({ ok: true, user: safe, token });
  } catch (e) {
    return res.status(500).json({ ok: false, message: 'Error en login con Google', error: e.message });
  }
};

module.exports = { googleLogin };
