# 🚀 AWS Lambda - Transformaciones Automáticas

## 🎯 Qué hace esta Lambda

Cuando subes una imagen a S3 en la carpeta `posts/`, Lambda automáticamente:
1. Descarga la imagen original
2. Genera 4 transformaciones con Sharp
3. Sube las 4 variantes de vuelta a S3

## ⚡ Quick Start

### 1. Empaquetar código
```bash
# Windows
lambda\package-lambda.bat

# Linux/Mac
./lambda/package-lambda.sh
```

### 2. Crear función en AWS Console

1. Ve a **AWS Lambda Console**
2. Click **Create function**
3. Configuración:
   - Name: `imageTransformFunction`
   - Runtime: `Node.js 20.x`
   - Memory: `1024 MB`
   - Timeout: `5 minutes`

4. Sube `function.zip`

### 3. Configurar S3 Trigger

En la Lambda:
1. **Add trigger** → S3
2. **Bucket**: `redsocial-dacem-media`
3. **Event type**: `PUT`
4. **Prefix**: `posts/`
5. **Suffix**: `original.`

### 4. Permisos IAM

Agregar a rol de Lambda:
```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::redsocial-dacem-media/*"
}
```

## 🧪 Probar

Sube una imagen desde tu app y verifica en S3:
```
posts/userId/postId/
├── original.jpg     (subido por backend)
├── thumb.jpg        (generado por Lambda)
├── t1_bw.jpg       (generado por Lambda)
├── t2_sepia.jpg    (generado por Lambda)
├── t3_blur.jpg     (generado por Lambda)
└── t4_upscale.jpg  (generado por Lambda)
```

## 📋 Ver logs
```bash
aws logs tail /aws/lambda/imageTransformFunction --follow
```

## 💰 Costo
- ~$0.70 por 1000 imágenes procesadas

## 📚 Documentación completa
Ver `DEPLOYMENT.md` para instrucciones detalladas.
