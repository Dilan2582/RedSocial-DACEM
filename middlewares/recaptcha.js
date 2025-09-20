// middlewares/recaptcha.js
require('dotenv').config();

const fetchFn = global.fetch || ((...a) => import('node-fetch').then(({default:f}) => f(...a)));
const trim = v => (v ?? '').toString().trim();

async function verifyRecaptcha(req, res, next) {
  try {
    const token  = trim(req.body['g-recaptcha-response'] || req.body.recaptchaToken);
    const secret = trim(process.env.RECAPTCHA_SECRET_KEY);

    if (!token)  return res.status(400).json({ ok:false, message:'Captcha requerido' });
    if (!secret) return res.status(500).json({ ok:false, message:'Config captcha incompleta en servidor' });

    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);
    // params.append('remoteip', req.ip); // opcional

    const r = await fetchFn('https://www.google.com/recaptcha/api/siteverify', {
      method:'POST',
      headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
      body: params
    });
    const data = await r.json();

    console.log('[reCAPTCHA] success:', data.success, 'codes:', data['error-codes'], 'hostname:', data.hostname);

    if (!data.success) {
      return res.status(400).json({ ok:false, message:'Captcha inválido', details: data['error-codes'] || [] });
    }

    next();
  } catch (e) {
    console.error('[reCAPTCHA] exception:', e);
    res.status(500).json({ ok:false, message:'Error verificando captcha' });
  }
}

module.exports = { verifyRecaptcha };
