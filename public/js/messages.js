/* ========================== CONFIG ========================== */
const API_BASE = '/api';
let currentConversation = null;
let currentRecipient = null;
let conversations = [];
let pollInterval = null;
let authToken = null;

/* ========================== HELPERS ========================= */
const $ = (s)=>document.querySelector(s);
function safe(v,f=''){ return (v===null||v===undefined)?f:v; }
function displayName(u){
  if(!u) return 'Usuario';
  return (u.name || u.fullName || `${safe(u.firstName)} ${safe(u.lastName)}`.trim() || u.nick || u.nickname || u.username || 'Usuario');
}
function goToProfile(u){
  if(!u) return;
  const id  = u.id || u._id || '';
  const href = `profile.html?id=${encodeURIComponent(id)}`;
  location.href = href;
}
function resolveAvatar(u){
  if(!u) return 'img/default-avatar.png';
  const img = u.image || u.avatar;
  if (img){ if(img.startsWith('http')) return img; return `${location.origin}${img.startsWith('/')?img:'/'+img}`; }
  const seed = encodeURIComponent(u.nick || u.nickname || u.name || 'U');
  return `https://api.dicebear.com/8.x/initials/svg?seed=${seed}&radius=50&scale=110&fontWeight=700`;
}
function escapeHtml(t=''){ const d=document.createElement('div'); d.textContent=t; return d.innerHTML; }
function formatTime(ts){
  if(!ts) return ''; const d=new Date(ts); const diff=Date.now()-d;
  if(diff<60000) return 'Ahora';
  if(diff<3600000) return Math.floor(diff/60000)+'m';
  if(diff<86400000) return Math.floor(diff/3600000)+'h';
  if(diff<604800000) return Math.floor(diff/86400000)+'d';
  return d.toLocaleDateString('es-ES',{day:'numeric',month:'short'});
}

/* ====== Cache básico de usuarios ====== */
const userCache = new Map();
async function fetchUserPublic(uid){
  if(!uid) return {};
  if(userCache.has(uid)) return userCache.get(uid);
  try{
    const r = await fetch(`${API_BASE}/user/${uid}/public`, { headers:{ Authorization:authToken }});
    const d = await r.json();
    const u = d.user || d.data || {};
    userCache.set(uid, u);
    return u;
  }catch{ return {}; }
}

/* ====== Lightbox ====== */
let lb=null, lbImg=null, lbAva=null, lbName=null, lbUser=null, lbBody=null, lbInp=null, lbSend=null, lbLike=null, lbLikes=null, lbCommentsCount=null;

(function bindExistingLightbox(){
  lb = $('#lightbox');
  lbImg = $('#lbImg'); lbAva=$('#lbAva'); lbName=$('#lbName'); lbUser=$('#lbUser');
  lbBody=$('#lbComments'); lbInp=$('#lbInp'); lbSend=$('#lbSend');
  lbLike=$('#lbLike'); lbLikes=$('#lbLikes'); lbCommentsCount=$('#lbCommentsCount');
  $('#lbClose')?.addEventListener('click', closePostModal);
  lb?.addEventListener('click', (e)=>{ if(e.target===lb) closePostModal(); });
})();

/* ===== Likes helpers (sin body) ===== */
async function toggleLike(postId){
  const headers = { Authorization: authToken };
  const candidates = [
    `/posts/${postId}/likes/toggle`,
    `/posts/${postId}/like/toggle`,
    `/posts/${postId}/like`,
    `/posts/${postId}/likes`,
  ];
  for (const path of candidates){
    try{
      const r = await fetch(API_BASE + path, { method:'POST', headers });
      // Algunos backends devuelven 200 sin body, otros { ok:true }
      if (r.ok) return true;
      const d = await r.json().catch(()=>null);
      if (d && (d.ok === true || d.success === true)) return true;
    }catch(_){}
  }
  return false;
}
async function refreshCounts(postId){
  try{
    const r = await fetch(`${API_BASE}/posts/${postId}`, { headers:{ Authorization:authToken }});
    const d = await r.json();
    if (d?.ok && d.post){
      lbLike.setAttribute('aria-pressed', d.post.viewerLiked ? 'true' : 'false');
      if (typeof d.post.counts?.likes === 'number')    lbLikes.textContent = d.post.counts.likes;
      if (typeof d.post.counts?.comments === 'number') lbCommentsCount.textContent = d.post.counts.comments;
    }
  }catch(_){}
}

