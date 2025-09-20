const mongoose = require('mongoose');

const connection = async () => {
  try {
    // PUERTO CORRECTO: 27017
    await mongoose.connect('mongodb://localhost:27017/mi_red_social');
    console.log('Conectado a la base de Datos mi_red_social');
  } catch (error) {
    console.log(error);
    throw new Error('Error a la hora de iniciar la base de datos');
  }
};

module.exports = { connection }; 
