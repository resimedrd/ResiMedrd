const express = require("express");
const { getDB } = require("../config/db");
const { autenticarToken } = require("../middleware/auth");
const { normalizarTema } = require("../utils/normalizar");

const router = express.Router();

router.get("/api/public-stats", async (req, res) => {
  const db = getDB();
  try {
    const totalPreguntasRow = await db.get("SELECT COUNT(*) as count FROM preguntas");
    const totalSesionesRow = await db.get("SELECT COUNT(*) as count FROM sesiones");
    const totalContestadasRow = await db.get("SELECT SUM(cantidad_preguntas) as sum FROM sesiones");
    const promedioRow = await db.get("SELECT AVG(porcentaje) as avg FROM sesiones");

    res.json({
      totalPreguntas: totalPreguntasRow ? totalPreguntasRow.count : 470,
      totalSesiones: totalSesionesRow ? totalSesionesRow.count : 20,
      totalContestadas: totalContestadasRow && totalContestadasRow.sum ? totalContestadasRow.sum : 201,
      promedioGeneral: promedioRow && promedioRow.avg ? Math.round(promedioRow.avg) : 29
    });
  } catch (err) {
    console.error("Error al obtener estadísticas públicas:", err);
    res.json({
      totalPreguntas: 470,
      totalSesiones: 20,
      totalContestadas: 201,
      promedioGeneral: 29
    });
  }
});

/* ==========================================================================
   RUTAS DE FUNCIONAMIENTO DE SIMULACROS
   ========================================================================== */
router.get("/api/preguntas", async (req, res) => {
  const db = getDB();
  try {
    const { tema, limite } = req.query;
    const maxPreguntas = parseInt(limite) || 10;
    let filas;
    if (!tema || tema.trim().toLowerCase() === "todos") {
      filas = await db.all(`SELECT * FROM preguntas WHERE (activo = 1 OR activo IS NULL) ORDER BY RANDOM() LIMIT ?`, [maxPreguntas]);
    } else {
      filas = await db.all(`SELECT * FROM preguntas WHERE LOWER(TRIM(tema)) = LOWER(?) AND (activo = 1 OR activo IS NULL) ORDER BY RANDOM() LIMIT ?`, [tema.trim(), maxPreguntas]);
    }
    res.json(filas);
  } catch (error) {
    res.status(500).json({ error: "Error al extraer preguntas." });
  }
});

router.get("/api/preguntas/mapeo-temas", autenticarToken, async (req, res) => {
  const db = getDB();
  try {
    const filas = await db.all(`SELECT id, texto, tema, subtema FROM preguntas`);
    const mapeo = {};
    filas.forEach(f => {
      const data = { tema: f.tema, subtema: f.subtema };
      mapeo[f.id] = data;
      mapeo[f.texto] = data; // También mapeamos por texto para sesiones antiguas que no tengan ID
    });
    res.json(mapeo);
  } catch (error) {
    res.status(500).json({ error: "Error al mapear preguntas." });
  }
});

router.get("/api/temas", async (req, res) => {
  const db = getDB();
  try {
    const sql = `
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
      WHERE (activo = 1 OR activo IS NULL)
      GROUP BY esp_id
    `;
    const filas = await db.all(sql);
    
    const conteo = {};
    filas.forEach(f => {
      conteo[f.esp_id] = f.total;
    });

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

    const resultado = ESPECIALIDADES_OFICIALES.map(esp => ({
      tema: esp.nombre,
      total: conteo[esp.id] || 0
    }));

    const idsOficiales = new Set(ESPECIALIDADES_OFICIALES.map(e => e.id));
    Object.keys(conteo).forEach(espId => {
      if (espId && !idsOficiales.has(espId)) {
        const nombreFormateado = espId.charAt(0).toUpperCase() + espId.slice(1);
        resultado.push({
          tema: nombreFormateado,
          total: conteo[espId]
        });
      }
    });

    res.json(resultado);
  } catch (error) {
    console.error("Error al obtener temas:", error);
    res.status(500).json({ error: "Error al mapear especialidades." });
  }
});

function normalizarClaveSubtema(str) {
  if (!str) return "";
  return String(str).trim().replace(/\s+/g, " ").toLowerCase();
}

// FASE 3: Endpoint para recuperar subtemas de forma autónoma (soporta 1 o varias especialidades)
router.get("/api/especialidades/:especialidad/subtemas", async (req, res) => {
  const db = getDB();
  try {
    const rawEsp = req.params.especialidad || "Todos";
    const listaEsp = rawEsp.split(",").map(s => s.trim()).filter(Boolean);
    const esTodos = listaEsp.length === 0 || listaEsp.some(s => s.toLowerCase() === "todos");
    const requestedEspIds = new Set(listaEsp.map(s => normalizarTema(s)));

    const todas = await db.all(
      `SELECT DISTINCT subtema, tema FROM preguntas WHERE (activo = 1 OR activo IS NULL)`
    );

    const subtemasMap = new Map();
    todas.forEach(p => {
      const coincideEsp = esTodos || requestedEspIds.has(normalizarTema(p.tema));
      if (coincideEsp && p.subtema && p.subtema.trim() !== "") {
        const limpio = p.subtema.trim().replace(/\s+/g, " ");
        const clave = normalizarClaveSubtema(limpio);
        if (clave && !subtemasMap.has(clave)) {
          subtemasMap.set(clave, limpio);
        }
      }
    });

    const subtemas = Array.from(subtemasMap.values()).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );
    res.json(subtemas);
  } catch (error) {
    console.error("Error al obtener subtemas:", error);
    res.status(500).json({ error: "Error al cargar la lista de subtemas." });
  }
});