let currentPost = null;
async function fetchPost(postId){
  const r = await fetch(`${API_BASE}/posts/${postId}`, { headers:{ Authorization:authToken }});
  const d = await r.json(); return d.ok ? d.post : null;
}
async function listPostComments(postId){
  const r=await fetch(`${API_BASE}/posts/${postId}/comments?limit=100`,{headers:{Authorization:authToken}});
  const d=await r.json(); return d.ok? d.comments: [];
}
async function addPostComment(postId,text){
  const r=await fetch(`${API_BASE}/posts/${postId}/comments`,{
    method:'POST', headers:{Authorization:authToken,'Content-Type':'application/json'},
    body: JSON.stringify({ text })
  });
  const d=await r.json(); return d.ok? d.comment:null;
}

/* ---- Comentarios con @nickname clicable ---- */
function renderCommentRow(c){
  const cu   = c.user || {};
  const uid  = cu.id || cu._id || c.userId || '';
  const nick = (cu.nickname || cu.nick || 'usuario').replace(/^@/, '');
  const nmLink = `<a href="profile.html?id=${encodeURIComponent(uid)}" class="nm user-link">@${escapeHtml(nick)}</a>`;
  return `<span class="nm-wrap">${nmLink}</span>${escapeHtml(c.text)}<span class="dt">${formatTime(c.createdAt)}</span>`;
}

async function openPostModal(p){
  if(!p) return;
  currentPost = p;

  lbImg.src = p.media?.t1 || p.media?.original || p.media?.thumb || '';
  const au = p.author || p.user || {};
  lbAva.src = resolveAvatar(au);

  const nm      = displayName(au);
  const pid     = au.id || au._id || p.userId || '';
  const rawNick = (au.nickname || au.nick || '').replace(/^@/, '');
  const profHref = pid ? `profile.html?id=${encodeURIComponent(pid)}` : '#';

  lbName.innerHTML = `<a href="${profHref}" class="lb-author">${escapeHtml(nm)}</a>`;
  lbUser.innerHTML = rawNick ? `<a href="${profHref}" class="lb-author muted">@${escapeHtml(rawNick)}</a>` : '';
  lbAva.onclick = () => goToProfile({ id: pid });

  /* Estado inicial de likes/contadores */
  lbLike.setAttribute('aria-pressed', p.viewerLiked ? 'true' : 'false');
  lbLikes.textContent = p.counts?.likes ?? '0';
  lbCommentsCount.textContent = p.counts?.comments ?? '0';
  // Sincroniza por si el objeto venía desactualizado
  refreshCounts(p.id || p._id);

  // Comentarios (resuelve nick si falta)
  const comments = await listPostComments(p.id || p._id);
  for(const c of comments){
    const cu = c.user || {};
    const uid = c.userId || cu.id || cu._id;
    const hasNick = !!(cu.nickname || cu.nick);
    if(uid && !hasNick){
      const u = await fetchUserPublic(uid);
      c.user = { id: uid, _id: uid, ...u, ...c.user };
    }
  }
  lbBody.innerHTML='';
  comments.forEach(c=>{
    const row = document.createElement('div'); row.className='lb-cmt';
    row.innerHTML = renderCommentRow(c);
    lbBody.appendChild(row);
  });
  lbBody.scrollTop = lbBody.scrollHeight;

  // Enviar comentario
  lbSend.onclick = async ()=>{
    const t = lbInp.value.trim(); if(!t) return;
    const c = await addPostComment((p.id||p._id), t);
    if(c){
      if(!(c.user && (c.user.nickname||c.user.nick))){
        const uid = c.userId || c.user?.id || c.user?._id;
        if(uid){ const u = await fetchUserPublic(uid); c.user = { id: uid, _id: uid, ...c.user, ...u }; }
      }
      lbInp.value='';
      const row=document.createElement('div'); row.className='lb-cmt';
      row.innerHTML = renderCommentRow(c);
      lbBody.appendChild(row);
      lbBody.scrollTop=lbBody.scrollHeight;
      lbCommentsCount.textContent = +lbCommentsCount.textContent + 1;
    }
  };

  // Like (sin body; rollback si falla)
  lbLike.onclick = async ()=>{
    const pressedBefore = lbLike.getAttribute('aria-pressed')==='true';
    lbLike.setAttribute('aria-pressed', (!pressedBefore)+'' );
    lbLikes.textContent = (+lbLikes.textContent + (pressedBefore?-1:1));

    const ok = await toggleLike(p.id || p._id);
    if(!ok){
      // Revertir
      lbLike.setAttribute('aria-pressed', pressedBefore+'' );
      lbLikes.textContent = (+lbLikes.textContent + (pressedBefore?1:-1));
    } else {
      // Opcional: refrescar para quedar 100% alineados con el backend
      refreshCounts(p.id || p._id);
    }
  };

  lb.setAttribute('aria-hidden','false');
  try{ if(window.lucide) window.lucide.createIcons(); }catch(_){}
}
function closePostModal(){
  lb.setAttribute('aria-hidden','true');
  lbImg.removeAttribute('src'); lbBody.innerHTML=''; lbInp.value='';
  lbLike.setAttribute('aria-pressed','false'); lbLikes.textContent='0'; lbCommentsCount.textContent='0';
  currentPost=null;
}

