const express = require("express");
const { getDB } = require("../config/db");
const fallbacksList = require("../config/fallbacks_ia.json");

const router = express.Router();

router.post("/api/ia/consultar", async (req, res) => {
  const db = getDB();
  try {
    const { preguntaTexto, seleccionText } = req.body;
    if (!preguntaTexto) {
      return res.status(400).json({ error: "Falta el texto del caso clínico." });
    }

    const textoLower = preguntaTexto.toLowerCase();
    let especialidad = "Medicina General";
    let libroCita = "Guía de Práctica Clínica (GPC) de Referencia Nacional";
    let explicacion = "";

    // Buscar coincidencia en la configuración JSON de fallbacks
    const match = fallbacksList.find(f => 
      f.keywords.some(keyword => textoLower.includes(keyword.toLowerCase()))
    );

    if (match) {
      especialidad = match.especialidad;
      libroCita = match.libroCita;
      explicacion = match.explicacion;
    } else {
      explicacion = `Tras realizar un análisis exhaustivo del caso clínico planteado, se determina la relevancia de guiar el abordaje con estricto apego a las guías internacionales. En la práctica clínica real y el rigor del examen ENURM, el reconocimiento precoz de los signos pivote expuestos en el enunciado permite descartar diagnósticos diferenciales comunes y elegir la terapia más eficaz.`;
    }

    let feedbackIA = "";

    if (seleccionText) {
      feedbackIA = `<div class="ia-question-context">
        <strong>Caso Clínico:</strong> "${preguntaTexto}"<br>
        <span style="color: #ec4899;"><strong>Opción elegida para análisis:</strong> "${seleccionText}"</span>
      </div>`;
    }

    const respuestaFinal = `
      ${feedbackIA}
      <div class="ia-badge-book">📚 Fuente Oficial: ${libroCita}</div>
      <div class="ia-explanation-text">
        <p><strong>Querido Colega, aquí tienes la disección del Tutor IA:</strong></p>
        <p>${explicacion}</p>
        <p><em>Recuerda que el ENURM evalúa la memorización precisa de datos puros basados en la literatura médica clásica. Sigue estudiando con constancia.</em></p>
      </div>
    `;

    res.json({ explicacionIA: respuestaFinal });

  } catch (error) {
    console.error("Error en Tutor IA:", error);
    res.status(500).json({ error: "Error en el servidor al consultar el Tutor IA." });
  }
});

/* ==========================================================================
   🧠 ENDPOINTS DE SPACED REPETITION Y FLASHCARDS PERSONALIZADAS
   ========================================================================== */

// --- INTEGRACIÓN PREMIUM DE GEMINI CON CACHÉ LOCAL ---

let GoogleGenerativeAI = null;
try {
  GoogleGenerativeAI = require("@google/generative-ai").GoogleGenerativeAI;
} catch (err) {
  console.warn("⚠️ No se pudo cargar el SDK de @google/generative-ai:", err.message);
}

function parseOpcionesBackend(opciones) {
  if (!opciones) return [];
  if (Array.isArray(opciones)) return opciones;
  if (typeof opciones === "string") {
    try {
      const parsed = JSON.parse(opciones);
      if (Array.isArray(parsed)) return parsed;
      return [parsed];
    } catch (e) {
      return opciones.split(",").map(opt => opt.trim());
    }
  }
  return [];
}

