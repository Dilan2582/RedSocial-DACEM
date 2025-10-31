// index.js
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const { connection } = require('./database/connection');

// ====== App y config base ======
const app    = express();
const puerto = process.env.PORT || 3900;

// Middlewares base (declara app ANTES de usarla)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// ====== Rutas API ======
app.use('/api/user',   require('./routes/user'));
app.use('/api/follow', require('./routes/follow'));
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/test-upload', require('./routes/test-upload'));
app.use('/api/posts',  require('./routes/posts'));

// Ruta de prueba
app.get('/ruta-prueba', (req, res) => {
  res.status(200).json({ id: 1, nombre: 'Dilan', apellido: 'Escobar' });
});

// ====== Conexión BD y arranque ======
console.log('Bienvenido a mi red social');
connection();
console.log('Conexión a la base de datos exitosa');

app.listen(puerto, () => {
  console.log(`Servidor corriendo en http://localhost:${puerto}`);
});
