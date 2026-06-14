const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDB, ADMIN_EMAIL } = require("../config/db");
const { autenticarToken, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

router.post("/api/auth/registro", async (req, res) => {
  const db = getDB();
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) return res.status(400).json({ error: "Campos obligatorios." });

    // Encriptar contraseña
    const saltRounds = 10;
    const passwordEncriptada = await bcrypt.hash(password, saltRounds);

    const rol = (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) ? "admin" : "usuario";

    // Guardar usuario inicializado en la base de datos
    const registroFecha = new Date().toISOString();
    const resultado = await db.run(
      `INSERT INTO usuarios (nombre, email, password, rol, xp, streak, nivel, meta_semanal, fecha_registro) VALUES (?, ?, ?, ?, 0, 0, 1, 50, ?)`,
      [nombre, email.toLowerCase(), passwordEncriptada, rol, registroFecha]
    );

    const id = resultado.lastID;
    const token = jwt.sign({ id, email: email.toLowerCase(), rol }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({ 
      mensaje: "Usuario registrado con éxito.", 
      token,
      usuario: { 
        id, 
        nombre, 
        email, 
        rol, 
        xp: 0, 
        streak: 0, 
        nivel: 1, 
        meta_semanal: 50, 
        especialidad_aspirada: "Ninguna",
        fecha_nacimiento: "",
        biografia: "",
        fecha_registro: registroFecha
      } 
    });
  } catch (error) {
    console.error("❌ ERROR DETALLADO EN REGISTRO EN EL SERVIDOR:", error);
    if (error.message && error.message.includes("UNIQUE")) return res.status(400).json({ error: "El correo ya existe." });
    res.status(500).json({ error: `Error en el registro: ${error.message || error}` });
  }
});

router.post("/api/auth/login", async (req, res) => {
  const db = getDB();
  try {
    const { email, password } = req.body;
    
    // Buscar al usuario
    const usuario = await db.get(`SELECT * FROM usuarios WHERE email = ?`, [email.toLowerCase()]);
    if (!usuario) return res.status(401).json({ error: "Credenciales incorrectas." });

    // Verificar contraseña
    const passwordCorrecta = await bcrypt.compare(password, usuario.password);
    if (!passwordCorrecta) return res.status(401).json({ error: "Credenciales incorrectas." });

    const token = jwt.sign({ id: usuario.id, email: usuario.email, rol: usuario.rol }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ 
      token,
      usuario: { 
        id: usuario.id, 
        nombre: usuario.nombre, 
        email: usuario.email, 
        rol: usuario.rol,
        xp: usuario.xp || 0,
        streak: usuario.streak || 0,
        nivel: usuario.nivel || 1,
        meta_semanal: usuario.meta_semanal || 50,
        especialidad_aspirada: usuario.especialidad_aspirada || "Ninguna",
        fecha_nacimiento: usuario.fecha_nacimiento || "",
        biografia: usuario.biografia || "",
        fecha_registro: usuario.fecha_registro || ""
      } 
    });
  } catch (error) {
    console.error("❌ ERROR DETALLADO EN LOGIN EN EL SERVIDOR:", error);
    res.status(500).json({ error: `Error en el servidor: ${error.message || error}` });
  }
});

router.put("/api/usuario/actualizar", autenticarToken, async (req, res) => {
  const db = getDB();
  try {
    const { nombre, especialidadAspirada, metaSemanal, fechaNacimiento, biografia } = req.body;
    const usuarioId = req.usuario.id;

    if (!nombre || !especialidadAspirada || metaSemanal === undefined) {
      return res.status(400).json({ error: "Faltan campos requeridos." });
    }

    const meta = parseInt(metaSemanal) || 50;

    await db.run(
      `UPDATE usuarios SET nombre = ?, especialidad_aspirada = ?, meta_semanal = ?, fecha_nacimiento = ?, biografia = ? WHERE id = ?`,
      [nombre, especialidadAspirada, meta, fechaNacimiento || null, biografia || null, usuarioId]
    );

    // Obtener los datos actualizados del usuario
    const usuarioActualizado = await db.get(
      `SELECT id, nombre, email, rol, xp, streak, nivel, meta_semanal, especialidad_aspirada, fecha_nacimiento, biografia, fecha_registro FROM usuarios WHERE id = ?`,
      [usuarioId]
    );

    res.json({
      mensaje: "Perfil actualizado con éxito.",
      usuario: {
        id: usuarioActualizado.id,
        nombre: usuarioActualizado.nombre,
        email: usuarioActualizado.email,
        rol: usuarioActualizado.rol,
        xp: usuarioActualizado.xp || 0,
        streak: usuarioActualizado.streak || 0,
        nivel: usuarioActualizado.nivel || 1,
        meta_semanal: usuarioActualizado.meta_semanal || 50,
        especialidad_aspirada: usuarioActualizado.especialidad_aspirada || "Ninguna",
        fecha_nacimiento: usuarioActualizado.fecha_nacimiento || "",
        biografia: usuarioActualizado.biografia || "",
        fecha_registro: usuarioActualizado.fecha_registro || ""
      }
    });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).json({ error: "Error interno del servidor al actualizar perfil." });
  }
});

router.put("/api/usuario/cambiar-password", autenticarToken, async (req, res) => {
  const db = getDB();
  try {
    const { passwordActual, passwordNueva } = req.body;
    const usuarioId = req.usuario.id;

    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({ error: "Faltan campos requeridos." });
    }

    // Buscar al usuario
    const usuario = await db.get(`SELECT password FROM usuarios WHERE id = ?`, [usuarioId]);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    // Verificar contraseña actual
    const passwordCorrecta = await bcrypt.compare(passwordActual, usuario.password);
    if (!passwordCorrecta) {
      return res.status(400).json({ error: "La contraseña actual es incorrecta." });
    }

    // Encriptar nueva contraseña
    const saltRounds = 10;
    const nuevaPasswordEncriptada = await bcrypt.hash(passwordNueva, saltRounds);

    // Actualizar contraseña
    await db.run(
      `UPDATE usuarios SET password = ? WHERE id = ?`,
      [nuevaPasswordEncriptada, usuarioId]
    );

    res.json({ mensaje: "Contraseña actualizada con éxito." });
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    res.status(500).json({ error: "Error interno del servidor al cambiar contraseña." });
  }
});

module.exports = router;
