const mongoose = require('mongoose');
require('dotenv').config();

async function cleanOrphanPosts() {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/dacem';
    await mongoose.connect(mongoURI);
    console.log('✅ Conectado a MongoDB\n');

    const db = mongoose.connection.db;
    const postsCollection = db.collection('posts');
    const usersCollection = db.collection('users');

    // 1. Obtener IDs de todos los usuarios que SÍ existen
    const existingUsers = await usersCollection.find({}, { projection: { _id: 1 } }).toArray();
    const existingUserIds = existingUsers.map(u => u._id.toString());
    
    console.log(`📊 Usuarios existentes: ${existingUserIds.length}`);

    // 2. Encontrar todas las publicaciones
    const allPosts = await postsCollection.find({}).toArray();
    console.log(`📊 Total de publicaciones: ${allPosts.length}\n`);

    // 3. Identificar publicaciones huérfanas
    const orphanPosts = [];
    const validPosts = [];

    allPosts.forEach(post => {
      const userId = post.userId || post.user || post.author;
      const userIdStr = userId ? userId.toString() : null;
      
      if (!userIdStr || !existingUserIds.includes(userIdStr)) {
        orphanPosts.push(post);
      } else {
        validPosts.push(post);
      }
    });

    console.log(`🗑️  Publicaciones huérfanas (usuarios eliminados): ${orphanPosts.length}`);
    console.log(`✅ Publicaciones válidas: ${validPosts.length}\n`);

    if (orphanPosts.length > 0) {
      console.log('📋 Publicaciones que serán eliminadas:\n');
      orphanPosts.forEach((post, index) => {
        const userId = post.userId || post.user || post.author;
        console.log(`${index + 1}. Post ID: ${post._id}`);
        console.log(`   Usuario (eliminado): ${userId}`);
        console.log(`   Caption: ${(post.caption || '').substring(0, 50)}...`);
        console.log(`   Creado: ${post.createdAt || 'N/A'}\n`);
      });

      // 4. Eliminar publicaciones huérfanas
      const orphanIds = orphanPosts.map(p => p._id);
      const result = await postsCollection.deleteMany({ 
        _id: { $in: orphanIds } 
      });
      
      console.log(`✅ ${result.deletedCount} publicaciones huérfanas eliminadas\n`);
    } else {
      console.log('✅ No hay publicaciones huérfanas para eliminar\n');
    }

    // 5. Mostrar resumen final
    const finalCount = await postsCollection.countDocuments();
    console.log(`📊 Publicaciones finales en la base de datos: ${finalCount}`);

    if (finalCount > 0) {
      console.log('\n📋 Publicaciones restantes:');
      const remaining = await postsCollection.find({}).toArray();
      remaining.forEach((post, index) => {
        const userId = post.userId || post.user || post.author;
        console.log(`${index + 1}. Post: ${post._id} | Usuario: ${userId}`);
      });
    }

    console.log('\n🎉 Limpieza completada!\n');
    
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

cleanOrphanPosts();
