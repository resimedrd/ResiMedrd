const express = require("express");
const { getDB } = require("../config/db");
const { autenticarToken, exigirAdmin } = require("../middleware/auth");

const router = express.Router();

router.post("/api/preguntas", autenticarToken, exigirAdmin, async (req, res) => {
  const db = getDB();
  try {
    const { texto, opciones, correcta, tema, explicacion, fuente, examen_id, difficulty } = req.body;
    const usuarioId = req.usuario.id;

    // REVISIÓN INTEGRAL: En vez de creerle al texto "admin", le preguntamos directamente 
    // a la base de datos quién es este usuario usando su ID único de cuenta.
    const usuarioReal = await db.get(`SELECT rol FROM usuarios WHERE id = ?`, [usuarioId]);
    
    if (!usuarioReal || usuarioReal.rol !== "admin") {
      return res.status(403).json({ error: "Acceso denegado. No eres administrador." });
    }

    // Si la base de datos confirma que sí es administrador, guardamos la pregunta con su fuente
    const opcionesJSON = JSON.stringify(opciones);
    
    // Obtener año del examen si está asociado
    let anoExamen = 2024;
    let finalExamenId = null;
    if (examen_id) {
      finalExamenId = parseInt(examen_id);
      const exObj = await db.get(`SELECT ano FROM examenes WHERE id = ?`, [finalExamenId]);
      if (exObj) {
        anoExamen = exObj.ano;
      }
    }

    await db.run(
      `INSERT INTO preguntas (texto, opciones, correcta, tema, explicacion, fuente, especialidad, difficulty, activo, examen_id, ano_examen) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        texto, 
        opcionesJSON, 
        correcta, 
        tema, 
        explicacion, 
        fuente || "ENURM Referencia Académica Oficial",
        tema,
        difficulty !== undefined ? parseFloat(difficulty) : 0.5,
        finalExamenId,
        anoExamen
      ]
    );

    // Recalcular cantidad de preguntas del examen
    if (finalExamenId) {
      const countRow = await db.get(
        `SELECT COUNT(*) as total FROM preguntas WHERE examen_id = ? AND (activo = 1 OR activo IS NULL)`,
        [finalExamenId]
      );
      const cantidad = countRow ? countRow.total : 0;
      await db.run(`UPDATE examenes SET cantidad_preguntas = ? WHERE id = ?`, [cantidad, finalExamenId]);
    }

    res.status(201).json({ mensaje: "Pregunta guardada con éxito por el administrador." });
  } catch (error) {
    console.error("Error al guardar pregunta:", error);
    res.status(500).json({ error: "Error al guardar la pregunta." });
  }
});

// 2. Cargar muchas preguntas en bloque de forma segura y veloz (Soporte FASE 3)

router.post("/api/admin/cargar-masivo", autenticarToken, exigirAdmin, async (req, res) => {
  const db = getDB();
  try {
    const { preguntas, examen_id } = req.body;
    const usuarioId = req.usuario.id;

    // Volvemos a preguntar a la base de datos si el ID realmente es un administrador
    const usuarioReal = await db.get(`SELECT rol FROM usuarios WHERE id = ?`, [usuarioId]);
    
    if (!usuarioReal || usuarioReal.rol !== "admin") {
      return res.status(403).json({ error: "Acceso denegado. No eres administrador." });
    }

    if (!Array.isArray(preguntas)) {
      return res.status(400).json({ error: "El formato de los datos no es correcto." });
    }

    let finalExamenId = null;
    let anoExamen = 2024;
    if (examen_id) {
      finalExamenId = parseInt(examen_id);
      const exObj = await db.get(`SELECT ano FROM examenes WHERE id = ?`, [finalExamenId]);
      if (exObj) {
        anoExamen = exObj.ano;
      }
    }

    // Iniciar transacción de base de datos para alta velocidad y prevención de bloqueos de archivo
    await db.run("BEGIN TRANSACTION");

    try {
      // Si todo está bien, guardamos el bloque completo de preguntas
      for (const p of preguntas) {
        const opcionesJSON = JSON.stringify(p.opciones);
        
        const subtema = p.subtema || "Evaluación Oficial";
        const microtema = p.microtema || "Bloque de Reactivos";
        const tags = p.tags || `${p.tema || "General"},ENURM`;
        const difficulty = p.difficulty !== undefined ? parseFloat(p.difficulty) : 0.5;
        const especialidad = p.especialidad || p.tema || "General";
        const fuente = p.fuente || (finalExamenId ? `ENURM ${anoExamen}` : "ENURM Referencia Académica Oficial");

        let explicacionCorrecta = "";
        let explicacionIncorrecta = "";
        if (p.explicacion_correcta || p.explicacion_incorrecta) {
          explicacionCorrecta = p.explicacion_correcta || "";
          explicacionIncorrecta = p.explicacion_incorrecta || "";
        } else if (p.explicacion) {
          const partes = p.explicacion.split("🚫 DESCARTE (Por qué NO):");
          if (partes.length > 1) {
            explicacionCorrecta = partes[0].replace("🔬 JUSTIFICACIÓN (Por qué SÍ):\n", "").trim();
            explicacionIncorrecta = partes[1].trim();
          } else {
            explicacionCorrecta = p.explicacion;
            explicacionIncorrecta = "No disponible.";
          }
        }

        await db.run(
          `INSERT INTO preguntas (texto, opciones, correcta, explicacion, tema, subtema, microtema, tags, difficulty, fuente, especialidad, ano_examen, explicacion_correcta, explicacion_incorrecta, activo, examen_id) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          [
            p.texto, 
            opcionesJSON, 
            p.correcta, 
            p.explicacion || "", 
            p.tema || "General", 
            subtema, 
            microtema, 
            tags, 
            difficulty, 
            fuente, 
            especialidad, 
            anoExamen, 
            explicacionCorrecta, 
            explicacionIncorrecta,
            finalExamenId
          ]
        );
      }
      
      await db.run("COMMIT");
    } catch (transactionError) {
      await db.run("ROLLBACK");
      throw transactionError;
    }

    // Recalcular cantidad de preguntas del examen
    if (finalExamenId) {
      const countRow = await db.get(
        `SELECT COUNT(*) as total FROM preguntas WHERE examen_id = ? AND (activo = 1 OR activo IS NULL)`,
        [finalExamenId]
      );
      const cantidad = countRow ? countRow.total : 0;
      await db.run(`UPDATE examenes SET cantidad_preguntas = ? WHERE id = ?`, [cantidad, finalExamenId]);
    }

    res.status(200).json({ mensaje: `¡Éxito! Se cargaron ${preguntas.length} preguntas correctamente.` });
  } catch (error) {
    console.error("Error en la carga masiva:", error);
    res.status(500).json({ error: "Error en la carga masiva." });
  }
});