router.get("/api/ia/ayudas", async (req, res) => {
  const db = getDB();
  const preguntaId = parseInt(req.query.preguntaId);

  if (!preguntaId) {
    return res.status(400).json({ error: "Falta el parámetro preguntaId." });
  }

  try {
    // 1. Buscar en caché local
    const cachedRow = await db.get(
      `SELECT socratic_tip, key_info_html FROM cache_ayudas_ia WHERE pregunta_id = ?`,
      [preguntaId]
    );

    if (cachedRow) {
      return res.json({
        socratic_tip: cachedRow.socratic_tip,
        key_info_html: cachedRow.key_info_html,
        origen: "cache"
      });
    }

    // 2. Si no hay caché, verificar si tenemos API Key de Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !GoogleGenerativeAI) {
      // Retornar bandera para usar fallback local gratuito
      return res.json({ useFallback: true, origen: "fallback-no-key" });
    }

    // 3. Buscar la pregunta en la base de datos
    const pregunta = await db.get(
      `SELECT texto, opciones, correcta FROM preguntas WHERE id = ?`,
      [preguntaId]
    );

    if (!pregunta) {
      return res.status(404).json({ error: "Pregunta no encontrada." });
    }

    // 4. Invocar a Gemini para generar las ayudas inteligentes
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const opcionesArray = parseOpcionesBackend(pregunta.opciones);
    const opcionesText = opcionesArray.map((o, idx) => `${String.fromCharCode(65 + idx)}) ${o}`).join("\n");

    const prompt = `Actúa como un Tutor Médico experto preparando a estudiantes para el ENURM (Examen Nacional de Residencias Médicas).
Dado el siguiente caso clínico:
Caso clínico: "${pregunta.texto}"
Opciones de respuesta:
${opcionesText}
La opción correcta es la de índice ${pregunta.correcta} (0 para A, 1 para B, 2 para C, 3 para D).

Tu tarea es generar dos elementos educativos de nivel premium y altamente académicos para guiar al estudiante:

1. "socratic_tip": Un consejo de tutoría socrática avanzado (en formato Markdown con subtítulos en negrita y viñetas) que guíe al estudiante mediante el razonamiento clínico sin revelar la respuesta correcta de forma directa ni citar las opciones explícitamente. Debe ser detallado, riguroso y de alto valor médico. Estructúralo estrictamente de la siguiente manera:
   - **🔍 Foco Clínico y Síntoma Pivote**: Identifica y explica de forma detallada la relevancia del dato o síntoma pivote (ej. edad del paciente, antecedente clave, o hallazgo de laboratorio crítico) y cómo este acota tus sospechas diagnósticas.
   - **🧠 Razonamiento Fisiopatológico**: Formula una pregunta reflexiva profunda sobre la fisiopatología, el mecanismo de acción o el diagnóstico diferencial aplicable a este caso específico. Debe conectar los síntomas con la patogenia subyacente.
   - **🚫 Estrategia de Descarte Clínico**: Proporciona una clave diagnóstica clara para descartar al menos una opción incorrecta (por ejemplo, basándose en la edad típica de presentación, la ausencia de un hallazgo patognomónico, la cronicidad del cuadro, o la presencia de bilis/sangre en secreciones).

2. "key_info_html": El texto del caso clínico original EXACTAMENTE igual, pero enriquecido con etiquetas HTML para los datos clave más relevantes. Envuelve cada dato clínico clave en una etiqueta HTML con el formato:
   <span class="clinical-key-highlight" data-tooltip="EXPLICACIÓN CLÍNICA DE POR QUÉ ESTE DATO ES IMPORTANTE EN ESTE CASO">DATO_CLAVE_ORIGINAL</span>
   Debes resaltar entre 2 y 4 datos clave esenciales. Las explicaciones en 'data-tooltip' deben ser explicaciones clínicas concisas, de alto nivel y muy informativas.
   IMPORTANTE: El texto retornado en "key_info_html" debe conservar el resto del contenido del caso clínico exactamente igual al original.

Responde únicamente con un objeto JSON válido con los campos "socratic_tip" y "key_info_html".`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsedResponse = JSON.parse(responseText);

    const socraticTip = parsedResponse.socratic_tip || "";
    const keyInfoHtml = parsedResponse.key_info_html || pregunta.texto;

    // 5. Guardar en caché local
    await db.run(
      `INSERT INTO cache_ayudas_ia (pregunta_id, socratic_tip, key_info_html) 
       VALUES (?, ?, ?) 
       ON CONFLICT (pregunta_id) DO UPDATE SET socratic_tip = EXCLUDED.socratic_tip, key_info_html = EXCLUDED.key_info_html`,
      [preguntaId, socraticTip, keyInfoHtml]
    );

    res.json({
      socratic_tip: socraticTip,
      key_info_html: keyInfoHtml,
      origen: "gemini-api"
    });

  } catch (error) {
    console.error("⚠️ Fallo en el Tutor de IA Premium:", error.message);
    // Retornar fallback para que el cliente no falle
    res.json({ useFallback: true, origen: "fallback-on-error", error: error.message });
  }
});

module.exports = router;
