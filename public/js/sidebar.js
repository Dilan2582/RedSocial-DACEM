// sidebar.js - Menú lateral unificado para toda la aplicación

(function() {
  'use strict';

  // Detectar la página actual
  const currentPage = location.pathname.split('/').pop() || 'user.html';
  
  // Variable para almacenar el ID del usuario actual
  let currentUserId = null;

  // Obtener ID del usuario actual desde localStorage o token
  function getCurrentUserId() {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Decodificar el JWT para obtener el userId
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub || payload.id || payload.userId;
      }
    } catch (error) {
      console.error('Sidebar: Error obteniendo userId:', error);
    }
    return null;
  }

  // Configuración del menú
  function getMenuItems() {
    currentUserId = getCurrentUserId();
    
    return [
      {
        id: 'home',
        label: 'Inicio',
        href: 'user.html',
        icon: 'home',
        pages: ['user.html', 'index.html', '']
      },
      {
        id: 'notifications',
        label: 'Notificaciones',
        href: 'notifications.html',
        icon: 'heart',
        pages: ['notifications.html'],
        badge: 'notificationsBadge'
      },
      {
        id: 'messages',
        label: 'Mensajes',
        href: 'messages.html',
        icon: 'message-circle',
        pages: ['messages.html'],
        badge: 'unreadBadge'
      },
      {
        id: 'profile',
        label: 'Mi perfil',
        href: currentUserId ? `profile.html?id=${currentUserId}` : 'profile.html',
        icon: 'user',
        pages: ['profile.html']
      }
    ];
  }

  // Generar HTML del sidebar
  function generateSidebar() {
    const menuItems = getMenuItems(); // Obtener items actualizados
    
    const sidebarHTML = `
      <aside class="sidebar card">
        <nav class="nav">
          ${menuItems.map(item => {
            const isActive = item.pages.includes(currentPage);
            const activeClass = isActive ? 'active' : '';
            
            return `
              <a class="nav-item ${activeClass}" href="${item.href}" data-page="${item.id}">
                <i class="nav-ico" data-lucide="${item.icon}"></i> ${item.label}
                ${item.badge ? `<span class="unread-badge" id="${item.badge}" style="display:none"></span>` : ''}
              </a>
            `;
          }).join('')}
        </nav>
      </aside>
    `;
    
    return sidebarHTML;
  }

  // Insertar el sidebar en el DOM
  function initSidebar() {
    // Buscar un contenedor específico para sidebar (usado en pages como messages.html)
    const sidebarContainer = document.getElementById('sidebar-container');
    
    if (sidebarContainer) {
      // Si existe un contenedor específico, llenarlo con el HTML del sidebar (sin el <aside> externo)
      const menuItems = getMenuItems();
      const navHTML = `
        <nav class="nav">
          ${menuItems.map(item => {
            const isActive = item.pages.includes(currentPage);
            const activeClass = isActive ? 'active' : '';
            
            return `
              <a class="nav-item ${activeClass}" href="${item.href}" data-page="${item.id}">
                <i class="nav-ico" data-lucide="${item.icon}"></i> ${item.label}
                ${item.badge ? `<span class="unread-badge" id="${item.badge}" style="display:none"></span>` : ''}
              </a>
            `;
          }).join('')}
        </nav>
      `;
      sidebarContainer.innerHTML = navHTML;
      console.log('Sidebar: Contenido insertado en #sidebar-container');
    } else {
      // Buscar el contenedor del layout (para pages como user.html, notifications.html, profile.html)
      const layoutContainer = document.querySelector('.layout');
      
      if (!layoutContainer) {
        console.warn('Sidebar: No se encontró el contenedor .layout ni #sidebar-container');
        return;
      }

      // Verificar si ya existe un sidebar
      const existingSidebar = layoutContainer.querySelector('.sidebar');
      
      if (existingSidebar) {
        // Reemplazar el sidebar existente
        existingSidebar.outerHTML = generateSidebar();
        console.log('Sidebar: Reemplazado exitosamente');
      } else {
        // Insertar al inicio del layout
        layoutContainer.insertAdjacentHTML('afterbegin', generateSidebar());
        console.log('Sidebar: Insertado exitosamente');
      }
    }

    // Inicializar iconos de Lucide si está disponible
    if (window.lucide) {
      lucide.createIcons();
    } else {
      // Esperar a que Lucide esté disponible
      setTimeout(() => {
        if (window.lucide) {
          lucide.createIcons();
        }
      }, 100);
    }
  }

  // Actualizar badges de notificaciones
  async function updateNotificationsBadge() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const API_BASE = location.origin;
      const response = await fetch(`${API_BASE}/api/notifications/unread-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      const badge = document.getElementById('notificationsBadge');
      if (!badge) return;

      if (data.ok && data.count > 0) {
        badge.textContent = data.count > 99 ? '99+' : data.count;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    } catch (error) {
      console.error('Sidebar: Error actualizando badge de notificaciones:', error);
    }
  }

  // Actualizar badges de mensajes
  async function updateMessagesBadge() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const API_BASE = location.origin;
      const response = await fetch(`${API_BASE}/api/messages/unread-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      const badge = document.getElementById('unreadBadge');
      if (!badge) return;

      if (data.ok && data.count > 0) {
        badge.textContent = data.count > 99 ? '99+' : data.count;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    } catch (error) {
      console.error('Sidebar: Error actualizando badge de mensajes:', error);
    }
  }

  // Función principal de inicialización
  function init() {
    initSidebar();
    
    // Actualizar badges después de un pequeño delay para asegurar que el DOM esté listo
    setTimeout(() => {
      updateNotificationsBadge();
      updateMessagesBadge();
    }, 500);
  }

  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exponer función para actualizar badges externamente si es necesario
  window.updateSidebarBadges = function() {
    updateNotificationsBadge();
    updateMessagesBadge();
  };

  console.log('Sidebar: Script cargado para página:', currentPage);

})();