router.post("/api/reportes-error", autenticarToken, async (req, res) => {
  const db = getDB();
  try {
    const { preguntaId, motivo, comentario } = req.body;
    const usuarioId = req.usuario.id;

    if (!preguntaId || !motivo) {
      return res.status(400).json({ error: "Faltan campos requeridos." });
    }

    await db.run(
      `INSERT INTO reportes_error (usuario_id, pregunta_id, motivo, comentario) VALUES (?, ?, ?, ?)`,
      [usuarioId, preguntaId, motivo, comentario || ""]
    );

    res.status(201).json({ mensaje: "Reporte de error enviado con éxito." });
  } catch (error) {
    console.error("Error al crear reporte de error:", error);
    res.status(500).json({ error: "Error al guardar el reporte en la base de datos." });
  }
});

// 2. Obtener todos los reportes de error (Solo para Administrador)

router.get("/api/admin/reportes-error", autenticarToken, exigirAdmin, async (req, res) => {
  const db = getDB();
  try {
    const usuarioId = req.usuario.id;
    const usuarioReal = await db.get(`SELECT rol FROM usuarios WHERE id = ?`, [usuarioId]);

    if (!usuarioReal || usuarioReal.rol !== "admin") {
      return res.status(403).json({ error: "Acceso denegado. No eres administrador." });
    }

    const reportes = await db.all(`
      SELECT 
        r.id, r.pregunta_id, r.motivo, r.comentario, r.leido, r.fecha,
        p.texto AS pregunta_texto, p.tema AS pregunta_tema,
        p.opciones AS pregunta_opciones, p.correcta AS pregunta_correcta,
        p.subtema AS pregunta_subtema, p.explicacion AS pregunta_explicacion,
        p.fuente AS pregunta_fuente,
        p.examen_id AS pregunta_examen_id, p.difficulty AS pregunta_difficulty,
        u.nombre AS usuario_nombre, u.email AS usuario_email
      FROM reportes_error r
      JOIN preguntas p ON r.pregunta_id = p.id
      JOIN usuarios u ON r.usuario_id = u.id
      ORDER BY r.leido ASC, r.fecha DESC
    `);

    res.json(reportes);
  } catch (error) {
    console.error("Error al obtener reportes de error:", error);
    res.status(500).json({ error: "Error interno del servidor al consultar los reportes." });
  }
});

