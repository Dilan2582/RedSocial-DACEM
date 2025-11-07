// controllers/posts.js
const { Types } = require('mongoose');
const Post = require('../models/post');
const Like = require('../models/like');
const Comment = require('../models/comment');
const { env } = require('../config/env');
const { buildPostKey, uploadBuffer, publicUrl } = require('../services/s3');
const { readMeta, processAllTransformations, varT4 } = require('../services/image');
const { analyzeS3Image } = require('../services/vision');
// TODO: Face-API requiere TensorFlow compilado en Windows - deshabilitado temporalmente
// const { analyzeFaces } = require('../services/faceapi');


function ensureAuthUser(req) {
  if (!req.user || !req.user.id) throw new Error('NO_AUTH');
  return req.user.id;
}

/* ----------------------------- CREATE POST ----------------------------- */
async function createPost(req, res) {
  try {
    const userId = ensureAuthUser(req);

    if (!req.file) return res.status(400).json({ ok: false, message: 'Falta imagen o video' });
    
    const isVideo = req.file.mimetype.startsWith('video/');
    
    // Si es video, solo subir original sin transformaciones
    if (isVideo) {
      return await createVideoPost(req, res, userId);
    }

    // === PROCESAMIENTO DE IMÁGENES CON FILTRO SELECCIONADO ===
    if (!env.upload.allowed.includes(req.file.mimetype))
      return res.status(400).json({ ok: false, message: 'MIME no permitido' });

    const buffer = req.file.buffer;
    const selectedFilter = req.body.filter || 'original'; // Filtro elegido por el usuario
    
    console.log(`📸 Procesando imagen con filtro: ${selectedFilter} (${(buffer.length / 1024).toFixed(2)} KB)...`);
    
    const meta = await readMeta(buffer);

    // 1) Genera un _id de post SIN guardar aún
    const postId = new Types.ObjectId();

    // 2) Arma las claves S3 usando ese postId
    const ext = (meta.mime.split('/')[1] || 'jpg').toLowerCase();
    const keyOriginal = buildPostKey(userId, postId, `original.${ext}`);
    const keyThumb    = buildPostKey(userId, postId, 'thumb.jpg');
    
    // Determinar qué transformación aplicar según filtro seleccionado
    let keyTransformed = null;
    let transformationType = null;
    
    if (selectedFilter !== 'original') {
      const filterMap = {
        't1': 't1_bw.jpg',        // Blanco y Negro
        't2': 't2_sepia.jpg',     // Sepia
        't3': 't3_blur.jpg',      // Blur
        't4': 't4_upscale.jpg',   // HD 2x
        't5': 't5_bright.jpg',    // Bright
        't6': 't6_dark.jpg',      // Dark
        't7': 't7_vibrant.jpg',   // Vibrant
        't8': 't8_warm.jpg',      // Warm
        't9': 't9_cool.jpg',      // Cool
        't10': 't10_invert.jpg'   // Invert
      };
      
      if (filterMap[selectedFilter]) {
        transformationType = selectedFilter;
        keyTransformed = buildPostKey(userId, postId, filterMap[selectedFilter]);
      }
    }

    // 3) Sube la imagen ORIGINAL a S3
    console.log(`☁️  Subiendo imagen original a S3...`);
    await uploadBuffer({ Key: keyOriginal, Body: buffer, ContentType: meta.mime });
    
    // Si el usuario seleccionó un filtro, Lambda lo procesará
    if (transformationType) {
      console.log(`✅ Original subido. Lambda generará transformación: ${transformationType}`);
    } else {
      console.log(`✅ Original subido sin transformaciones.`);
    }

    // 4) Analizar imagen con Rekognition (si está habilitado)
    let visionData = { tags: [], nsfw: false, faceCount: 0, raw: null };
    
    if (env.rekognition.enabled) {
      try {
        if (env.rekognition.mode === 'lite') {
          const { analyzeS3ImageLite } = require('../services/vision');
          visionData = await analyzeS3ImageLite({ 
            bucket: env.aws.s3Bucket, 
            key: keyOriginal 
          });
          console.log('✅ Rekognition (Lite) completado:', visionData.tags.length, 'tags');
        } else {
          visionData = await analyzeS3Image({ 
            bucket: env.aws.s3Bucket, 
            key: keyOriginal 
          });
          console.log('✅ Rekognition análisis completado:', {
            tags: visionData.tags.length,
            nsfw: visionData.nsfw,
            faces: visionData.faceCount
          });
        }
      } catch (visionErr) {
        console.error('⚠️  Error en Rekognition (continuando):', visionErr.message);
      }
    } else {
      console.log('⏭️  Rekognition deshabilitado en configuración');
    }
    
    // TODO: Integrar Face-API.js cuando esté disponible para Windows
    // const faceApiData = await analyzeFaces(buffer);

    // 6) Crear documento del post con el filtro seleccionado
    const mediaData = {
      keyOriginal,
      keyThumb,
      width: meta.width,
      height: meta.height,
      mime: meta.mime,
      size: buffer.length,
      selectedFilter: selectedFilter, // Guardar filtro elegido por el usuario
      variants: {}
    };

    // Solo agregar la variante si se seleccionó un filtro
    if (keyTransformed && transformationType) {
      mediaData.variants[transformationType] = keyTransformed;
    }

    const post = await Post.create({
      _id: postId,
      userId: new Types.ObjectId(userId),
      caption: (req.body.caption || '').trim(),
      media: mediaData,
      tags: visionData.tags,
      nsfw: visionData.nsfw,
      faceCount: visionData.faceCount,
      visionRaw: visionData.raw,
      // faceApiData: null,  // TODO: Agregar cuando Face-API funcione
      status: 'ready'
    });

    // 7) Preparar respuesta con las URLs correctas
    const mediaResponse = {
      original: publicUrl(keyOriginal),
      thumb: publicUrl(keyThumb),
      width: post.media.width,
      height: post.media.height,
      mime: post.media.mime,
      selectedFilter: selectedFilter
    };

    // Agregar URL de la transformación si existe
    if (keyTransformed) {
      mediaResponse.transformed = publicUrl(keyTransformed);
      mediaResponse.transformationType = transformationType;
    }

    console.log(`✅ Post creado con filtro: ${selectedFilter}${transformationType ? ' (Lambda procesando)' : ''}`);
    res.json({
      ok: true,
      post: {
        id: String(post._id),
        userId: String(post.userId),
        caption: post.caption || '',
        createdAt: post.createdAt,
        counts: post.counts || { likes: 0, comments: 0 },
        status: post.status,
        tags: post.tags || [],
        nsfw: post.nsfw || false,
        faceCount: post.faceCount || 0,
        media: mediaResponse
      }
    });
  } catch (err) {
    if (err.message === 'NO_AUTH') return res.status(401).json({ ok:false, message:'No autenticado' });
    console.error('[createPost] error', err);
    res.status(500).json({ ok:false, message:'Error al crear publicación' });
  }
}

