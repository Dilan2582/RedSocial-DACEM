// Script para crear una notificación de prueba de follow_request
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');
const Follow = require('../models/follow');
const Notification = require('../models/notification');

async function createTestFollowRequest() {
  try {
    const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Obtener dos usuarios diferentes
    const users = await User.find().limit(2).lean();
    
    if (users.length < 2) {
      console.log('❌ Necesitas al menos 2 usuarios en la BD');
      process.exit(1);
    }

    const user1 = users[0];
    const user2 = users[1];

    console.log(`👤 Usuario 1: ${user1.nickname || user1.firstName} (${user1._id})`);
    console.log(`👤 Usuario 2: ${user2.nickname || user2.firstName} (${user2._id})\n`);

    // Verificar si ya existe un follow
    const existingFollow = await Follow.findOne({
      user: user1._id,
      followed: user2._id
    });

    if (existingFollow) {
      console.log('⚠️  Ya existe un follow entre estos usuarios');
      console.log(`   Status actual: ${existingFollow.status}`);
      
      // Si está aceptado, lo eliminamos para crear uno pendiente
      if (existingFollow.status === 'accepted') {
        await Follow.deleteOne({ _id: existingFollow._id });
        console.log('   ✅ Follow aceptado eliminado para crear uno pendiente\n');
      }
    }

    // Crear un follow pendiente
    const newFollow = await Follow.create({
      user: user1._id,
      followed: user2._id,
      status: 'pending'
    });

    console.log('✅ Follow pendiente creado');

    // Crear notificación de follow_request
    const notification = await Notification.create({
      recipient: user2._id,
      sender: user1._id,
      type: 'follow_request',
      post: null,
      read: false
    });

    console.log('✅ Notificación de follow_request creada\n');

    console.log('📊 Resultado:');
    console.log(`   - ${user1.nickname || user1.firstName} envió solicitud a ${user2.nickname || user2.firstName}`);
    console.log(`   - Notificación creada para ${user2.nickname || user2.firstName}`);
    console.log(`   - ID de notificación: ${notification._id}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestFollowRequest();
