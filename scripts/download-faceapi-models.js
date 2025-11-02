// scripts/download-faceapi-models.js
const https = require('https');
const fs = require('fs');
const path = require('path');

const MODEL_DIR = path.join(__dirname, '../models/face-api');

// URLs directas desde GitHub
const MODELS = [
  {
    name: 'tiny_face_detector_model-weights_manifest.json',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json'
  },
  {
    name: 'tiny_face_detector_model-shard1',
    url: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/tiny_face_detector_model-shard1'
  },
  {
    name: 'age_gender_model-weights_manifest.json',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/age_gender_model-weights_manifest.json'
  },
  {
    name: 'age_gender_model-shard1',
    url: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/age_gender_model-shard1'
  },
  {
    name: 'face_expression_model-weights_manifest.json',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_expression_model-weights_manifest.json'
  },
  {
    name: 'face_expression_model-shard1',
    url: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_expression_model-shard1'
  },
  {
    name: 'face_landmark_68_model-weights_manifest.json',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json'
  },
  {
    name: 'face_landmark_68_model-shard1',
    url: 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_landmark_68_model-shard1'
  }
];

// Crear directorio si no existe
if (!fs.existsSync(MODEL_DIR)) {
  fs.mkdirSync(MODEL_DIR, { recursive: true });
  console.log(`📁 Directorio creado: ${MODEL_DIR}`);
}

// Función para descargar un archivo
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    https.get(url, (response) => {
      // Manejar redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Error descargando ${url}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// Descargar todos los modelos
async function downloadModels() {
  console.log('🚀 Descargando modelos de Face-API.js...\n');
  
  for (const model of MODELS) {
    const dest = path.join(MODEL_DIR, model.name);
    
    // Verificar si ya existe
    if (fs.existsSync(dest)) {
      console.log(`✓ ${model.name} (ya existe)`);
      continue;
    }
    
    try {
      console.log(`⏬ Descargando ${model.name}...`);
      await downloadFile(model.url, dest);
      console.log(`✅ ${model.name}`);
    } catch (error) {
      console.error(`❌ Error descargando ${model.name}:`, error.message);
      process.exit(1);
    }
  }
  
  console.log('\n✅ Todos los modelos descargados correctamente');
  console.log(`📁 Ubicación: ${MODEL_DIR}`);
}

downloadModels();
