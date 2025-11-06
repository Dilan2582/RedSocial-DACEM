// Script para crear notificaciones de follow_request para todos los usuarios
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');
const Follow = require('../models/follow');
const Notification = require('../models/notification');

async function createFollowRequestsForAll() {
  try {
    const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    const users = await User.find().lean();
    
    if (users.length < 2) {
      console.log('❌ Necesitas al menos 2 usuarios en la BD');
      process.exit(1);
    }

    console.log(`👥 Encontrados ${users.length} usuarios\n`);

    let created = 0;

    // Para cada usuario, crear solicitudes de otros usuarios hacia él
    for (const targetUser of users) {
      for (const senderUser of users) {
        // No enviar solicitud a uno mismo
        if (String(senderUser._id) === String(targetUser._id)) continue;

        // Verificar si ya existe un follow
        const existingFollow = await Follow.findOne({
          user: senderUser._id,
          followed: targetUser._id
        });

        // Si no existe o está aceptado, crear uno pendiente
        if (!existingFollow) {
          // Crear follow pendiente
          await Follow.create({
            user: senderUser._id,
            followed: targetUser._id,
            status: 'pending'
          });

          // Crear notificación
          await Notification.create({
            recipient: targetUser._id,
            sender: senderUser._id,
            type: 'follow_request',
            post: null,
            read: false
          });

          const senderName = senderUser.nickname || senderUser.firstName || 'Usuario';
          const targetName = targetUser.nickname || targetUser.firstName || 'Usuario';
          console.log(`✅ ${senderName} → ${targetName} (solicitud creada)`);
          created++;
        } else if (existingFollow.status === 'accepted') {
          // Si está aceptado, cambiar a pendiente y crear notificación
          existingFollow.status = 'pending';
          await Follow.updateOne({ _id: existingFollow._id }, { status: 'pending' });

          // Verificar si ya existe la notificación
          const existingNotif = await Notification.findOne({
            recipient: targetUser._id,
            sender: senderUser._id,
            type: 'follow_request'
          });

          if (!existingNotif) {
            await Notification.create({
              recipient: targetUser._id,
              sender: senderUser._id,
              type: 'follow_request',
              post: null,
              read: false
            });

            const senderName = senderUser.nickname || senderUser.firstName || 'Usuario';
            const targetName = targetUser.nickname || targetUser.firstName || 'Usuario';
            console.log(`✅ ${senderName} → ${targetName} (cambiado a pendiente)`);
            created++;
          }
        }
      }
    }

    console.log(`\n📊 Total de solicitudes creadas: ${created}`);

    // Verificar notificaciones
    const totalNotifs = await Notification.countDocuments({ type: 'follow_request' });
    console.log(`📬 Total notificaciones de follow_request: ${totalNotifs}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createFollowRequestsForAll();
