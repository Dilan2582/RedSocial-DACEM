// smooth-navigation.js - Navegación fluida entre páginas

(function() {
  'use strict';

  // Verificar si el navegador soporta View Transitions API
  const supportsViewTransitions = 'startViewTransition' in document;

  // Configuración
  const TRANSITION_DURATION = 250; // ms - reducido para mayor fluidez

  // Guardar estado de scroll antes de navegar
  function saveScrollState() {
    sessionStorage.setItem('scrollY', window.scrollY.toString());
  }

  // Función para navegar con transición suave
  function navigateWithTransition(url) {
    saveScrollState();
    
    // Si el navegador soporta View Transitions API
    if (supportsViewTransitions && document.startViewTransition) {
      document.startViewTransition(() => {
        window.location.href = url;
      });
    } else {
      // Fallback: fade out suave
      document.body.style.transition = `opacity ${TRANSITION_DURATION}ms ease`;
      document.body.style.opacity = '0';
      
      setTimeout(() => {
        window.location.href = url;
      }, TRANSITION_DURATION);
    }
  }

  // Interceptar clicks en enlaces de navegación del sidebar
  function interceptNavigationClicks() {
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a.nav-item, a[href*=".html"]');
      
      if (link && link.href && !link.target && !link.hasAttribute('data-no-smooth')) {
        // Verificar si es un enlace interno
        const url = new URL(link.href);
        if (url.origin === window.location.origin && url.pathname.endsWith('.html')) {
          e.preventDefault();
          navigateWithTransition(link.href);
        }
      }
    });
  }

  // Precargar páginas al hacer hover (mejora el rendimiento)
  function setupPreloading() {
    const preloadedPages = new Set();
    let preloadTimeout;

    document.addEventListener('mouseover', function(e) {
      const link = e.target.closest('a.nav-item, a[href*=".html"]');
      
      if (link && link.href && !preloadedPages.has(link.href)) {
        const url = new URL(link.href);
        if (url.origin === window.location.origin && url.pathname.endsWith('.html')) {
          // Esperar un poco antes de precargar (evitar precargas innecesarias)
          clearTimeout(preloadTimeout);
          preloadTimeout = setTimeout(() => {
            const preloadLink = document.createElement('link');
            preloadLink.rel = 'prefetch';
            preloadLink.href = link.href;
            preloadLink.as = 'document';
            document.head.appendChild(preloadLink);
            
            preloadedPages.add(link.href);
          }, 100);
        }
      }
    });
  }

  // Fade in suave al cargar la página
  function fadeInOnLoad() {
    // Marcar como cargando
    document.documentElement.classList.add('page-loading');
    
    // Función para completar la carga
    function completeLoad() {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('page-loading');
        document.documentElement.classList.add('page-loaded');
        
        // Restaurar scroll si existe
        const savedScroll = sessionStorage.getItem('scrollY');
        if (savedScroll && window.location.href === sessionStorage.getItem('lastUrl')) {
          setTimeout(() => {
            window.scrollTo(0, parseInt(savedScroll));
            sessionStorage.removeItem('scrollY');
          }, 50);
        }
        
        sessionStorage.setItem('lastUrl', window.location.href);
      });
    }

    // Esperar a que todo esté listo
    if (document.readyState === 'complete') {
      completeLoad();
    } else {
      window.addEventListener('load', completeLoad);
      // Timeout de seguridad
      setTimeout(completeLoad, 800);
    }
  }

  // Prevenir flash blanco en navegación
  function preventFlash() {
    // Aplicar el tema inmediatamente
    const theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    
    // Aplicar color de fondo inmediatamente
    const bgColor = theme === 'dark' ? '#0b0f1a' : '#f8f9fc';
    document.documentElement.style.backgroundColor = bgColor;
    if (document.body) {
      document.body.style.backgroundColor = bgColor;
    }
  }

  // Inicializar
  function init() {
    preventFlash();
    fadeInOnLoad();
    interceptNavigationClicks();
    setupPreloading();
    
    // Restaurar opacidad si venimos de una transición fallida
    if (document.body && (document.body.style.opacity === '0' || document.body.style.opacity === '')) {
      document.body.style.opacity = '1';
    }
  }

  // Ejecutar lo antes posible
  preventFlash();
  
  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
