// index.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const { connectMongo } = require("./database/connection");

const app = express();

// ========= PUERTO/HOST =========
const PORT = process.env.PORT ? Number(process.env.PORT) : 3900;
const HOST = "0.0.0.0"; // <-- importante en Railway

// ========= CORS =========
const FRONTEND_URL = process.env.FRONTEND_URL; // ej: https://dacem.up.railway.app
const allowRailway = /.*\.up\.railway\.app$/;

app.use(cors({
  origin: (origin, cb) => {
    // peticiones same-origin (curl, server to server, o navegador sin Origin)
    if (!origin) return cb(null, true);
    if (
      (FRONTEND_URL && origin === FRONTEND_URL) ||
      allowRailway.test(origin) ||
      origin.startsWith("https://accounts.google.com")
    ) return cb(null, true);
    cb(new Error("CORS blocked for origin: " + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Si detrás de proxy (Railway), útil para IP reales y cookies seguras
app.set("trust proxy", 1);

// Headers extras (tu caso OAuth)
app.use((req, res, next) => {
  res.removeHeader("Cross-Origin-Opener-Policy");
  res.removeHeader("Cross-Origin-Embedder-Policy");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========= STATIC =========
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// Healthcheck (útil para probar que levantó)
app.get("/api/healthz", (_req, res) => res.json({ ok: true }));

// Opcional: servir index.html en raíz
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ========= RUTAS API =========
app.use("/api/user", require("./routes/user"));
app.use("/api/follow", require("./routes/follow"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/test-upload", require("./routes/test-upload"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/messages", require("./routes/messages"));

// Ruta de prueba
app.get("/ruta-prueba", (_req, res) => {
  res.status(200).json({ id: 1, nombre: "Dilan", apellido: "Escobar" });
});

// ========= START =========
(async () => {
  try {
    console.log("🚀 Iniciando DACEM backend…");
    await connectMongo();
    app.listen(PORT, HOST, () => {
      console.log(`✅ Server on http://${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error("💥 No se pudo iniciar el servidor:", err.message);
    process.exit(1);
  }
})();
