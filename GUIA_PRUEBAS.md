# 🧪 GUÍA DE PRUEBAS - MENSAJES Y PUBLICACIONES

## ✅ ANTES DE EMPEZAR

Asegúrate de que:
1. El servidor está corriendo: `npm start` o `node index.js`
2. Base de datos MongoDB conectada
3. AWS configurado (S3, Rekognition opcional, Lambda opcional)
4. Tienes al menos 2 usuarios registrados

---

## 🧪 PRUEBA 1: ENVÍO DE MENSAJES

### Paso 1: Abre dos navegadores o pestañas
```
Usuario A: http://localhost:3900
Usuario B: http://localhost:3900
```

### Paso 2: Inicia sesión con dos usuarios diferentes
- Navegador 1: Inicia sesión con Usuario A
- Navegador 2: Inicia sesión con Usuario B

### Paso 3: Usuario A inicia conversación
1. En la sección **Mensajes**
2. Haz click en botón "Nuevo mensaje" (lápiz)
3. Busca y selecciona Usuario B
4. Haz click en "Chat"

### Paso 4: Usuario A envía mensaje
1. Se abre el chat con Usuario B
2. Verifica que aparezca el **composer** (campo de texto)
3. Escribe un mensaje: `"Hola, ¿cómo estás?"`
4. Presiona **Enter** o click en botón "Enviar"

### ✅ Resultado esperado:
- Mensaje aparece en el chat
- Se marca como "mío" (alineado a la derecha)
- Input se limpia
- Conversación se recarga

### Paso 5: Usuario B recibe mensaje
1. En navegador 2, recarga o abre **Mensajes**
2. Debe aparecer conversación con Usuario A
3. Haz click para abrir el chat
4. Verifica que el mensaje aparezca (alineado a la izquierda)

### Paso 6: Usuario B responde
1. Escribe respuesta: `"¡Hola! Bien, ¿y tú?"`
2. Envía mensaje
3. Usuario A debe verlo sin recargar

---

## 🧪 PRUEBA 2: PUBLICACIONES CON FILTROS

### Paso 1: Prepara una imagen
- Ten lista una imagen JPG/PNG en tu computadora
- Preferiblemente ~1-5 MB

### Paso 2: Ir a publicar
1. En página principal (Inicio)
2. Busca sección "Compose" o "Nueva publicación"
3. Haz click en "Seleccionar imagen"

### Paso 3: Selecciona imagen
1. Elige tu imagen del sistema de archivos
2. La imagen debe aparecer en preview

### Paso 4: Selecciona filtro
1. Verifica que hay opciones de filtro:
   - Original
   - Blanco y Negro (B&N)
   - Sepia
   - Blur
   - HD 2x (Upscale)
   - Bright
   - Dark
   - Vibrant
   - Warm
   - Cool
   - Invert

2. Selecciona un filtro (ej: **Sepia**)

### Paso 5: Agrega caption (opcional)
1. Escribe un caption: `"Mi foto con filtro sepia ✨"`
2. Esto es opcional pero recomendado

### Paso 6: Publica
1. Haz click en botón **"Publicar"** o **"Post"**
2. Espera a que se procese (2-5 segundos)

### ✅ Resultado esperado:
- La publicación aparece en el feed
- Muestra la imagen con el filtro seleccionado
- Caption aparece debajo
- Botones de like, comentario, share están disponibles

### Paso 7: Verifica transformación
1. La imagen que ves debe tener el filtro aplicado
2. Si seleccionaste **Sepia**, debe verse en tonos café/sepia
3. Si seleccionaste **B&N**, debe ser blanco y negro

---

## 🧪 PRUEBA 3: INTERACCIÓN EN PUBLICACIONES

### Paso 1: Abre una publicación
1. Haz click en la imagen de la publicación
2. Debe abrir modal ampliado

### ✅ Resultado esperado:
- Imagen amplificada
- Información del autor
- Botones de like, comentario, share
- Comentarios previos

### Paso 2: Dale like
1. Haz click en corazón ❤️
2. El contador debe aumentar de 0 a 1

### Paso 3: Agrega comentario
1. En campo "Añade un comentario..."
2. Escribe: `"¡Hermosa foto! 🌟"`
3. Haz click en botón "Enviar"

### ✅ Resultado esperado:
- Comentario aparece abajo
- Se muestra tu nombre de usuario
- El contador de comentarios aumenta

---

## 🧪 PRUEBA 4: BÚSQUEDA EN CONVERSACIONES

