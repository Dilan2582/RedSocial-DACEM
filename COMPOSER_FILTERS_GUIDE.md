# Sistema de Filtros en el Compositor

## 📸 Cómo funciona

### Flujo de Usuario:

1. **Usuario hace clic en "Imagen"** 
   - Selecciona una foto de su dispositivo
   
2. **Se muestra preview de la imagen**
   - Aparece debajo del compositor

3. **Se generan los filtros automáticamente**
   - **Original** (🎞️): Imagen sin modificaciones
   - **Blanco y Negro** (⬜): Escala de grises
   - **Sepia** (🔶): Efecto vintage/marrón
   - **Blur** (✨): Desenfoque suave

4. **Usuario selecciona un filtro** (opcional)
   - Al hacer clic en un filtro, se ve el preview
   - El filtro seleccionado aparece marcado en azul

5. **Usuario publica**
   - Si seleccionó un filtro diferente a "Original", se publica con ese filtro aplicado
   - Si dejó "Original", se publica la imagen sin modificaciones

## 🎨 Filtros disponibles

### 🎞️ Original
- La imagen sin cambios
- Calidad máxima
- Recomendado para fotos naturales

### ⬜ Blanco y Negro
- Convierte a escala de grises
- Mayor impacto emocional
- Resalta texturas y contrastes
- Estilo artístico

### 🔶 Sepia
- Efecto vintage/retro
- Tonos cálidos marrones
- Nostálgico
- Perfecto para fotos antiguas o artísticas

### ✨ Blur (Desenfoque Suave)
- Suaviza la imagen
- Efecto dreamlike
- Reduce ruido
- Ambiente más difuminado

## 💾 Almacenamiento

Cuando se publica una foto con filtro:

1. El servidor recibe la imagen filtrada
2. Se guarda en S3 como imagen original
3. Se generan automáticamente las variantes:
   - **Thumbnail** (100x100)
   - **Escala media** (600x600)
   - **Blanco y Negro** (800x800)
   - **Sepia** (800x800)
   - **Blur** (800x800)

4. Solo las URLs se guardan en MongoDB

```
S3 Bucket: dacem-posts-media
├── originals/
│   └── [uuid].jpg (imagen con filtro ya aplicado)
└── transformed/
    ├── [uuid]-thumb.jpg
    ├── [uuid]-t1.jpg (B/N)
    ├── [uuid]-t2.jpg (Sepia)
    └── [uuid]-t3.jpg (Blur)
```

## ⚙️ Especificaciones técnicas

### Generación de filtros
- **Método**: Canvas API (cliente)
- **Velocidad**: <500ms
- **Calidad**: JPEG 80% (equilibrio tamaño/calidad)

### Procesamiento
```javascript
// Blanco y Negro: Fórmula Luma
gray = R * 0.299 + G * 0.587 + B * 0.114

// Sepia: Matriz de transformación
R_sepia = R * 0.393 + G * 0.769 + B * 0.189
G_sepia = R * 0.349 + G * 0.686 + B * 0.168
B_sepia = R * 0.272 + G * 0.534 + B * 0.131

// Blur: Filtro CSS (3px)
ctx.filter = 'blur(3px)'
```

## 🎯 Casos de uso

| Tipo de foto | Filtro recomendado | Por qué |
|--------------|-------------------|--------|
| Selfie natural | Original | Máxima calidad |
| Momentos emocionales | Blanco y Negro | Mayor impacto |
| Fotos antiguas | Sepia | Nostalgia |
| Retratos artísticos | Blur suave | Efecto dreamlike |
| Fotografía de producto | Original | Detalles claros |
| Arte abstracto | Blanco y Negro | Contraste |

## 📱 Responsive

- Botones de filtro scrolleable en mobile
- Preview adapta tamaño según pantalla
- Diseño touch-friendly

## ⚡ Performance

- Generación de filtros en background
- Canvas rendering optimizado
- No afecta la UI mientras se procesan
- Indicador visual de carga

## 🔍 Inspeccionar filtros aplicados

En el visor de publicaciones (lightbox), hay un botón "🖼️" que permite:
- Ver la imagen original
- Ver todas las transformaciones generadas por el servidor
- Descargar cualquier variante

## 🆚 Diferencia: Filtros vs Transformaciones

### Filtros (Compositor) 🎨
- Aplicados ANTES de publicar
- Cliente-side (Canvas API)
- En tiempo real
- Opcional

### Transformaciones (Servidor) 🖼️
- Generadas DESPUÉS de publicar
- Server-side (Sharp)
- Automáticas y obligatorias
- Incluyen: thumbnail, B/N, Sepia, Blur

## 📋 Limitaciones

- Solo imágenes JPEG/PNG/WebP
- Tamaño máximo: 10MB (configurable)
- Generación en Canvas no disponible en IE11
- Fallback: imagen original si hay error

## 🎓 Guía paso a paso

```
1. Click en "Imagen" 📷
   ↓
2. Seleccionar foto de galería 📁
   ↓
3. Esperar a que genere filtros ⏳
   ↓
4. Preview aparece debajo ✨
   ↓
5. Hacer clic en un filtro (opcional) 🎨
   ↓
6. Escribir caption (opcional) ✍️
   ↓
7. Click en "Publicar" 🚀
   ↓
8. ¡Publicado con filtro aplicado! ✅
```

## 🐛 Troubleshooting

### Los filtros no aparecen
- Actualizar página (F5 o Ctrl+Shift+R)
- Verificar que la imagen sea válida
- Abrir consola (F12) para ver errores

### La imagen tarda mucho en procesarse
- Imagen muy grande (reducir resolución)
- Navegador lento (actualizar tabs)
- Conexión lenta (esperar más)

### El filtro no se aplica al publicar
- Seleccionar el filtro nuevamente
- Asegurar que el filtro esté marcado en azul
- Verificar que selectedFile no sea null

## 🔮 Mejoras futuras

- [ ] Más filtros (vintage, cooling, warming, etc.)
- [ ] Filtro personalizado (intensidad ajustable)
- [ ] Comparador antes/después
- [ ] Historial de filtros favoritos
- [ ] Filtros basados en IA/Rekognition
- [ ] Ajustes manuales (brillo, contraste, etc.)
