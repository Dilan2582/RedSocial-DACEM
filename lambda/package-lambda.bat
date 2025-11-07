@echo off
echo 📦 Empaquetando Lambda Function...

cd lambda\imageTransform

echo 📥 Instalando Sharp para Linux x64...
call npm install --platform=linux --arch=x64

echo 🗜️  Creando function.zip...
powershell Compress-Archive -Path index.mjs,node_modules -DestinationPath function.zip -Force

echo ✅ function.zip creado!
echo.
echo 📤 Para subir a Lambda usar AWS Console o CLI:
echo    aws lambda update-function-code ^
echo      --function-name imageTransformFunction ^
echo      --zip-file fileb://function.zip

cd ..\..
