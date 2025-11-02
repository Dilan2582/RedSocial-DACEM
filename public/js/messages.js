const API_BASE = '/api';
let currentConversation = null;
let currentRecipient = null;
let conversations = [];
let pollInterval = null;
let authToken = null;

// Helper para resolver avatares
function resolveAvatar(user) {
  if (!user) return 'img/default-avatar.png';
  if (user.image || user.avatar) {
    const img = user.image || user.avatar;
    // Si ya es URL completa, devolverla
    if (img.startsWith('http')) return img;
    // Si es ruta relativa del servidor, agregarle el origin
    if (img.startsWith('/')) return `${location.origin}${img}`;
    return `${location.origin}/${img}`;
  }
  // Fallback a avatar generado
  const seed = encodeURIComponent(user.nick || user.nickname || user.name || 'U');
  return `https://api.dicebear.com/8.x/initials/svg?seed=${seed}&radius=50&scale=110&fontWeight=700`;
}

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/index.html';
    return;
  }
  
  authToken = 'Bearer ' + token;
  setupTheme();
  
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('backBtn').addEventListener('click', () => window.location.href = '/user.html');
  document.getElementById('searchBox').addEventListener('input', handleSearch);
  
  loadConversations();
  
  // Si viene userId en URL, iniciar conversación
  const userId = new URLSearchParams(window.location.search).get('userId');
  if (userId) {
    startConversationWithUser(userId);
  }
  
  // Polling para nuevos mensajes
  pollInterval = setInterval(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id, true);
    }
  }, 5000);
});

function setupTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  document.getElementById('themeTxt').textContent = saved === 'dark' ? 'Modo claro' : 'Modo oscuro';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  document.getElementById('themeTxt').textContent = newTheme === 'dark' ? 'Modo claro' : 'Modo oscuro';
}

function logout() {
  localStorage.removeItem('token');
  window.location.href = '/index.html';
}

async function loadConversations() {
  try {
    const r = await fetch(API_BASE + '/messages', {
      headers: { Authorization: authToken }
    });
    
    if (!r.ok) {
      if (r.status === 401) logout();
      return;
    }
    
    const data = await r.json();
    conversations = data.conversations || [];
    console.log('🔍 DEBUG Conversaciones:', conversations); // Debug
    renderConversations(conversations);
  } catch (err) {
    console.error('Error loadConversations:', err);
  }
}

