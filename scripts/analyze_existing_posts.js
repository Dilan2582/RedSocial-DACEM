const mongoose = require('mongoose');
require('dotenv').config();
const { analyzeS3Image } = require('../services/vision');
const { env } = require('../config/env');

async function analyzeExistingPosts() {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/dacem';
    await mongoose.connect(mongoURI);
    console.log('✅ Conectado a MongoDB\n');

    const db = mongoose.connection.db;
    
    // Buscar posts sin análisis (sin tags o tags vacíos)
    const posts = await db.collection('posts').find({
      $or: [
        { tags: { $exists: false } },
        { tags: { $size: 0 } },
        { nsfw: { $exists: false } }
      ]
    }).toArray();

    console.log(`📊 Posts sin análisis: ${posts.length}\n`);

    if (posts.length === 0) {
      console.log('✅ Todos los posts ya tienen análisis');
      await mongoose.disconnect();
      process.exit(0);
      return;
    }

    let analyzed = 0;
    let errors = 0;

    for (const post of posts) {
      try {
        console.log(`🔍 Analizando post ${post._id}...`);
        
        const visionData = await analyzeS3Image({
          bucket: env.aws.s3Bucket,
          key: post.media.keyOriginal
        });

        await db.collection('posts').updateOne(
          { _id: post._id },
          {
            $set: {
              tags: visionData.tags,
              nsfw: visionData.nsfw,
              faceCount: visionData.faceCount,
              visionRaw: visionData.raw
            }
          }
        );

        console.log(`   ✅ Tags: [${visionData.tags.slice(0, 5).join(', ')}]`);
        console.log(`   ✅ NSFW: ${visionData.nsfw}`);
        console.log(`   ✅ Caras: ${visionData.faceCount}\n`);
        
        analyzed++;
      } catch (err) {
        console.error(`   ❌ Error: ${err.message}\n`);
        errors++;
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`   ✅ Analizados: ${analyzed}`);
    console.log(`   ❌ Errores: ${errors}`);

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

analyzeExistingPosts();
