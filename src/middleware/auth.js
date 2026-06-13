const jwt = require("jsonwebtoken");
const { getDB } = require("../config/db");

const JWT_SECRET = "resiMed_secret_key_ultra_premium_amboss";

function autenticarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Acceso denegado. Token no proporcionado." });
  }

  jwt.verify(token, JWT_SECRET, (err, usuario) => {
    if (err) {
      return res.status(403).json({ error: "Sesión inválida o expirada. Inicia sesión nuevamente." });
    }
    req.usuario = usuario;
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
  exigirAdmin,
  JWT_SECRET
};
