// index.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const { connectMongo } = require("./database/connection");

const app = express();
const PORT = Number(process.env.PORT || 3900);

// ===== Middlewares base =====
// CORS configurado para Google OAuth
app.use(cors({
  origin: [
    'http://localhost:3900',
    'http://127.0.0.1:3900',
    'https://accounts.google.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Headers adicionales para Google OAuth
app.use((req, res, next) => {
  // Permitir Google OAuth completamente
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== Archivos estáticos =====
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// ===== Rutas API =====
app.use("/api/user", require("./routes/user"));
app.use("/api/follow", require("./routes/follow"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/test-upload", require("./routes/test-upload"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/face-recognition", require("./routes/facerecognition"));

// Ruta de prueba
app.get("/ruta-prueba", (_req, res) => {
  res.status(200).json({ id: 1, nombre: "Dilan", apellido: "Escobar" });
});

// ===== Arranque =====
(async () => {
  try {
    console.log("🚀 Iniciando DACEM backend…");
    await connectMongo(); // espera conexión antes de levantar el server
    app.listen(PORT, () => {
      console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("💥 No se pudo iniciar el servidor:", err.message);
    process.exit(1);
  }
})();
