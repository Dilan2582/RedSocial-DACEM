/* ========================== CONFIG ========================== */
const API_BASE = '/api';
let currentConversation = null;
let currentRecipient = null;
let conversations = [];
let pollInterval = null;
let authToken = null;

/* ====== Bulk delete (modal) ====== */
let delModal = null, delList = null, delCount = null, delConfirm = null, delCancel = null;

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

/* ===== Helpers: sesión y “siguiendo” para nuevo mensaje ===== */
function getMeId() {
  try {
    const me = JSON.parse(localStorage.getItem('user') || '{}');
    return me.id || me._id || me.userId || null;
  } catch { return null; }
}

async function loadFollowingForNewMsg(q = '') {
  const meId = getMeId();
  if (!meId) return [];

  try {
    const r = await fetch(`${API_BASE}/follow/${meId}/following?limit=50`, {
      headers: { Authorization: authToken }
    });
    if (!r.ok) return [];

    const d = await r.json();
    let users = d.users || [];

    // Normaliza a formato consistente con tu UI
    users = users.map(u => ({
      id: u.id || u._id,
      name:
        (u.nickname && u.nickname.trim()) ||
        `${u.firstName || ''} ${u.lastName || ''}`.trim() ||
        'Usuario',
      avatar: u.avatar || u.image || null
    }));

    const query = (q || '').toLowerCase();
    if (query) users = users.filter(u => (u.name || '').toLowerCase().includes(query));

    return users;
  } catch {
    return [];
  }
}

