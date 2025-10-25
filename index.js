require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const { connection } = require('./database/connection');

// Rutas
const userRoutes   = require('./routes/user');
const followRoutes = require('./routes/follow');
const authRoutes   = require('./routes/auth');

console.log('Bienvenido a mi red social');

// Conexión a BD
connection();
console.log('Conexión a la base de datos exitosa');

const app = express();
const puerto = process.env.PORT || 3900;

// Middlewares base
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Montaje de rutas (usa las variables ya requeridas arriba)
app.use('/api/user', userRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/auth', authRoutes);

// Ruta de prueba
app.get('/ruta-prueba', (req, res) => {
  res.status(200).json({ id: 1, nombre: 'Dilan', apellido: 'Escobar' });
});

app.listen(puerto, () => {
  console.log(`Servidor corriendo en http://localhost:${puerto}`);
});

app.use('/api/test-upload', require('./routes/test-upload'));