/* ----------------------------- CREATE VIDEO POST ----------------------------- */
async function createVideoPost(req, res, userId) {
  try {
    const buffer = req.file.buffer;
    console.log(`🎥 Procesando video (${(buffer.length / 1024 / 1024).toFixed(2)} MB)...`);

    // 1) Genera un _id de post
    const postId = new Types.ObjectId();

    // 2) Detecta extensión
    const mimeToExt = {
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/x-msvideo': 'avi',
      'video/webm': 'webm'
    };
    const ext = mimeToExt[req.file.mimetype] || 'mp4';

    // 3) Claves S3
    const keyOriginal = buildPostKey(userId, postId, `video.${ext}`);
    const keyThumb = buildPostKey(userId, postId, 'thumb.jpg');

    // 4) Para videos, generamos un thumbnail simple (primer frame)
    // Por ahora, usamos una imagen placeholder o el video mismo como thumb
    // En producción, usarías FFmpeg para extraer un frame
    const placeholderThumb = Buffer.from(''); // Placeholder vacío

    // 5) Sube video a S3
    console.log('☁️  Subiendo video a S3...');
    await uploadBuffer({ 
      Key: keyOriginal, 
      Body: buffer, 
      ContentType: req.file.mimetype 
    });
    
    // Si tienes thumbnail, súbelo también
    // await uploadBuffer({ Key: keyThumb, Body: placeholderThumb, ContentType: 'image/jpeg' });

    // 6) Crea el post (videos NO tienen transformaciones)
    const post = await Post.create({
      _id: postId,
      userId: new Types.ObjectId(userId),
      caption: (req.body.caption || '').trim(),
      media: {
        keyOriginal,
        keyThumb: keyOriginal, // Usa el video como thumb por ahora
        variants: { t1: '', t2: '', t3: '' }, // Sin variantes para videos
        width: 1920,  // Valores por defecto
        height: 1080,
        mime: req.file.mimetype,
        size: buffer.length
      },
      tags: [],
      nsfw: false,
      faceCount: 0,
      visionRaw: null,
      status: 'ready'
    });

    console.log('✅ Video post creado');
    res.json({
      ok: true,
      post: {
        id: String(post._id),
        userId: String(post.userId),
        caption: post.caption || '',
        createdAt: post.createdAt,
        counts: { likes: 0, comments: 0 },
        status: post.status,
        media: {
          original: publicUrl(keyOriginal),
          thumb: publicUrl(keyOriginal),
          mime: post.media.mime
        }
      }
    });
  } catch (err) {
    console.error('[createVideoPost] error', err);
    res.status(500).json({ ok: false, message: 'Error al crear video' });
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
    console.log(`📍 getPostById(${id}): includeVariants=${includeVariants}, query=`, req.query);
    const data = serializePost(post, { includeVariants });
    console.log(`✅ Serialized media:`, data.media);

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
      
      // Eliminar notificación de like si existe
      const { createNotification } = require('./notifications');
      try {
        const Notification = require('../models/notification');
        await Notification.deleteOne({
          recipient: exists.userId,
          sender: userId,
          type: 'like',
          post: postId
        });
      } catch (err) {
        console.error('Error eliminando notificación de like:', err);
      }
      
      return res.json({ ok: true, liked: false });
    }
    
    const like = await Like.create({ postId, userId });
    await Post.updateOne({ _id: postId }, { $inc: { 'counts.likes': 1 } });
    
    // Crear notificación de like
    try {
      const post = await Post.findById(postId);
      console.log('[toggleLike] Post encontrado:', post?._id, 'Owner:', post?.userId, 'Liker:', userId);
      if (post && post.userId.toString() !== userId) {
        const { createNotification } = require('./notifications');
        const notif = await createNotification(post.userId, userId, 'like', { postId });
        console.log('[toggleLike] Notificación creada:', notif?._id);
      } else {
        console.log('[toggleLike] No se crea notificación (mismo usuario)');
      }
    } catch (err) {
      console.error('Error creando notificación de like:', err);
    }
    
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
    
    // Crear notificación de comentario
    try {
      const post = await Post.findById(id);
      if (post && post.userId.toString() !== userId) {
        const { createNotification } = require('./notifications');
        await createNotification(post.userId, userId, 'comment', {
          postId: id,
          commentId: c._id,
          commentText: text
        });
      }
    } catch (err) {
      console.error('Error creando notificación de comentario:', err);
    }
    
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
    mime: post.media.mime,
    selectedFilter: post.media.selectedFilter || 'original',
    variants: {}
  };
  
  if (include) {
    if (variants.t1) media.variants.t1_bw = base(variants.t1);           // Blanco y Negro
    if (variants.t2) media.variants.t2_sepia = base(variants.t2);  // Sepia
    if (variants.t3) media.variants.t3_blur = base(variants.t3);     // Blur
    if (variants.t4) media.variants.t4_upscale = base(variants.t4); // Ampliación
    if (variants.t5) media.variants.t5_bright = base(variants.t5);   // Brillante
    if (variants.t6) media.variants.t6_dark = base(variants.t6);       // Oscuro
    if (variants.t7) media.variants.t7_vibrant = base(variants.t7); // Vibrante
    if (variants.t8) media.variants.t8_warm = base(variants.t8);       // Cálido
    if (variants.t9) media.variants.t9_cool = base(variants.t9);       // Frío
    if (variants.t10) media.variants.t10_invert = base(variants.t10); // Invertido
  }

  return {
    id: String(post._id),
    userId: String(post.userId),
    caption: post.caption || '',
    createdAt: post.createdAt,
    counts: post.counts || { likes: 0, comments: 0 },
    status: post.status || 'ready',
    tags: post.tags || [],
    nsfw: post.nsfw || false,
    faceCount: post.faceCount || 0,
    media
  };
}