/* ====== Lightbox (posts) ====== */
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

  lbLike.setAttribute('aria-pressed', p.viewerLiked ? 'true' : 'false');
  lbLikes.textContent = p.counts?.likes ?? '0';
  lbCommentsCount.textContent = p.counts?.comments ?? '0';
  refreshCounts(p.id || p._id);

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

  lbLike.onclick = async ()=>{
    const pressedBefore = lbLike.getAttribute('aria-pressed')==='true';
    lbLike.setAttribute('aria-pressed', (!pressedBefore)+'' );
    lbLikes.textContent = (+lbLikes.textContent + (pressedBefore?-1:1));
    const ok = await toggleLike(p.id || p._id);
    if(!ok){
      lbLike.setAttribute('aria-pressed', pressedBefore+'' );
      lbLikes.textContent = (+lbLikes.textContent + (pressedBefore?1:-1));
    } else {
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
  $('#logoutBtnTop')?.addEventListener('click', ()=>{ localStorage.removeItem('token'); location.href='/index.html'; });

  // Buscar
  $('#searchBox')?.addEventListener('input', handleSearch);

  // Cargar conversaciones
  loadConversations();

  // Abrir conversación directa por query
  const userId = new URLSearchParams(location.search).get('userId');
  if(userId) startConversationWithUser(userId);

  // Polling
  pollInterval = setInterval(()=>{ if(currentConversation){ loadMessages(currentConversation.id, true); } }, 5000);

  /* ===== Nuevo mensaje (modal) ===== */
  wireNewMessageModal();
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
  if(!container) return;

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
    <img src="${resolveAvatar(currentRecipient)}" class="chat-avatar" alt="${escapeHtml(name)}" id="chatHeadAva">
    <div class="chat-user-info">
      <a class="chat-username" id="chatHeadLink" href="profile.html?id=${encodeURIComponent(userId)}" style="text-decoration:none">
        ${escapeHtml(name)}
      </a>
      <div class="chat-status">Activo ahora</div>
    </div>`;

  $('#chatHeadAva').onclick = (e)=>{ e.preventDefault(); location.href = `profile.html?id=${encodeURIComponent(userId)}`; };
  const sendBtn = $('#sendBtn');
  const inp     = $('#messageInput');

  if (sendBtn) {
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

/* ====================== BULK DELETE (MODAL) ====================== */
function openDeleteModal(){
  if(!delModal) return;
  // Construir la lista con conversaciones actuales
  if(!conversations.length){
    delList.innerHTML = `<div class="muted" style="padding:8px 4px">No hay conversaciones para borrar.</div>`;
  }else{
    delList.innerHTML = conversations.map(c=>{
      const u = c.user || c.recipient || {};
      const name = displayName(u);
      return `
        <label class="del-row">
          <input type="checkbox" class="del-check" value="${escapeHtml(c.id)}">
          <img src="${resolveAvatar(u)}" class="del-ava" alt="">
          <div class="del-info">
            <div class="del-name" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
            <div class="del-prev muted">${escapeHtml((c.lastMessage?.content || ''))}</div>
          </div>
          <span class="del-time muted">${formatTime(c.lastMessageAt)}</span>
        </label>`;
    }).join('');
  }
  // contador
  updateDelCount();
  // listeners
  delList.querySelectorAll('.del-check').forEach(ch=>{
    ch.addEventListener('change', updateDelCount);
  });

  // botones
  delCancel.onclick = closeDeleteModal;
  delConfirm.onclick = confirmDeleteSelected;

  delModal.setAttribute('aria-hidden','false');
}
function closeDeleteModal(){
  delModal?.setAttribute('aria-hidden','true');
  if(delList) delList.innerHTML = '';
  updateDelCount();
}
function updateDelCount(){
  const n = delList ? delList.querySelectorAll('.del-check:checked').length : 0;
  if(delCount) delCount.textContent = n;
  if(delConfirm) delConfirm.disabled = n===0;
}

async function confirmDeleteSelected(){
  const ids = [...delList.querySelectorAll('.del-check:checked')].map(x=>x.value);
  if(!ids.length) return;

  delConfirm.disabled = true;

  // intenta varios endpoints comunes
  async function tryDeleteOne(id){
    const candidates = [
      { m:'DELETE', p:`/messages/conversation/${id}` },
      { m:'DELETE', p:`/messages/${id}` },
      { m:'DELETE', p:`/messages/conversations/${id}` },
    ];
    for(const c of candidates){
      try{
        const r = await fetch(API_BASE + c.p, { method:c.m, headers:{ Authorization:authToken }});
        if(r.ok) return true;
      }catch(_){}
    }
    return false;
  }

  let okAll = true;
  for(const id of ids){
    const ok = await tryDeleteOne(id);
    if(!ok) okAll = false;
  }

  // Recargar lista pase lo que pase
  await loadConversations();
  if(currentConversation && ids.includes(currentConversation.id)){
    // si borraste la actual, limpia la vista de chat
    currentConversation = null;
    $('#chatBody')?.replaceChildren();
    $('#chatHead')?.replaceChildren();
    $('#chatComposer')?.style && ($('#chatComposer').style.display='none');
  }

  delConfirm.disabled = false;
  closeDeleteModal();

  if(!okAll) alert('Algunas conversaciones no pudieron eliminarse.');
}

/* ====================== NUEVO MENSAJE (MODAL) ====================== */
/* IDs esperados en messages.html:
   - Botón abrir:           #newMsgBtn
   - Modal:                 #newMsgModal
   - Botón cerrar:          #nmClose
   - Input búsqueda:        #nmSearch
   - Lista de usuarios:     #nmList
   - Botón Chat:            #nmChatBtn
*/
let nmSelectedUserId = null;

function wireNewMessageModal(){
  const btnOpen  = $('#newMsgBtn');
  const modal    = $('#newMsgModal');
  const btnClose = $('#nmClose');
  const inpSearch= $('#nmSearch');
  const list     = $('#nmList');
  const btnChat  = $('#nmChatBtn');

  if(!btnOpen || !modal) return;

  function setVisible(flag){
    modal.setAttribute('aria-hidden', (!flag)+'');
  }

  async function refreshList(q=''){
    const users = await loadFollowingForNewMsg(q);
    renderNewMsgList(users);
  }

  function renderNewMsgList(users){
    nmSelectedUserId = null;
    if(!list) return;
    if(!users.length){
      list.innerHTML = `<div class="muted" style="padding:12px">No se encontraron usuarios</div>`;
      btnChat && (btnChat.disabled = true);
      return;
    }
    list.innerHTML = users.map(u => `
      <label class="del-row" style="grid-template-columns:auto 40px 1fr auto">
        <input type="radio" name="nmUser" value="${escapeHtml(u.id)}">
        <img src="${resolveAvatar(u)}" class="del-ava" alt="">
        <div class="del-info">
          <div class="del-name" title="${escapeHtml(u.name)}">${escapeHtml(u.name)}</div>
        </div>
      </label>
    `).join('');

    list.querySelectorAll('input[name="nmUser"]').forEach(r=>{
      r.addEventListener('change', ()=>{
        nmSelectedUserId = r.value;
        if(btnChat) btnChat.disabled = !nmSelectedUserId;
      });
    });
    if(btnChat) btnChat.disabled = true;
  }

  btnOpen.addEventListener('click', async ()=>{
    setVisible(true);
    await refreshList('');
    inpSearch && (inpSearch.value = '');
    nmSelectedUserId = null;
    btnChat && (btnChat.disabled = true);
  });

  btnClose?.addEventListener('click', ()=> setVisible(false));
  modal?.addEventListener('click', (e)=>{ if(e.target === modal) setVisible(false); });

  inpSearch?.addEventListener('input', async (e)=>{
    await refreshList(e.target.value || '');
  });

  btnChat?.addEventListener('click', async ()=>{
    if(!nmSelectedUserId) return;
    setVisible(false);
    await startConversationWithUser(nmSelectedUserId);
  });
}
