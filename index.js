// index.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const { connectMongo } = require("./database/connection");

const app = express();
const PORT = Number(process.env.PORT || 3900);

// ===== Helpers de dominio/orígenes =====
const RAILWAY_URL = process.env.PUBLIC_URL || "https://redsocial-dacem-production.up.railway.app";
const LOCAL_URLS = ["http://localhost:3900", "http://127.0.0.1:3900"];
const EXTRA_CLIENT = process.env.CLIENT_URL ? [process.env.CLIENT_URL] : [];

// Importante en plataformas con proxy (Railway, Render, etc.)
app.set("trust proxy", 1);

// ===== Middlewares base =====
app.use(
  cors({
    origin: [...LOCAL_URLS, RAILWAY_URL, ...EXTRA_CLIENT],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// (Opcional) Si quieres forzar https en producción detrás de proxy
// app.use((req, res, next) => {
//   if (process.env.NODE_ENV === "production" && req.headers["x-forwarded-proto"] !== "https") {
//     return res.redirect(`https://${req.headers.host}${req.url}`);
//   }
//   next();
// });

// Headers adicionales (tu nota para Google OAuth)
app.use((req, res, next) => {
  res.removeHeader("Cross-Origin-Opener-Policy");
  res.removeHeader("Cross-Origin-Embedder-Policy");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== Archivos estáticos =====
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// ===== Health checks (Railway) =====
app.get("/healthz", (_req, res) => res.status(200).send("ok"));
app.get("/api/health", (_req, res) => res.json({ ok: true, env: process.env.NODE_ENV || "dev" }));

// ===== Rutas API =====
app.use("/api/user", require("./routes/user"));
app.use("/api/follow", require("./routes/follow"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/test-upload", require("./routes/test-upload"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/notifications", require("./routes/notifications"));

// Ruta de prueba
app.get("/ruta-prueba", (_req, res) => {
  res.status(200).json({ id: 1, nombre: "Dilan", apellido: "Escobar" });
});

// (Opcional) SPA fallback: si entras a /user.html o /profile.html directo funciona por estáticos,
// pero si más adelante haces rutas tipo /app/... puedes descomentar esto:
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "public", "index.html"));
// });

// ===== Arranque =====
(async () => {
  try {
    console.log("🚀 Iniciando DACEM backend…");
    await connectMongo();
    app.listen(PORT, () => {
      console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
      console.log(`🌐 Origin permitido: ${RAILWAY_URL}`);
    });
  } catch (err) {
    console.error("💥 No se pudo iniciar el servidor:", err.message);
    process.exit(1);
  }
})();