function renderConversations(convs) {
  const container = document.getElementById('conversationsBody');
  
  if (convs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <p>No tienes conversaciones aún</p>
      </div>`;
    return;
  }
  
  container.innerHTML = convs.map(conv => {
    const isActive = currentConversation && currentConversation.id === conv.id;
    const isUnread = conv.lastMessage && !conv.lastMessage.read && !conv.lastMessage.isMine;
    const lastMsg = conv.lastMessage 
      ? (conv.lastMessage.isMine ? 'Tú: ' : '') + conv.lastMessage.content 
      : 'No hay mensajes aún';
    
    // Intentar obtener el nombre de múltiples formas
    const user = conv.user || conv.recipient || {};
    console.log('🔍 Usuario en conversación:', user); // Debug
    
    const displayName = user.name || 
                        user.fullName ||
                        `${user.firstName || ''} ${user.lastName || ''}`.trim() || 
                        user.nick || 
                        user.nickname || 
                        user.username ||
                        'Usuario';
    
    return `
      <div class="conversation-item ${isActive ? 'active' : ''}" 
           onclick="selectConversation('${conv.id}', '${user.id || user._id}', '${escapeHtml(displayName)}', '${user.image || user.avatar || ''}')">
        <img src="${resolveAvatar(user)}" class="conv-avatar" alt="${displayName}">
        <div class="conv-info">
          <div class="conv-top">
            <div class="conv-name">${escapeHtml(displayName)}</div>
            <div class="conv-time">${formatTime(conv.lastMessageAt)}</div>
          </div>
          <div class="conv-message ${isUnread ? 'unread' : ''}">${escapeHtml(lastMsg)}</div>
        </div>
      </div>`;
  }).join('');
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase();
  const filtered = conversations.filter(c => 
    c.user.nick.toLowerCase().includes(query)
  );
  renderConversations(filtered);
}

function selectConversation(id, userId, displayName, image) {
  currentConversation = { id };
  currentRecipient = { 
    id: userId, 
    nick: displayName,
    nickname: displayName,
    name: displayName,
    image: image 
  };
  renderConversations(conversations);
  renderChatHeader();
  loadMessages(id);
  
  // Mobile: ocultar lista y mostrar chat
  document.getElementById('conversationsList').classList.add('hidden');
  document.getElementById('chatView').classList.remove('hidden');
}

async function startConversationWithUser(userId) {
  try {
    const r = await fetch(API_BASE + '/messages/conversation/' + userId, {
      headers: { Authorization: authToken }
    });
    
    if (!r.ok) throw new Error('Error al iniciar conversación');
    
    const data = await r.json();
    console.log('🔍 DEBUG startConversation response:', data); // Debug
    
    currentConversation = { id: data.conversation.id };
    currentRecipient = data.conversation.user;
    
    console.log('🔍 DEBUG currentRecipient asignado:', currentRecipient); // Debug
    
    renderChatHeader();
    loadMessages(data.conversation.id);
    loadConversations();
    
    // Mobile
    document.getElementById('conversationsList').classList.add('hidden');
    document.getElementById('chatView').classList.remove('hidden');
  } catch (err) {
    console.error('Error startConversation:', err);
  }
}

function renderChatHeader() {
  if (!currentRecipient) return;
  
  console.log('🔍 DEBUG currentRecipient:', currentRecipient); // Debug
  
  const displayName = currentRecipient.name || 
                      currentRecipient.fullName ||
                      `${currentRecipient.firstName || ''} ${currentRecipient.lastName || ''}`.trim() || 
                      currentRecipient.nick || 
                      currentRecipient.nickname || 
                      currentRecipient.username ||
                      'Usuario';
  
  console.log('🔍 DEBUG displayName:', displayName); // Debug
  
  document.getElementById('chatView').innerHTML = `
    <div class="chat-header">
      <button class="btn ghost small" id="backToList" style="display:none">← Atrás</button>
      <img src="${resolveAvatar(currentRecipient)}" class="chat-avatar" alt="${displayName}">
      <div class="chat-user-info">
        <div class="chat-username">${escapeHtml(displayName)}</div>
        <div class="chat-status">Activo ahora</div>
      </div>
    </div>
    <div class="chat-body" id="chatBody"></div>
    <div class="chat-input-area">
      <textarea class="chat-input" id="chatInput" placeholder="Escribe un mensaje..." rows="1"></textarea>
      <button class="send-btn" id="sendBtn">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>`;
  
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('chatInput').addEventListener('keypress', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Mobile: botón volver
  const backBtn = document.getElementById('backToList');
  if (window.innerWidth <= 768) {
    backBtn.style.display = 'block';
    backBtn.addEventListener('click', () => {
      document.getElementById('conversationsList').classList.remove('hidden');
      document.getElementById('chatView').classList.add('hidden');
    });
  }
}

async function loadMessages(conversationId, polling = false) {
  try {
    const r = await fetch(API_BASE + '/messages/' + conversationId, {
      headers: { Authorization: authToken }
    });
    
    if (!r.ok) throw new Error('Error al cargar mensajes');
    
    const data = await r.json();
    const messages = data.messages || [];
    
    // Si es polling, solo actualizar si hay nuevos mensajes
    if (polling) {
      const chatBody = document.getElementById('chatBody');
      if (chatBody) {
        const currentCount = chatBody.querySelectorAll('.message').length;
        if (messages.length > currentCount) {
          renderMessages(messages);
        }
      }
    } else {
      renderMessages(messages);
    }
    
    markAsRead(conversationId);
  } catch (err) {
    console.error('Error loadMessages:', err);
  }
}

function renderMessages(messages) {
  const chatBody = document.getElementById('chatBody');
  if (!chatBody) return;
  
  const wasAtBottom = chatBody.scrollHeight - chatBody.scrollTop <= chatBody.clientHeight + 100;
  
  if (messages.length === 0) {
    chatBody.innerHTML = '<div class="empty-state"><p>Escribe el primer mensaje</p></div>';
    return;
  }
  
  chatBody.innerHTML = messages.map(msg => `
    <div class="message ${msg.isMine ? 'mine' : ''}">
      <img src="${resolveAvatar(msg.sender)}" class="msg-avatar" alt="${msg.sender.nick}">
      <div>
        <div class="msg-bubble">${escapeHtml(msg.content)}</div>
        <div class="msg-time">${formatTime(msg.createdAt)}</div>
      </div>
    </div>`).join('');
  
  // Auto-scroll si estaba al final o es el primer mensaje
  if (wasAtBottom || messages.length <= 1) {
    chatBody.scrollTop = chatBody.scrollHeight;
  }
}

async function sendMessage() {
  if (!currentConversation) return;
  
  const input = document.getElementById('chatInput');
  if (!input) return;
  
  const content = input.value.trim();
  if (!content) return;
  
  try {
    const r = await fetch(API_BASE + '/messages/' + currentConversation.id, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken
      },
      body: JSON.stringify({ content })
    });
    
    if (!r.ok) throw new Error('Error al enviar mensaje');
    
    input.value = '';
    input.style.height = 'auto';
    
    loadMessages(currentConversation.id);
    loadConversations();
  } catch (err) {
    console.error('Error sendMessage:', err);
    alert('Error al enviar el mensaje');
  }
}

async function markAsRead(conversationId) {
  try {
    await fetch(API_BASE + '/messages/' + conversationId + '/read', {
      method: 'PUT',
      headers: { Authorization: authToken }
    });
  } catch (err) {
    console.error('Error markAsRead:', err);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const diff = Date.now() - date;
  
  if (diff < 60000) return 'Ahora';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'd';
  
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

window.addEventListener('beforeunload', () => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
});
