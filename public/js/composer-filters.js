/**
 * Sistema de Filtros para el Compositor (FIX IDs consistentes)
 * - Todos los filtros usan: original, t1..t10
 * - Normaliza alias como t1_bw → t1, t2_sepia → t2, etc.
 */

class ComposerFilters {
  constructor() {
    this.currentImage = null;
    this.currentFilter = 'original';
    this.filteredImages = {};
    this.isProcessing = false;
    this.init();
  }

  /* ================== Init / DOM ================== */
  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupListeners());
    } else {
      this.setupListeners();
    }
  }

  setupListeners() {
    const cmpFile = document.getElementById('cmpFile');
    if (cmpFile) cmpFile.addEventListener('change', (e) => this.handleImageSelect(e));

    const cmpRemoveImg = document.getElementById('cmpRemoveImg');
    if (cmpRemoveImg) cmpRemoveImg.addEventListener('click', () => this.clearFilters());
  }

  /* ================== Utils ================== */
  // Acepta alias (por si en algún punto llegan estos nombres)
  normalizeFilterName(name) {
    if (!name || name === 'original') return 'original';
    
    // Mapa de alias a IDs normalizados
    const map = {
      't1_bw': 't1', 't2_sepia': 't2', 't3_blur': 't3', 't4_upscale': 't4',
      't5_bright': 't5', 't6_dark': 't6', 't7_vibrant': 't7',
      't8_warm': 't8', 't9_cool': 't9', 't10_invert': 't10'
    };
    
    // Si es un alias conocido, usar su ID normalizado
    if (map[name]) return map[name];
    
    // Si ya es un ID normalizado (t1-t10), usarlo directamente
    if (/^t([1-9]|10)$/.test(name)) return name;
    
    // Si no coincide con ningún patrón conocido, usar original
    return 'original';
  }

  /* ================== Select / Preview ================== */
  async handleImageSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      console.error('El archivo debe ser una imagen');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      this.currentImage = e.target.result;
      this.currentFilter = 'original';
      this.filteredImages = { original: this.currentImage };

      const previewContainer = document.getElementById('cmpPreview');
      const previewImg = document.getElementById('cmpPreviewImg');
      if (previewContainer) previewContainer.style.display = 'flex';
      if (previewImg) {
        previewImg.src = this.currentImage;
        previewImg.style.display = 'block';
      }

      this.showFiltersContainer();
      await this.generateFilters();
      this.updatePreviewImage('original');
    };
    reader.readAsDataURL(file);
  }

  showFiltersContainer() {
    const container = this.getOrCreateFiltersContainer();
    container.classList.add('active');
  }

  getOrCreateFiltersContainer() {
    let container = document.getElementById('cmpFiltersContainer');
    if (container) return container;

    const previewDiv = document.getElementById('cmpPreview');
    if (!previewDiv) return document.createElement('div');

    container = document.createElement('div');
    container.id = 'cmpFiltersContainer';
    container.className = 'cmp-filters-container';
    // 👉 IDs ya consistentes (original, t1..t10)
    container.innerHTML = `
      <div class="cmp-filters-label">
        <span>Selecciona un filtro para publicar</span>
      </div>
      <div class="cmp-filters-scroll" id="cmpFiltersScroll"></div>
      <div class="cmp-filter-preview" id="cmpFilterPreview" style="display:none">
        <img id="cmpFilterPreviewImg" alt="preview filtro">
        <div class="cmp-filter-preview-label" id="cmpFilterLabel">Original</div>
      </div>
    `;
    previewDiv.parentElement.insertBefore(container, previewDiv.nextSibling);
    return container;
  }

  /* ================== Previews ================== */
  async generateFilters() {
    if (!this.currentImage) return;
    this.isProcessing = true;

    const scroll = document.getElementById('cmpFiltersScroll');
    const container = document.getElementById('cmpFiltersContainer');
    if (container) container.classList.add('active');

    if (scroll) {
      scroll.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;padding:12px;color:var(--muted)">
          <div class="spinner-small"></div><span>Generando previews...</span>
        </div>`;
    }

    try {
      const previews = await this.generateFilterPreviews(this.currentImage);
      this.filteredImages = { original: this.currentImage, ...previews };
      this.renderFilterButtons();
      this.currentFilter = 'original';
      this.updatePreviewImage('original');
    } catch (err) {
      console.error('Error generando previews:', err);
      this.filteredImages = { original: this.currentImage };
      this.renderFilterButtons();
      this.updatePreviewImage('original');
    } finally {
      this.isProcessing = false;
    }
  }

  async generateFilterPreviews(imageUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const targetWidth = 300;
        const scale = targetWidth / img.width;
        canvas.width = targetWidth;
        canvas.height = Math.max(1, img.height * scale);
        const ctx = canvas.getContext('2d');
        const previews = {};

        // T1: B/N
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let id = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let d = id.data;
        for (let i=0;i<d.length;i+=4){
          const g = d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114;
          d[i]=d[i+1]=d[i+2]=g;
        }
        ctx.putImageData(id,0,0);
        previews.t1 = canvas.toDataURL('image/jpeg', .75);

        // T2: Sepia
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        id = ctx.getImageData(0,0,canvas.width,canvas.height);
        d = id.data;
        for (let i=0;i<d.length;i+=4){
          const r=d[i], g=d[i+1], b=d[i+2];
          d[i]=Math.min(255, r*.393 + g*.769 + b*.189);
          d[i+1]=Math.min(255, r*.349 + g*.686 + b*.168);
          d[i+2]=Math.min(255, r*.272 + g*.534 + b*.131);
        }
        ctx.putImageData(id,0,0);
        previews.t2 = canvas.toDataURL('image/jpeg', .75);

        // T3: Blur
        ctx.filter = 'blur(3px)'; ctx.drawImage(img,0,0,canvas.width,canvas.height); ctx.filter='none';
        previews.t3 = canvas.toDataURL('image/jpeg', .75);

        // T5: Bright
        ctx.filter = 'brightness(1.4) contrast(1.1)'; ctx.drawImage(img,0,0,canvas.width,canvas.height); ctx.filter='none';
        previews.t5 = canvas.toDataURL('image/jpeg', .75);

        // T6: Dark
        ctx.filter = 'brightness(0.7) contrast(1.3)'; ctx.drawImage(img,0,0,canvas.width,canvas.height); ctx.filter='none';
        previews.t6 = canvas.toDataURL('image/jpeg', .75);

        // T7: Vibrant
        ctx.filter = 'saturate(1.8) contrast(1.1)'; ctx.drawImage(img,0,0,canvas.width,canvas.height); ctx.filter='none';
        previews.t7 = canvas.toDataURL('image/jpeg', .75);

        // T8: Warm
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        id = ctx.getImageData(0,0,canvas.width,canvas.height); d = id.data;
        for (let i=0;i<d.length;i+=4){ d[i]=Math.min(255, d[i]*1.2); d[i+1]=Math.min(255, d[i+1]*1.1); d[i+2]=Math.min(255, d[i+2]*0.8); }
        ctx.putImageData(id,0,0);
        previews.t8 = canvas.toDataURL('image/jpeg', .75);

        // T9: Cool
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        id = ctx.getImageData(0,0,canvas.width,canvas.height); d = id.data;
        for (let i=0;i<d.length;i+=4){ d[i]=Math.min(255,d[i]*0.9); d[i+1]=Math.min(255,d[i+1]*1.05); d[i+2]=Math.min(255,d[i+2]*1.3); }
        ctx.putImageData(id,0,0);
        previews.t9 = canvas.toDataURL('image/jpeg', .75);

        // T10: Invert
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        id = ctx.getImageData(0,0,canvas.width,canvas.height); d = id.data;
        for (let i=0;i<d.length;i+=4){ d[i]=255-d[i]; d[i+1]=255-d[i+1]; d[i+2]=255-d[i+2]; }
        ctx.putImageData(id,0,0);
        previews.t10 = canvas.toDataURL('image/jpeg', .75);

        resolve(previews);
      };
      img.onerror = () => resolve({});
      img.src = imageUrl;
    });
  }

  renderFilterButtons() {
    const scroll = document.getElementById('cmpFiltersScroll');
    if (!scroll) return;

    const filters = [
      { id:'original', label:'Original', available:true },
      { id:'t1', label:'B/N', available:!!this.filteredImages.t1 },
      { id:'t2', label:'Sepia', available:!!this.filteredImages.t2 },
      { id:'t3', label:'Blur', available:!!this.filteredImages.t3 },
      { id:'t4', label:'HD 2x', available:false },        // reservado para Lambda
      { id:'t5', label:'Bright', available:!!this.filteredImages.t5 },
      { id:'t6', label:'Dark', available:!!this.filteredImages.t6 },
      { id:'t7', label:'Vibrant', available:!!this.filteredImages.t7 },
      { id:'t8', label:'Warm', available:!!this.filteredImages.t8 },
      { id:'t9', label:'Cool', available:!!this.filteredImages.t9 },
      { id:'t10', label:'Invert', available:!!this.filteredImages.t10 }
    ];

    scroll.innerHTML = filters.map(f => `
      <button class="cmp-filter-btn ${f.id==='original'?'active':''}"
              data-filter="${f.id}" ${!f.available?'disabled':''}>
        ${f.label}
      </button>
    `).join('');

    scroll.querySelectorAll('.cmp-filter-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        if (btn.disabled) return;
        this.applyFilter(btn.dataset.filter);
      });
    });
  }

  /* ================== Apply ================== */
  applyFilter(filter) {
    if (this.isProcessing) return;
    
    // Normalizar el ID del filtro y verificar si existe
    const normalized = this.normalizeFilterName(filter);
    if (!this.filteredImages[normalized] && normalized !== 'original') {
      console.warn(`Filtro ${normalized} no disponible, usando original`);
      this.currentFilter = 'original';
      this.updatePreviewImage('original');
      return;
    }

    // Actualizar estado y UI
    this.currentFilter = normalized;
    document.querySelectorAll('.cmp-filter-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === normalized);
    });

    // Actualizar previsualización
    this.updatePreviewImage(normalized);
  }

  updatePreviewImage(filterName) {
    const f = this.normalizeFilterName(filterName);
    const previewContainer = document.getElementById('cmpPreview');
    const previewImg = document.getElementById('cmpPreviewImg');
    const badge = document.getElementById('cmpFilterBadge');

    if (previewContainer) previewContainer.style.display = 'flex';

    const imageUrl = this.filteredImages[f] || this.currentImage;
    if (imageUrl && previewImg) {
      previewImg.style.display = 'block';
      previewImg.style.opacity = '0';
      previewImg.src = imageUrl;
      previewImg.onload = () => {
        previewImg.style.opacity = '1';
        const box = document.querySelector('.cmp-preview-main');
        if (box) {
          box.style.display = 'flex';
          box.style.alignItems = 'center';
          box.style.justifyContent = 'center';
        }
      };
    }

    if (badge) {
      const labels = { original:'🎞️ Original', t1:'B/N', t2:'Sepia', t3:'Blur', t4:'HD 2x', t5:'Bright', t6:'Dark', t7:'Vibrant', t8:'Warm', t9:'Cool', t10:'Invert' };
      badge.textContent = labels[f] || '🎞️ Original';
      badge.style.animation = 'none'; setTimeout(()=>{ badge.style.animation = 'badgeSlide .3s ease' },10);
    }
  }

  /* ================== Clear / Get ================== */
  clearFilters() {
    this.currentImage = null;
    this.currentFilter = 'original';
    this.filteredImages = {};

    const previewContainer = document.getElementById('cmpPreview');
    if (previewContainer) previewContainer.style.display = 'none';

    const previewImg = document.getElementById('cmpPreviewImg');
    if (previewImg) { previewImg.src = ''; previewImg.style.display = 'none'; }

    const container = document.getElementById('cmpFiltersContainer');
    if (container) container.classList.remove('active');
  }

  getFilteredImageBlob() {
    return new Promise((resolve) => {
      const src = this.filteredImages[this.currentFilter] || this.currentImage;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      };
      img.src = src;
    });
  }

  getCurrentFilterInfo() {
    const normalized = this.normalizeFilterName(this.currentFilter);
    // Mapa de nombres amigables para los filtros
    const labels = {
      'original': 'Original',
      't1': 'Blanco y Negro',
      't2': 'Sepia',
      't3': 'Blur',
      't4': 'HD 2x',
      't5': 'Bright',
      't6': 'Dark',
      't7': 'Vibrant',
      't8': 'Warm',
      't9': 'Cool',
      't10': 'Invert'
    };

    // Para el backend, necesitamos asegurarnos que el tipo de filtro sea consistente
    const filterTypes = {
      't1': 't1_bw',
      't2': 't2_sepia',
      't3': 't3_blur',
      't4': 't4_upscale',
      't5': 't5_bright',
      't6': 't6_dark',
      't7': 't7_vibrant',
      't8': 't8_warm',
      't9': 't9_cool',
      't10': 't10_invert'
    };

    return {
      filter: normalized,
      filterType: filterTypes[normalized] || 'original',  // Para compatibilidad con el backend
      label: labels[normalized] || 'Original',
      shouldApplyLambda: normalized !== 'original'
    };
  }

  getSelectedImage() {
    const normalized = this.normalizeFilterName(this.currentFilter);
    const imageData = this.filteredImages[normalized] || this.currentImage;
    
    if (!imageData) {
      console.error('No hay imagen seleccionada o filtro válido');
      return null;
    }

    return {
      dataUrl: imageData,
      filter: normalized,
      filterType: normalized === 'original' ? 'original' : `t${normalized.substring(1)}_${this.getFilterSuffix(normalized)}`,
      isOriginal: normalized === 'original'
    };
  }

  // Helper para obtener el sufijo del filtro para el backend
  getFilterSuffix(filter) {
    const suffixes = {
      't1': 'bw',
      't2': 'sepia',
      't3': 'blur',
      't4': 'upscale',
      't5': 'bright',
      't6': 'dark',
      't7': 'vibrant',
      't8': 'warm',
      't9': 'cool',
      't10': 'invert'
    };
    return suffixes[filter] || '';
  }

  /* ================== (Opcional) URLs transformadas S3 ================== */
  static getTransformedUrls(originalUrl) {
    if (!originalUrl) return {};
    const basePath = originalUrl.replace(/original\.\w+$/, '');
    return {
      original: originalUrl,
      t1: `${basePath}t1.jpg`,
      t2: `${basePath}t2.jpg`,
      t3: `${basePath}t3.jpg`,
      t4: `${basePath}t4.jpg`,
      t5: `${basePath}t5.jpg`,
      t6: `${basePath}t6.jpg`,
      t7: `${basePath}t7.jpg`,
      t8: `${basePath}t8.jpg`,
      t9: `${basePath}t9.jpg`,
      t10: `${basePath}t10.jpg`,
      thumb: `${basePath}thumb.jpg`
    };
  }
}

// Instancia global
window.composerFilters = new ComposerFilters();

// Export CommonJS (tests / bundlers)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComposerFilters;
}
