require('dotenv').config(); 
// Importar dependencias
const express = require('express');
const cors = require('cors');
// OJO: desestructurar
const { connection } = require('./database/connection');
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/auth');

// Mensaje de bienvenida
console.log('Bienvenido a mi red social');

// Conectar a la base de datos
connection();
console.log('Conexión a la base de datos exitosa');

// Crear el servidor de Node
const app = express();
const puerto = process.env.PORT || 3900;

// Configurar CORS y body-parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/user', require('./routes/user'));
app.use(express.static('public'));
app.use('/api/follow', require('./routes/follow'));
app.use('/api/auth', authRoutes);


// Ruta de prueba
app.get('/ruta-prueba', (req, res) => {
  return res.status(200).json({ id: 1, nombre: 'Dilan', apellido: 'Escobar' });
});

// Levantar servidor
app.listen(puerto, () => {
  console.log(`Servidor corriendo en http://localhost:${puerto}`);
});
