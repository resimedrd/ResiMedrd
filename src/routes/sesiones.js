const express = require("express");
const { getDB } = require("../config/db");
const { autenticarToken } = require("../middleware/auth");
const { normalizarTema } = require("../utils/normalizar");

const router = express.Router();

router.post("/api/sesiones", autenticarToken, async (req, res) => {
  const db = getDB();
  try {
    const { usuarioId, tema, modo, cantidadPreguntas, correctas, porcentaje, detalle } = req.body;
    
    if (parseInt(usuarioId) !== req.usuario.id) {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }

    await db.run(
      `INSERT INTO sesiones (usuario_id, tema, modo, cantidad_preguntas, correctas, porcentaje, detalle) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId, tema, modo, cantidadPreguntas, correctas, porcentaje, detalle]
    );

    // Calcular XP: 10 XP por acierto + 30 XP por completar simulacro
    const xpGanado = (correctas * 10) + 30 + (porcentaje === 100 ? 50 : 0);

    const usuario = await db.get(`SELECT xp, streak, nivel, last_active_date FROM usuarios WHERE id = ?`, [usuarioId]);
    let nuevoXp = xpGanado;
    let nuevoNivel = 1;
    let nuevoStreak = 0;
    
    if (usuario) {
      nuevoXp = (usuario.xp || 0) + xpGanado;
      nuevoNivel = Math.floor(nuevoXp / 1000) + 1;
      nuevoStreak = usuario.streak || 0;
      
      const hoy = new Date().toISOString().split("T")[0];
      if (!usuario.last_active_date) {
        nuevoStreak = 1;
      } else {
        const ayerDate = new Date();
        ayerDate.setDate(ayerDate.getDate() - 1);
        const ayer = ayerDate.toISOString().split("T")[0];
        
        if (usuario.last_active_date === ayer) {
          nuevoStreak += 1;
        } else if (usuario.last_active_date !== hoy) {
          nuevoStreak = 1;
        }
      }
      
      await db.run(
        `UPDATE usuarios SET xp = ?, nivel = ?, streak = ?, last_active_date = ? WHERE id = ?`,
        [nuevoXp, nuevoNivel, nuevoStreak, hoy, usuarioId]
      );
    }

    res.status(201).json({ 
      mensaje: "Examen guardado con éxito.", 
      xpGanado,
      usuarioActualizado: {
        xp: nuevoXp,
        nivel: nuevoNivel,
        streak: nuevoStreak
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Error al guardar historial." });
  }
});

router.get("/api/sesiones", autenticarToken, async (req, res) => {
  const db = getDB();
  try {
    const { usuarioId } = req.query;
    if (parseInt(usuarioId) !== req.usuario.id) {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }
    const filas = await db.all(`SELECT * FROM sesiones WHERE usuario_id = ? ORDER BY fecha DESC LIMIT 5`, [usuarioId]);
    res.json(filas);
  } catch (error) {
    res.status(500).json({ error: "Error al leer historial." });
  }
});

router.get("/api/historial", autenticarToken, async (req, res) => {
  const db = getDB();
  try {
    const { usuarioId } = req.query;
    if (!usuarioId) {
      return res.status(400).json({ error: "Falta el ID de usuario." });
    }

    let filas;
    if (req.usuario.rol === "admin") {
      filas = await db.all(`SELECT * FROM sesiones ORDER BY fecha DESC`);
    } else {
      if (parseInt(usuarioId) !== req.usuario.id) {
        return res.status(403).json({ error: "Acceso no autorizado." });
      }
      filas = await db.all(`SELECT * FROM sesiones WHERE usuario_id = ? ORDER BY fecha DESC`, [usuarioId]);
    }
    res.json(filas);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener historial completo." });
  }
});

router.get("/api/dashboard/resumen", autenticarToken, async (req, res) => {
  const db = getDB();
  try {
    const { usuarioId } = req.query;
    if (parseInt(usuarioId) !== req.usuario.id) {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }
    const totalSesionesRow = await db.get(`SELECT COUNT(*) AS total FROM sesiones WHERE usuario_id = ?`, [usuarioId]);
    const promedioRow = await db.get(`SELECT ROUND(AVG(porcentaje), 0) AS promedio FROM sesiones WHERE usuario_id = ?`, [usuarioId]);
    const mejorRow = await db.get(`SELECT MAX(porcentaje) AS mejor FROM sesiones WHERE usuario_id = ?`, [usuarioId]);
    const totalRespondidasRow = await db.get(`SELECT SUM(cantidad_preguntas) AS total FROM sesiones WHERE usuario_id = ?`, [usuarioId]);

    // Obtener datos de gamificación
    const userRow = await db.get(`SELECT xp, streak, nivel, meta_semanal FROM usuarios WHERE id = ?`, [usuarioId]);

    res.json({
      totalSesiones: totalSesionesRow?.total || 0,
      promedioGeneral: promedioRow?.promedio || 0,
      mejorPorcentaje: mejorRow?.mejor || 0,
      totalPreguntasRespondidas: totalRespondidasRow?.total || 0,
      xp: userRow?.xp || 0,
      streak: userRow?.streak || 0,
      nivel: userRow?.nivel || 1,
      metaSemanal: userRow?.meta_semanal || 50
    });
  } catch (error) {
    res.status(500).json({ error: "Error estadístico." });
  }
});



router.get("/api/dashboard/cobertura", autenticarToken, async (req, res) => {
  const db = getDB();
  try {
    const { usuarioId } = req.query;
    if (!usuarioId) {
      return res.status(400).json({ error: "Falta el ID de usuario." });
    }
    if (parseInt(usuarioId) !== req.usuario.id) {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }

    const ESPECIALIDADES_OFICIALES = [
      { id: "pediatria", nombre: "Pediatría" },
      { id: "ginecologia", nombre: "Gineco-Obstetricia" },
      { id: "cirugia", nombre: "Cirugía General" },
      { id: "interna", nombre: "Medicina Interna" },
      { id: "basicas", nombre: "Ciencias Básicas" },
      { id: "cardiologia", nombre: "Cardiología" },
      { id: "neumologia", nombre: "Neumología" },
      { id: "gastro", nombre: "Gastroenterología" },
      { id: "nefro", nombre: "Nefrología y Urología" },
      { id: "neurologia", nombre: "Neurología" },
      { id: "infectologia", nombre: "Infectología" },
      { id: "trauma", nombre: "Traumatología y Ortopedia" },
      { id: "psiquiatria", nombre: "Psiquiatría" },
      { id: "salud", nombre: "Salud Pública y Epidemiología" }
    ];

    const sql = `
      WITH total_banco AS (
        SELECT 
          CASE 
            WHEN LOWER(tema) LIKE '%pediatria%' OR LOWER(tema) LIKE '%pediatría%' OR LOWER(tema) LIKE '%pediatra%' OR LOWER(tema) LIKE '%pediat%' THEN 'pediatria'
            WHEN LOWER(tema) LIKE '%ginecologia%' OR LOWER(tema) LIKE '%ginecología%' OR LOWER(tema) LIKE '%obstetricia%' OR LOWER(tema) LIKE '%gineco%' OR LOWER(tema) LIKE '%obstet%' OR LOWER(tema) LIKE '%ginec%' THEN 'ginecologia'
            WHEN LOWER(tema) LIKE '%cirugia%' OR LOWER(tema) LIKE '%cirugía%' OR LOWER(tema) LIKE '%quirur%' OR LOWER(tema) LIKE '%quirúr%' OR LOWER(tema) LIKE '%cirug%' THEN 'cirugia'
            WHEN LOWER(tema) LIKE '%interna%' THEN 'interna'
            WHEN LOWER(tema) LIKE '%basica%' OR LOWER(tema) LIKE '%básica%' OR LOWER(tema) LIKE '%básico%' OR LOWER(tema) LIKE '%basico%' OR LOWER(tema) LIKE '%fisiologia%' OR LOWER(tema) LIKE '%fisiología%' OR LOWER(tema) LIKE '%anatomia%' OR LOWER(tema) LIKE '%anatomía%' OR LOWER(tema) LIKE '%farmacologia%' OR LOWER(tema) LIKE '%farmacología%' OR LOWER(tema) LIKE '%embriologia%' OR LOWER(tema) LIKE '%embriología%' OR LOWER(tema) LIKE '%histologia%' OR LOWER(tema) LIKE '%histología%' OR LOWER(tema) LIKE '%microbiologia%' OR LOWER(tema) LIKE '%microbiología%' OR LOWER(tema) LIKE '%parasitologia%' OR LOWER(tema) LIKE '%parasitología%' OR LOWER(tema) LIKE '%bioquimica%' OR LOWER(tema) LIKE '%bioquímica%' OR LOWER(tema) LIKE '%genetica%' OR LOWER(tema) LIKE '%genética%' THEN 'basicas'
            WHEN LOWER(tema) LIKE '%cardio%' THEN 'cardiologia'
            WHEN LOWER(tema) LIKE '%neumo%' OR LOWER(tema) LIKE '%respirato%' OR LOWER(tema) LIKE '%pulmonar%' THEN 'neumologia'
            WHEN LOWER(tema) LIKE '%gastro%' OR LOWER(tema) LIKE '%digestiv%' THEN 'gastro'
            WHEN LOWER(tema) LIKE '%neuro%' THEN 'neurologia'
            WHEN LOWER(tema) LIKE '%nefro%' OR LOWER(tema) LIKE '%urolo%' OR LOWER(tema) LIKE '%urólo%' THEN 'nefro'
            WHEN LOWER(tema) LIKE '%infecto%' OR LOWER(tema) LIKE '%virologia%' OR LOWER(tema) LIKE '%virología%' OR LOWER(tema) LIKE '%bacteriologia%' OR LOWER(tema) LIKE '%bacteriología%' THEN 'infectologia'
            WHEN LOWER(tema) LIKE '%trauma%' OR LOWER(tema) LIKE '%orto%' THEN 'trauma'
            WHEN LOWER(tema) LIKE '%psiquia%' OR LOWER(tema) LIKE '%salud mental%' OR LOWER(tema) LIKE '%psiquic%' THEN 'psiquiatria'
            WHEN LOWER(tema) LIKE '%salud publica%' OR LOWER(tema) LIKE '%salud pública%' OR LOWER(tema) LIKE '%epidemio%' OR LOWER(tema) LIKE '%preventiva%' OR LOWER(tema) LIKE '%bioestadistica%' OR LOWER(tema) LIKE '%bioestadística%' OR LOWER(tema) = 'salud' THEN 'salud'
            ELSE LOWER(TRIM(tema))
          END as esp_id,
          COUNT(*) as total
        FROM preguntas
        WHERE activo = 1
        GROUP BY esp_id
      ),
      unicas_vistas AS (
        SELECT 
          CASE 
            WHEN LOWER(p.tema) LIKE '%pediatria%' OR LOWER(p.tema) LIKE '%pediatría%' OR LOWER(p.tema) LIKE '%pediatra%' OR LOWER(p.tema) LIKE '%pediat%' THEN 'pediatria'
            WHEN LOWER(p.tema) LIKE '%ginecologia%' OR LOWER(p.tema) LIKE '%ginecología%' OR LOWER(p.tema) LIKE '%obstetricia%' OR LOWER(p.tema) LIKE '%gineco%' OR LOWER(p.tema) LIKE '%obstet%' OR LOWER(p.tema) LIKE '%ginec%' THEN 'ginecologia'
            WHEN LOWER(p.tema) LIKE '%cirugia%' OR LOWER(p.tema) LIKE '%cirugía%' OR LOWER(p.tema) LIKE '%quirur%' OR LOWER(p.tema) LIKE '%quirúr%' OR LOWER(p.tema) LIKE '%cirug%' THEN 'cirugia'
            WHEN LOWER(p.tema) LIKE '%interna%' THEN 'interna'
            WHEN LOWER(p.tema) LIKE '%basica%' OR LOWER(p.tema) LIKE '%básica%' OR LOWER(p.tema) LIKE '%básico%' OR LOWER(p.tema) LIKE '%basico%' OR LOWER(p.tema) LIKE '%fisiologia%' OR LOWER(p.tema) LIKE '%fisiología%' OR LOWER(p.tema) LIKE '%anatomia%' OR LOWER(p.tema) LIKE '%anatomía%' OR LOWER(p.tema) LIKE '%farmacologia%' OR LOWER(p.tema) LIKE '%farmacología%' OR LOWER(p.tema) LIKE '%embriologia%' OR LOWER(p.tema) LIKE '%embriología%' OR LOWER(p.tema) LIKE '%histologia%' OR LOWER(p.tema) LIKE '%histología%' OR LOWER(p.tema) LIKE '%microbiologia%' OR LOWER(p.tema) LIKE '%microbiología%' OR LOWER(p.tema) LIKE '%parasitologia%' OR LOWER(p.tema) LIKE '%parasitología%' OR LOWER(p.tema) LIKE '%bioquimica%' OR LOWER(p.tema) LIKE '%bioquímica%' OR LOWER(p.tema) LIKE '%genetica%' OR LOWER(p.tema) LIKE '%genética%' THEN 'basicas'
            WHEN LOWER(p.tema) LIKE '%cardio%' THEN 'cardiologia'
            WHEN LOWER(p.tema) LIKE '%neumo%' OR LOWER(p.tema) LIKE '%respirato%' OR LOWER(p.tema) LIKE '%pulmonar%' THEN 'neumologia'
            WHEN LOWER(p.tema) LIKE '%gastro%' OR LOWER(p.tema) LIKE '%digestiv%' THEN 'gastro'
            WHEN LOWER(p.tema) LIKE '%neuro%' THEN 'neurologia'
            WHEN LOWER(p.tema) LIKE '%nefro%' OR LOWER(p.tema) LIKE '%urolo%' OR LOWER(p.tema) LIKE '%urólo%' THEN 'nefro'
            WHEN LOWER(p.tema) LIKE '%infecto%' OR LOWER(p.tema) LIKE '%virologia%' OR LOWER(p.tema) LIKE '%virología%' OR LOWER(p.tema) LIKE '%bacteriologia%' OR LOWER(p.tema) LIKE '%bacteriología%' THEN 'infectologia'
            WHEN LOWER(p.tema) LIKE '%trauma%' OR LOWER(p.tema) LIKE '%orto%' THEN 'trauma'
            WHEN LOWER(p.tema) LIKE '%psiquia%' OR LOWER(p.tema) LIKE '%salud mental%' OR LOWER(p.tema) LIKE '%psiquic%' THEN 'psiquiatria'
            WHEN LOWER(p.tema) LIKE '%salud publica%' OR LOWER(p.tema) LIKE '%salud pública%' OR LOWER(p.tema) LIKE '%epidemio%' OR LOWER(p.tema) LIKE '%preventiva%' OR LOWER(p.tema) LIKE '%bioestadistica%' OR LOWER(p.tema) LIKE '%bioestadística%' OR LOWER(p.tema) = 'salud' THEN 'salud'
            ELSE LOWER(TRIM(p.tema))
          END as esp_id,
          COUNT(DISTINCT q.texto) as total_vistas
        FROM preguntas p
        JOIN (
          SELECT distinct json_extract(value, '$.texto') as texto
          FROM sesiones, json_each(sesiones.detalle)
          WHERE sesiones.usuario_id = ? AND sesiones.detalle IS NOT NULL
        ) q ON p.texto = q.texto
        WHERE p.activo = 1
        GROUP BY esp_id
      ),
      antiguas_vistas AS (
        SELECT 
          CASE 
            WHEN LOWER(tema) LIKE '%pediatria%' OR LOWER(tema) LIKE '%pediatría%' OR LOWER(tema) LIKE '%pediatra%' OR LOWER(tema) LIKE '%pediat%' THEN 'pediatria'
            WHEN LOWER(tema) LIKE '%ginecologia%' OR LOWER(tema) LIKE '%ginecología%' OR LOWER(tema) LIKE '%obstetricia%' OR LOWER(tema) LIKE '%gineco%' OR LOWER(tema) LIKE '%obstet%' OR LOWER(tema) LIKE '%ginec%' THEN 'ginecologia'
            WHEN LOWER(tema) LIKE '%cirugia%' OR LOWER(tema) LIKE '%cirugía%' OR LOWER(tema) LIKE '%quirur%' OR LOWER(tema) LIKE '%quirúr%' OR LOWER(tema) LIKE '%cirug%' THEN 'cirugia'
            WHEN LOWER(tema) LIKE '%interna%' THEN 'interna'
            WHEN LOWER(tema) LIKE '%basica%' OR LOWER(tema) LIKE '%básica%' OR LOWER(tema) LIKE '%básico%' OR LOWER(tema) LIKE '%basico%' OR LOWER(tema) LIKE '%fisiologia%' OR LOWER(tema) LIKE '%fisiología%' OR LOWER(tema) LIKE '%anatomia%' OR LOWER(tema) LIKE '%anatomía%' OR LOWER(tema) LIKE '%farmacologia%' OR LOWER(tema) LIKE '%farmacología%' OR LOWER(tema) LIKE '%embriologia%' OR LOWER(tema) LIKE '%embriología%' OR LOWER(tema) LIKE '%histologia%' OR LOWER(tema) LIKE '%histología%' OR LOWER(tema) LIKE '%microbiologia%' OR LOWER(tema) LIKE '%microbiología%' OR LOWER(tema) LIKE '%parasitologia%' OR LOWER(tema) LIKE '%parasitología%' OR LOWER(tema) LIKE '%bioquimica%' OR LOWER(tema) LIKE '%bioquímica%' OR LOWER(tema) LIKE '%genetica%' OR LOWER(tema) LIKE '%genética%' THEN 'basicas'
            WHEN LOWER(tema) LIKE '%cardio%' THEN 'cardiologia'
            WHEN LOWER(tema) LIKE '%neumo%' OR LOWER(tema) LIKE '%respirato%' OR LOWER(tema) LIKE '%pulmonar%' THEN 'neumologia'
            WHEN LOWER(tema) LIKE '%gastro%' OR LOWER(tema) LIKE '%digestiv%' THEN 'gastro'
            WHEN LOWER(tema) LIKE '%neuro%' THEN 'neurologia'
            WHEN LOWER(tema) LIKE '%nefro%' OR LOWER(tema) LIKE '%urolo%' OR LOWER(tema) LIKE '%urólo%' THEN 'nefro'
            WHEN LOWER(tema) LIKE '%infecto%' OR LOWER(tema) LIKE '%virologia%' OR LOWER(tema) LIKE '%virología%' OR LOWER(tema) LIKE '%bacteriologia%' OR LOWER(tema) LIKE '%bacteriología%' THEN 'infectologia'
            WHEN LOWER(tema) LIKE '%trauma%' OR LOWER(tema) LIKE '%orto%' THEN 'trauma'
            WHEN LOWER(tema) LIKE '%psiquia%' OR LOWER(tema) LIKE '%salud mental%' OR LOWER(tema) LIKE '%psiquic%' THEN 'psiquiatria'
            WHEN LOWER(tema) LIKE '%salud publica%' OR LOWER(tema) LIKE '%salud pública%' OR LOWER(tema) LIKE '%epidemio%' OR LOWER(tema) LIKE '%preventiva%' OR LOWER(tema) LIKE '%bioestadistica%' OR LOWER(tema) LIKE '%bioestadística%' OR LOWER(tema) = 'salud' THEN 'salud'
            ELSE LOWER(TRIM(tema))
          END as esp_id,
          SUM(cantidad_preguntas) as total_antiguas
        FROM sesiones
        WHERE usuario_id = ? AND detalle IS NULL
        GROUP BY esp_id
      )
      SELECT 
        tb.esp_id,
        tb.total as total_banco,
        COALESCE(uv.total_vistas, 0) as total_vistas,
        COALESCE(av.total_antiguas, 0) as total_antiguas
      FROM total_banco tb
      LEFT JOIN unicas_vistas uv ON tb.esp_id = uv.esp_id
      LEFT JOIN antiguas_vistas av ON tb.esp_id = av.esp_id
    `;

    const filas = await db.all(sql, [usuarioId, usuarioId]);

    const conteo = {};
    filas.forEach(f => {
      conteo[f.esp_id] = {
        totalBanco: f.total_banco,
        respondidas: Math.min(f.total_vistas + f.total_antiguas, f.total_banco)
      };
    });

    const cobertura = {};
    ESPECIALIDADES_OFICIALES.forEach(esp => {
      const data = conteo[esp.id] || { totalBanco: 0, respondidas: 0 };
      const totalBanco = data.totalBanco;
      const respondidas = data.respondidas;
      const porcentaje = totalBanco > 0 ? Math.round((respondidas / totalBanco) * 100) : 0;

      cobertura[esp.nombre] = {
        totalBanco,
        respondidas,
        porcentaje
      };
    });

    res.json(cobertura);
  } catch (error) {
    console.error("Error al calcular cobertura:", error);
    res.status(500).json({ error: "Error al calcular la cobertura del banco." });
  }
});


module.exports = router;
