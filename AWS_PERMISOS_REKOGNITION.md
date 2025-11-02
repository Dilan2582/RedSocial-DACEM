# 🔑 Configurar Permisos de Rekognition en AWS

## ⚠️ Error Actual
```
User: arn:aws:iam::224888985520:user/reedsocial-app is not authorized to perform: 
rekognition:DetectLabels because no identity-based policy allows the rekognition:DetectLabels action
```

**Causa**: El usuario IAM `reedsocial-app` no tiene permisos para usar AWS Rekognition.

---

## ✅ Solución Paso a Paso

### **PASO 1: Ir a IAM Console**

1. Abre tu navegador
2. Ve a: https://console.aws.amazon.com/iam/
3. Inicia sesión con tu cuenta de AWS

### **PASO 2: Encontrar tu Usuario**

1. En el menú lateral izquierdo, click en **"Users"** (Usuarios)
2. En la lista, busca: **`reedsocial-app`**
3. Click en el nombre del usuario

### **PASO 3: Agregar Permisos**

#### Opción A: Política Administrada (Más Rápido) ⭐

1. Click en la pestaña **"Permissions"** (Permisos)
2. Click en botón **"Add permissions"** → **"Attach policies directly"**
3. En el buscador, escribe: `AmazonRekognitionReadOnlyAccess`
4. ✅ Marca el checkbox de esta política
5. Click en **"Next"**
6. Click en **"Add permissions"**

#### Opción B: Política Personalizada (Más Seguro) 🔒

1. Click en la pestaña **"Permissions"** (Permisos)
2. Click en **"Add permissions"** → **"Create inline policy"**
3. Click en la pestaña **"JSON"**
4. Borra todo y pega esto:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RekognitionAnalysis",
      "Effect": "Allow",
      "Action": [
        "rekognition:DetectLabels",
        "rekognition:DetectModerationLabels",
        "rekognition:DetectFaces"
      ],
      "Resource": "*"
    }
  ]
}
```

5. Click en **"Next"**
6. Nombre de la política: `RekognitionAccess`
7. Click en **"Create policy"**

### **PASO 4: Verificar Permisos**

Después de agregar los permisos, deberías ver algo como esto en la página del usuario:

```
Permissions policies (1)
✅ AmazonRekognitionReadOnlyAccess
   - rekognition:*
   - s3:GetObject (para leer imágenes)
```

---

## 🧪 Probar que Funciona

### 1. **Actualizar .env**
Cambia esta línea en tu archivo `.env`:
```env
REKOGNITION_ENABLED=false
```
A:
```env
REKOGNITION_ENABLED=true
```

### 2. **Reiniciar Servidor**
```bash
# Presiona Ctrl+C en la terminal del servidor
# Luego vuelve a iniciar:
npm start
```

### 3. **Subir Imagen de Prueba**
1. Ve a: http://localhost:3900/test-rekognition.html
2. Inicia sesión si no lo has hecho
3. Sube una imagen

### 4. **Verificar Logs**
Deberías ver en la consola del servidor:
```bash
🔍 [Rekognition] Iniciando análisis...
   ✅ Labels: 8 tags detectados
   ✅ Moderación: Seguro
   ✅ Caras: 1 rostro(s) encontrado(s)
```

✅ **Si ves eso, funciona!**

❌ **Si sigue dando error**, verifica que:
- Agregaste los permisos al usuario correcto (`reedsocial-app`)
- Esperaste 1-2 minutos después de agregar permisos
- Las credenciales en `.env` son correctas

---

## 📋 Permisos Necesarios (Resumen)

Tu usuario IAM necesita estos permisos:

| Acción | Para qué |
|--------|----------|
| `rekognition:DetectLabels` | Detectar objetos/escenas (tags) |
| `rekognition:DetectModerationLabels` | Detectar contenido NSFW |
| `rekognition:DetectFaces` | Analizar rostros |
| `s3:GetObject` | Leer imágenes del bucket S3 |

---

## 🔗 Links Útiles

- **IAM Console**: https://console.aws.amazon.com/iam/
- **Tu usuario**: https://console.aws.amazon.com/iam/home#/users/reedsocial-app
- **Rekognition Pricing**: https://aws.amazon.com/rekognition/pricing/
- **Documentación**: https://docs.aws.amazon.com/rekognition/

---

## 💡 Nota sobre Seguridad

Las políticas administradas de AWS (`AmazonRekognitionReadOnlyAccess`) incluyen más permisos de los que necesitas, pero son seguras para desarrollo.

Para producción, usa la **Opción B (política personalizada)** que solo da los 3 permisos específicos que tu app necesita.

---

## ❓ Troubleshooting

### Error persiste después de agregar permisos
- Espera 2-3 minutos (AWS tarda en propagar cambios)
- Verifica que el `AWS_ACCESS_KEY_ID` en `.env` corresponde al usuario `reedsocial-app`
- Reinicia el servidor Node.js

### No encuentras el usuario `reedsocial-app`
- Verifica que estás en la región correcta (us-east-1)
- Verifica que estás en la cuenta correcta (ID: 224888985520)

### "Access Denied" al intentar agregar permisos
- Necesitas ser administrador de la cuenta AWS
- O que alguien con permisos de administrador te lo configure

---

✅ **Una vez configurado, podrás usar Rekognition sin problemas!**
