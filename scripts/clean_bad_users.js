const mongoose = require('mongoose');
require('dotenv').config();

async function cleanBadUsers() {
  try {
    // Conectar a MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dacem';
    await mongoose.connect(mongoURI);
    console.log('✅ Conectado a MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // 1. Buscar usuarios con emails incompletos (solo dominio)
    const badUsers = await usersCollection.find({
      email: { $regex: /^@/ } // Emails que empiezan con @
    }).toArray();

    console.log(`\n📊 Usuarios con emails incompletos encontrados: ${badUsers.length}`);

    if (badUsers.length > 0) {
      console.log('\n🗑️  Usuarios a eliminar:');
      badUsers.forEach(user => {
        console.log(`  - Email: ${user.email} | ID: ${user._id} | Nickname: ${user.nickname || 'N/A'}`);
      });

      // Eliminar usuarios con emails incompletos
      const deleteResult = await usersCollection.deleteMany({
        email: { $regex: /^@/ }
      });

      console.log(`\n✅ ${deleteResult.deletedCount} usuarios eliminados`);
    } else {
      console.log('\n✅ No hay usuarios con emails incompletos');
    }

    // 2. Buscar usuarios duplicados por email
    const duplicates = await usersCollection.aggregate([
      {
        $group: {
          _id: "$email",
          count: { $sum: 1 },
          ids: { $push: "$_id" },
          docs: { $push: "$$ROOT" }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]).toArray();

    console.log(`\n📊 Emails duplicados encontrados: ${duplicates.length}`);

    if (duplicates.length > 0) {
      for (const dup of duplicates) {
        console.log(`\n📧 Email duplicado: ${dup._id} (${dup.count} copias)`);
        
        // Mantener el más antiguo (primer ID)
        const keepId = dup.ids[0];
        const deleteIds = dup.ids.slice(1);
        
        console.log(`  ✅ Manteniendo: ${keepId}`);
        console.log(`  🗑️  Eliminando: ${deleteIds.join(', ')}`);
        
        await usersCollection.deleteMany({ 
          _id: { $in: deleteIds } 
        });
      }
      console.log('\n✅ Duplicados eliminados');
    } else {
      console.log('\n✅ No hay emails duplicados');
    }

    // 3. Crear índice único para email (si no existe)
    try {
      await usersCollection.createIndex({ email: 1 }, { unique: true });
      console.log('\n✅ Índice único creado para email');
    } catch (error) {
      if (error.code === 85) {
        console.log('\n⚠️  El índice único ya existe');
      } else {
        console.log('\n✅ Índice único verificado');
      }
    }

    // 4. Crear índice único para nickname (si no existe)
    try {
      await usersCollection.createIndex({ nickname: 1 }, { unique: true });
      console.log('✅ Índice único creado para nickname');
    } catch (error) {
      if (error.code === 85) {
        console.log('⚠️  El índice único para nickname ya existe');
      } else {
        console.log('✅ Índice único para nickname verificado');
      }
    }

    // 5. Normalizar emails existentes (convertir a minúsculas)
    const allUsers = await usersCollection.find({}).toArray();
    let normalized = 0;
    
    for (const user of allUsers) {
      if (user.email && user.email !== user.email.toLowerCase().trim()) {
        await usersCollection.updateOne(
          { _id: user._id },
          { 
            $set: { 
              email: user.email.toLowerCase().trim() 
            } 
          }
        );
        normalized++;
      }
    }

    if (normalized > 0) {
      console.log(`\n✅ ${normalized} emails normalizados (convertidos a minúsculas)`);
    } else {
      console.log('\n✅ Todos los emails ya están normalizados');
    }

    console.log('\n🎉 Limpieza completada exitosamente!\n');
    
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error durante la limpieza:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

cleanBadUsers();
