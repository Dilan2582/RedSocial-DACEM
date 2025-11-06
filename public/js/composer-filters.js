/**
 * Sistema de Filtros para el Compositor
 * Permite aplicar transformaciones a la imagen ANTES de publicar
 */

class ComposerFilters {
  constructor() {
    this.currentImage = null;
    this.currentFilter = 'original';
    this.filteredImages = {};
    this.isProcessing = false;
    this.init();
  }

  init() {
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupListeners());
    } else {
      this.setupListeners();
    }
  }

  setupListeners() {
    // Detectar cuando se selecciona una imagen
    const cmpFile = document.getElementById('cmpFile');
    if (cmpFile) {
      cmpFile.addEventListener('change', (e) => this.handleImageSelect(e));
    }

    // Detectar cuando se quita la imagen
    const cmpRemoveImg = document.getElementById('cmpRemoveImg');
    if (cmpRemoveImg) {
      cmpRemoveImg.addEventListener('click', () => this.clearFilters());
    }
  }

  /**
   * Maneja la selección de imagen
   */
  async handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validar que sea imagen
    if (!file.type.startsWith('image/')) {
      console.error('El archivo debe ser una imagen');
      return;
    }

    // Leer imagen como Data URL
    const reader = new FileReader();
    reader.onload = async (e) => {
      this.currentImage = e.target.result;
      this.currentFilter = 'original';
      this.filteredImages = { original: this.currentImage };

      // Mostrar container de filtros
      this.showFiltersContainer();

      // Generar filtros de forma asincrónica
      await this.generateFilters();
    };
    reader.readAsDataURL(file);
  }

  /**
   * Muestra el container de filtros
   */
  showFiltersContainer() {
    const container = this.getOrCreateFiltersContainer();
    container.classList.add('active');
  }

  /**
   * Obtiene o crea el container de filtros
   */
  getOrCreateFiltersContainer() {
    let container = document.getElementById('cmpFiltersContainer');

    if (!container) {
      const previewDiv = document.getElementById('cmpPreview');
      if (previewDiv) {
        container = document.createElement('div');
        container.id = 'cmpFiltersContainer';
        container.className = 'cmp-filters-container';
        container.innerHTML = `
          <div class="cmp-filters-label">
            <span>🎨 Filtros disponibles:</span>
            <small style="display: block; font-size: 11px; color: #666; margin-top: 4px;">
              Las transformaciones se generarán automáticamente al publicar con AWS Lambda
            </small>
          </div>
          <div class="cmp-filters-scroll" id="cmpFiltersScroll">
            <button class="cmp-filter-btn active" data-filter="original" data-icon="📸">Original</button>
            <button class="cmp-filter-btn" data-filter="t1" data-icon="⚫">B/N</button>
            <button class="cmp-filter-btn" data-filter="t2" data-icon="�">Sepia</button>
            <button class="cmp-filter-btn" data-filter="t3" data-icon="🌫️">Blur</button>
            <button class="cmp-filter-btn" data-filter="t4" data-icon="🔍">2x</button>
          </div>
          <div class="cmp-filter-preview" id="cmpFilterPreview">
            <img id="cmpFilterPreviewImg" alt="preview filtro">
            <div class="cmp-filter-preview-label" id="cmpFilterLabel">
              Original
              <small style="display: block; font-size: 10px; opacity: 0.7;">Vista previa</small>
            </div>
          </div>
        `;
        previewDiv.parentElement.insertBefore(container, previewDiv.nextSibling);

        // Event listeners para botones de filtro
        container.querySelectorAll('.cmp-filter-btn').forEach((btn) => {
          btn.addEventListener('click', () => this.applyFilter(btn.dataset.filter));
        });
      }
    }

    return container;
  }

  /**
   * Genera los filtros con previews para que el usuario elija
   */
  async generateFilters() {
    if (!this.currentImage) return;

    this.isProcessing = true;
    const scroll = document.getElementById('cmpFiltersScroll');
    const container = document.getElementById('cmpFiltersContainer');

    if (container) container.classList.add('active');

    // Mostrar mensaje de carga
    if (scroll) {
      scroll.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; padding: 12px; color: var(--muted);">
          <div class="spinner-small"></div>
          <span>Generando previews...</span>
        </div>
      `;
    }

    try {
      // Generar previews rápidos con Canvas (solo visual)
      const previews = await this.generateFilterPreviews(this.currentImage);

      this.filteredImages = {
        original: this.currentImage,
        ...previews
      };

      // Renderizar botones de selección
      this.renderFilterButtons();

      // Seleccionar 'original' por defecto y mostrar en preview
      this.currentFilter = 'original';
      this.updatePreviewImage('original');

    } catch (error) {
      console.error('Error generando previews:', error);
      this.filteredImages = { original: this.currentImage };
      this.renderFilterButtons();
      this.updatePreviewImage('original');
    }

    this.isProcessing = false;
  }

  /**
   * Genera previews de filtros usando Canvas (solo para visualización)
   */
  async generateFilterPreviews(imageUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Preview pequeño para velocidad
        const targetWidth = 300;
        const scale = targetWidth / img.width;
        canvas.width = targetWidth;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');

        const previews = {};

        // T1: Blanco y Negro
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          data[i] = data[i + 1] = data[i + 2] = gray;
        }
        ctx.putImageData(imageData, 0, 0);
        previews.t1 = canvas.toDataURL('image/jpeg', 0.75);

        // T2: Sepia (Vintage)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
          data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
          data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
        }
        ctx.putImageData(imageData, 0, 0);
        previews.t2 = canvas.toDataURL('image/jpeg', 0.75);

        // T3: Blur
        ctx.filter = 'blur(3px)';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';
        previews.t3 = canvas.toDataURL('image/jpeg', 0.75);

        // T5: Brillo Alto (High Brightness)
        ctx.filter = 'brightness(1.4) contrast(1.1)';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';
        previews.t5 = canvas.toDataURL('image/jpeg', 0.75);

        // T6: Oscuro (Dark/Moody)
        ctx.filter = 'brightness(0.7) contrast(1.3)';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';
        previews.t6 = canvas.toDataURL('image/jpeg', 0.75);

        // T7: Saturación Alta (Vibrant)
        ctx.filter = 'saturate(1.8) contrast(1.1)';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';
        previews.t7 = canvas.toDataURL('image/jpeg', 0.75);

        // T8: Vintage Cálido
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * 1.2);     // Más rojo
          data[i + 1] = Math.min(255, data[i + 1] * 1.1); // Poco más verde
          data[i + 2] = Math.min(255, data[i + 2] * 0.8); // Menos azul
        }
        ctx.putImageData(imageData, 0, 0);
        previews.t8 = canvas.toDataURL('image/jpeg', 0.75);

        // T9: Frío (Cool/Blue)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * 0.9);       // Menos rojo
          data[i + 1] = Math.min(255, data[i + 1] * 1.05); // Poco más verde
          data[i + 2] = Math.min(255, data[i + 2] * 1.3);  // Más azul
        }
        ctx.putImageData(imageData, 0, 0);
        previews.t9 = canvas.toDataURL('image/jpeg', 0.75);

        // T10: Invertido (Invert)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 255 - data[i];
          data[i + 1] = 255 - data[i + 1];
          data[i + 2] = 255 - data[i + 2];
        }
        ctx.putImageData(imageData, 0, 0);
        previews.t10 = canvas.toDataURL('image/jpeg', 0.75);

        resolve(previews);
      };

      img.onerror = () => resolve({});
      img.src = imageUrl;
    });
  }

  /**
   * Renderiza los botones de selección de filtros
   */
  renderFilterButtons() {
    const scroll = document.getElementById('cmpFiltersScroll');
    if (!scroll) return;

    const filters = [
      { id: 'original', icon: '🎞️', label: 'Original', desc: 'Sin filtro', available: true },
      { id: 't1', icon: '⬜', label: 'B/N', desc: 'Blanco y Negro', available: !!this.filteredImages.t1 },
      { id: 't2', icon: '�', label: 'Sepia', desc: 'Tono vintage', available: !!this.filteredImages.t2 },
      { id: 't3', icon: '✨', label: 'Blur', desc: 'Desenfoque artístico', available: !!this.filteredImages.t3 },
      { id: 't4', icon: '🔍', label: 'HD 2x', desc: 'Alta calidad (Lambda)', available: false },
      { id: 't5', icon: '☀️', label: 'Bright', desc: 'Brillo alto', available: !!this.filteredImages.t5 },
      { id: 't6', icon: '🌑', label: 'Dark', desc: 'Oscuro dramático', available: !!this.filteredImages.t6 },
      { id: 't7', icon: '🌈', label: 'Vibrant', desc: 'Colores intensos', available: !!this.filteredImages.t7 },
      { id: 't8', icon: '🔥', label: 'Warm', desc: 'Tonos cálidos', available: !!this.filteredImages.t8 },
      { id: 't9', icon: '❄️', label: 'Cool', desc: 'Tonos fríos', available: !!this.filteredImages.t9 },
      { id: 't10', icon: '🔄', label: 'Invert', desc: 'Colores invertidos', available: !!this.filteredImages.t10 }
    ];

    scroll.innerHTML = filters.map(f => `
      <button 
        class="cmp-filter-btn ${f.id === 'original' ? 'active' : ''}" 
        data-filter="${f.id}"
        ${!f.available ? 'disabled' : ''}
        title="${f.desc}"
      >
        <span style="font-size: 20px;">${f.icon}</span>
        <span style="font-weight: 700; font-size: 11px;">${f.label}</span>
      </button>
    `).join('');

    // Event listeners para selección
    scroll.querySelectorAll('.cmp-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const filter = btn.dataset.filter;
        this.applyFilter(filter);
      });
    });
  }

  /**
   * applyFilter - Aplica el filtro seleccionado y actualiza preview en tiempo real
   */
  applyFilter(filterName) {
    if (this.isProcessing) return;

    this.currentFilter = filterName;

    // Actualizar botones activos
    document.querySelectorAll('.cmp-filter-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === filterName);
    });

    // Actualizar preview en tiempo real
    this.updatePreviewImage(filterName);
  }

  /**
   * Actualiza la imagen de preview con el filtro seleccionado
   */
  updatePreviewImage(filterName) {
    const previewImg = document.getElementById('cmpPreviewImg');
    const badge = document.getElementById('cmpFilterBadge');

    if (!previewImg) return;

    // Actualizar imagen
    const imageUrl = this.filteredImages[filterName] || this.currentImage;
    if (imageUrl) {
      previewImg.src = imageUrl;
      
      // Agregar animación de transición
      previewImg.style.opacity = '0';
      setTimeout(() => {
        previewImg.style.opacity = '1';
      }, 50);
    }

    // Actualizar badge con el nombre del filtro
    if (badge) {
      const filterLabels = {
        original: '🎞️ Original',
        t1: '⬜ Blanco y Negro',
        t2: '� Sepia',
        t3: '✨ Blur',
        t4: '🔍 HD 2x',
        t5: '☀️ Bright',
        t6: '🌑 Dark',
        t7: '🌈 Vibrant',
        t8: '🔥 Warm',
        t9: '❄️ Cool',
        t10: '🔄 Invert'
      };
      
      badge.textContent = filterLabels[filterName] || '🎞️ Original';
      
      // Animación del badge
      badge.style.animation = 'none';
      setTimeout(() => {
        badge.style.animation = 'badgeSlide 0.3s ease';
      }, 10);
    }
  }

  /**
   * Limpia los filtros cuando se quita la imagen
   */
  clearFilters() {
    this.currentImage = null;
    this.currentFilter = 'original';
    this.filteredImages = {};

    const container = document.getElementById('cmpFiltersContainer');
    if (container) {
      container.classList.remove('active');
    }
  }

  /**
   * Obtiene la imagen filtrada actual como Blob
   */
  getFilteredImageBlob() {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      };
      img.src = this.filteredImages[this.currentFilter] || this.currentImage;
    });
  }

  /**
   * Obtiene información del filtro seleccionado por el usuario
   */
  getCurrentFilterInfo() {
    const filterLabels = {
      original: 'Original',
      t1: 'Blanco y Negro',
      t2: 'Sepia',
      t3: 'Blur',
      t4: 'HD 2x',
      t5: 'Bright',
      t6: 'Dark',
      t7: 'Vibrant',
      t8: 'Warm',
      t9: 'Cool',
      t10: 'Invert'
    };

    return {
      filter: this.currentFilter,
      filterType: this.currentFilter, // Para backend
      label: filterLabels[this.currentFilter] || 'Original',
      shouldApplyLambda: this.currentFilter !== 'original' // Si necesita procesamiento Lambda
    };
  }

  /**
   * Obtiene la imagen seleccionada para publicar
   */
  getSelectedImage() {
    return {
      dataUrl: this.filteredImages[this.currentFilter] || this.currentImage,
      filter: this.currentFilter,
      isOriginal: this.currentFilter === 'original'
    };
  }
}

// Instanciar globalmente
window.composerFilters = new ComposerFilters();

// Exportar para uso modular
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComposerFilters;
}
