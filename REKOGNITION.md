# 🔍 AWS Rekognition - Integración

## ¿Qué hace?

AWS Rekognition analiza automáticamente cada imagen que se sube como post y extrae:

- **🏷️ Tags**: Etiquetas descriptivas (ej: "Person", "Outdoor", "Mountain", "Sky")
- **🔞 NSFW**: Detecta contenido sensible o inapropiado
- **👥 Face Count**: Cuenta cuántas caras hay en la imagen

## Flujo de análisis

1. **Usuario sube imagen** → POST `/api/posts`
2. **Se sube a S3** → Se generan todas las variantes (original, thumb, t1, t2, t3)
3. **Rekognition analiza** → Se llama a `analyzeS3Image()` con la imagen original
4. **Se guarda en MongoDB** → Los resultados se guardan en el post

```javascript
{
  tags: ["Person", "Face", "Smile", "Portrait"],
  nsfw: false,
  faceCount: 1,
  visionRaw: { /* datos completos de Rekognition */ }
}
```

## Endpoints

### 1. Crear post (con análisis automático)
```
POST /api/posts
Headers: Authorization: <token>
Body: FormData
  - image: archivo de imagen
  - caption: texto opcional
```

**Respuesta:**
```json
{
  "ok": true,
  "post": {
    "id": "...",
    "tags": ["Person", "Outdoor"],
    "nsfw": false,
    "faceCount": 2,
    "media": { ... }
  }
}
```

### 2. Re-analizar un post existente
```
POST /api/posts/:id/reanalyze
Headers: Authorization: <token>
```

Útil para posts antiguos que no tienen análisis.

## Scripts

### Analizar posts existentes
```bash
node scripts/analyze_existing_posts.js
```

Busca todos los posts sin análisis y los procesa en batch.

## Página de prueba

Abre `http://localhost:3900/test-rekognition.html` para probar la funcionalidad de forma visual.

## Configuración requerida

En `.env`:
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
S3_BUCKET=tu-bucket-name
```

## Permisos IAM necesarios

El usuario de AWS necesita permisos para:
- `rekognition:DetectLabels`
- `rekognition:DetectModerationLabels`
- `rekognition:DetectFaces`
- `s3:GetObject` (en el bucket donde están las imágenes)

## Uso en el frontend

Los datos están disponibles en cada post:

```javascript
const post = await fetch('/api/posts/123', {
  headers: { 'Authorization': token }
}).then(r => r.json());

console.log(post.tags);       // ["Person", "Outdoor"]
console.log(post.nsfw);        // false
console.log(post.faceCount);   // 2
```

## Filtros futuros

Con esta data puedes implementar:
- 🔍 Búsqueda por tags
- 🔞 Filtro de contenido sensible
- 👥 Ordenar por cantidad de caras
- 📊 Analytics de contenido más popular

## Costos

AWS Rekognition cobra por análisis:
- **Primeros 1M imágenes/mes**: $1 por 1,000 imágenes
- **Más de 1M**: $0.80 por 1,000 imágenes

Cada post usa 3 llamadas (labels, moderation, faces) = ~$0.003 por post.

---

✨ **Todo listo!** Las imágenes ahora se analizan automáticamente al subirlas.
