const mongoose = require('mongoose');
require('dotenv').config();

async function watchUsers() {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/dacem';
    await mongoose.connect(mongoURI);
    console.log('✅ Conectado a MongoDB');
    console.log('👀 Monitoreando cambios en la colección users...\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Mostrar usuarios actuales cada 3 segundos
    setInterval(async () => {
      const users = await usersCollection.find({}).toArray();
      
      console.clear();
      console.log('👀 MONITOR DE USUARIOS - ' + new Date().toLocaleTimeString());
      console.log('=' .repeat(70));
      console.log(`\n📊 Total de usuarios: ${users.length}\n`);
      
      if (users.length === 0) {
        console.log('⚠️  No hay usuarios (esperando login con Google...)\n');
      } else {
        users.forEach((user, index) => {
          console.log(`${index + 1}. ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(`   📧 Email: ${user.email || 'N/A'}`);
          console.log(`   👤 Nickname: ${user.nickname || 'N/A'}`);
          console.log(`   🏷️  Nombre: ${user.firstName || 'N/A'} ${user.lastName || ''}`);
          console.log(`   🔐 Provider: ${user.provider || 'local'}`);
          console.log(`   🆔 Provider ID: ${user.providerId || 'N/A'}`);
          console.log(`   📅 Creado: ${user.createdAt || 'N/A'}`);
          console.log('');
        });
      }
      
      console.log('Presiona Ctrl+C para detener el monitoreo...');
    }, 3000);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

watchUsers();
