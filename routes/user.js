// routes/user.js
const router = require('express').Router();

const C = require('../controllers/user');
const { googleLogin } = require('../controllers/auth'); // si lo usas

// ---- Auth middleware (compatibilidad con ambos estilos de export) ----
const authMod = require('../middlewares/auth');
const ensureAuth =
  typeof authMod === 'function'
    ? authMod
    : (authMod.ensureAuth || authMod.auth);

// ---- Upload y reCAPTCHA (tus middlewares existentes) ----
const { upload } = require('../middlewares/upload');
const { verifyRecaptcha } = require('../middlewares/recaptcha');

// =================== Rutas públicas ===================
// Con reCAPTCHA según tu implementación actual
router.post('/register', verifyRecaptcha, C.register);
router.post('/login',    verifyRecaptcha, C.login);

// (Opcional) login con Google, si lo quieres habilitar
// router.post('/login/google', verifyRecaptcha, googleLogin);

// Avatar (stream desde GridFS) — importante que esté ANTES de '/:id/public'
router.get('/avatar/:id', C.streamAvatar);

// =================== Rutas protegidas ===================
router.get('/me',         ensureAuth, C.me);
router.put('/update',     ensureAuth, C.update);
router.get('/others',     ensureAuth, C.listOthers);
router.get('/:id/public', ensureAuth, C.publicProfile);

// Subidas (avatar/banner) usando tu middleware `upload`
router.post('/me/avatar', ensureAuth, upload.single('avatar'), C.updateAvatar);
router.put('/me/banner',  ensureAuth, upload.single('banner'),  C.updateBanner);

module.exports = router;
