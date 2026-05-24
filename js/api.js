// ====== CENTRAL DE PETICIONES HTTP (api.js) ======

const BASE_URL = "";

// Helper centralizado para inyectar token JWT de forma automática
async function request(url, options = {}) {
  const token = localStorage.getItem("resiMed_jwt_token");
  
  options.headers = {
    "Content-Type": "application/json",
    ...options.headers
  };
  
  if (token) {
    options.headers["Authorization"] = `Bearer ${token}`;
  }
  
  const respuesta = await fetch(url, options);
  
  if (respuesta.status === 401 || respuesta.status === 403) {
    // Si la sesión expiró o no está autorizado, forzar logout
    localStorage.removeItem("resiMed_session");
    localStorage.removeItem("resiMed_jwt_token");
    window.location.reload();
    throw new Error("Sesión expirada. Inicie sesión nuevamente.");
  }
  
  const datos = await respuesta.json();
  
  if (!respuesta.ok) {
    throw new Error(datos.error || "Ocurrió una falla en la conexión.");
  }
  
  return datos;
}

const api = {
  // Autenticación
  registro: (nombre, email, password) => 
    request("/api/auth/registro", {
      method: "POST",
      body: JSON.stringify({ nombre, email, password })
    }),
    
  login: (email, password) => 
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),

  // Simulador y Preguntas
  obtenerPreguntas: (tema, limite) => 
    request(`/api/preguntas?tema=${encodeURIComponent(tema)}&limite=${limite}`),

  obtenerTemas: () => 
    request("/api/temas"),

  guardarSesion: (sesionData) => 
    request("/api/sesiones", {
      method: "POST",
      body: JSON.stringify(sesionData)
    }),

  obtenerSesionesRecientes: (usuarioId) => 
    request(`/api/sesiones?usuarioId=${usuarioId}`),

  obtenerHistorialCompleto: (usuarioId) => 
    request(`/api/historial?usuarioId=${usuarioId}`),

  // Analytics & Dashboard
  obtenerResumenDashboard: (usuarioId) => 
    request(`/api/dashboard/resumen?usuarioId=${usuarioId}`),

  obtenerCobertura: (usuarioId) => 
    request(`/api/dashboard/cobertura?usuarioId=${usuarioId}`),

  // Tutor IA
  consultarTutorIA: (preguntaTexto, seleccionText) => 
    request("/api/ia/consultar", {
      method: "POST",
      body: JSON.stringify({ preguntaTexto, seleccionText })
    }),

  // Spaced Repetition (SM-2 / FSRS)
  obtenerRepeticionEspaciada: (usuarioId) => 
    request(`/api/spaced-repetition?usuarioId=${usuarioId}`),

  guardarRepeticionEspaciada: (spacedData) => 
    request("/api/spaced-repetition", {
      method: "POST",
      body: JSON.stringify(spacedData)
    }),

  // Flashcards Personalizadas
  obtenerFlashcardsPersonalizadas: (usuarioId) => 
    request(`/api/flashcards/personalizadas?usuarioId=${usuarioId}`),

  guardarFlashcardPersonalizada: (usuarioId, tema, pregunta, respuesta) => 
    request("/api/flashcards/personalizadas", {
      method: "POST",
      body: JSON.stringify({ usuarioId, tema, pregunta, respuesta })
    }),

  actualizarPerfil: (nombre, especialidadAspirada, metaSemanal) => 
    request("/api/usuario/actualizar", {
      method: "PUT",
      body: JSON.stringify({ nombre, especialidadAspirada, metaSemanal })
    }),

  guardarPregunta: (texto, opciones, correcta, tema, explicacion, fuente, usuarioId) => 
    request("/api/preguntas", {
      method: "POST",
      body: JSON.stringify({ texto, opciones, correcta, tema, explicacion, fuente, usuarioId })
    }),

  cargarMasivo: (preguntas, usuarioId) => 
    request("/api/admin/cargar-masivo", {
      method: "POST",
      body: JSON.stringify({ preguntas, usuarioId })
    }),

  guardarReporteError: (preguntaId, motivo, comentario) =>
    request("/api/reportes-error", {
      method: "POST",
      body: JSON.stringify({ preguntaId, motivo, comentario })
    }),

  obtenerReportesError: () =>
    request("/api/admin/reportes-error"),

  resolverReporteError: (id) =>
    request(`/api/admin/reportes-error/${id}/marcar-leido`, {
      method: "PUT"
    }),

  editarPregunta: (id, data) =>
    request(`/api/admin/preguntas/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),

  obtenerMapeoTemas: () =>
    request("/api/preguntas/mapeo-temas"),

  // === FASE 1: NUEVOS ENDPOINTS ===
  obtenerAnosExamen: () =>
    request("/api/examenes/anos"),

  prepararExamen: (tipo, valor, cantidad) =>
    request("/api/exam-setup", {
      method: "POST",
      body: JSON.stringify({ tipo, valor, cantidad })
    })
};

window.api = api;