/* ----------------------------- RE-ANALYZE POST ----------------------------- */
async function reanalyzePost(req, res) {
  try {
    const userId = ensureAuthUser(req);
    const postId = req.params.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ ok: false, message: 'Post no encontrado' });
    if (String(post.userId) !== String(userId)) {
      return res.status(403).json({ ok: false, message: 'No autorizado' });
    }

    // Analizar con Rekognition
    const visionData = await analyzeS3Image({
      bucket: env.aws.s3Bucket,
      key: post.media.keyOriginal
    });

    // Actualizar post
    post.tags = visionData.tags;
    post.nsfw = visionData.nsfw;
    post.faceCount = visionData.faceCount;
    post.visionRaw = visionData.raw;
    await post.save();

    console.log('✅ Post re-analizado:', postId);

    res.json({
      ok: true,
      analysis: {
        tags: visionData.tags,
        nsfw: visionData.nsfw,
        faceCount: visionData.faceCount
      }
    });
  } catch (err) {
    if (err.message === 'NO_AUTH') return res.status(401).json({ ok: false, message: 'No autenticado' });
    console.error('[reanalyzePost] error', err);
    res.status(500).json({ ok: false, message: 'Error al analizar post' });
  }
}

/* ----------------------------- DELETE POST ----------------------------- */
async function deletePost(req, res) {
  try {
    const userId = ensureAuthUser(req);
    const postId = req.params.id;

    if (!Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ ok: false, message: 'ID inválido' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ ok: false, message: 'Post no encontrado' });
    }

    // Verificar que sea el dueño del post
    if (String(post.userId) !== String(userId)) {
      return res.status(403).json({ ok: false, message: 'No autorizado' });
    }

    // Eliminar likes asociados
    await Like.deleteMany({ postId: new Types.ObjectId(postId) });

    // Eliminar comentarios asociados
    await Comment.deleteMany({ postId: new Types.ObjectId(postId) });

    // Eliminar el post
    await Post.findByIdAndDelete(postId);

    console.log('✅ Post eliminado:', postId);

    res.json({ ok: true, message: 'Post eliminado correctamente' });
  } catch (err) {
    if (err.message === 'NO_AUTH') return res.status(401).json({ ok: false, message: 'No autenticado' });
    console.error('[deletePost] error', err);
    res.status(500).json({ ok: false, message: 'Error al eliminar post' });
  }
}

