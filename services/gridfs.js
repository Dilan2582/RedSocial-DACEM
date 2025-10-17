// services/gridfs.js
const mongoose = require('mongoose');
let bucket;

function getBucket() {
  if (!bucket) {
    bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'avatars'
    });
  }
  return bucket;
}

module.exports = { getBucket };
