// controllers/posts.js
const { Types } = require('mongoose');
const Post = require('../models/post');
const Like = require('../models/like');
const Comment = require('../models/comment');
const { env } = require('../config/env');
const { buildPostKey, uploadBuffer, publicUrl } = require('../services/s3');
const { readMeta, makeThumb, varT1, varT2, varT3 } = require('../services/image');
const { analyzeS3Image } = require('../services/vision');


function ensureAuthUser(req) {
  if (!req.user || !req.user.id) throw new Error('NO_AUTH');
  return req.user.id;
}

/* ----------------------------- CREATE POST ----------------------------- */
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

/* ----------------------------- HELPERS LIST ---------------------------- */
async function collectViewerLikes(userId, postRows) {
  if (!userId || !postRows?.length) return new Set();
  const ids = postRows.map(p => p._id);
  const liked = await Like.find({ userId, postId: { $in: ids } }).select('postId').lean();
  return new Set(liked.map(l => String(l.postId)));
}

/* ------------------------------- FEED/LIST ----------------------------- */
// GET /api/posts?limit=10&cursor=ISO_DATE&userId=<id>
async function getFeed(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit || 10), 50);

    // cursor seguro
    let cursor = null;
    if (req.query.cursor) {
      const d = new Date(req.query.cursor);
      if (!isNaN(d)) cursor = d;
    }

    // userId seguro
    let userId = null;
    if (req.query.userId) {
      if (!Types.ObjectId.isValid(req.query.userId)) {
        return res.status(400).json({ ok:false, message:'userId inválido' });
      }
      userId = new Types.ObjectId(req.query.userId);
    }

    const q = {};
    if (cursor) q.createdAt = { $lt: cursor };
    if (userId) q.userId = userId;

    const rows = await Post.find(q).sort({ createdAt: -1 }).limit(limit).lean();

    // Marca viewerLiked si hay usuario autenticado
    const viewerId = req.user?.id ? String(req.user.id) : null;
    const likedSet = await collectViewerLikes(viewerId, rows);

    const posts = rows.map(p => {
      const sp = serializePost(p);
      sp.viewerLiked = likedSet.has(String(p._id));
      return sp;
    });

    const nextCursor = rows.length ? rows[rows.length - 1].createdAt.toISOString() : null;
    res.json({ ok: true, posts, nextCursor });
  } catch (e) {
    console.error('[getFeed] error', e);
    res.status(500).json({ ok:false, message:'Error listando posts' });
  }
}

/* -------------------------------- DETAIL ------------------------------- */
async function getPostById(req, res) {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok:false, message:'ID inválido' });
    }

    const post = await Post.findById(id).lean();
    if (!post) return res.status(404).json({ ok: false, message: 'No encontrado' });

    const includeVariants = req.query.variants === '1';
    const data = serializePost(post, { includeVariants });

    // viewerLiked si hay auth
    if (req.user?.id) {
      const liked = await Like.findOne({ userId: req.user.id, postId: id }).lean();
      data.viewerLiked = !!liked;
    } else {
      data.viewerLiked = false;
    }

    res.json({ ok: true, post: data });
  } catch (e) {
    console.error('[getPostById] error', e);
    res.status(500).json({ ok:false, message:'Error obteniendo post' });
  }
}

/* -------------------------------- LIKES -------------------------------- */
async function toggleLike(req, res) {
  try {
    const userId = ensureAuthUser(req);
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok:false, message:'ID inválido' });
    }
    const postId = id;

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
    console.error('[toggleLike] error', e);
    return res.status(500).json({ ok:false, message:'Error like/unlike' });
  }
}

/* ------------------------------ COMMENTS ------------------------------- */
async function listComments(req, res) {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok:false, message:'ID inválido' });
    }

    const limit = Math.min(Number(req.query.limit || 20), 100);
    const rows = await Comment.find({ postId: id })
      .sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ ok: true, comments: rows });
  } catch (e) {
    console.error('[listComments] error', e);
    res.status(500).json({ ok:false, message:'Error listando comentarios' });
  }
}

async function addComment(req, res) {
  try {
    const userId = ensureAuthUser(req);
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok:false, message:'ID inválido' });
    }

    const text = (req.body.text || '').trim();
    if (!text) return res.status(400).json({ ok:false, message:'Comentario vacío' });

    const c = await Comment.create({ postId: id, userId, text });
    await Post.updateOne({ _id: id }, { $inc: { 'counts.comments': 1 } });
    res.json({ ok: true, comment: c });
  } catch (e) {
    console.error('[addComment] error', e);
    res.status(500).json({ ok:false, message:'Error comentando' });
  }
}

/* --------------------------------- UTIL -------------------------------- */
function serializePost(post, opts = {}) {
  const base = (k) => publicUrl(k);
  const variants = post.media?.variants || {};
  const include = !!opts.includeVariants;

  const media = {
    original: base(post.media.keyOriginal),
    thumb:    base(post.media.keyThumb),
    width: post.media.width,
    height: post.media.height,
    mime: post.media.mime
  };
  if (include) {
    if (variants.t1) media.t1 = base(variants.t1);
    if (variants.t2) media.t2 = base(variants.t2);
    if (variants.t3) media.t3 = base(variants.t3);
  }

  return {
    id: String(post._id),
    userId: String(post.userId),
    caption: post.caption || '',
    createdAt: post.createdAt,
    counts: post.counts || { likes: 0, comments: 0 },
    status: post.status || 'ready',
    media
  };
}

module.exports = {
  createPost,
  getFeed,
  getPostById,
  toggleLike,
  listComments,
  addComment
};

async function getAnalysis(req, res) {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok:false, message:'ID inválido' });
    }
    const post = await Post.findById(id).select('tags nsfw faceCount visionRaw').lean();
    if (!post) return res.status(404).json({ ok:false, message:'No encontrado' });
    res.json({ ok:true, analysis: post });
  } catch (e) {
    console.error('[getAnalysis] error', e);
    res.status(500).json({ ok:false, message:'Error obteniendo análisis' });
  }
}

module.exports = {
  createPost,
  getFeed,
  getPostById,
  toggleLike,
  listComments,
  addComment,
  getAnalysis // <-- exporta
};
