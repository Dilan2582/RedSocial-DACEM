// Script para verificar el estado de los follows en la base de datos
require('dotenv').config();
const mongoose = require('mongoose');
const Follow = require('../models/follow');
const User = require('../models/user');

async function checkFollows() {
  try {
    // Conectar a la base de datos
    const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/redsocial';
    console.log('🔗 Conectando a:', MONGODB_URI.replace(/:[^:@]+@/, ':****@')); // Ocultar contraseña
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Contar todos los follows
    const totalFollows = await Follow.countDocuments();
    console.log(`📊 Total de follows en la BD: ${totalFollows}`);

    if (totalFollows === 0) {
      console.log('\n⚠️  No hay follows en la base de datos');
      console.log('Esto significa que necesitas crear follows de prueba o que nunca se han creado follows.');
    } else {
      // Contar por estado
      const pending = await Follow.countDocuments({ status: 'pending' });
      const accepted = await Follow.countDocuments({ status: 'accepted' });
      const rejected = await Follow.countDocuments({ status: 'rejected' });
      const withoutStatus = await Follow.countDocuments({ status: { $exists: false } });
      const nullStatus = await Follow.countDocuments({ status: null });

      console.log('\n📊 Estado de los follows:');
      console.log(`   - Pendientes: ${pending}`);
      console.log(`   - Aceptados: ${accepted}`);
      console.log(`   - Rechazados: ${rejected}`);
      console.log(`   - Sin campo status: ${withoutStatus}`);
      console.log(`   - Con status null: ${nullStatus}`);

      // Mostrar algunos ejemplos
      console.log('\n📋 Ejemplos de follows:');
      const samples = await Follow.find()
        .limit(5)
        .populate('user', 'firstName lastName nickname')
        .populate('followed', 'firstName lastName nickname')
        .lean();

      samples.forEach((f, i) => {
        const userName = f.user?.nickname || f.user?.firstName || 'Usuario desconocido';
        const followedName = f.followed?.nickname || f.followed?.firstName || 'Usuario desconocido';
        console.log(`   ${i + 1}. ${userName} → ${followedName} (status: ${f.status || 'sin status'})`);
      });
    }

    // Contar usuarios
    const totalUsers = await User.countDocuments();
    console.log(`\n👥 Total de usuarios en la BD: ${totalUsers}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkFollows();