// 3. Marcar reporte de error como leído/resuelto (Solo para Administrador)

router.put("/api/admin/reportes-error/:id/marcar-leido", autenticarToken, exigirAdmin, async (req, res) => {
  const db = getDB();
  try {
    const reporteId = req.params.id;
    const usuarioId = req.usuario.id;
    const usuarioReal = await db.get(`SELECT rol FROM usuarios WHERE id = ?`, [usuarioId]);

    if (!usuarioReal || usuarioReal.rol !== "admin") {
      return res.status(403).json({ error: "Acceso denegado. No eres administrador." });
    }

    await db.run(`UPDATE reportes_error SET leido = 1 WHERE id = ?`, [reporteId]);

    res.json({ mensaje: "Reporte marcado como resuelto con éxito." });
  } catch (error) {
    console.error("Error al marcar reporte como resuelto:", error);
    res.status(500).json({ error: "Error interno del servidor al actualizar el estado." });
  }
});

// 4. Modificar una pregunta (Solo para Administrador - Soporte FASE 3)

router.put("/api/admin/preguntas/:id", autenticarToken, exigirAdmin, async (req, res) => {
  const db = getDB();
  try {
    const preguntaId = req.params.id;
    const usuarioId = req.usuario.id;
    const usuarioReal = await db.get(`SELECT rol FROM usuarios WHERE id = ?`, [usuarioId]);

    if (!usuarioReal || usuarioReal.rol !== "admin") {
      return res.status(403).json({ error: "Acceso denegado. No eres administrador." });
    }

    const { 
      texto, opciones, correcta, tema, subtema, microtema, 
      especialidad, difficulty, explicacion, fuente, 
      activo, examen_id, explicacion_correcta, explicacion_incorrecta, ano_examen
    } = req.body;

    if (!texto || !opciones || correcta === undefined || !tema) {
      return res.status(400).json({ error: "Faltan campos requeridos." });
    }

    const opcionesStr = Array.isArray(opciones) ? JSON.stringify(opciones) : opciones;

    const query = `
      UPDATE preguntas 
      SET texto = ?, opciones = ?, correcta = ?, tema = ?, subtema = ?, microtema = ?, 
          especialidad = ?, difficulty = ?, explicacion = ?, fuente = ?, 
          activo = ?, examen_id = ?, explicacion_correcta = ?, explicacion_incorrecta = ?, ano_examen = ?
      WHERE id = ?
    `;

    await db.run(query, [
      texto, 
      opcionesStr, 
      correcta, 
      tema, 
      subtema || "", 
      microtema || "", 
      especialidad || tema, 
      difficulty !== undefined ? parseFloat(difficulty) : 0.5, 
      explicacion || "", 
      fuente || "", 
      activo !== undefined ? (activo ? 1 : 0) : 1, 
      examen_id !== undefined ? (examen_id ? parseInt(examen_id) : null) : null,
      explicacion_correcta || "",
      explicacion_incorrecta || "",
      ano_examen !== undefined ? (ano_examen ? parseInt(ano_examen) : null) : null,
      preguntaId
    ]);

    // Recalcular cantidad_preguntas en exámenes si corresponde
    const todosExamenes = await db.all(`SELECT id FROM examenes`);
    for (const ex of todosExamenes) {
      const countRow = await db.get(
        `SELECT COUNT(*) as total FROM preguntas WHERE examen_id = ? AND (activo = 1 OR activo IS NULL)`,
        [ex.id]
      );
      const cantidad = countRow ? countRow.total : 0;
      await db.run(`UPDATE examenes SET cantidad_preguntas = ? WHERE id = ?`, [cantidad, ex.id]);
    }

    res.json({ mensaje: "Pregunta modificada con éxito." });
  } catch (error) {
    console.error("Error al modificar la pregunta:", error);
    res.status(500).json({ error: "Error interno del servidor al guardar los cambios." });
  }
});



