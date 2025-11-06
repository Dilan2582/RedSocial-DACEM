# 🚀 Deployment de Lambda - Transformaciones de Imágenes

## 📦 Preparación

### 1. Instalar dependencias en carpeta Lambda
```bash
cd lambda/imageTransform
npm install
```

### 2. Crear layer de Sharp (optimizado para Lambda)
```bash
mkdir -p layer/nodejs
cd layer/nodejs
npm init -y
npm install sharp --platform=linux --arch=x64
cd ../..
zip -r sharp-layer.zip layer/
```

## 🏗️ Crear Lambda Function

### 1. Desde AWS Console:

1. **Ir a AWS Lambda Console**
2. **Crear función**:
   - Nombre: `imageTransformFunction`
   - Runtime: `Node.js 20.x`
   - Arquitectura: `x86_64`
   - Permisos: Crear rol nuevo con permisos S3

3. **Subir código**:
   ```bash
   zip -r function.zip index.mjs node_modules/
   ```
   - Upload: `function.zip`

4. **Configuración**:
   - Handler: `index.handler`
   - Timeout: `5 minutos`
   - Memoria: `1024 MB` (mínimo para Sharp)
   - Environment variables:
     ```
     AWS_REGION=us-east-1
     ```

### 2. Agregar Layer de Sharp (si no incluiste node_modules):
   - Create layer: Upload `sharp-layer.zip`
   - Compatible runtimes: Node.js 20.x
   - Add layer to function

### 3. Configurar S3 Trigger:

**Event Type**: `s3:ObjectCreated:*`
**Bucket**: `redsocial-dacem-media`
**Prefix**: `posts/`
**Suffix**: `original.jpg` (o usa regex para .jpg, .png, .jpeg)

## 🔐 Permisos IAM

El rol de Lambda necesita:

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
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

## 🛠️ Usando AWS CLI

### Crear función:
```bash
aws lambda create-function \
  --function-name imageTransformFunction \
  --runtime nodejs20.x \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-s3-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 300 \
  --memory-size 1024 \
  --region us-east-1
```

### Agregar S3 trigger:
```bash
aws s3api put-bucket-notification-configuration \
  --bucket redsocial-dacem-media \
  --notification-configuration file://s3-notification.json
```

**s3-notification.json**:
```json
{
  "LambdaFunctionConfigurations": [
    {
      "LambdaFunctionArn": "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:imageTransformFunction",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {
              "Name": "prefix",
              "Value": "posts/"
            },
            {
              "Name": "suffix",
              "Value": "original."
            }
          ]
        }
      }
    }
  ]
}
```

### Dar permisos a S3 para invocar Lambda:
```bash
aws lambda add-permission \
  --function-name imageTransformFunction \
  --statement-id s3-trigger-permission \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::redsocial-dacem-media \
  --region us-east-1
```

## 🧪 Probar Lambda

### Evento de prueba (Test Event):
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
          "name": "redsocial-dacem-media",
          "arn": "arn:aws:s3:::redsocial-dacem-media"
        },
        "object": {
          "key": "posts/user123/post456/original.jpg"
        }
      }
    }
  ]
}
```

### Verificar logs:
```bash
aws logs tail /aws/lambda/imageTransformFunction --follow
```

## 📊 Monitoreo

### CloudWatch Metrics:
- Invocations
- Duration
- Errors
- Throttles

### CloudWatch Logs:
- `/aws/lambda/imageTransformFunction`

## 💰 Costos Estimados

**Por 1000 imágenes:**
- Lambda invocations: $0.20
- Lambda compute (1GB, 3s avg): $0.50
- S3 PUT requests (5 per image): $0.025
- **Total**: ~$0.725 / 1000 imágenes

## 🔄 Actualizar Lambda

```bash
cd lambda/imageTransform
zip -r function.zip index.mjs node_modules/
aws lambda update-function-code \
  --function-name imageTransformFunction \
  --zip-file fileb://function.zip
```

## 🐛 Troubleshooting

### Error: "Cannot find module 'sharp'"
- Solución: Instalar sharp con `--platform=linux --arch=x64`
- O usar Lambda Layer

### Error: "Task timed out after X seconds"
- Aumentar timeout a 5 minutos
- Aumentar memoria a 1024MB o más

### Error: "AccessDenied"
- Verificar permisos IAM del rol
- Verificar bucket policy

## ✅ Checklist Deployment

- [ ] Código Lambda empaquetado
- [ ] Sharp instalado para Linux x64
- [ ] Lambda function creada
- [ ] Rol IAM con permisos S3
- [ ] S3 trigger configurado
- [ ] Permisos Lambda-S3 agregados
- [ ] Timeout configurado (300s)
- [ ] Memoria configurada (1024MB)
- [ ] Probado con evento de prueba
- [ ] Logs verificados en CloudWatch
