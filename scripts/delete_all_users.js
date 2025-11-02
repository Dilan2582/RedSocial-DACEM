const mongoose = require('mongoose');
require('dotenv').config();

async function deleteAllUsers() {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/dacem';
    await mongoose.connect(mongoURI);
    console.log('✅ Conectado a MongoDB\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // 1. Contar usuarios antes de eliminar
    const count = await usersCollection.countDocuments();
    console.log(`📊 Usuarios actuales: ${count}`);

    if (count === 0) {
      console.log('\n⚠️  No hay usuarios para eliminar\n');
      await mongoose.disconnect();
      process.exit(0);
    }

    // 2. Listar usuarios antes de eliminar
    const users = await usersCollection.find({}).toArray();
    console.log('\n👥 Usuarios que serán eliminados:\n');
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email || 'N/A'} | Nickname: ${user.nickname || 'N/A'} | Provider: ${user.provider || 'local'}`);
    });

    // 3. Confirmar eliminación
    console.log('\n⚠️  ADVERTENCIA: Se eliminarán TODOS los usuarios');
    console.log('🗑️  Eliminando...\n');

    // 4. Eliminar todos los usuarios
    const result = await usersCollection.deleteMany({});
    console.log(`✅ ${result.deletedCount} usuarios eliminados`);

    // 5. Verificar que esté vacío
    const remaining = await usersCollection.countDocuments();
    console.log(`📊 Usuarios restantes: ${remaining}`);

    // 6. Recrear índices
    try {
      await usersCollection.dropIndexes();
      console.log('\n🔧 Índices eliminados');
    } catch (e) {
      console.log('\n⚠️  No hay índices para eliminar');
    }

    try {
      await usersCollection.createIndex({ email: 1 }, { unique: true });
      await usersCollection.createIndex({ nickname: 1 }, { unique: true });
      console.log('✅ Índices únicos recreados para email y nickname');
    } catch (e) {
      console.log('⚠️  Error creando índices:', e.message);
    }

    console.log('\n🎉 Base de datos completamente limpia!\n');
    
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

deleteAllUsers();
