// ====== CONTROLADOR DEL SIMULADOR / QUIZ (quiz.js) ======

// Variables internas de tiempo para Modo Guardia y simulacros
let tiempoPorPreguntaRestante = 30;
let guardiaTimerInterval = null;

function safeParseOpciones(opciones) {
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
}

const quiz = {
  guardarEstadoExamenActivo() {
    if (state.preguntasCargadas && state.preguntasCargadas.length > 0) {
      localStorage.setItem("resiMed_examen_activo", JSON.stringify({
        modoActual: state.modoActual,
        especialidadSeleccionada: state.especialidadSeleccionada,
        subtemaSeleccionado: state.subtemaSeleccionado,
        cantidadSolicitada: state.cantidadSolicitada,
        preguntasCargadas: state.preguntasCargadas,
        indiceActual: state.indiceActual,
        respuestasUsuario: state.respuestasUsuario,
        preguntasMarcadas: state.preguntasMarcadas,
        duracionTotalSegundos: state.duracionTotalSegundos,
        tiempoRestanteSegundos: state.tiempoRestanteSegundos,
        retroalimentacionInmediata: state.retroalimentacionInmediata,
        intentosPrevios: state.intentosPrevios || {}
      }));
    }
  },

  limpiarEstadoExamenActivo() {
    localStorage.removeItem("resiMed_examen_activo");
  },

  restaurarExamenActivo() {
    try {
      const dataStr = localStorage.getItem("resiMed_examen_activo");
      if (!dataStr) return false;
      const data = JSON.parse(dataStr);
      if (!data || !data.preguntasCargadas || data.preguntasCargadas.length === 0) return false;

      // Restaurar estado global
      state.modoActual = data.modoActual;
      state.especialidadSeleccionada = data.especialidadSeleccionada;
      state.subtemaSeleccionado = data.subtemaSeleccionado;
      state.cantidadSolicitada = data.cantidadSolicitada;
      state.preguntasCargadas = data.preguntasCargadas;
      state.indiceActual = data.indiceActual;
      state.respuestasUsuario = data.respuestasUsuario;
      state.preguntasMarcadas = data.preguntasMarcadas;
      state.duracionTotalSegundos = data.duracionTotalSegundos;
      state.tiempoRestanteSegundos = data.tiempoRestanteSegundos;
      state.retroalimentacionInmediata = data.retroalimentacionInmediata;
      state.intentosPrevios = data.intentosPrevios || {};

      // Reseteo de intervalos si estaban activos
      clearInterval(state.intervaloTemporizador);
      clearInterval(guardiaTimerInterval);

      const chipModo = document.getElementById("chip-modo");
      const chipTema = document.getElementById("chip-tema");
      const mapEl = document.getElementById("simulacro-navigation-map");
      const temporizadorEl = document.getElementById("temporizador");

      if (chipModo) {
        if (state.modoActual === "guardia") {
          chipModo.textContent = "MODO GUARDIA";
          chipModo.className = "chip chip-primary";
          chipModo.style.background = "linear-gradient(135deg, var(--danger) 0%, #b91c1c 100%)";
        } else {
          chipModo.textContent = state.modoActual === "estudio" ? "Modo Estudio" : "Modo Simulacro";
          chipModo.className = "chip chip-primary";
          chipModo.style.background = "";
        }
      }

      if (chipTema) {
        if (state.modoActual === "guardia") {
          chipTema.textContent = "Urgencias Médicas";
        } else if (state.especialidadSeleccionada === "Todos") {
          chipTema.textContent = "Examen General";
        } else {
          chipTema.textContent = (state.subtemaSeleccionado && state.subtemaSeleccionado !== "Todos")
            ? `${state.especialidadSeleccionada} - ${state.subtemaSeleccionado}`
            : state.especialidadSeleccionada;
        }
      }

      if (mapEl) mapEl.classList.remove("hidden");

      // Iniciar UI
      quiz.ocultarFeedback();
      ui.mostrarPantalla("quiz", false);

      // Re-arrancar cronómetros
      if (state.modoActual === "guardia") {
        if (temporizadorEl) temporizadorEl.classList.remove("hidden");
        // Reiniciar el temporizador para la pregunta actual (30 segundos)
        quiz.iniciarTemporizadorGuardia();
      } else if (state.modoActual === "simulacro" || state.modoActual === "estudio") {
        if (temporizadorEl) {
          temporizadorEl.classList.remove("hidden");
          quiz.actualizarRelojVisual();
        }
        state.intervaloTemporizador = setInterval(() => {
          state.tiempoRestanteSegundos--;
          state.duracionTotalSegundos++;
          quiz.actualizarRelojVisual();

          if (state.duracionTotalSegundos % 2 === 0) {
            quiz.guardarEstadoExamenActivo();
          }

          if (state.tiempoRestanteSegundos <= 0) {
            clearInterval(state.intervaloTemporizador);
            quiz.congelarControles();
            alert("Tiempo límite de evaluación alcanzado. Guardando tus respuestas...");
            quiz.finalizarSesion();
          }
        }, 1000);
      }

      quiz.renderizarPreguntaActual();
      return true;
    } catch (e) {
      console.error("Error al restaurar examen activo:", e);
      localStorage.removeItem("resiMed_examen_activo");
      return false;
    }
  },

  solicitarConfirmacionInicio(modo) {
    const modal = document.getElementById("modal-confirmar-inicio");
    const tituloEl = document.getElementById("modal-confirmar-titulo");
    const descEl = document.getElementById("modal-confirmar-descripcion-box");
    const btnAceptar = document.getElementById("btn-confirmar-aceptar");
    const btnCancelar = document.getElementById("btn-confirmar-cerrar");
    const toggleBox = document.getElementById("modal-confirmar-estudio-toggle-box");
    const chkRetro = document.getElementById("chk-retroalimentacion-inmediata");

    if (!modal) {
      quiz.iniciarSesion(modo);
      return;
    }

    // Mostrar u ocultar el switch de retroalimentación según corresponda
    if (toggleBox) {
      toggleBox.style.display = (modo === "estudio") ? "flex" : "none";
    }

    const actualizarTextoEstudio = () => {
      if (!chkRetro) return;
      if (chkRetro.checked) {
        tituloEl.textContent = "Modo Estudio (Respuestas al Instante)";
        descEl.textContent = "Sesión de aprendizaje adaptativo con respuestas y justificaciones clínicas al instante al contestar cada pregunta. Límite de 90 segundos por pregunta.";
      } else {
        tituloEl.textContent = "Modo Estudio (Respuestas al Final)";
        descEl.textContent = "Sesión de aprendizaje adaptativo con respuestas y justificaciones clínicas consolidadas al finalizar el bloque de preguntas. Límite de 90 segundos por pregunta.";
      }
    };

    // Configurar contenidos sobrios y ultra-resumidos por modo
    if (modo === "estudio") {
      actualizarTextoEstudio();
      if (chkRetro) {
        chkRetro.addEventListener("change", actualizarTextoEstudio);
      }
    } else if (modo === "simulacro") {
      tituloEl.textContent = "Modo Simulacro";
      descEl.textContent = "Evaluación formal y estricta bajo condiciones reales de examen (cuenta regresiva de 90 segundos por pregunta) con respuestas y resultados bloqueados hasta finalizar el test.";
    } else if (modo === "guardia") {
      tituloEl.textContent = "Modo Guardia";
      descEl.textContent = "Entrenamiento acelerado de 10 preguntas aleatorias de emergencias médicas con límite estricto de 30 segundos por pregunta.";
    }

    // Manejar eventos de forma limpia libres de acumulaciones
    const alAceptar = () => {
      modal.classList.remove("active");
      btnAceptar.removeEventListener("click", alAceptar);
      btnCancelar.removeEventListener("click", alCancelar);
      modal.removeEventListener("click", alFondo);
      if (chkRetro) {
        chkRetro.removeEventListener("change", actualizarTextoEstudio);
      }
      quiz.iniciarSesion(modo);
    };

    const alCancelar = () => {
      modal.classList.remove("active");
      btnAceptar.removeEventListener("click", alAceptar);
      btnCancelar.removeEventListener("click", alCancelar);
      modal.removeEventListener("click", alFondo);
      if (chkRetro) {
        chkRetro.removeEventListener("change", actualizarTextoEstudio);
      }
    };

    const alFondo = (e) => {
      if (e.target === modal) {
        alCancelar();
      }
    };

    btnAceptar.addEventListener("click", alAceptar);
    btnCancelar.addEventListener("click", alCancelar);
    modal.addEventListener("click", alFondo);

    modal.classList.add("active");
  },

  inicializar() {
    const btnModoEstudio = document.getElementById("btn-modo-estudio");
    const btnModoSimulacro = document.getElementById("btn-modo-simulacro");
    const btnSiguiente = document.getElementById("btn-siguiente");
    const btnFinalizar = document.getElementById("btn-finalizar");
    const btnFlagPregunta = document.getElementById("btn-flag-pregunta");
    const preguntaTexto = document.getElementById("pregunta-texto");

    if (btnModoEstudio) {
      btnModoEstudio.addEventListener("click", () => quiz.solicitarConfirmacionInicio("estudio"));
    }
    if (btnModoSimulacro) {
      btnModoSimulacro.addEventListener("click", () => quiz.solicitarConfirmacionInicio("simulacro"));
    }
    if (btnSiguiente) {
      btnSiguiente.addEventListener("click", () => quiz.siguientePregunta());
    }
    if (btnFinalizar) {
      btnFinalizar.addEventListener("click", () => quiz.finalizarSesion());
    }
    if (btnFlagPregunta) {
      btnFlagPregunta.addEventListener("click", () => {
        state.preguntasMarcadas[state.indiceActual] = !state.preguntasMarcadas[state.indiceActual];
        quiz.actualizarBotonFlagVisual();
        quiz.renderizarMapaNavegacion();
        
        // Actualizar reactivamente la clase de la pregunta en pantalla
        const pTexto = document.getElementById("pregunta-texto");
        if (pTexto) {
          if (state.preguntasMarcadas[state.indiceActual]) {
            pTexto.classList.add("flagged-question");
          } else {
            pTexto.classList.remove("flagged-question");
          }
        }

        quiz.guardarEstadoExamenActivo();
      });
    }

    // 🔍 HERRAMIENTA HIGHLIGHTER INTERACTIVA (Fase 4)
    if (preguntaTexto) {
      preguntaTexto.addEventListener("mouseup", () => {
        const seleccion = window.getSelection();
        const textoSeleccionado = seleccion.toString().trim();
        if (textoSeleccionado.length > 0) {
          const rango = seleccion.getRangeAt(0);
          
          if (preguntaTexto.contains(rango.commonAncestorContainer)) {
            const mark = document.createElement("mark");
            mark.className = "resaltado-medico";
            mark.title = "Haz clic para borrar el subrayado";
            
            try {
              rango.surroundContents(mark);
            } catch (e) {
              // Evitar fallos si cruza múltiples nodos
            }
            seleccion.removeAllRanges();
          }
        }
      });
    }

    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("resaltado-medico")) {
        const mark = e.target;
        const parent = mark.parentNode;
        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
        parent.normalize();
      }
    });
  },

  // ⏱️ INICIAR SESIÓN (CON ADAPTIVE LEARNING & MODO GUARDIA)
  async iniciarSesion(modoForce) {
    const modo = modoForce || state.modoActual || "estudio";
    state.modoActual = modo;
    
    // Capturar retroalimentación inmediata
    const chkRetro = document.getElementById("chk-retroalimentacion-inmediata");
    state.retroalimentacionInmediata = (modo === "estudio" && chkRetro) ? chkRetro.checked : false;

    state.cantidadSolicitada = parseInt(document.getElementById("cantidad").value) || 20;

    // Reseteo de intervalos si estaban activos
    clearInterval(state.intervaloTemporizador);
    clearInterval(guardiaTimerInterval);
    const temporizadorEl = document.getElementById("temporizador");
    if (temporizadorEl) temporizadorEl.classList.add("hidden");

    try {
      // 1. Cargar preguntas desde nuestro nuevo endpoint centralizado POST /api/exam-setup
      let preguntas = [];
      if (modo === "guardia") {
        preguntas = await api.prepararExamen("todos", "todos", 10);
        state.cantidadSolicitada = 10;
        state.especialidadSeleccionada = "Todos";
        state.subtemaSeleccionado = "Todos";
      } else {
        const tipo = state.tipoSimulacroSeleccionado || "especialidad";
        const valor = tipo === "especialidad" ? document.getElementById("especialidad").value : document.getElementById("selector-ano").value;
        const selectorSub = document.getElementById("selector-subtema");
        const subtema = (tipo === "especialidad" && selectorSub) ? selectorSub.value : "Todos";

        // FASE 3: Guardar en el estado para consistencia visual premium
        state.especialidadSeleccionada = valor;
        state.subtemaSeleccionado = subtema;

        preguntas = await api.prepararExamen(tipo, valor, state.cantidadSolicitada, subtema);
      }

      if (preguntas.length === 0) {
        alert("No hay preguntas registradas en este bloque actualmente.");
        return;
      }

      // 2. Motor de Aprendizaje Adaptativo (Filtrado & Priorización)
      if (modo !== "guardia" && state.tipoSimulacroSeleccionado === "especialidad") {
        preguntas = await quiz.aplicarFiltroAdaptativo(preguntas);
      }

      // Limitar a la cantidad solicitada
      state.preguntasCargadas = preguntas.slice(0, state.cantidadSolicitada);
      state.indiceActual = 0;
      state.respuestasUsuario = new Array(state.preguntasCargadas.length).fill(null);
      state.preguntasMarcadas = new Array(state.preguntasCargadas.length).fill(false);
      state.duracionTotalSegundos = 0;
      state.intentosPrevios = {};

      const chipModo = document.getElementById("chip-modo");
      const chipTema = document.getElementById("chip-tema");
      const mapEl = document.getElementById("simulacro-navigation-map");

      if (chipModo) {
        if (modo === "guardia") {
          chipModo.textContent = "MODO GUARDIA";
          chipModo.className = "chip chip-primary";
          chipModo.style.background = "linear-gradient(135deg, var(--danger) 0%, #b91c1c 100%)";
        } else {
          chipModo.textContent = modo === "estudio" ? "Modo Estudio" : "Modo Simulacro";
          chipModo.className = "chip chip-primary";
          chipModo.style.background = "";
        }
      }
      if (chipTema) {
        if (modo === "guardia") {
          chipTema.textContent = "Urgencias Médicas";
        } else if (state.especialidadSeleccionada === "Todos") {
          chipTema.textContent = "Examen General";
        } else {
          chipTema.textContent = (state.subtemaSeleccionado && state.subtemaSeleccionado !== "Todos")
            ? `${state.especialidadSeleccionada} - ${state.subtemaSeleccionado}`
            : state.especialidadSeleccionada;
        }
      }
      if (mapEl) mapEl.classList.remove("hidden");

      quiz.ocultarFeedback();
      ui.mostrarPantalla("quiz");

      // 3. Configuración de Tiempos
      if (modo === "guardia") {
        state.preguntasCargadas = preguntas.slice(0, 10); // Modo guardia siempre 10 preguntas
        state.respuestasUsuario = new Array(state.preguntasCargadas.length).fill(null);
        state.preguntasMarcadas = new Array(state.preguntasCargadas.length).fill(false);
        
        if (temporizadorEl) temporizadorEl.classList.remove("hidden");
        quiz.iniciarTemporizadorGuardia();
      } else if (modo === "simulacro" || modo === "estudio") {
        state.tiempoRestanteSegundos = state.preguntasCargadas.length * 90;
        state.duracionTotalSegundos = 0;
        if (temporizadorEl) {
          temporizadorEl.classList.remove("hidden");
          quiz.actualizarRelojVisual();
        }
        state.intervaloTemporizador = setInterval(() => {
          state.tiempoRestanteSegundos--;
          state.duracionTotalSegundos++;
          quiz.actualizarRelojVisual();
          
          // FASE 4: Guardar el tiempo restante de forma incremental cada 2 segundos
          if (state.duracionTotalSegundos % 2 === 0) {
            quiz.guardarEstadoExamenActivo();
          }

          if (state.tiempoRestanteSegundos <= 0) {
            clearInterval(state.intervaloTemporizador);
            quiz.congelarControles();
            alert("Tiempo límite de evaluación alcanzado. Guardando tus respuestas...");
            quiz.finalizarSesion();
          }
        }, 1000);
      }

      quiz.renderizarPreguntaActual();
      quiz.guardarEstadoExamenActivo();
    } catch (e) {
      alert("Error al estructurar el examen: " + e.message);
    }
  },

  // Algoritmo de Priorización de Flaquezas (Adaptive Learning)
  async aplicarFiltroAdaptativo(preguntas) {
    if (!state.usuarioConectado) return preguntas;
    
    try {
      // Obtener cobertura y rendimiento por especialidad del usuario
      const cobertura = await api.obtenerCobertura(state.usuarioConectado.id);
      
      // Ordenar temas con menor acierto (menor cobertura/rendimiento) para priorizarlos
      const debilidades = Object.keys(cobertura).sort((a, b) => {
        return cobertura[a].porcentaje - cobertura[b].porcentaje;
      });
      
      // Reordenar preguntas basándose en las debilidades del usuario
      return preguntas.sort((a, b) => {
        const indexA = debilidades.indexOf(a.tema.trim().toLowerCase());
        const indexB = debilidades.indexOf(b.tema.trim().toLowerCase());
        
        // Si el tema está en el mapa de debilidades (acierto bajo), va primero (menor índice es más débil)
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return 0;
      });
    } catch (e) {
      console.warn("Falla al aplicar algoritmo adaptativo, usando aleatoriedad por defecto.", e);
      return preguntas;
    }
  },

  // Temporizador Rápido para MODO GUARDIA (30 segundos por pregunta)
  iniciarTemporizadorGuardia() {
    clearInterval(guardiaTimerInterval);
    tiempoPorPreguntaRestante = 30;
    quiz.actualizarRelojGuardiaVisual();

    guardiaTimerInterval = setInterval(() => {
      tiempoPorPreguntaRestante--;
      state.duracionTotalSegundos++;
      quiz.actualizarRelojGuardiaVisual();

      if (tiempoPorPreguntaRestante <= 0) {
        clearInterval(guardiaTimerInterval);
        alert("¡Tiempo de guardia agotado en esta pregunta!");
        // Marcar como no respondida y saltar
        state.respuestasUsuario[state.indiceActual] = -1; 
        quiz.siguientePregunta();
      }
    }, 1000);
  },

  actualizarRelojGuardiaVisual() {
    const temporizadorEl = document.getElementById("temporizador");
    if (temporizadorEl) {
      temporizadorEl.textContent = `${tiempoPorPreguntaRestante}s`;
      if (tiempoPorPreguntaRestante <= 10) {
        temporizadorEl.style.color = "var(--danger)";
        temporizadorEl.style.fontWeight = "bold";
      } else {
        temporizadorEl.style.color = "";
        temporizadorEl.style.fontWeight = "";
      }
    }
  },

  actualizarRelojVisual() {
    const temporizadorEl = document.getElementById("temporizador");
    if (temporizadorEl) {
      const min = Math.floor(state.tiempoRestanteSegundos / 60);
      const seg = state.tiempoRestanteSegundos % 60;
      temporizadorEl.textContent = `${min.toString().padStart(2, "0")}:${seg.toString().padStart(2, "0")}`;
    }
  },

  actualizarRelojEstudioVisual() {
    const temporizadorEl = document.getElementById("temporizador");
    if (temporizadorEl) {
      const min = Math.floor(state.duracionTotalSegundos / 60);
      const seg = state.duracionTotalSegundos % 60;
      temporizadorEl.textContent = `${min.toString().padStart(2, "0")}:${seg.toString().padStart(2, "0")}`;
    }
  },

  renderizarPreguntaActual() {
    quiz.ocultarFeedback();
    const btnSiguiente = document.getElementById("btn-siguiente");
    const btnFinalizar = document.getElementById("btn-finalizar");
    const contadorPregunta = document.getElementById("contador-pregunta");
    const progressFill = document.getElementById("progress-fill");
    const preguntaTexto = document.getElementById("pregunta-texto");
    const opcionesContainer = document.getElementById("opciones-container");

    if (btnSiguiente) btnSiguiente.classList.add("hidden");
    if (btnFinalizar) {
      btnFinalizar.classList.remove("hidden");
      btnFinalizar.textContent = "Terminar";
      if (state.indiceActual === state.preguntasCargadas.length - 1) {
        btnFinalizar.classList.add("btn-primary");
        btnFinalizar.classList.remove("btn-secondary");
      } else {
        btnFinalizar.classList.remove("btn-primary");
        btnFinalizar.classList.add("btn-secondary");
      }
    }


    quiz.actualizarBotonFlagVisual();
    quiz.renderizarMapaNavegacion();

    const p = state.preguntasCargadas[state.indiceActual];
    if (contadorPregunta) {
      contadorPregunta.textContent = `Pregunta ${state.indiceActual + 1} de ${state.preguntasCargadas.length}`;
    }
    if (progressFill) {
      progressFill.style.width = `${((state.indiceActual + 1) / state.preguntasCargadas.length) * 100}%`;
    }

    if (preguntaTexto) {
      preguntaTexto.innerHTML = p.texto;
      if (state.preguntasMarcadas[state.indiceActual]) {
        preguntaTexto.classList.add("flagged-question");
      } else {
        preguntaTexto.classList.remove("flagged-question");
      }
    }
    if (opcionesContainer) opcionesContainer.innerHTML = "";

    const opcionesArray = safeParseOpciones(p.opciones);
    opcionesArray.forEach((opcion, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "option-wrapper";

      const boton = document.createElement("button");
      boton.className = "option-btn";
      boton.type = "button";
      boton.style.flex = "1";
      
      let opcionLimpia = opcion;
      const regexPrefijo = /^[a-d](?:\)|\.-|\.\s|\s-\s)\s*/i;
      opcionLimpia = opcionLimpia.replace(regexPrefijo, "");

      boton.innerHTML = `<span class="option-letter">${String.fromCharCode(65 + index)}</span><span class="option-text-content">${opcionLimpia}</span>`;
      
      if (state.respuestasUsuario[state.indiceActual] === index) boton.classList.add("selected");

      const btnMarcar = document.createElement("button");
      btnMarcar.className = "btn-marcar-respuesta";
      btnMarcar.type = "button";
      btnMarcar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="icon-marcar"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      btnMarcar.title = "Tachar o descartar esta opción";

      btnMarcar.addEventListener("click", (e) => {
        e.stopPropagation();
        boton.classList.toggle("marked-option");
        if (boton.classList.contains("marked-option")) {
          btnMarcar.classList.add("active");
        } else {
          btnMarcar.classList.remove("active");
        }
      });

      boton.addEventListener("click", async () => {
        // En Modo Guardia y Simulacro, solo permite responder una vez
        if (state.modoActual === "estudio") {
          const botones = opcionesContainer.querySelectorAll(".option-btn");
          const marcadores = opcionesContainer.querySelectorAll(".btn-marcar-respuesta");
          
          state.intentosPrevios = state.intentosPrevios || {};
          state.intentosPrevios[state.indiceActual] = state.intentosPrevios[state.indiceActual] || [];
          const anteriores = state.intentosPrevios[state.indiceActual];

          const esCorrecto = (index === p.correcta);
          
          if (esCorrecto) {
            // Si es correcto, finalizamos la pregunta
            boton.classList.add("correct");
            botones.forEach(b => b.disabled = true);
            marcadores.forEach(bm => bm.classList.add("hidden"));
            state.respuestasUsuario[state.indiceActual] = index;
            
            // Todos los intentos incorrectos anteriores en esta pregunta se marcan en amarillo (previous-attempt)
            anteriores.forEach(idxIntentado => {
              if (botones[idxIntentado]) {
                botones[idxIntentado].classList.remove("wrong");
                botones[idxIntentado].classList.add("previous-attempt");
              }
            });
            
            quiz.mostrarFeedback(true, p.explicacion);
            
            // Cuenta como correcto en SM-2 si fue al primer intento
            const esAlPrimerIntento = (anteriores.length === 0);
            await spacedRepetition.sincronizarEstado(p.id, null, esAlPrimerIntento, esAlPrimerIntento ? 2 : 1);
            
            quiz.chequearBotonesNavegacion();
            quiz.renderizarMapaNavegacion();
            quiz.guardarEstadoExamenActivo();
          } else {
            // Si es incorrecto, no bloqueamos la pregunta completa
            // Cualquier intento "wrong" (rojo) anterior pasa a ser "previous-attempt" (amarillo)
            anteriores.forEach(idxIntentado => {
              if (botones[idxIntentado]) {
                botones[idxIntentado].classList.remove("wrong");
                botones[idxIntentado].classList.add("previous-attempt");
              }
            });
            
            // El intento actual incorrecto se marca en rojo ("wrong") y se deshabilita
            boton.classList.add("wrong");
            boton.disabled = true;
            
            // Registrar este intento
            if (!anteriores.includes(index)) {
              anteriores.push(index);
            }
            
            // La opción correcta se resalta en verde de una vez como ya está configurado
            if (botones[p.correcta]) {
              botones[p.correcta].classList.add("correct");
            }
            
            quiz.mostrarFeedback(false, p.explicacion);
            
            quiz.chequearBotonesNavegacion();
            quiz.renderizarMapaNavegacion();
            quiz.guardarEstadoExamenActivo();
          }
        } else {
          const botones = opcionesContainer.querySelectorAll(".option-btn");
          if (botones) {
            botones.forEach(b => b.classList.remove("selected"));
          }
          boton.classList.add("selected");
          state.respuestasUsuario[state.indiceActual] = index;
          
          quiz.chequearBotonesNavegacion();
          quiz.renderizarMapaNavegacion();
          quiz.guardarEstadoExamenActivo();
        }
      });

      wrapper.appendChild(boton);
      wrapper.appendChild(btnMarcar);
      if (opcionesContainer) opcionesContainer.appendChild(wrapper);
    });

    // Si ya fue respondida en Modo Estudio
    if (state.modoActual === "estudio" && state.respuestasUsuario[state.indiceActual] !== null) {
      const botones = opcionesContainer.querySelectorAll(".option-btn");
      const marcadores = opcionesContainer.querySelectorAll(".btn-marcar-respuesta");
      botones.forEach(b => b.disabled = true);
      marcadores.forEach(bm => bm.classList.add("hidden"));
      
      const yaRespondida = state.respuestasUsuario[state.indiceActual];
      if (yaRespondida !== -1) {
        if (yaRespondida === p.correcta) {
          botones[yaRespondida].classList.add("correct");
          quiz.mostrarFeedback(true, p.explicacion);
        } else {
          botones[yaRespondida].classList.add("wrong");
          botones[p.correcta].classList.add("correct");
          quiz.mostrarFeedback(false, p.explicacion);
        }
      }
      
      // Aplicar estilos de intentos previos en amarillo (previous-attempt)
      const intentos = (state.intentosPrevios && state.intentosPrevios[state.indiceActual]) || [];
      intentos.forEach(idxIntentado => {
        if (idxIntentado !== yaRespondida && idxIntentado !== p.correcta) {
          if (botones[idxIntentado]) {
            botones[idxIntentado].classList.remove("wrong");
            botones[idxIntentado].classList.add("previous-attempt");
          }
        }
      });
      
      quiz.chequearBotonesNavegacion();
    }
    
    // Asegurar el correcto estado de los botones de navegación en carga inicial de pregunta
    quiz.chequearBotonesNavegacion();
  },

  chequearBotonesNavegacion() {
    const btnSiguiente = document.getElementById("btn-siguiente");
    if (state.indiceActual < state.preguntasCargadas.length - 1) {
      if (state.modoActual !== "estudio" || state.respuestasUsuario[state.indiceActual] !== null) {
        if (btnSiguiente) btnSiguiente.classList.remove("hidden");
      }
    }
  },

  siguientePregunta() {
    clearInterval(guardiaTimerInterval);
    if (state.indiceActual >= state.preguntasCargadas.length - 1) {
      alert("Has llegado al final del examen.");
      quiz.finalizarSesion();
      return;
    }
    state.indiceActual++;
    
    if (state.modoActual === "guardia") {
      quiz.iniciarTemporizadorGuardia();
    }
    quiz.renderizarPreguntaActual();
    quiz.guardarEstadoExamenActivo();
  },

  renderizarMapaNavegacion() {
    const gridContainer = document.getElementById("grid-preguntas-container");
    if (!gridContainer) return;
    
    gridContainer.innerHTML = "";
    state.preguntasCargadas.forEach((p, idx) => {
      const btn = document.createElement("button");
      btn.className = "nav-map-btn";
      btn.type = "button";
      
      let contenidoBtn = `${idx + 1}`;
      if (state.preguntasMarcadas[idx]) {
        btn.classList.add("flagged");
      }
      btn.innerHTML = contenidoBtn;

      if (state.respuestasUsuario[idx] !== null) {
        btn.classList.add("answered");
      } else {
        btn.classList.add("pending");
      }

      if (idx === state.indiceActual) {
        btn.classList.add("current");
      }

      btn.addEventListener("click", () => {
        clearInterval(guardiaTimerInterval);
        state.indiceActual = idx;
        if (state.modoActual === "guardia") {
          quiz.iniciarTemporizadorGuardia();
        }
        quiz.renderizarPreguntaActual();
        quiz.guardarEstadoExamenActivo();
      });

      gridContainer.appendChild(btn);
    });
  },

  actualizarBotonFlagVisual() {
    const btnFlagPregunta = document.getElementById("btn-flag-pregunta");
    if (!btnFlagPregunta) return;
    if (state.preguntasMarcadas[state.indiceActual]) {
      btnFlagPregunta.classList.add("active");
      btnFlagPregunta.innerHTML = "Marcada";
    } else {
      btnFlagPregunta.classList.remove("active");
      btnFlagPregunta.innerHTML = "Marcar pregunta";
    }
  },

  mostrarFeedback(esCorrecto, explicacion) {
    const feedbackBox = document.getElementById("feedback-box");
    const feedbackEstado = document.getElementById("feedback-estado");
    const feedbackExplicacion = document.getElementById("feedback-explicacion");

    if (feedbackBox) feedbackBox.classList.remove("hidden");
    if (feedbackEstado) {
      if (esCorrecto) {
        feedbackEstado.textContent = "RESPUESTA ACERTADA";
        feedbackEstado.className = "feedback-estado correct";
      } else {
        feedbackEstado.textContent = "RESPUESTA INCORRECTA";
        feedbackEstado.className = "feedback-estado wrong";
      }
    }
    if (feedbackExplicacion) {
      const preguntaActual = state.preguntasCargadas[state.indiceActual];
      const fuente = preguntaActual ? preguntaActual.fuente : null;
      const expCorrecta = preguntaActual ? preguntaActual.explicacion_correcta : null;
      const expIncorrecta = preguntaActual ? preguntaActual.explicacion_incorrecta : null;
      feedbackExplicacion.innerHTML = `
        ${ui.formatearExplicacionClinica(explicacion, fuente, expCorrecta, expIncorrecta)}
        <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
          <button class="btn btn-reportar-pregunta" data-id="${preguntaActual ? preguntaActual.id : ''}" style="margin: 0;" type="button">Reportar Error en Pregunta</button>
        </div>
      `;
    }
  },

  ocultarFeedback() {
    const feedbackBox = document.getElementById("feedback-box");
    if (feedbackBox) feedbackBox.classList.add("hidden");
  },

  // 🏁 FINALIZAR EVALUACIÓN (CON CONEXIÓN JWT & PROCESO DE GAMIFICACIÓN)
  async finalizarSesion() {
    quiz.limpiarEstadoExamenActivo();
    clearInterval(state.intervaloTemporizador);
    clearInterval(guardiaTimerInterval);
    
    let aciertos = 0;
    state.preguntasCargadas.forEach((p, i) => {
      if (state.respuestasUsuario[i] === p.correcta) aciertos++;
    });

    const porcentaje = Math.round((aciertos / state.preguntasCargadas.length) * 100) || 0;

    // Calcular y formatear duración total de la sesión
    const minutos = Math.floor(state.duracionTotalSegundos / 60);
    const segundos = state.duracionTotalSegundos % 60;
    const duracionFormateada = `${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`;
    
    const resultadoTiempoEl = document.getElementById("resultado-tiempo");
    if (resultadoTiempoEl) {
      resultadoTiempoEl.textContent = duracionFormateada;
    }

    try {
      const detalleExamen = state.preguntasCargadas.map((p, i) => ({
        id: p.id,
        texto: p.texto,
        opciones: safeParseOpciones(p.opciones),
        correcta: p.correcta,
        seleccionada: state.respuestasUsuario[i],
        explicacion: p.explicacion,
        fuente: p.fuente,
        tema: p.tema,
        subtema: p.subtema,
        microtema: p.microtema,
        marcada: !!state.preguntasMarcadas[i],
        duracionTotalSegundos: state.duracionTotalSegundos,
        explicacion_correcta: p.explicacion_correcta,
        explicacion_incorrecta: p.explicacion_incorrecta,
        intentosPrevios: (state.intentosPrevios && state.intentosPrevios[i]) || []
      }));

      // Sincronizar repetición espaciada en segundo plano de forma no bloqueante para velocidad instantánea
      state.preguntasCargadas.forEach((p, i) => {
        const esCorrecto = (state.respuestasUsuario[i] === p.correcta);
        spacedRepetition.sincronizarEstado(p.id, null, esCorrecto, esCorrecto ? 2 : 1).catch(err => {
          console.warn("Falla silenciosa al sincronizar SR en segundo plano:", err);
        });
      });

      // Guardar el examen en el servidor
      const datosFinal = await api.guardarSesion({
        usuarioId: state.usuarioConectado.id,
        tema: state.especialidadSeleccionada,
        modo: state.modoActual,
        cantidadPreguntas: state.preguntasCargadas.length,
        correctas: aciertos,
        porcentaje: porcentaje,
        detalle: JSON.stringify(detalleExamen)
      });

      // Sincronizar datos del usuario conectados internamente
      if (datosFinal.usuarioActualizado) {
        state.usuarioConectado.xp = datosFinal.usuarioActualizado.xp;
        state.usuarioConectado.nivel = datosFinal.usuarioActualizado.nivel;
        state.usuarioConectado.streak = datosFinal.usuarioActualizado.streak;
        localStorage.setItem("resiMed_session", JSON.stringify(state.usuarioConectado));
        
        // Notificación académica formal
        alert(`¡Evaluación finalizada con éxito! Tus respuestas han sido guardadas y sincronizadas con tu historial de estudio.`);
      }
    } catch (err) {
      console.error("Error al guardar la sesión de estudio: " + err.message);
    }

    // Renderizar Informe de Desempeño
    document.getElementById("resultado-puntaje").textContent = `${aciertos} / ${state.preguntasCargadas.length}`;
    document.getElementById("resultado-porcentaje").textContent = `${porcentaje}%`;
    
    // FASE 3: Detalle dinámico y completo en el informe de rendimiento
    const resultadoTemaEl = document.getElementById("resultado-tema");
    if (resultadoTemaEl) {
      if (state.modoActual === "guardia") {
        resultadoTemaEl.textContent = "Urgencias Médicas";
      } else if (state.especialidadSeleccionada === "Todos") {
        resultadoTemaEl.textContent = "Examen General";
      } else {
        resultadoTemaEl.textContent = (state.subtemaSeleccionado && state.subtemaSeleccionado !== "Todos")
          ? `${state.especialidadSeleccionada} - ${state.subtemaSeleccionado}`
          : state.especialidadSeleccionada;
      }
    }

    const revisionContainer = document.getElementById("revision-container");
    if (revisionContainer) {
      revisionContainer.innerHTML = "";

      state.preguntasCargadas.forEach((p, idx) => {
        const opcionesArray = safeParseOpciones(p.opciones);
        const seleccion = state.respuestasUsuario[idx];
        
        let opcionesHtml = "";
        opcionesArray.forEach((o, oIdx) => {
          let claseOpt = "";
          if (oIdx === p.correcta) claseOpt = "correct";
          if (oIdx === seleccion && seleccion !== p.correcta) claseOpt = "wrong";
          
          let oLimpia = o;
          const regexPrefijo = /^[a-d](?:\)|\.-|\.\s|\s-\s)\s*/i;
          oLimpia = oLimpia.replace(regexPrefijo, "");
          
          opcionesHtml += `<div class="review-opt ${claseOpt}"><strong>${String.fromCharCode(65 + oIdx)}.</strong> ${oLimpia}</div>`;
        });

        // Habilitar botón para Tutor IA, Inyección de Flashcards Automáticas y Reporte de Error
        let botonesAccionHtml = `<div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;">`;
        const textoEscapado = p.texto.replace(/"/g, "&quot;");
        const explicacionEscapada = (p.explicacion || "Sin desglose.").replace(/"/g, "&quot;");
        const temaEscapado = (p.tema || "General").replace(/"/g, "&quot;");

        if (seleccion !== p.correcta) {
          const seleccionText = (seleccion !== null && opcionesArray[seleccion]) 
            ? opcionesArray[seleccion].replace(/"/g, "&quot;") 
            : "Sin responder";
          botonesAccionHtml += `
            <button class="btn-ia btn-consultar-tutor" data-texto="${textoEscapado}" data-seleccion="${seleccionText}" type="button">Consultar Tutor IA</button>
            <button class="btn btn-primary btn-auto-flashcard" data-tema="${temaEscapado}" data-pregunta="${textoEscapado}" data-respuesta="${explicacionEscapada}" style="background: var(--warning); color:#000; font-size:12px; padding:6px 12px; border:none;" type="button">Crear Flashcard</button>
          `;
        }
        
        botonesAccionHtml += `
          <button class="btn btn-reportar-pregunta" data-id="${p.id}" type="button">Reportar Error</button>
        </div>`;

        const div = document.createElement("div");
        div.className = "review-item";
        
        const esMarcada = !!state.preguntasMarcadas[idx];
        let badgeMarcadaHtml = "";
        if (esMarcada) {
          div.classList.add("review-flagged");
          badgeMarcadaHtml = `<span class="flagged-review-chip">PREGUNTA MARCADA</span>`;
        }
        if (seleccion !== p.correcta) {
          div.classList.add("review-wrong");
        }

        div.innerHTML = `
          <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 8px;">
            ${badgeMarcadaHtml}
            <div style="font-size: 11px; color: var(--text-dim);">
              Taxonomía: <strong>${p.tema || "General"}</strong> • Subtema: <strong>${p.subtema || "Varios"}</strong>
            </div>
          </div>
          <div class="review-q-text">${idx + 1}. ${p.texto}</div>
          <div class="review-options">${opcionesHtml}</div>
          <div class="review-exp-container">${ui.formatearExplicacionClinica(p.explicacion, p.fuente, p.explicacion_correcta, p.explicacion_incorrecta)}</div>
          ${botonesAccionHtml}
        `;
        revisionContainer.appendChild(div);
      });
    }

    // Ocultar Mapa del Examen
    const mapEl = document.getElementById("simulacro-navigation-map");
    if (mapEl) mapEl.classList.add("hidden");

    ui.filtrarRevision("todas");
    ui.mostrarPantalla("resultados");
  },

  congelarControles() {
    const opciones = document.querySelectorAll(".option-btn");
    opciones.forEach(btn => btn.disabled = true);

    const marcadores = document.querySelectorAll(".btn-marcar-respuesta");
    marcadores.forEach(bm => bm.classList.add("hidden"));

    const btnFlag = document.getElementById("btn-flag-pregunta");
    if (btnFlag) btnFlag.disabled = true;

    const navBtns = document.querySelectorAll(".nav-map-btn");
    navBtns.forEach(btn => {
      btn.disabled = true;
      btn.style.pointerEvents = "none";
      btn.style.opacity = "0.5";
    });

    const btnSiguiente = document.getElementById("btn-siguiente");
    const btnFinalizar = document.getElementById("btn-finalizar");
    if (btnSiguiente) btnSiguiente.classList.add("hidden");
    if (btnFinalizar) {
      btnFinalizar.textContent = "Procesando...";
      btnFinalizar.disabled = true;
    }
  }
};

window.quiz = quiz;
