// Script para aceptar todas las solicitudes pendientes
require('dotenv').config();
const mongoose = require('mongoose');
const Follow = require('../models/follow');

async function acceptAllPending() {
  try {
    const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Contar solicitudes pendientes
    const pendingCount = await Follow.countDocuments({ status: 'pending' });
    console.log(`📊 Solicitudes pendientes: ${pendingCount}`);

    if (pendingCount === 0) {
      console.log('\n✅ No hay solicitudes pendientes para aceptar');
      process.exit(0);
    }

    // Actualizar todas a 'accepted'
    const result = await Follow.updateMany(
      { status: 'pending' },
      { $set: { status: 'accepted' } }
    );

    console.log(`✅ Actualizadas ${result.modifiedCount} solicitudes a 'accepted'\n`);

    // Verificar estado final
    const accepted = await Follow.countDocuments({ status: 'accepted' });
    const pending = await Follow.countDocuments({ status: 'pending' });

    console.log('📊 Estado final:');
    console.log(`   - Aceptados: ${accepted}`);
    console.log(`   - Pendientes: ${pending}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

acceptAllPending();
