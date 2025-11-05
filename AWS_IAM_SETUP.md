# Configuración de AWS IAM para Face Recognition

## Problema Actual
El usuario AWS `redsocial-app` en la cuenta AWS `224888985520` no tiene los permisos necesarios para usar Amazon Rekognition.

**Error:** `User is not authorized to perform: rekognition:DetectFaces`

## Solución: Agregar Permisos a la IAM Policy

### Opción 1: Agregar política directa al usuario (Recomendado)

1. Ve a **AWS Console** → **IAM** → **Users**
2. Busca y selecciona el usuario **`redsocial-app`**
3. En la pestaña **Permissions**, haz clic en **Add permissions** → **Attach policies**
4. Busca `AmazonRekognitionFullAccess` o crea una política personalizada
5. Haz clic en **Attach policies**

### Opción 2: Crear una política personalizada (Más restrictiva)

1. Ve a **AWS Console** → **IAM** → **Policies** → **Create policy**
2. Selecciona la pestaña **JSON**
3. Copia y pega esta política:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:DetectFaces",
        "rekognition:RecognizeCelebrities",
        "rekognition:DetectLabels",
        "rekognition:DetectModerationLabels"
      ],
      "Resource": "*"
    }
  ]
}
```

4. Haz clic en **Next: Tags** → **Next: Review**
5. Dale un nombre: `RedSocial-Rekognition-Policy`
6. Haz clic en **Create policy**
7. Ve a **IAM** → **Users** → **redsocial-app** → **Add permissions** → **Attach policies**
8. Busca `RedSocial-Rekognition-Policy` y adjúntala

### Opción 3: Usar la política administrada (Más simple)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "rekognition:*",
      "Resource": "*"
    }
  ]
}
```

## Verificar que los permisos están configurados

1. Ve a **IAM** → **Users** → **redsocial-app**
2. En la sección **Permissions**, deberías ver una política que incluya:
   - `rekognition:DetectFaces`
   - O `rekognition:*` (si usaste la política completa)

## Después de agregar los permisos

1. Reinicia el servidor:
```bash
npm start
```

2. Prueba el botón de reconocimiento facial (😊) en un post
3. Deberías ver los detalles del rostro detectado (edad, género, emociones, etc.)

## Troubleshooting

### Si sigue sin funcionar:

1. **Verifica las credenciales AWS en el `.env`:**
```
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_REGION=us-east-1
```

2. **Verifica que el usuario es correcto:**
   - En AWS Console, ve a IAM → Security credentials
   - Copia el Access Key ID y verifica que coincida con tu `.env`

3. **Espera 15 minutos:** A veces AWS necesita tiempo para sincronizar los permisos

4. **Genera nuevas credenciales:**
   - Ve a AWS IAM → Users → redsocial-app → Security credentials
   - Crea nuevas access keys
   - Actualiza tu `.env`

## URLs útiles

- [IAM Console](https://console.aws.amazon.com/iam/)
- [Documentación de Rekognition](https://docs.aws.amazon.com/rekognition/)
- [Referencia de permisos de Rekognition](https://docs.aws.amazon.com/rekognition/latest/dg/access-control-overview.html)

## Características que usamos

El reconocimiento facial detecta:
- ✅ Edad (rango estimado)
- ✅ Género
- ✅ Emociones (feliz, triste, enojado, sorprendido, etc.)
- ✅ Características faciales (gafas, barba, bigote)
- ✅ Estado de los ojos y boca (abiertos/cerrados)
- ✅ Confianza en cada detección (0-100%)

## Costos

AWS Rekognition cobra por análisis:
- DetectFaces: $0.0015 por imagen (1000 imágenes = $1.50)
- Incluye análisis de edad, género, emociones, landmarks, etc.

Consulta los precios actuales en [AWS Pricing](https://aws.amazon.com/rekognition/pricing/)
