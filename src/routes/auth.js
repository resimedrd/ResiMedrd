const express = require("express");
   const { getDB } = require("../config/db");
   const { autenticarToken } = require("../middleware/auth");

   const router = express.Router();

   // Obtener perfil del usuario autenticado
   router.get("/api/usuario/perfil", autenticarToken, async (req, res) => {
     const db = getDB();
     try {
       const usuarioId = req.usuario.id;
       const usuario = await db.get(
         `SELECT id, nombre, email, rol, xp, streak, nivel, meta_semanal, especialidad_aspirada, fecha_nacimiento, biografia, fecha_registro FROM usuarios WHERE id = ?`,
         [usuarioId]
       );
       
       if (!usuario) {
         return res.status(404).json({ error: "Usuario no encontrado en la base de datos pública." });
       }

       res.json({
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
       console.error("❌ ERROR AL OBTENER PERFIL DE USUARIO:", error);
       res.status(500).json({ error: "Error en el servidor al obtener el perfil." });
     }
   });

   // Actualizar perfil de usuario
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

   module.exports = router;
