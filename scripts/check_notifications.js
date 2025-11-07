// Script para verificar notificaciones en la base de datos
require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('../models/notification');
const User = require('../models/user'); // Necesario para populate

async function checkNotifications() {
  try {
    const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    const total = await Notification.countDocuments();
    console.log(`📊 Total de notificaciones: ${total}`);

    if (total === 0) {
      console.log('\n⚠️  No hay notificaciones en la base de datos');
    } else {
      const byType = await Notification.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]);

      console.log('\n📊 Notificaciones por tipo:');
      byType.forEach(t => {
        console.log(`   - ${t._id}: ${t.count}`);
      });

      const unread = await Notification.countDocuments({ read: false });
      console.log(`\n📬 No leídas: ${unread}`);

      console.log('\n📋 Últimas 10 notificaciones:');
      const recent = await Notification.find()
        .populate('recipient', 'firstName lastName nickname')
        .populate('sender', 'firstName lastName nickname')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      recent.forEach((n, i) => {
        const recipient = n.recipient?.nickname || n.recipient?.firstName || 'Usuario';
        const sender = n.sender?.nickname || n.sender?.firstName || 'Usuario';
        const date = new Date(n.createdAt).toLocaleString();
        console.log(`   ${i + 1}. ${sender} → ${recipient} (${n.type}) [${n.read ? 'leída' : 'no leída'}] - ${date}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkNotifications();
