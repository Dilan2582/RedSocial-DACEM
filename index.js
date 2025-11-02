// index.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const { connectMongo } = require("./database/connection");

const app = express();
const PORT = Number(process.env.PORT || 3900);

// ===== Middlewares base =====
app.use(cors());
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