### Paso 1: Crea varias conversaciones
1. Inicia chats con Usuario B, C, D, etc.
2. Envía al menos un mensaje en cada uno

### Paso 2: Usa búsqueda
1. En **Mensajes**, en el campo "Buscar conversación..."
2. Escribe un nombre: `"Usuario B"`
3. Debe filtrar automáticamente

### ✅ Resultado esperado:
- Solo aparecen conversaciones coincidentes
- Al limpiar búsqueda, aparecen todas

---

## 🧪 PRUEBA 5: ELIMINAR CONVERSACIÓN

### Paso 1: Abre opciones
1. En **Mensajes**, haz click en botón "..." (tres puntos)

### Paso 2: Selecciona conversación
1. Marca checkbox de conversación
2. Pueden haber varias seleccionadas

### Paso 3: Elimina
1. Haz click en **"Eliminar (1)"**
2. Debe desaparecer de la lista

### ✅ Resultado esperado:
- Conversación eliminada
- No aparece en listado
- Contador se actualiza

---

## 📊 CHECKLIST DE VERIFICACIÓN

### Mensajería
- [ ] Puedo enviar mensajes
- [ ] Los mensajes aparecen en ambos usuarios
- [ ] Presionar Enter envía el mensaje
- [ ] El input se limpia después de enviar
- [ ] Las conversaciones se recarga automáticamente
- [ ] Puedo buscar conversaciones
- [ ] Puedo eliminar conversaciones
- [ ] El composer es visible al abrir chat

### Publicaciones
- [ ] Puedo seleccionar imagen
- [ ] Veo preview de la imagen
- [ ] Hay opciones de filtro disponibles
- [ ] Puedo seleccionar un filtro
- [ ] El filtro se aplica a la imagen
- [ ] Puedo agregar caption
- [ ] La publicación aparece en el feed
- [ ] El filtro se mantiene en la imagen publicada

### Interacción
- [ ] Puedo abrir publicación en modal
- [ ] Puedo dar like
- [ ] El contador de likes aumenta
- [ ] Puedo agregar comentario
- [ ] El comentario aparece en lista
- [ ] Otros usuarios pueden ver mis comentarios

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### ❌ El composer no aparece
**Solución:**
1. Abre DevTools (F12)
2. Consola debe mostrar: `✅ Compositor mostrado`
3. Si ve error, recarga la página
4. Verifica que el HTML tiene: `id="chatComposer"`

### ❌ El mensaje no se envía
**Solución:**
1. Abre DevTools (F12) → Network
2. Busca petición POST a `/api/messages/:id`
3. Verifica que responde 200 OK
4. Si es 400 o 500, revisa consola del servidor

### ❌ El filtro no se aplica
**Solución:**
1. Verifica que Lambda está configurada (si aplica transformaciones)
2. Revisa logs del servidor en sección de `createPost`
3. Si ves "Lambda procesando...", espera más tiempo
4. Si ves error, verifica permisos AWS

### ❌ Publicación no aparece en feed
**Solución:**
1. Abre DevTools (F12) → Network
2. Verifica que POST `/api/posts` retorna 200 OK
3. Recarga la página con F5
4. Si sigue sin aparecer, revisa logs del servidor

---

## 📝 LOGS IMPORTANTES

### Backend - Envío de mensaje
```
✅ POST /api/messages/:conversationId
   Message created: [ID]
   Response 200 OK
```

### Backend - Creación de publicación
```
📸 Procesando imagen con filtro: sepia
☁️  Subiendo imagen original a S3...
✅ Original subido. Lambda generará transformación: t2_sepia
✅ Rekognition análisis completado: { tags: N, nsfw: false, faces: X }
✅ Post creado con filtro: sepia (Lambda procesando)
Response 200 OK
```

### Frontend - Envío de mensaje
```
Console: ✅ Compositor mostrado
Console: Conversaciones renderizadas en el DOM
Network: POST /api/messages/[conversationId] → 200 OK
```

---

## ✅ ÉXITO

Si completaste todas las pruebas y los checklists están marcados, ¡felicidades! 🎉

**Tu sistema de mensajería y publicaciones está funcionando correctamente.**

---

**Nota:** Estos tests pueden ejecutarse en navegadores diferentes, dispositivos diferentes, o incluso con bots de prueba. Lo importante es verificar que:
1. Los datos llegan correctamente al backend
2. El backend procesa sin errores
3. La respuesta es correcta (200 OK)
4. El frontend renderiza correctamente
5. La experiencia de usuario es suave y responsiva

---

**Última actualización:** 2025-11-06  
**Versión:** 1.0