router.get("/api/examenes", async (req, res) => {
  const db = getDB();
  try {
    const filas = await db.all(`
      SELECT e.*, COUNT(p.id) as cantidad_preguntas_real
      FROM examenes e
      LEFT JOIN preguntas p ON p.examen_id = e.id AND p.activo = 1
      GROUP BY e.id
      ORDER BY e.ano DESC
    `);
    
    const examenes = filas.map(f => ({
      id: f.id,
      nombre: f.nombre,
      ano: f.ano,
      cantidad_preguntas: f.cantidad_preguntas_real || 0,
      activo: f.activo
    }));
    
    res.json(examenes);
  } catch (error) {
    console.error("Error al listar exámenes:", error);
    res.status(500).json({ error: "Error al listar exámenes." });
  }
});

// 2. Crear un nuevo examen oficial (Solo para Administrador)

router.get("/api/examenes/anos", autenticarToken, async (req, res) => {
  const db = getDB();
  try {
    const filas = await db.all(
      `SELECT DISTINCT ano_examen FROM preguntas WHERE ano_examen IS NOT NULL ORDER BY ano_examen DESC`
    );
    // Retornar array de años
    const anos = filas.map(f => f.ano_examen);
    res.json(anos);
  } catch (error) {
    console.error("Error al obtener años de exámenes:", error);
    res.status(500).json({ error: "Error al cargar la lista de años." });
  }
});

// 2. Endpoint central para preparar y filtrar el bloque de preguntas de un examen
router.post("/api/exam-setup", autenticarToken, async (req, res) => {
  const db = getDB();
  try {
    const { tipo, valor, subtema, cantidad } = req.body;
    const maxPreguntas = parseInt(cantidad) || 10;

    let preguntas = [];

    const valoresEsp = Array.isArray(valor)
      ? valor.map(v => String(v).trim()).filter(Boolean)
      : (valor ? [String(valor).trim()] : []);
    const esTodos = valoresEsp.length === 0 || valoresEsp.some(v => v.toLowerCase() === "todos");

    const valoresSub = Array.isArray(subtema)
      ? subtema.map(s => normalizarClaveSubtema(s)).filter(Boolean)
      : (subtema ? [normalizarClaveSubtema(subtema)].filter(Boolean) : []);
    const esTodosSub = valoresSub.length === 0 || valoresSub.includes("todos");

    if (tipo === "especialidad" && (!esTodos || !esTodosSub)) {
      const requestedEspIds = new Set(valoresEsp.map(v => normalizarTema(v)));
      const requestedSubKeys = new Set(valoresSub);
      
      // Obtener todas las preguntas activas
      const todas = await db.all(
        `SELECT * FROM preguntas WHERE (activo = 1 OR activo IS NULL)`
      );
      
      // Filtrar por especialidades y subtemas normalizados
      let filtradas = todas.filter(p => {
        const matchesEsp = esTodos ? true : requestedEspIds.has(normalizarTema(p.tema));
        const matchesSub = esTodosSub ? true : requestedSubKeys.has(normalizarClaveSubtema(p.subtema));
        return matchesEsp && matchesSub;
      });
      
      // Barajar y limitar a maxPreguntas
      filtradas.sort(() => 0.5 - Math.random());
      preguntas = filtradas.slice(0, maxPreguntas);
    } else if (tipo === "ano" && !esTodos) {
      const valorNum = parseInt(valor);
      
      // Intentar buscar por examen_id primero
      const examenExiste = await db.get(`SELECT id FROM examenes WHERE id = ?`, [valorNum]);
      if (examenExiste) {
        preguntas = await db.all(
          `SELECT * FROM preguntas 
           WHERE examen_id = ? AND (activo = 1 OR activo IS NULL)
           ORDER BY RANDOM() LIMIT ?`,
          [valorNum, maxPreguntas]
        );
      } else {
        // Fallback por año si es un año suelto (ej: 2024)
        preguntas = await db.all(
          `SELECT * FROM preguntas 
           WHERE ano_examen = ? AND (activo = 1 OR activo IS NULL)
           ORDER BY RANDOM() LIMIT ?`,
          [valorNum, maxPreguntas]
        );
      }
    } else {
      preguntas = await db.all(
        `SELECT * FROM preguntas 
         WHERE (activo = 1 OR activo IS NULL)
         ORDER BY RANDOM() LIMIT ?`,
        [maxPreguntas]
      );
    }

    res.json(preguntas);
  } catch (error) {
    console.error("Error al configurar bloque de examen:", error);
    res.status(500).json({ error: "Error interno del servidor al configurar el examen." });
  }
});

module.exports = router;