/* ----------------------------- DELETE COMMENT ----------------------------- */
async function deleteComment(req, res) {
  try {
    const userId = ensureAuthUser(req);
    const { postId, commentId } = req.params;

    if (!Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ ok: false, message: 'ID de comentario inválido' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ ok: false, message: 'Comentario no encontrado' });
    }

    // Verificar que sea el dueño del comentario O del post
    const post = await Post.findById(postId);
    const isCommentOwner = String(comment.userId) === String(userId);
    const isPostOwner = post && String(post.userId) === String(userId);

    if (!isCommentOwner && !isPostOwner) {
      return res.status(403).json({ ok: false, message: 'No autorizado' });
    }

    await Comment.findByIdAndDelete(commentId);

    // Actualizar contador en el post
    if (post) {
      post.counts.comments = Math.max(0, (post.counts.comments || 0) - 1);
      await post.save();
    }

    console.log('✅ Comentario eliminado:', commentId);

    res.json({ ok: true, message: 'Comentario eliminado' });
  } catch (err) {
    if (err.message === 'NO_AUTH') return res.status(401).json({ ok: false, message: 'No autenticado' });
    console.error('[deleteComment] error', err);
    res.status(500).json({ ok: false, message: 'Error al eliminar comentario' });
  }
}

module.exports = {
  createPost,
  getFeed,
  getPostById,
  toggleLike,
  listComments,
  addComment,
  deletePost,
  deleteComment,
  reanalyzePost
};
