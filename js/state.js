// ====== ESTADO GLOBAL UNIFICADO (state.js) ======

const state = {
  usuarioConectado: null,       // Almacenará { id, nombre, email, rol, xp, streak, nivel, metaSemanal }
  preguntasCargadas: [],
  indiceActual: 0,
  respuestasUsuario: [],
  preguntasMarcadas: [],        // Flagging de preguntas
  modoActual: "",               // "estudio", "simulacro", "guardia"
  especialidadSeleccionada: "Todos",
  cantidadSolicitada: 5,
  pantallaDeRetorno: "home",

  safeParseOpciones(opciones) {
    if (!opciones) return [];
    if (Array.isArray(opciones)) return opciones;
    if (typeof opciones === "string") {
      try {
        const parsed = JSON.parse(opciones);
        if (Array.isArray(parsed)) return parsed;
        return [parsed];
      } catch (e) {
        console.error("Error al parsear opciones JSON, usando fallback:", opciones, e);
        return opciones.split(",").map(opt => opt.trim());
      }
    }
    return [];
  },

  // Temporizadores
  tiempoRestanteSegundos: 0,
  intervaloTemporizador: null,
  duracionTotalSegundos: 0,

  // Módulo de Flashcards
  mazoActualFlashcards: [],
  indiceActualFlashcard: 0,
  dominadasFlashcards: 0,
  repasoFlashcards: 0,
  mazoFalladasSesion: [],       // Acumulador seguro de fallas (Repetición Espaciada SM-2)
  
  // Taxonomía de las 14 especialidades médicas oficiales ENURM
  LISTA_ESPECIALIDADES: [
    { id: "pediatria", nombre: "Pediatría", emoji: "👶" },
    { id: "ginecologia", nombre: "Gineco-Obstetricia", emoji: "🤰" },
    { id: "cirugia", nombre: "Cirugía General", emoji: "🥼" },
    { id: "interna", nombre: "Medicina Interna", emoji: "🫁" },
    { id: "basicas", nombre: "Ciencias Básicas", emoji: "🧬" },
    { id: "cardiologia", nombre: "Cardiología", emoji: "🫀" },
    { id: "neumologia", nombre: "Neumología", emoji: "🌬️" },
    { id: "gastro", nombre: "Gastroenterología", emoji: "🩺" },
    { id: "nefro", nombre: "Nefrología y Urología", emoji: "💧" },
    { id: "neurologia", nombre: "Neurología", emoji: "🧠" },
    { id: "infectologia", nombre: "Infectología", emoji: "🦠" },
    { id: "trauma", nombre: "Traumatología y Ortopedia", emoji: "🦴" },
    { id: "psiquiatria", nombre: "Psiquiatría", emoji: "💭" },
    { id: "salud", nombre: "Salud Pública y Epidemiología", emoji: "📊" }
  ]
};

window.state = state;