router.post("/api/admin/examenes", autenticarToken, exigirAdmin, async (req, res) => {
  const db = getDB();
  try {
    const usuarioId = req.usuario.id;
    const usuarioReal = await db.get(`SELECT rol FROM usuarios WHERE id = ?`, [usuarioId]);
    if (!usuarioReal || usuarioReal.rol !== "admin") {
      return res.status(403).json({ error: "Acceso denegado. No eres administrador." });
    }

    const { nombre, ano, activo } = req.body;
    if (!nombre || !ano) {
      return res.status(400).json({ error: "Faltan campos requeridos: nombre y año." });
    }

    const anoNum = parseInt(ano);
    
    const duplicado = await db.get(`SELECT id FROM examenes WHERE ano = ? OR nombre = ?`, [anoNum, nombre]);
    if (duplicado) {
      return res.status(400).json({ error: "Ya existe un examen con ese año o nombre." });
    }

    const result = await db.run(
      `INSERT INTO examenes (nombre, ano, activo, cantidad_preguntas) VALUES (?, ?, ?, 0)`,
      [nombre, anoNum, activo !== undefined ? activo : 1]
    );

    res.status(201).json({
      mensaje: "Examen creado con éxito.",
      id: result.lastID
    });
  } catch (error) {
    console.error("Error al crear examen:", error);
    res.status(500).json({ error: "Error interno del servidor al crear el examen." });
  }
});

// 3. Editar nombre/año/estado activo de un examen (Solo para Administrador)

router.put("/api/admin/examenes/:id", autenticarToken, exigirAdmin, async (req, res) => {
  const db = getDB();
  try {
    const usuarioId = req.usuario.id;
    const usuarioReal = await db.get(`SELECT rol FROM usuarios WHERE id = ?`, [usuarioId]);
    if (!usuarioReal || usuarioReal.rol !== "admin") {
      return res.status(403).json({ error: "Acceso denegado. No eres administrador." });
    }

    const examenId = req.params.id;
    const { nombre, ano, activo } = req.body;

    if (!nombre || !ano) {
      return res.status(400).json({ error: "Faltan campos requeridos: nombre y año." });
    }

    const anoNum = parseInt(ano);

    const duplicado = await db.get(
      `SELECT id FROM examenes WHERE (ano = ? OR nombre = ?) AND id != ?`,
      [anoNum, nombre, examenId]
    );
    if (duplicado) {
      return res.status(400).json({ error: "Ya existe otro examen con ese año o nombre." });
    }

    await db.run(
      `UPDATE examenes SET nombre = ?, ano = ?, activo = ? WHERE id = ?`,
      [nombre, anoNum, activo !== undefined ? activo : 1, examenId]
    );

    res.json({ mensaje: "Examen actualizado con éxito." });
  } catch (error) {
    console.error("Error al actualizar examen:", error);
    res.status(500).json({ error: "Error interno del servidor al actualizar el examen." });
  }
});

// 4. Alternar estado activo de una pregunta (Solo para Administrador)

router.put("/api/admin/preguntas/:id/toggle-activo", autenticarToken, exigirAdmin, async (req, res) => {
  const db = getDB();
  try {
    const preguntaId = req.params.id;
    const usuarioId = req.usuario.id;
    const usuarioReal = await db.get(`SELECT rol FROM usuarios WHERE id = ?`, [usuarioId]);

    if (!usuarioReal || usuarioReal.rol !== "admin") {
      return res.status(403).json({ error: "Acceso denegado. No eres administrador." });
    }

    const pregunta = await db.get(`SELECT activo, examen_id FROM preguntas WHERE id = ?`, [preguntaId]);
    if (!pregunta) {
      return res.status(404).json({ error: "Pregunta no encontrada." });
    }

    const nuevoActivo = (pregunta.activo === 0) ? 1 : 0;
    await db.run(`UPDATE preguntas SET activo = ? WHERE id = ?`, [nuevoActivo, preguntaId]);

    if (pregunta.examen_id) {
      const countRow = await db.get(
        `SELECT COUNT(*) as total FROM preguntas WHERE examen_id = ? AND (activo = 1 OR activo IS NULL)`,
        [pregunta.examen_id]
      );
      const cantidad = countRow ? countRow.total : 0;
      await db.run(`UPDATE examenes SET cantidad_preguntas = ? WHERE id = ?`, [cantidad, pregunta.examen_id]);
    }

    res.json({ mensaje: "Estado activo modificado con éxito.", activo: nuevoActivo });
  } catch (error) {
    console.error("Error al alternar estado activo:", error);
    res.status(500).json({ error: "Error interno al alternar estado activo." });
  }
});


module.exports = router;
