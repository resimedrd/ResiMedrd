require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const os = require("os");
const { conectarBaseDeDatos, getDB } = require("./src/config/db");
const { JWT_SECRET } = require("./src/middleware/auth");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" })); // Aumentamos el límite para soportar textos largos de preguntas
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Interceptor robusto de errores de parsing de JSON (SyntaxError)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error("❌ ERROR CRÍTICO DE PARSING DE JSON EN EL SERVIDOR:");
    console.error("Mensaje:", err.message);
    console.error("Cuerpo que causó la falla:", err.body);
    return res.status(400).json({ 
      error: "JSON Inválido enviado por el cliente.", 
      detalle: err.message,
      cuerpoRecibido: err.body 
    });
  }
  next();
});

app.use(express.static(__dirname, {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
  }
}));

// --- CARGA DE ROUTERS MODULARIZADOS ---
const authRouter = require("./src/routes/auth");
const preguntasRouter = require("./src/routes/preguntas");
const sesionesRouter = require("./src/routes/sesiones");
const srRouter = require("./src/routes/spacedRepetition");
const adminRouter = require("./src/routes/admin");
const iaRouter = require("./src/routes/ia");

app.get("/api/config", (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
  });
});

app.use(authRouter);
app.use(preguntasRouter);
app.use(sesionesRouter);
app.use(srRouter);
app.use(adminRouter);
app.use(iaRouter);

// Fallback wildcard para servir index.html (Single Page App)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

function obtenerDireccionIPLocal() {
  const interfaces = os.networkInterfaces();
  for (const nombre of Object.keys(interfaces)) {
    for (const interfaz of interfaces[nombre]) {
      if (interfaz.family === "IPv4" && !interfaz.internal) {
        return interfaz.address;
      }
    }
  }
  return "localhost";
}

async function arrancar() {
  try {
    // Inicializar conexión a base de datos SQLite
    const db = await conectarBaseDeDatos();
    console.log("📈 Conexión a SQLite y esquemas de base de datos cargados.");
    
    // Inicializar servidor de batallas multijugador en tiempo real (WebSocket)
    const { inicializarBatallas } = require("./server_battle.js");
    await inicializarBatallas(server, db, JWT_SECRET);

    server.listen(PORT, () => {
      const ipLocal = obtenerDireccionIPLocal();
      console.log(`\n======================================================`);
      console.log(`🚀 Servidor ResiMed Activo:`);
      console.log(`   - Local (PC):       http://localhost:${PORT}`);
      console.log(`   - Red Local (Móvil): http://${ipLocal}:${PORT}`);
      console.log(`======================================================\n`);
    });
  } catch (error) {
    console.error("❌ Falla crítica al arrancar servidor de ResiMed:", error);
    process.exit(1);
  }
}

arrancar();
