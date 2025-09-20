// scripts/migrate_users.js
require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// Ajusta la URL si en tu connection.js no usas process.env:
const MONGO_URI = 'mongodb://localhost:27017/mi_red_social';

const User = require('../models/user'); // asegúrate de la ruta correcta a tu modelo

async function run(){
  await mongoose.connect(MONGO_URI);
  const users = await User.find({});
  console.log('Usuarios a migrar:', users.length);

  for (const u of users) {
    let changed = false;

    // nickname (si falta, toma antes del @ del email; asegura unicidad)
    if (!u.nickname || !u.nickname.trim()) {
      let base = (u.email && u.email.includes('@')) ? u.email.split('@')[0].toLowerCase() : `user${u._id.toString().slice(-4)}`;
      let nick = base;
      // garantizar único
      // eslint-disable-next-line no-await-in-loop
      while (await User.findOne({ nickname: nick, _id: { $ne: u._id } })) {
        nick = base + Math.floor(Math.random()*10);
      }
      u.nickname = nick;
      changed = true;
    }

    // firstName / lastName desde name (si existen)
        if ((!u.firstName || !u.firstName.trim()) && u.name) {
    const parts = u.name.trim().split(' ');
    u.firstName = parts[0] || 'Usuario';
    u.lastName  = parts.slice(1).join(' ') || 'N/A';  // <— aquí
    changed = true;
    }

    
    // name “legacy” desde first/last por coherencia
    if (u.firstName && (u.isModified?.('firstName') || u.isModified?.('lastName') || !u.name)) {
      u.name = `${u.firstName} ${u.lastName || ''}`.trim();
      changed = true;
    }

    if (changed) {
      // eslint-disable-next-line no-await-in-loop
      await u.save();
      console.log('Migrado:', u.email, '->', u.nickname);
    }
  }

  await mongoose.disconnect();
  console.log('OK: migración completada');
}

run().catch(e=>{ console.error('Error migración:', e); process.exit(1); });
