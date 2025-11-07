// Script para migrar follows existentes agregando status='accepted'
require('dotenv').config();
const mongoose = require('mongoose');
const Follow = require('../models/follow');

async function migrateFollows() {
  try {
    // Conectar a la base de datos
    const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/redsocial';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar todos los follows sin status o con status null
    const followsWithoutStatus = await Follow.find({
      $or: [
        { status: { $exists: false } },
        { status: null }
      ]
    });

    console.log(`📊 Encontrados ${followsWithoutStatus.length} follows sin status`);

    if (followsWithoutStatus.length === 0) {
      console.log('✅ No hay follows para migrar');
      process.exit(0);
    }

    // Actualizar todos a status='accepted'
    const result = await Follow.updateMany(
      {
        $or: [
          { status: { $exists: false } },
          { status: null }
        ]
      },
      { $set: { status: 'accepted' } }
    );

    console.log(`✅ Actualizados ${result.modifiedCount} follows a status='accepted'`);

    // Verificar resultados
    const pendingCount = await Follow.countDocuments({ status: 'pending' });
    const acceptedCount = await Follow.countDocuments({ status: 'accepted' });
    const rejectedCount = await Follow.countDocuments({ status: 'rejected' });

    console.log('\n📊 Estado final:');
    console.log(`   - Pendientes: ${pendingCount}`);
    console.log(`   - Aceptados: ${acceptedCount}`);
    console.log(`   - Rechazados: ${rejectedCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  }
}

migrateFollows();
