// ====== MOTOR DE REPETICIÓN ESPACIADA SAAS (spaced_repetition.js) ======

const spacedRepetition = {
  // Inicialización o lectura de un estado
  obtenerEstadoVacio() {
    return {
      stability: 2.0,
      difficulty: 0.5,
      ease: 2.5,
      repetitions: 0,
      interval: 0,
      nextReview: new Date().toISOString()
    };
  },

  // Algoritmo SM-2 Adaptativo simplificado
  procesarRepaso(estadoActual, seLaSabia, dificultadSubjetiva = 2) {
    const estado = estadoActual ? { ...estadoActual } : spacedRepetition.obtenerEstadoVacio();
    
    if (seLaSabia) {
      estado.repetitions += 1;
      
      // Cálculo del intervalo en días
      if (estado.repetitions === 1) {
        estado.interval = 1; // 1 día
      } else if (estado.repetitions === 2) {
        estado.interval = 3; // 3 días
      } else {
        estado.interval = Math.round(estado.interval * estado.ease);
      }
      
      // Ajuste adaptativo del factor de facilidad (ease)
      // DificultadSubjetiva: 3 = Fácil, 2 = Normal, 1 = Difícil
      if (dificultadSubjetiva === 3) {
        estado.ease = Math.min(3.0, estado.ease + 0.15);
        estado.difficulty = Math.max(0.1, estado.difficulty - 0.1);
      } else if (dificultadSubjetiva === 1) {
        estado.ease = Math.max(1.3, estado.ease - 0.15);
        estado.difficulty = Math.min(0.9, estado.difficulty + 0.1);
      } else {
        estado.ease = Math.min(3.0, Math.max(1.3, estado.ease));
      }
    } else {
      // Si la falló o no se la sabía
      estado.repetitions = 0;
      estado.interval = 0; // Repaso inmediato
      estado.ease = Math.max(1.3, estado.ease - 0.25);
      estado.difficulty = Math.min(0.95, estado.difficulty + 0.15);
    }
    
    // Calcular próxima revisión
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + estado.interval);
    estado.nextReview = fecha.toISOString();
    
    return estado;
  },

  // Guardar estado en el servidor
  async sincronizarEstado(preguntaId, flashcardId, seLaSabia, dificultadSubjetiva = 2) {
    if (!state.usuarioConectado) return;
    
    try {
      // 1. Obtener estados actuales de la base de datos (o usar mazo de estado)
      const todosEstados = await api.obtenerRepeticionEspaciada(state.usuarioConectado.id);
      
      let estadoActual = null;
      if (flashcardId) {
        estadoActual = todosEstados.find(e => e.flashcard_id === flashcardId);
      } else if (preguntaId) {
        estadoActual = todosEstados.find(e => e.pregunta_id === preguntaId);
      }
      
      // 2. Procesar el nuevo estado con el algoritmo
      const nuevoEstado = spacedRepetition.procesarRepaso(estadoActual, seLaSabia, dificultadSubjetiva);
      
      // 3. Sincronizar en el servidor
      await api.guardarRepeticionEspaciada({
        usuarioId: state.usuarioConectado.id,
        preguntaId,
        flashcardId,
        stability: nuevoEstado.stability,
        difficulty: nuevoEstado.difficulty,
        ease: nuevoEstado.ease,
        repetitions: nuevoEstado.repetitions,
        interval: nuevoEstado.interval,
        nextReview: nuevoEstado.nextReview
      });
      
      return nuevoEstado;
    } catch (e) {
      console.error("Error al sincronizar repetición espaciada:", e);
    }
  }
};

window.spacedRepetition = spacedRepetition;
