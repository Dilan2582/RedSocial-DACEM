# 🗑️ Gestión de Publicaciones - Documentación

## ✨ Funcionalidades Agregadas

### 1. **Eliminar Publicación**
Los usuarios pueden eliminar sus propias publicaciones desde su perfil.

**Características:**
- ✅ Solo el dueño puede eliminar su post
- ✅ Elimina automáticamente todos los likes asociados
- ✅ Elimina automáticamente todos los comentarios asociados
- ✅ Actualiza el grid de publicaciones en tiempo real
- ✅ Confirmación antes de eliminar

**Endpoint:**
```
DELETE /api/posts/:id
Headers: Authorization: Bearer <token>
```

**Respuesta exitosa:**
```json
{
  "ok": true,
  "message": "Post eliminado correctamente"
}
```

---

### 2. **Eliminar Comentario**
Los usuarios pueden eliminar comentarios en sus publicaciones.

**Características:**
- ✅ El dueño del comentario puede eliminarlo
- ✅ El dueño del post puede eliminar cualquier comentario
- ✅ Actualiza el contador de comentarios del post
- ✅ Confirmación antes de eliminar

**Endpoint:**
```
DELETE /api/posts/:postId/comments/:commentId
Headers: Authorization: Bearer <token>
```

**Respuesta exitosa:**
```json
{
  "ok": true,
  "message": "Comentario eliminado"
}
```

---

## 🎯 Cómo Usar

### En el Perfil:

1. **Ve a tu perfil**: `http://localhost:3900/profile.html`
2. **Click en**: "Gestionar publicaciones" (botón al lado de "Editar perfil")
3. **Modal se abre** mostrando todas tus publicaciones con:
   - Miniatura de la imagen
   - Descripción
   - Contador de likes y comentarios
   - Botones de acción

### Para Eliminar una Publicación:

1. En el modal de gestión
2. Click en **"Eliminar publicación"**
3. Confirma la acción
4. La publicación se elimina permanentemente

### Para Gestionar Comentarios:

1. En el modal de gestión
2. Click en **"Ver comentarios"** en cualquier publicación
3. Se abre modal con todos los comentarios
4. Click en **"Eliminar"** junto al comentario que quieras borrar
5. Confirma la acción

---

## 📋 Permisos

| Acción | Quién Puede |
|--------|-------------|
| **Eliminar publicación** | Solo el dueño del post |
| **Eliminar comentario** | Dueño del comentario O dueño del post |
| **Ver comentarios** | Cualquier usuario autenticado |

---

## 🔧 Implementación Técnica

### Backend (controllers/posts.js):

```javascript
// Eliminar post
async function deletePost(req, res) {
  // 1. Verificar que sea el dueño
  // 2. Eliminar likes asociados
  // 3. Eliminar comentarios asociados
  // 4. Eliminar el post
}

// Eliminar comentario
async function deleteComment(req, res) {
  // 1. Verificar permisos (dueño del comentario o del post)
  // 2. Eliminar comentario
  // 3. Actualizar contador en el post
}
```

### Frontend (profile.html):

**Modal de Gestión:**
```html
<div id="managePostsModal" class="backdrop">
  <!-- Lista de posts con opciones -->
</div>
```

**Modal de Comentarios:**
```html
<div id="viewCommentsModal" class="backdrop">
  <!-- Lista de comentarios con botón eliminar -->
</div>
```

**Funciones JavaScript:**
- `openManagePostsModal()` - Carga y muestra posts
- `openViewCommentsModal(postId)` - Carga comentarios de un post
- Eventos de eliminación con confirmación

---

## 🎨 UI/UX

### Diseño:
- ✅ Modales consistentes con el diseño existente
- ✅ Confirmaciones para acciones destructivas
- ✅ Estados de carga (botones con "Eliminando...")
- ✅ Feedback visual inmediato
- ✅ Responsivo (se adapta a móviles)

### Flujo de Usuario:
1. **Perfil** → Botón "Gestionar publicaciones"
2. **Modal** → Lista de posts con vista previa
3. **Acciones**:
   - Ver comentarios → Modal secundario
   - Eliminar post → Confirmación → Eliminado
   - Eliminar comentario → Confirmación → Eliminado

---

## ⚠️ Consideraciones

### Seguridad:
- ✅ Validación de permisos en el backend
- ✅ IDs validados con `Types.ObjectId.isValid()`
- ✅ Autenticación requerida (middleware `ensureAuth`)
- ✅ Solo el dueño puede eliminar sus posts
- ✅ Dueño del post puede moderar comentarios

### Base de Datos:
- ✅ Eliminación en cascada (likes + comentarios)
- ✅ Contadores actualizados automáticamente
- ✅ Transacciones implícitas con Mongoose

### Rendimiento:
- ✅ Carga limitada a 50 posts por usuario
- ✅ Comentarios cargados bajo demanda
- ✅ Caché de usuarios en frontend

---

## 🧪 Testing

### Casos de Prueba:

1. **Eliminar post propio**:
   - ✅ Se elimina correctamente
   - ✅ Desaparece del grid
   - ✅ Likes y comentarios eliminados

2. **Eliminar comentario propio**:
   - ✅ Se elimina del modal
   - ✅ Contador actualizado

3. **Eliminar comentario como dueño del post**:
   - ✅ Permite eliminar comentarios de otros
   - ✅ Útil para moderación

4. **Intentar eliminar post de otro**:
   - ❌ Error 403: No autorizado

5. **Intentar eliminar comentario sin permisos**:
   - ❌ Error 403: No autorizado

---

## 📱 Ejemplo de Uso

```javascript
// Eliminar un post
const response = await fetch('/api/posts/67890xyz', {
  method: 'DELETE',
  headers: { 'Authorization': 'Bearer token...' }
});

// Eliminar un comentario
const response = await fetch('/api/posts/67890xyz/comments/12345abc', {
  method: 'DELETE',
  headers: { 'Authorization': 'Bearer token...' }
});
```

---

## 🚀 Próximas Mejoras

Posibles funcionalidades futuras:

- [ ] Editar publicación (cambiar descripción)
- [ ] Archivar publicación (ocultar sin eliminar)
- [ ] Reportar comentarios inapropiados
- [ ] Bloquear usuarios (no pueden comentar)
- [ ] Historial de publicaciones eliminadas
- [ ] Restaurar publicaciones eliminadas (papelera)

---

✅ **Listo! Ahora puedes gestionar tus publicaciones y comentarios desde tu perfil.**
