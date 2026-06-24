const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { getDB } = require("../config/db");

// Cargar la clave pública de Supabase desde el archivo PEM
let publicKey = null;
try {
  const pemPath = path.join(__dirname, "../config/supabase_public_key.pem");
  publicKey = fs.readFileSync(pemPath, "utf8");
} catch (err) {
  console.error("❌ ERROR AL CARGAR CLAVE PÚBLICA DE SUPABASE EN EL MIDDLEWARE:", err);
}

function autenticarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Acceso denegado. Token no proporcionado." });
  }

  if (!publicKey) {
    return res.status(500).json({ error: "Error de configuración de seguridad en el servidor." });
  }

  jwt.verify(token, publicKey, { algorithms: ["ES256"] }, (err, decoded) => {
    if (err) {
      console.warn("⚠️ Token inválido o falló verificación asimétrica ES256:", err.message);
      return res.status(403).json({ error: "Sesión inválida o expirada. Inicia sesión nuevamente." });
    }
    
    // Mapear decoded.sub (UUID de Supabase) a req.usuario.id
    req.usuario = {
      id: decoded.sub,
      email: decoded.email
    };
    next();
  });
}

async function exigirAdmin(req, res, next) {
  try {
    const usuarioId = req.usuario.id;
    const db = getDB();
    const usuarioReal = await db.get("SELECT rol FROM usuarios WHERE id = ?", [usuarioId]);

    if (!usuarioReal || usuarioReal.rol !== "admin") {
      return res.status(403).json({ error: "Acceso denegado. No eres administrador." });
    }
    next();
  } catch (error) {
    console.error("Error en exigirAdmin middleware:", error);
    res.status(500).json({ error: "Error interno en validación de privilegios." });
  }
}

module.exports = {
  autenticarToken,
  exigirAdmin
};
