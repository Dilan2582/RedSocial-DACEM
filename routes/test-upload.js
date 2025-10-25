const router = require('express').Router();
const { upload } = require('../middlewares/upload');
const { putPublicObject } = require('../services/s3');

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok:false, message:'Sin archivo' });
    const safe = (req.file.originalname || 'file').replace(/\s+/g, '_');
    const Key = `tests/${Date.now()}-${safe}`;
    const url = await putPublicObject({ Key, Body: req.file.buffer, ContentType: req.file.mimetype });
    res.json({ ok:true, url, key: Key });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error: String(e) });
  }
});

module.exports = router;
