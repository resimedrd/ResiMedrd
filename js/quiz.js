// ====== CONTROLADOR DEL SIMULADOR / QUIZ (quiz.js) ======

// Variables internas de tiempo para Modo Guardia y simulacros
let tiempoPorPreguntaRestante = 30;
let guardiaTimerInterval = null;

const quiz = {
  inicializar() {
    const btnModoEstudio = document.getElementById("btn-modo-estudio");
    const btnModoSimulacro = document.getElementById("btn-modo-simulacro");
    const btnSiguiente = document.getElementById("btn-siguiente");
    const btnFinalizar = document.getElementById("btn-finalizar");
    const btnFlagPregunta = document.getElementById("btn-flag-pregunta");
    const preguntaTexto = document.getElementById("pregunta-texto");

    if (btnModoEstudio) {
      btnModoEstudio.addEventListener("click", () => quiz.iniciarSesion("estudio"));
    }
    if (btnModoSimulacro) {
      btnModoSimulacro.addEventListener("click", () => quiz.iniciarSesion("simulacro"));
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
      } else {
        const tipo = state.tipoSimulacroSeleccionado || "especialidad";
        const valor = tipo === "especialidad" ? document.getElementById("especialidad").value : document.getElementById("selector-ano").value;
        
        preguntas = await api.prepararExamen(tipo, valor, state.cantidadSolicitada);
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
        chipTema.textContent = state.especialidadSeleccionada === "Todos" ? "Examen General" : state.especialidadSeleccionada;
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
      } else if (modo === "simulacro") {
        state.tiempoRestanteSegundos = state.preguntasCargadas.length * 90;
        if (temporizadorEl) {
          temporizadorEl.classList.remove("hidden");
          quiz.actualizarRelojVisual();
        }
        state.intervaloTemporizador = setInterval(() => {
          state.tiempoRestanteSegundos--;
          state.duracionTotalSegundos++;
          quiz.actualizarRelojVisual();
          if (state.tiempoRestanteSegundos <= 0) {
            clearInterval(state.intervaloTemporizador);
            alert("Tiempo límite de simulacro alcanzado.");
            quiz.finalizarSesion();
          }
        }, 1000);
      } else {
        // Modo estudio
        state.duracionTotalSegundos = 0;
        state.intervaloTemporizador = setInterval(() => {
          state.duracionTotalSegundos++;
        }, 1000);
      }

      quiz.renderizarPreguntaActual();
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

  // Temporizador Rápido para MODO GUARDIA (30 segundos por reactivo)
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

    if (preguntaTexto) preguntaTexto.innerHTML = p.texto;
    if (opcionesContainer) opcionesContainer.innerHTML = "";

    const opcionesArray = JSON.parse(p.opciones);
    opcionesArray.forEach((opcion, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "option-wrapper";

      const boton = document.createElement("button");
      boton.className = "option-btn";
      boton.type = "button";
      boton.style.flex = "1";
      boton.innerHTML = `<strong>${String.fromCharCode(65 + index)}.</strong> ${opcion}`;
      
      if (state.respuestasUsuario[state.indiceActual] === index) boton.classList.add("selected");

      const btnMarcar = document.createElement("button");
      btnMarcar.className = "btn-marcar-respuesta";
      btnMarcar.type = "button";
      btnMarcar.innerHTML = "H";
      btnMarcar.title = "Marcar esta opción";

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
          botones.forEach(b => b.disabled = true);
          marcadores.forEach(bm => bm.classList.add("hidden"));
          state.respuestasUsuario[state.indiceActual] = index;
          
          const esCorrecto = (index === p.correcta);
          
          if (esCorrecto) {
            boton.classList.add("correct");
            quiz.mostrarFeedback(true, p.explicacion);
          } else {
            boton.classList.add("wrong");
            botones[p.correcta].classList.add("correct");
            quiz.mostrarFeedback(false, p.explicacion);
          }
          
          // Sincronizar repetición espaciada en caliente (SM-2)
          await spacedRepetition.sincronizarEstado(p.id, null, esCorrecto, esCorrecto ? 2 : 1);
          
          quiz.chequearBotonesNavegacion();
          quiz.renderizarMapaNavegacion();
        } else {
          const botones = opcionesContainer.querySelectorAll(".option-btn");
          botones.forEach(b => b.classList.remove("selected"));
          boton.classList.add("selected");
          state.respuestasUsuario[state.indiceActual] = index;
          
          quiz.chequearBotonesNavegacion();
          quiz.renderizarMapaNavegacion();
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
    state.indiceActual++;
    
    if (state.modoActual === "guardia") {
      quiz.iniciarTemporizadorGuardia();
    }
    quiz.renderizarPreguntaActual();
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

      if (idx === state.indiceActual) {
        btn.classList.add("current");
      } else if (state.respuestasUsuario[idx] !== null) {
        btn.classList.add("answered");
      } else {
        btn.classList.add("pending");
      }

      btn.addEventListener("click", () => {
        clearInterval(guardiaTimerInterval);
        state.indiceActual = idx;
        if (state.modoActual === "guardia") {
          quiz.iniciarTemporizadorGuardia();
        }
        quiz.renderizarPreguntaActual();
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
      feedbackExplicacion.innerHTML = `
        ${ui.formatearExplicacionClinica(explicacion, fuente)}
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
    clearInterval(state.intervaloTemporizador);
    clearInterval(guardiaTimerInterval);
    
    let aciertos = 0;
    state.preguntasCargadas.forEach((p, i) => {
      if (state.respuestasUsuario[i] === p.correcta) aciertos++;
    });

    const porcentaje = Math.round((aciertos / state.preguntasCargadas.length) * 100) || 0;

    try {
      const detalleExamen = state.preguntasCargadas.map((p, i) => ({
        id: p.id,
        texto: p.texto,
        opciones: JSON.parse(p.opciones),
        correcta: p.correcta,
        seleccionada: state.respuestasUsuario[i],
        explicacion: p.explicacion,
        fuente: p.fuente,
        tema: p.tema,
        subtema: p.subtema,
        microtema: p.microtema,
        marcada: !!state.preguntasMarcadas[i]
      }));

      // Sincronizar repetición espaciada de cada pregunta fallada o acertada en el examen
      for (let i = 0; i < state.preguntasCargadas.length; i++) {
        const p = state.preguntasCargadas[i];
        const esCorrecto = (state.respuestasUsuario[i] === p.correcta);
        await spacedRepetition.sincronizarEstado(p.id, null, esCorrecto, esCorrecto ? 2 : 1);
      }

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

      // Actualizar datos del usuario conectados con XP del servidor
      if (datosFinal.usuarioActualizado) {
        state.usuarioConectado.xp = datosFinal.usuarioActualizado.xp;
        state.usuarioConectado.nivel = datosFinal.usuarioActualizado.nivel;
        state.usuarioConectado.streak = datosFinal.usuarioActualizado.streak;
        localStorage.setItem("resiMed_session", JSON.stringify(state.usuarioConectado));
        
        // Notificación de gamificación
        alert(`¡Examen finalizado! Ganaste +${datosFinal.xpGanado} XP. Nivel actual: ${state.usuarioConectado.nivel}`);
      }
    } catch (err) {
      console.error("Error al guardar la sesión de estudio: " + err.message);
    }

    // Renderizar Informe de Desempeño
    document.getElementById("resultado-puntaje").textContent = `${aciertos} / ${state.preguntasCargadas.length}`;
    document.getElementById("resultado-porcentaje").textContent = `${porcentaje}%`;
    document.getElementById("resultado-tema").textContent = state.especialidadSeleccionada === "Todos" ? "Examen General" : state.especialidadSeleccionada;

    const revisionContainer = document.getElementById("revision-container");
    if (revisionContainer) {
      revisionContainer.innerHTML = "";

      state.preguntasCargadas.forEach((p, idx) => {
        const opcionesArray = JSON.parse(p.opciones);
        const seleccion = state.respuestasUsuario[idx];
        
        let opcionesHtml = "";
        opcionesArray.forEach((o, oIdx) => {
          let claseOpt = "";
          if (oIdx === p.correcta) claseOpt = "correct";
          if (oIdx === seleccion && seleccion !== p.correcta) claseOpt = "wrong";
          opcionesHtml += `<div class="review-opt ${claseOpt}"><strong>${String.fromCharCode(65 + oIdx)}.</strong> ${o}</div>`;
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
          <div class="review-exp-container">${ui.formatearExplicacionClinica(p.explicacion, p.fuente)}</div>
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
  }
};

window.quiz = quiz;
