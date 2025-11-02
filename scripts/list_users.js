const mongoose = require('mongoose');
require('dotenv').config();

async function listUsers() {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/dacem';
    await mongoose.connect(mongoURI);
    console.log('✅ Conectado a MongoDB\n');

    const db = mongoose.connection.db;
    const users = await db.collection('users').find({}).toArray();

    console.log(`📊 Total de usuarios: ${users.length}\n`);

    if (users.length === 0) {
      console.log('⚠️  No hay usuarios en la base de datos');
    } else {
      console.log('👥 Lista de usuarios:\n');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`   ID: ${user._id}`);
        console.log(`   Email: ${user.email || 'N/A'}`);
        console.log(`   Nickname: ${user.nickname || 'N/A'}`);
        console.log(`   Nombre: ${user.firstName || 'N/A'} ${user.lastName || ''}`);
        console.log(`   Provider: ${user.provider || 'local'}`);
        console.log(`   ProviderId: ${user.providerId || '(ninguno)'}`);
        console.log(`   Creado: ${user.createdAt || 'N/A'}`);
        console.log('');
      });
    }

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

listUsers();
