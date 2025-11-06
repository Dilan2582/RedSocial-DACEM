#!/bin/bash

echo "📦 Empaquetando Lambda Function..."

cd lambda/imageTransform

# Instalar dependencias para Linux
echo "📥 Instalando Sharp para Linux x64..."
npm install --platform=linux --arch=x64

# Crear ZIP
echo "🗜️  Creando function.zip..."
zip -r function.zip index.mjs node_modules/

echo "✅ function.zip creado!"
echo ""
echo "📤 Para subir a Lambda:"
echo "   aws lambda update-function-code \\"
echo "     --function-name imageTransformFunction \\"
echo "     --zip-file fileb://function.zip"