/* ====================== BOOT ====================== */
document.addEventListener('DOMContentLoaded', ()=>{
  const token = localStorage.getItem('token');
  if(!token){ location.href='/index.html'; return; }
  authToken = 'Bearer ' + token;

<<<<<<< HEAD
  // Referencias modal borrar
  delModal   = $('#delModal');
  delList    = $('#delList');
  delCount   = $('#delCount');
  delConfirm = $('#delConfirm');
  delCancel  = $('#delCancel');

  // Botón opciones (…)
  $('#msgOptionsBtn')?.addEventListener('click', openDeleteModal);

  // Cerrar modal cuando se hace clic fuera
  delModal?.addEventListener('click', (e)=>{ if(e.target === delModal) closeDeleteModal(); });

  // Cerrar modal con Escape
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && delModal?.getAttribute('aria-hidden')==='false') closeDeleteModal(); });

  // Logout
=======
  $('#themeToggle')?.addEventListener('click', ()=>{
    const cur=document.documentElement.getAttribute('data-theme');
    const t=cur==='dark'?'light':'dark';
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    const el=$('#themeTxt'); if(el) el.textContent=t==='dark'?'Modo claro':'Modo oscuro';
    try{ if(window.lucide) window.lucide.createIcons(); }catch(_){}
  });
>>>>>>> parent of 9dbd1184 (Merge branch 'r-Develop' of https://github.com/Dilan2582/RedSocial-DACEM into r-Develop)
  $('#logoutBtnTop')?.addEventListener('click', ()=>{ localStorage.removeItem('token'); location.href='/index.html'; });

  $('#searchBox')?.addEventListener('input', handleSearch);

  loadConversations();

  const userId = new URLSearchParams(location.search).get('userId');
  if(userId) startConversationWithUser(userId);

  pollInterval = setInterval(()=>{ if(currentConversation){ loadMessages(currentConversation.id, true); } }, 5000);
});

