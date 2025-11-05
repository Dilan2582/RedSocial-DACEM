class ImageTransformations {
  constructor() {
    this.currentPost = null;
    this.init();
  }

  init() {
    // Crear modal para transformaciones si no existe1
    if (!document.getElementById('transformationModal')) {
      this.createModal();
    }
  }

  createModal() {
    const modal = document.createElement('div');
    modal.id = 'transformationModal';
    modal.className = 'transformation-modal';
    modal.innerHTML = `
      <div class="transformation-modal-content">
        <button class="transformation-modal-close" id="closeTransformationModal">&times;</button>
        <div class="transformation-modal-header">
          <h3>Transformaciones de Imagen</h3>
          <p>Variantes automáticas generadas</p>
        </div>
        <div class="transformation-modal-gallery" id="transformationGallery"></div>
      </div>
    `;
    document.body.appendChild(modal);

    // Event listener para cerrar modal
    document.getElementById('closeTransformationModal').addEventListener('click', () => {
      modal.classList.remove('active');
    });

    // Cerrar modal al hacer clic fuera
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }

  /**
   * Muestra el botón de transformaciones en un post
   * @param {HTMLElement} postElement - Elemento del post
   * @param {Object} mediaUrls - URLs de las transformaciones
   */
  addTransformationButton(postElement, mediaUrls) {
    // Buscar el contenedor de acciones del post
    const actionsContainer = postElement.querySelector('.post-actions, .post-footer, [data-role="post-actions"]');
    
    if (!actionsContainer) {
      console.warn('No se encontró contenedor de acciones del post');
      return;
    }

    // Crear botón
    const button = document.createElement('button');
    button.className = 'btn-view-transformations';
    button.innerHTML = `
      <span>🖼️</span>
      <span>Transformaciones</span>
    `;

    // Event listener
    button.addEventListener('click', () => {
      this.showTransformations(mediaUrls, postElement);
    });

    // Agregar botón al contenedor
    actionsContainer.appendChild(button);
  }

  /**
   * Muestra el modal con las transformaciones
   * @param {Object} mediaUrls - URLs de las imágenes
   * @param {HTMLElement} sourceElement - Elemento del post
   */
  async showTransformations(mediaUrls, sourceElement) {
    const gallery = document.getElementById('transformationGallery');
    gallery.innerHTML = '';

    // Validar que tenga URL de original
    if (!mediaUrls.original) {
      gallery.innerHTML = '<div class="transformation-error">No se encontró la imagen original</div>';
      document.getElementById('transformationModal').classList.add('active');
      return;
    }

    // Crear tarjetas para cada transformación
    const transformations = [
      {
        type: 'original',
        label: 'Original',
        description: 'Imagen sin modificaciones',
        icon: '🎞️',
        url: mediaUrls.original
      },
      {
        type: 't1',
        label: 'Blanco y Negro',
        description: 'Versión en escala de grises',
        icon: '⬜',
        url: mediaUrls.t1
      },
      {
        type: 't2',
        label: 'Sepia',
        description: 'Efecto vintage sepia',
        icon: '🔶',
        url: mediaUrls.t2
      },
      {
        type: 't3',
        label: 'Blur Suave',
        description: 'Efecto de desenfoque',
        icon: '✨',
        url: mediaUrls.t3
      },
      {
        type: 'thumb',
        label: 'Miniatura',
        description: 'Versión comprimida para carga rápida',
        icon: '📷',
        url: mediaUrls.thumb
      }
    ];

    // Cargar imágenes
    for (const transform of transformations) {
      if (!transform.url) continue;

      const card = document.createElement('div');
      card.className = 'transformation-card transformation-generating';

      card.innerHTML = `
        <img 
          src="${transform.url}" 
          alt="${transform.label}"
          loading="lazy"
          onload="this.parentElement.classList.remove('transformation-generating')"
          onerror="this.parentElement.innerHTML = '<div class=\"transformation-error\">Error al cargar imagen</div>'"
        />
        <div class="transformation-card-info">
          <h4 class="transformation-card-title">
            <span>${transform.icon}</span> ${transform.label}
          </h4>
          <p class="transformation-card-desc">${transform.description}</p>
        </div>
      `;

      // Agregar opción de descargar
      card.addEventListener('click', () => {
        this.downloadImage(transform.url, `${transform.label}.jpg`);
      });

      gallery.appendChild(card);
    }

    // Mostrar modal
    document.getElementById('transformationModal').classList.add('active');
  }

  /**
   * Descarga una imagen
   * @param {string} url - URL de la imagen
   * @param {string} filename - Nombre del archivo
   */
  downloadImage(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * Inyecta las transformaciones en los posts existentes
   * @param {Array} posts - Array de posts con media
   */
  injectToExistingPosts(posts) {
    posts.forEach((post, index) => {
      // Buscar elemento del post en el DOM
      const postElement = document.querySelector(`[data-post-id="${post._id}"]`);
      
      if (postElement && post.media) {
        this.addTransformationButton(postElement, {
          original: post.media.original,
          thumb: post.media.thumb,
          t1: post.media.t1,
          t2: post.media.t2,
          t3: post.media.t3
        });
      }
    });
  }

  /**
   * Crea un badge indicador de transformaciones
   * @returns {HTMLElement} Elemento del badge
   */
  createBadge() {
    const badge = document.createElement('span');
    badge.className = 'transformation-badge';
    badge.textContent = 'Transformaciones disponibles';
    badge.title = 'Haz clic para ver variantes de esta imagen';
    return badge;
  }

  /**
   * Muestra indicador de que se están generando transformaciones
   * @param {HTMLElement} container - Elemento contenedor
   */
  showGeneratingIndicator(container) {
    const indicator = document.createElement('div');
    indicator.className = 'transformation-loading';
    indicator.innerHTML = 'Generando transformaciones...';
    container.appendChild(indicator);
    return indicator;
  }

  /**
   * Obtiene información de transformaciones para un post
   * @param {string} postId - ID del post
   * @returns {Promise<Object>} Información de transformaciones
   */
  async getTransformationInfo(postId) {
    try {
      const response = await fetch(`/api/posts/${postId}/transformations`);
      if (!response.ok) throw new Error('Error al obtener transformaciones');
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  }

  /**
   * Muestra un preview de transformaciones en miniatura
   * @param {HTMLElement} container - Elemento contenedor
   * @param {Object} mediaUrls - URLs de las imágenes
   */
  createMiniGallery(container, mediaUrls) {
    const gallery = document.createElement('div');
    gallery.className = 'transformation-gallery';

    const items = [
      { label: 'Original', url: mediaUrls.original, icon: '🎞️' },
      { label: 'B/N', url: mediaUrls.t1, icon: '⬜' },
      { label: 'Sepia', url: mediaUrls.t2, icon: '🔶' },
      { label: 'Blur', url: mediaUrls.t3, icon: '✨' }
    ];

    items.forEach(item => {
      if (!item.url) return;

      const element = document.createElement('div');
      element.className = 'transformation-item';
      element.innerHTML = `
        <img src="${item.url}" alt="${item.label}" loading="lazy" />
        <div class="transformation-label">
          <span class="transformation-label-icon">${item.icon}</span>
          ${item.label}
        </div>
      `;

      element.addEventListener('click', () => {
        this.showTransformations(mediaUrls);
      });

      gallery.appendChild(element);
    });

    container.appendChild(gallery);
  }
}

// Instanciar globalmente
window.imageTransformations = new ImageTransformations();

// Exportar para uso modular
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImageTransformations;
}
