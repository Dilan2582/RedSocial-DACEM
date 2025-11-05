# 🚀 GUÍA RÁPIDA - Deploy Lambda (Consola AWS)

## ✅ PASO 1: Crear Función Lambda

1. Ve a: https://console.aws.amazon.com/lambda
2. Click **"Create function"**
3. Configuración:
   - ✅ **Author from scratch**
   - **Function name**: `imageTransformFunction`
   - **Runtime**: `Node.js 20.x`
   - **Architecture**: `x86_64`
   - **Permissions**: Create a new role with basic Lambda permissions

4. Click **"Create function"**

---

## ✅ PASO 2: Subir Código

1. En la función creada, ve a **"Code"** tab
2. Click **"Upload from"** → **".zip file"**
3. Selecciona: `lambda/imageTransform/function.zip` (11.7 MB)
4. Click **"Save"**
5. Espera a que se suba (puede tardar 1-2 minutos)

---

## ✅ PASO 3: Configurar Function

### General Configuration:
1. Click **"Configuration"** tab → **"General configuration"** → **"Edit"**
2. Cambiar:
   - **Timeout**: `5 min 0 sec`
   - **Memory**: `1024 MB`
3. Click **"Save"**

### Environment Variables:
**NO NECESITAS AGREGAR NINGUNA VARIABLE**
- AWS Lambda ya proporciona `AWS_REGION` automáticamente
- Si necesitas otras variables más adelante, agrégalas aquí

---

## ✅ PASO 4: Agregar Permisos S3

1. Click **"Configuration"** → **"Permissions"**
2. Click en el **Execution role name** (te lleva a IAM)
3. Click **"Add permissions"** → **"Attach policies"**
4. Busca y selecciona: `AmazonS3FullAccess` (temporal, luego restringir)
5. Click **"Attach policy"**

**O crear política personalizada**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::redsocial-dacem-media/*"
    }
  ]
}
```

---

## ✅ PASO 5: Configurar S3 Trigger

1. Vuelve a la función Lambda
2. Click **"Add trigger"**
3. Selecciona **"S3"**
4. Configuración:
   - **Bucket**: `redsocial-dacem-media`
   - **Event type**: `All object create events` o `PUT`
   - **Prefix**: `posts/`
   - **Suffix**: `original.`
   - ✅ **Acknowledge recursive invocation**
5. Click **"Add"**

---

## ✅ PASO 6: Dar Permiso a S3 para invocar Lambda

AWS debería agregarlo automáticamente, pero si hay error:

1. Ve a **"Configuration"** → **"Permissions"** → **"Resource-based policy"**
2. Verifica que exista una política permitiendo a S3 invocar la función
3. Si no existe, click **"Add permission"**:
   - **Principal**: `s3.amazonaws.com`
   - **Source ARN**: `arn:aws:s3:::redsocial-dacem-media`
   - **Action**: `lambda:InvokeFunction`

---

## 🧪 PASO 7: Probar Lambda

### Opción A: Test Event desde Lambda Console

1. En Lambda, click **"Test"** tab
2. Click **"Create new event"**
3. Event name: `TestS3Upload`
4. Template: `s3-put`
5. Edita el JSON:
```json
{
  "Records": [
    {
      "eventVersion": "2.1",
      "eventSource": "aws:s3",
      "awsRegion": "us-east-1",
      "eventTime": "2025-11-05T12:00:00.000Z",
      "eventName": "ObjectCreated:Put",
      "s3": {
        "bucket": {
          "name": "redsocial-dacem-media"
        },
        "object": {
          "key": "posts/testuser/testpost/original.jpg"
        }
      }
    }
  ]
}
```
6. Click **"Test"**
7. **IMPORTANTE**: Necesitas que exista una imagen real en esa ruta S3

### Opción B: Test Real

1. Ve a tu app: http://localhost:3900/test-transformations.html
2. Inicia sesión
3. Sube una imagen
4. Espera 5-10 segundos
5. Ve a S3 y verifica que se crearon las transformaciones:
   ```
   posts/{userId}/{postId}/
   ├── original.jpg     ✅ (subido por backend)
   ├── thumb.jpg        ✅ (generado por Lambda)
   ├── t1_bw.jpg       ✅ (generado por Lambda)
   ├── t2_sepia.jpg    ✅ (generado por Lambda)
   ├── t3_blur.jpg     ✅ (generado por Lambda)
   └── t4_upscale.jpg  ✅ (generado por Lambda)
   ```

---

## 📊 PASO 8: Ver Logs

1. En Lambda, click **"Monitor"** tab
2. Click **"View CloudWatch logs"**
3. Busca los mensajes:
   - `🚀 Lambda triggered`
   - `📸 Imagen descargada`
   - `🎨 Generando 4 transformaciones`
   - `✅ Transformaciones completadas`

---

## ❌ Troubleshooting

### Error: "Cannot find module 'sharp'"
- Solución: Reinstala con `npm install --platform=linux --arch=x64`
- O usa Lambda Layer (ver DEPLOYMENT.md)

### Error: "Task timed out"
- Aumenta timeout a 5 minutos
- Aumenta memoria a 1536 MB

### Error: "AccessDenied"
- Verifica permisos S3 en el rol IAM
- Asegúrate que el bucket es `redsocial-dacem-media`

### No se generan transformaciones
- Verifica que el trigger S3 esté activo
- Confirma que el prefix sea `posts/` y suffix `original.`
- Revisa CloudWatch logs para errores

---

## ✅ Checklist Final

- [ ] Lambda function creada
- [ ] Código subido (function.zip)
- [ ] Timeout: 5 minutos
- [ ] Memoria: 1024 MB
- [ ] Permisos S3 en IAM role
- [ ] S3 trigger configurado
- [ ] Test ejecutado con éxito
- [ ] Logs verificados en CloudWatch
- [ ] Transformaciones aparecen en S3

---

## 🎉 ¡Listo!

Ahora cada vez que subas una imagen, Lambda automáticamente:
1. Se dispara cuando el original.jpg llega a S3
2. Descarga la imagen
3. Genera 4 transformaciones
4. Sube todo de vuelta a S3
5. En 3-5 segundos está completo

**Costo**: ~$0.70 por 1000 imágenes procesadas