/* ================== CONVERSATIONS ================= */
async function loadConversations(){
  try{
    const r = await fetch(API_BASE+'/messages', { headers:{ Authorization:authToken }});
    if(!r.ok){ if(r.status===401) { localStorage.removeItem('token'); location.href='/index.html'; } return; }
    const d = await r.json();
    conversations = d.conversations || [];
    renderConversations(conversations);
  }catch(e){ console.error('loadConversations', e); }
}

function renderConversations(convs){
  const container = $('#conversationsBody');
  if(!convs.length){
    container.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <p>No tienes conversaciones aún</p></div>`;
    return;
  }

  container.innerHTML = convs.map(conv=>{
    const isActive = currentConversation && currentConversation.id===conv.id;
    const last = conv.lastMessage;
    const isUnread = last && !last.read && !last.isMine;
    const preview = last ? (last.isMine?'Tú: ':'') + (typeof last.content==='string' ? last.content.replace(/[\r\n]+/g,' ').slice(0,120) : '[contenido]') : 'No hay mensajes aún';
    const user = conv.user || conv.recipient || {};
    const name = displayName(user);
    return `
    <div class="conversation-item ${isActive?'active':''}"
      onclick="selectConversation('${conv.id}','${user.id||user._id||''}','${escapeHtml(name)}','${user.image||user.avatar||''}')">
      <img src="${resolveAvatar(user)}" class="conv-avatar" alt="${escapeHtml(name)}">
      <div class="conv-info">
        <div class="conv-top">
          <div class="conv-name">${escapeHtml(name)}</div>
          <div class="conv-time">${formatTime(conv.lastMessageAt)}</div>
        </div>
        <div class="conv-message ${isUnread?'unread':''}">${escapeHtml(preview)}</div>
      </div>
    </div>`;
  }).join('');
}

function handleSearch(e){
  const q = e.target.value.toLowerCase();
  const filtered = conversations.filter(c=>{
    const u = c.user || c.recipient || {};
    return displayName(u).toLowerCase().includes(q);
  });
  renderConversations(filtered);
}

function selectConversation(id,userId,name,image){
  currentConversation={id};
  currentRecipient={ id:userId, name, nick:name, nickname:name, image };

  const head = $('#chatHead');
  head.style.display = 'flex';
  head.innerHTML = `
    <button class="btn ghost small" id="backToList" style="display:none">← Atrás</button>
    <img src="${resolveAvatar(currentRecipient)}" class="chat-avatar" alt="${escapeHtml(name)}">
    <div class="chat-user-info">
      <div class="chat-username">${escapeHtml(name)}</div>
      <div class="chat-status">Activo ahora</div>
    </div>`;
    $('#chatComposer').style.display = 'flex';
 const sendBtn = $('#sendBtn');
  const inp     = $('#messageInput');

  if (sendBtn) {
    // sobrescribe cualquier handler previo
    sendBtn.onclick = null;
    sendBtn.onclick = sendMessage;
  }
  if (inp) {
    inp.onkeypress = null;
    inp.onkeypress = (e)=>{
      if(e.key==='Enter' && !e.shiftKey){
        e.preventDefault();
        sendMessage();
      }
    };
  }
  const view = $('#chatView');
  view.style.display = 'grid';
  view.style.gridTemplateRows = 'auto 1fr auto';
  view.style.minHeight = '0';

  const body = $('#chatBody');
  body.style.flex = '1';
  body.style.minHeight = '0';
  body.style.overflow = 'auto';

  const composer = $('#chatComposer');
  composer.style.display = 'flex';

  const backBtn = $('#backToList');
  if (window.innerWidth <= 768) {
    backBtn.style.display = 'block';
    backBtn.onclick = ()=>{
      $('#conversationsList').classList.remove('hidden');
      $('#chatView').classList.add('hidden');
    };
  }

  renderConversations(conversations);
  loadMessages(id);

  $('#conversationsList').classList.add('hidden');
  $('#chatView').classList.remove('hidden');
}

/* ====================== MESSAGES ====================== */
function extractEmbeddedJson(str){
  const start = str.indexOf('{'); const end = str.lastIndexOf('}');
  if(start !== -1 && end !== -1 && end > start){
    try{ return JSON.parse(str.slice(start, end+1)); }catch{ return null; }
  }
  return null;
}
function extractPostIdFromLink(str){
  const m = str.match(/[#?&]post=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

async function loadMessages(conversationId, polling=false){
  try{
    const r = await fetch(API_BASE+'/messages/'+conversationId, { headers:{ Authorization:authToken }});
    if(!r.ok) throw 0;
    const d = await r.json();
    const list = d.messages || [];

    if(polling){
      const body=$('#chatBody'); if(!body) return;
      const cnt = body.querySelectorAll('.message').length;
      if(list.length>cnt) renderMessages(list);
    }else{
      renderMessages(list);
    }
    markAsRead(conversationId);
  }catch(e){ console.error('loadMessages',e); }
}

function buildPostBubble(msg, data){
  const authorName = data.name || data.author || '';
  const nick = (data.nickname || '').replace(/^@/,'');
  const ava = data.avatar || '';
  const thumb = data.mediaThumb || '';
  const caption = data.caption || '';

  const header = `
    <div class="pc-head">
      <img src="${escapeHtml(ava)}" class="pc-ava" alt="${escapeHtml(authorName)}">
      <div class="pc-u">
        <div class="pc-name">${escapeHtml(authorName)}</div>
        <div class="pc-nick">${nick ? '@'+escapeHtml(nick) : ''}</div>
      </div>
    </div>`;
  const media = `<div class="pc-media"><img src="${escapeHtml(thumb)}" alt=""></div>`;
  const cap = caption ? `<div class="pc-cap">${escapeHtml(caption)}</div>` : '';

  return `
  <div class="message ${msg.isMine ? 'mine' : ''}">
    <img src="${resolveAvatar(msg.sender)}" class="msg-avatar" alt="${escapeHtml(displayName(msg.sender))}">
    <div class="msg-bubble post-bubble"
         data-postid="${escapeHtml(data.postId||'')}"
         data-mode="card"
         data-userid="${escapeHtml(data.userId||'')}"
         data-nickname="${escapeHtml(nick)}"
         data-authorname="${escapeHtml(authorName)}"
         data-avatar="${escapeHtml(ava)}">
      ${header}${media}${cap}
    </div>
  </div>`;
}

function buildMessageHTML(msg){
  let data=null, postId=null;

  if(typeof msg.content === 'object' && msg.content){
    data = msg.content;
  }else if(typeof msg.content === 'string'){
    if(msg.content.trim().startsWith('{')){ try{ data = JSON.parse(msg.content); }catch{} }
    if(!data){ data = extractEmbeddedJson(msg.content); }
    if(!data){ postId = extractPostIdFromLink(msg.content); }
  }

  if(data && data.type==='post-card'){
    return buildPostBubble(msg, data);
  }

  if(postId){
    const pid = escapeHtml(postId);
    return `
    <div class="message ${msg.isMine ? 'mine' : ''}">
      <img src="${resolveAvatar(msg.sender)}" class="msg-avatar" alt="${escapeHtml(displayName(msg.sender))}">
      <div class="msg-bubble post-bubble loading" data-postlink="${pid}">
        <div class="pc-loading">Cargando publicación…</div>
      </div>
    </div>`;
  }

  return `
    <div class="message ${msg.isMine ? 'mine' : ''}">
      <img src="${resolveAvatar(msg.sender)}" class="msg-avatar" alt="${escapeHtml(displayName(msg.sender))}">
      <div>
        <div class="msg-bubble">${escapeHtml(String(msg.content||''))}</div>
        <div class="msg-time">${formatTime(msg.createdAt)}</div>
      </div>
    </div>`;
}

async function upgradeLinkShares(){
  const els = document.querySelectorAll('.post-bubble[data-postlink]:not([data-mode])');
  for(const el of els){
    const postId = el.getAttribute('data-postlink');
    const p = await fetchPost(postId);
    if(!p) { el.innerHTML = '<div class="pc-loading">No se pudo cargar la publicación</div>'; continue; }

    const au = p.author || p.user || {};
    const nick = (au.nickname || au.nick || '').replace(/^@/,'');
    const header = `
      <div class="pc-head">
        <img src="${resolveAvatar(au)}" class="pc-ava" alt="${escapeHtml(displayName(au))}">
        <div class="pc-u">
          <div class="pc-name">${escapeHtml(displayName(au))}</div>
          <div class="pc-nick">${nick ? '@'+escapeHtml(nick) : ''}</div>
        </div>
      </div>`;
    const media = `<div class="pc-media"><img src="${escapeHtml(p.media?.thumb || p.media?.original || '')}" alt=""></div>`;
    const cap = p.caption ? `<div class="pc-cap">${escapeHtml(p.caption)}</div>` : '';

    el.innerHTML = `${header}${media}${cap}`;
    el.dataset.mode = 'card';
    el.dataset.postid = p.id || p._id;

    el.dataset.userid = au.id || au._id || (p.userId || '');
    el.dataset.nickname = nick || '';
    el.dataset.authorname = displayName(au);
    el.dataset.avatar = au.avatar || au.image || '';
  }
  attachPostCardHandlers();
}

function attachPostCardHandlers(){
  document.querySelectorAll('.post-bubble[data-postid]').forEach(el=>{
    if(el.__bound) return;
    el.__bound = true;
    el.addEventListener('click', async ()=>{
      const postId = el.getAttribute('data-postid');
      if(!postId) return;
      const p = await fetchPost(postId);
      if(p){
        const au = {
          id: el.getAttribute('data-userid') || p.userId,
          _id: el.getAttribute('data-userid') || p.userId,
          nickname: (el.getAttribute('data-nickname') || '').replace(/^@/, ''),
          nick: (el.getAttribute('data-nickname') || '').replace(/^@/, ''),
          name: el.getAttribute('data-authorname') || '',
          avatar: el.getAttribute('data-avatar') || ''
        };
        p.author = au;
        openPostModal(p);
      }
    });
  });
}

function renderMessages(list){
  const body = $('#chatBody'); if(!body) return;
  if(!list.length){ body.innerHTML='<div class="empty-state"><p>Escribe el primer mensaje</p></div>'; return; }

  body.innerHTML = list.map(buildMessageHTML).join('');
  attachPostCardHandlers();
  upgradeLinkShares();

  body.scrollTop = body.scrollHeight;
}

async function sendMessage(){
  if(!currentConversation) return;
  const input = $('#messageInput'); if(!input) return;
  const content = input.value.trim(); if(!content) return;

  try{
    const r = await fetch(API_BASE+'/messages/'+currentConversation.id, {
      method:'POST',
      headers:{ 'Content-Type': 'application/json', Authorization:authToken },
      body: JSON.stringify({ content })
    });
    if(!r.ok) throw 0;

    input.value=''; input.style.height='auto';
    await loadMessages(currentConversation.id);
    loadConversations();
  }catch(e){ console.error('sendMessage', e); alert('Error al enviar el mensaje'); }
}

async function startConversationWithUser(userId){
  try{
    const r = await fetch(API_BASE+'/messages/conversation/'+userId, { headers:{ Authorization:authToken }});
    if(!r.ok) throw 0;
    const d = await r.json();
    currentConversation = { id:d.conversation.id };
    currentRecipient   = d.conversation.user;
    selectConversation(d.conversation.id, currentRecipient.id||currentRecipient._id, displayName(currentRecipient), currentRecipient.image||currentRecipient.avatar);
  }catch(e){ console.error('startConversation', e); }
}

async function markAsRead(conversationId){
  try{ await fetch(API_BASE+`/messages/${conversationId}/read`, {method:'PUT', headers:{Authorization:authToken}}); }catch{}
}

window.addEventListener('beforeunload', ()=>{ if(pollInterval) clearInterval(pollInterval); });
