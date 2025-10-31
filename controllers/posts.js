// controllers/posts.js
const { Types } = require('mongoose');
const Post = require('../models/post');
const Like = require('../models/like');
const Comment = require('../models/comment');
const { env } = require('../config/env');
const { buildPostKey, uploadBuffer, publicUrl } = require('../services/s3');
const { readMeta, makeThumb, varT1, varT2, varT3 } = require('../services/image');

function ensureAuthUser(req) {
  if (!req.user || !req.user.id) throw new Error('NO_AUTH');
  return req.user.id;
}

async function createPost(req, res) {
  try {
    const userId = ensureAuthUser(req);

    if (!req.file) return res.status(400).json({ ok: false, message: 'Falta imagen' });
    if (!env.upload.allowed.includes(req.file.mimetype))
      return res.status(400).json({ ok: false, message: 'MIME no permitido' });

    const buffer = req.file.buffer;
    const meta = await readMeta(buffer);

    // 1) Genera un _id de post SIN guardar aún
    const postId = new Types.ObjectId();

    // 2) Arma las claves S3 usando ese postId
    const ext = (meta.mime.split('/')[1] || 'jpg').toLowerCase();
    const keyOriginal = buildPostKey(userId, postId, `original.${ext}`);
    const keyThumb    = buildPostKey(userId, postId, 'thumb.jpg');
    const keyT1       = buildPostKey(userId, postId, 't1.jpg');
    const keyT2       = buildPostKey(userId, postId, 't2.jpg');
    const keyT3       = buildPostKey(userId, postId, 't3.jpg');

    // 3) Genera las variantes en memoria
    const [thumbBuf, t1Buf, t2Buf, t3Buf] = await Promise.all([
      makeThumb(buffer), varT1(buffer), varT2(buffer), varT3(buffer)
    ]);

    // 4) Sube todo a S3
    await Promise.all([
      uploadBuffer({ Key: keyOriginal, Body: buffer,   ContentType: meta.mime }),
      uploadBuffer({ Key: keyThumb,    Body: thumbBuf, ContentType: 'image/jpeg' }),
      uploadBuffer({ Key: keyT1,       Body: t1Buf,    ContentType: 'image/jpeg' }),
      uploadBuffer({ Key: keyT2,       Body: t2Buf,    ContentType: 'image/jpeg' }),
      uploadBuffer({ Key: keyT3,       Body: t3Buf,    ContentType: 'image/jpeg' }),
    ]);

    // 5) Ahora sí, crea el documento completo (cumple los required)
    const post = await Post.create({
      _id: postId,
      userId: new Types.ObjectId(userId),
      caption: (req.body.caption || '').trim(),
      media: {
        keyOriginal,
        keyThumb,
        variants: { t1: keyT1, t2: keyT2, t3: keyT3 },
        width: meta.width,
        height: meta.height,
        mime: meta.mime,
        size: buffer.length
      },
      status: 'ready'
    });

    // 6) Respuesta
    res.json({
      ok: true,
      post: {
        id: String(post._id),
        userId: String(post.userId),
        caption: post.caption || '',
        createdAt: post.createdAt,
        counts: post.counts || { likes: 0, comments: 0 },
        status: post.status,
        media: {
          original: publicUrl(keyOriginal),
          thumb:    publicUrl(keyThumb),
          t1:       publicUrl(keyT1),
          t2:       publicUrl(keyT2),
          t3:       publicUrl(keyT3),
          width: post.media.width,
          height: post.media.height,
          mime: post.media.mime
        }
      }
    });
  } catch (err) {
    if (err.message === 'NO_AUTH') return res.status(401).json({ ok:false, message:'No autenticado' });
    console.error('[createPost] error', err);
    res.status(500).json({ ok:false, message:'Error al crear publicación' });
  }
}

// ====== Feed paginado (cursor por fecha) ======
async function getFeed(req, res) {
  const limit = Math.min(Number(req.query.limit || 10), 50);
  const cursor = req.query.cursor ? new Date(req.query.cursor) : null;

  const q = cursor ? { createdAt: { $lt: cursor } } : {};
  const rows = await Post.find(q).sort({ createdAt: -1 }).limit(limit).lean();

  const posts = rows.map(serializePost);
  const nextCursor = rows.length ? rows[rows.length - 1].createdAt.toISOString() : null;
  res.json({ ok: true, posts, nextCursor });
}

// ====== Detalle ======
async function getPostById(req, res) {
  const post = await Post.findById(req.params.id).lean();
  if (!post) return res.status(404).json({ ok: false, message: 'No encontrado' });
  res.json({ ok: true, post: serializePost(post, { includeVariants: true }) });
}

// ====== Likes (toggle) ======
async function toggleLike(req, res) {
  try {
    const userId = ensureAuthUser(req);
    const postId = req.params.id;

    const exists = await Like.findOne({ postId, userId });
    if (exists) {
      await Like.deleteOne({ _id: exists._id });
      await Post.updateOne({ _id: postId }, { $inc: { 'counts.likes': -1 } });
      return res.json({ ok: true, liked: false });
    }
    await Like.create({ postId, userId });
    await Post.updateOne({ _id: postId }, { $inc: { 'counts.likes': 1 } });
    return res.json({ ok: true, liked: true });
  } catch (e) {
    return res.status(500).json({ ok:false, message:'Error like/unlike' });
  }
}

// ====== Comments ======
async function listComments(req, res) {
  const limit = Math.min(Number(req.query.limit || 20), 100);
  const rows = await Comment.find({ postId: req.params.id })
    .sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ ok: true, comments: rows });
}

async function addComment(req, res) {
  try {
    const userId = ensureAuthUser(req);
    const text = (req.body.text || '').trim();
    if (!text) return res.status(400).json({ ok:false, message:'Comentario vacío' });

    const c = await Comment.create({ postId: req.params.id, userId, text });
    await Post.updateOne({ _id: req.params.id }, { $inc: { 'counts.comments': 1 } });
    res.json({ ok: true, comment: c });
  } catch (e) {
    res.status(500).json({ ok:false, message:'Error comentando' });
  }
}

// ====== Helpers ======
function serializePost(post, opts = {}) {
  const base = (k) => publicUrl(k);
  return {
    id: String(post._id),
    userId: String(post.userId),
    caption: post.caption || '',
    createdAt: post.createdAt,
    counts: post.counts || { likes: 0, comments: 0 },
    status: post.status || 'ready',
    media: {
      original: base(post.media.keyOriginal),
      thumb:    base(post.media.keyThumb),
      ...(opts.includeVariants ? {
        t1: base(post.media.variants.t1),
        t2: base(post.media.variants.t2),
        t3: base(post.media.variants.t3),
      } : {}),
      width: post.media.width, height: post.media.height, mime: post.media.mime
    }
  };
}

module.exports = {
  createPost, getFeed, getPostById,
  toggleLike, listComments, addComment
};
