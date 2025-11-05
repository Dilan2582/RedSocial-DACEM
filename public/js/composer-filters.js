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
          <div class="cmp-filters-label">Filtros:</div>
          <div class="cmp-filters-scroll" id="cmpFiltersScroll">
            <button class="cmp-filter-btn active" data-filter="original" data-icon="🎞️">Original</button>
            <button class="cmp-filter-btn" data-filter="t1" data-icon="⬜">B/N</button>
            <button class="cmp-filter-btn" data-filter="t2" data-icon="🔶">Sepia</button>
            <button class="cmp-filter-btn" data-filter="t3" data-icon="✨">Blur</button>
          </div>
          <div class="cmp-filter-preview" id="cmpFilterPreview">
            <img id="cmpFilterPreviewImg" alt="preview filtro">
            <div class="cmp-filter-preview-label" id="cmpFilterLabel">Original</div>
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
   * Genera los filtros de forma asincrónica
   */
  async generateFilters() {
    if (!this.currentImage) return;

    this.isProcessing = true;
    const scroll = document.getElementById('cmpFiltersScroll');

    // Mostrar indicador de carga
    if (scroll) {
      const loadingIndicator = document.createElement('div');
      loadingIndicator.className = 'cmp-filter-loading';
      loadingIndicator.textContent = 'Generando filtros...';
      scroll.appendChild(loadingIndicator);
    }

    try {
      // Generar filtros usando Canvas
      const filters = await this.generateCanvasFilters(this.currentImage);

      this.filteredImages = {
        original: this.currentImage,
        t1: filters.blackWhite,
        t2: filters.sepia,
        t3: filters.blur
      };

      // Actualizar preview
      this.updatePreview('original');

      // Remover indicador de carga
      const loadingIndicator = scroll.querySelector('.cmp-filter-loading');
      if (loadingIndicator) loadingIndicator.remove();

    } catch (error) {
      console.error('Error generando filtros:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Genera filtros usando Canvas (más rápido que Sharp en el cliente)
   */
  async generateCanvasFilters(imageUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        // Original
        ctx.drawImage(img, 0, 0);
        const original = canvas.toDataURL('image/jpeg', 0.8);

        // Blanco y Negro
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }

        ctx.putImageData(imageData, 0, 0);
        const blackWhite = canvas.toDataURL('image/jpeg', 0.8);

        // Sepia
        ctx.drawImage(img, 0, 0);
        const imageSepiaData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const sepiaData = imageSepiaData.data;

        for (let i = 0; i < sepiaData.length; i += 4) {
          const r = sepiaData[i];
          const g = sepiaData[i + 1];
          const b = sepiaData[i + 2];

          sepiaData[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
          sepiaData[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
          sepiaData[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
        }

        ctx.putImageData(imageSepiaData, 0, 0);
        const sepia = canvas.toDataURL('image/jpeg', 0.8);

        // Blur (usando filtro CSS simulado)
        const blur = this.applyBlurEffect(imageUrl);

        resolve({ blackWhite, sepia, blur: blur || imageUrl });
      };

      img.onerror = () => {
        resolve({ blackWhite: imageUrl, sepia: imageUrl, blur: imageUrl });
      };

      img.src = imageUrl;
    });
  }

  /**
   * Aplica efecto blur (aproximado con Canvas)
   */
  applyBlurEffect(imageUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    return new Promise((resolve) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        // Aplicar filtro blur con canvas
        ctx.filter = 'blur(3px)';
        ctx.drawImage(img, 0, 0);

        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };

      img.onerror = () => resolve(imageUrl);
      img.src = imageUrl;
    });
  }

  /**
   * Aplica un filtro
   */
  applyFilter(filterName) {
    if (this.isProcessing) return;

    this.currentFilter = filterName;

    // Actualizar botones activos
    document.querySelectorAll('.cmp-filter-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === filterName);
    });

    // Actualizar preview
    this.updatePreview(filterName);
  }

  /**
   * Actualiza el preview del filtro
   */
  updatePreview(filterName) {
    const preview = document.getElementById('cmpFilterPreview');
    const previewImg = document.getElementById('cmpFilterPreviewImg');
    const label = document.getElementById('cmpFilterLabel');

    if (previewImg && this.filteredImages[filterName]) {
      previewImg.src = this.filteredImages[filterName];
      preview?.classList.add('active');

      // Actualizar label
      const labels = {
        original: '🎞️ Original',
        t1: '⬜ Blanco y Negro',
        t2: '🔶 Sepia',
        t3: '✨ Blur'
      };

      if (label) label.textContent = labels[filterName] || 'Original';
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
   * Obtiene información del filtro actual
   */
  getCurrentFilterInfo() {
    return {
      filter: this.currentFilter,
      label: {
        original: 'Original',
        t1: 'Blanco y Negro',
        t2: 'Sepia',
        t3: 'Blur'
      }[this.currentFilter] || 'Original'
    };
  }
}

// Instanciar globalmente
window.composerFilters = new ComposerFilters();

// Exportar para uso modular
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComposerFilters;
}
