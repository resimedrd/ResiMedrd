const express = require("express");
const { getDB } = require("../config/db");
const { autenticarToken } = require("../middleware/auth");

const router = express.Router();

router.get("/api/spaced-repetition", autenticarToken, async (req, res) => {
  const db = getDB();
  try {
    const { usuarioId } = req.query;
    if (parseInt(usuarioId) !== req.usuario.id) {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }

    const filas = await db.all(`SELECT * FROM spaced_repetition WHERE usuario_id = ?`, [usuarioId]);
    res.json(filas);
  } catch (error) {
    res.status(500).json({ error: "Error al leer repetición espaciada." });
  }
});

router.get("/api/spaced-repetition/individual", autenticarToken, async (req, res) => {
  const db = getDB();
  try {
    const { usuarioId, preguntaId, flashcardId } = req.query;
    if (parseInt(usuarioId) !== req.usuario.id) {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }

    let fila = null;
    if (flashcardId) {
      fila = await db.get(`SELECT * FROM spaced_repetition WHERE usuario_id = ? AND flashcard_id = ?`, [usuarioId, flashcardId]);
    } else if (preguntaId) {
      fila = await db.get(`SELECT * FROM spaced_repetition WHERE usuario_id = ? AND pregunta_id = ?`, [usuarioId, preguntaId]);
    }

    res.json(fila || null);
  } catch (error) {
    console.error("Error al leer repetición espaciada individual:", error);
    res.status(500).json({ error: "Error al leer repetición espaciada individual." });
  }
});

router.post("/api/spaced-repetition", autenticarToken, async (req, res) => {
  const db = getDB();
  try {
    const { usuarioId, preguntaId, flashcardId, stability, difficulty, ease, repetitions, interval, nextReview, lastReviewedDate } = req.body;
    
    if (parseInt(usuarioId) !== req.usuario.id) {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }

    let existente;
    if (flashcardId) {
      existente = await db.get(`SELECT id FROM spaced_repetition WHERE usuario_id = ? AND flashcard_id = ?`, [usuarioId, flashcardId]);
    } else if (preguntaId) {
      existente = await db.get(`SELECT id FROM spaced_repetition WHERE usuario_id = ? AND pregunta_id = ?`, [usuarioId, preguntaId]);
    }

    const reviewDate = lastReviewedDate || new Date().toLocaleDateString('en-CA');

    if (existente) {
      await db.run(
        `UPDATE spaced_repetition SET stability = ?, difficulty = ?, ease = ?, repetitions = ?, interval = ?, next_review = ?, last_reviewed_date = ? WHERE id = ?`,
        [stability, difficulty, ease, repetitions, interval, nextReview, reviewDate, existente.id]
      );
    } else {
      await db.run(
        `INSERT INTO spaced_repetition (usuario_id, pregunta_id, flashcard_id, stability, difficulty, ease, repetitions, interval, next_review, last_reviewed_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [usuarioId, preguntaId, flashcardId, stability, difficulty, ease, repetitions, interval, nextReview, reviewDate]
      );
    }

    res.json({ mensaje: "Estado de repetición espaciada sincronizado." });
  } catch (error) {
    res.status(500).json({ error: "Error al guardar repetición espaciada." });
  }
});

router.get("/api/flashcards/personalizadas", autenticarToken, async (req, res) => {
  const db = getDB();
  try {
    const { usuarioId } = req.query;
    if (parseInt(usuarioId) !== req.usuario.id) {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }

    const filas = await db.all(`SELECT * FROM flashcards_personalizadas WHERE usuario_id = ? ORDER BY fecha DESC`, [usuarioId]);
    res.json(filas);
  } catch (error) {
    res.status(500).json({ error: "Error al leer flashcards personalizadas." });
  }
});

router.post("/api/flashcards/personalizadas", autenticarToken, async (req, res) => {
  const db = getDB();
  try {
    const { usuarioId, tema, pregunta, respuesta } = req.body;
    
    if (parseInt(usuarioId) !== req.usuario.id) {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }

    await db.run(
      `INSERT INTO flashcards_personalizadas (usuario_id, tema, pregunta, respuesta) VALUES (?, ?, ?, ?)`,
      [usuarioId, tema, pregunta, respuesta]
    );

    res.status(201).json({ mensaje: "Flashcard personalizada inyectada con éxito." });
  } catch (error) {
    res.status(500).json({ error: "Error al crear flashcard personalizada." });
  }
});

/* ==========================================================================
   📈 ENDPOINTS DE HISTORIAL DIARIO DE FLASHCARDS (FASE 10)
   ========================================================================== */

router.post("/api/flashcards/historial", autenticarToken, async (req, res) => {
  const db = getDB();
  try {
    const { usuarioId, flashcardId, tema, seLaSabia, dificultad } = req.body;
    if (parseInt(usuarioId) !== req.usuario.id) {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }
    await db.run(
      `INSERT INTO historial_flashcards (usuario_id, flashcard_id, tema, se_la_sabia, dificultad) VALUES (?, ?, ?, ?, ?)`,
      [usuarioId, flashcardId, tema || "General", seLaSabia ? 1 : 0, dificultad || 2]
    );
    res.status(201).json({ mensaje: "Historial de flashcard guardado con éxito." });
  } catch (error) {
    console.error("Error al registrar historial de flashcard:", error);
    res.status(500).json({ error: "Error al registrar historial de flashcard." });
  }
});

router.get("/api/flashcards/historial-diario", autenticarToken, async (req, res) => {
  const db = getDB();
  try {
    const { usuarioId } = req.query;
    if (parseInt(usuarioId) !== req.usuario.id) {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }
    const filas = await db.all(
      `SELECT 
         date(fecha, 'localtime') AS dia,
         COUNT(*) AS total,
         SUM(CASE WHEN se_la_sabia = 1 THEN 1 ELSE 0 END) AS aciertos,
         SUM(CASE WHEN se_la_sabia = 0 THEN 1 ELSE 0 END) AS fallos
       FROM historial_flashcards 
       WHERE usuario_id = ?
       GROUP BY dia
       ORDER BY dia DESC`,
      [usuarioId]
    );
    res.json(filas);
  } catch (error) {
    console.error("Error al obtener historial diario:", error);
    res.status(500).json({ error: "Error al obtener historial diario de flashcards." });
  }
});

/* ==========================================================================
   🚨 APIS DE REPORTES DE ERROR EN PREGUNTAS (FASE 6)
   ========================================================================== */

// 1. Crear un reporte de error

module.exports = router;
