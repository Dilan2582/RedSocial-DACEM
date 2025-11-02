// database/connection.js
const mongoose = require("mongoose");

let isConnected = false;

async function connectMongo() {
  // Acepta MONGO_URL o MONGO_URI (usa el que tengas)
  const uri = process.env.MONGO_URL || process.env.MONGO_URI;
  if (!uri) throw new Error("Falta MONGO_URL (o MONGO_URI) en .env");

  if (isConnected) return; // evita reconectar si ya está

  // Opcional: mantiene compatibilidad con filtros antiguos
  mongoose.set("strictQuery", true);

  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 15000,
  });

  isConnected = true;
  console.log("✅ Conectado a MongoDB Atlas:", mongoose.connection.name);

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB error:", err);
  });
  mongoose.connection.on("disconnected", () => {
    isConnected = false;
    console.warn("MongoDB desconectado");
  });
}

module.exports = { connectMongo };
