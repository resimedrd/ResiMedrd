// ====== CONTROLADOR DE INTERFAZ Y RENDERIZACIÓN (ui.js) ======

const ui = {
  normalizarTema(tema) {
    if (!tema) return "";
    const t = tema.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Quitar acentos
    
    if (t.includes("pediatria") || t.includes("pediatra")) return "pediatria";
    if (t.includes("ginecologia") || t.includes("obstetricia") || t.includes("gineco")) return "ginecologia";
    if (t.includes("cirugia") || t.includes("quirur")) return "cirugia";
    if (t.includes("interna")) return "interna";
    if (t.includes("basica") || t.includes("fisiologia") || t.includes("anatomia") || t.includes("farmacologia") || t.includes("embriologia") || t.includes("histologia") || t.includes("microbiologia") || t.includes("parasitologia") || t.includes("bioquimica") || t.includes("genetica")) return "basicas";
    if (t.includes("cardio")) return "cardiologia";
    if (t.includes("neumo") || t.includes("respirato") || t.includes("pulmonar")) return "neumologia";
    if (t.includes("gastro") || t.includes("digestiv")) return "gastro";
    if (t.includes("neuro")) return "neurologia";
    if (t.includes("nefro") || t.includes("urolo")) return "nefro";
    if (t.includes("infecto") || t.includes("virologia") || t.includes("bacteriologia")) return "infectologia";
    if (t.includes("trauma") || t.includes("orto")) return "trauma";
    if (t.includes("psiquia") || t.includes("salud mental") || t.includes("psiquic")) return "psiquiatria";
    if (t.includes("salud publica") || t.includes("epidemio") || t.includes("preventiva") || t.includes("bioestadistica") || t === "salud") return "salud";
    
    if (t.includes("pediat")) return "pediatria";
    if (t.includes("obstet") || t.includes("ginec")) return "ginecologia";
    if (t.includes("cirug")) return "cirugia";
    
    return t; // Fallback
  },

  // CONTROL DE PANTALLAS CON TRANSICIONES SUAVES
  mostrarPantalla(idPantalla, pushState = true) {
    // Si no empieza con "pantalla-", agregar el prefijo de forma inteligente
    let idReal = idPantalla;
    if (idReal && !idReal.startsWith("pantalla-")) {
      idReal = "pantalla-" + idReal;
    }

    const nombrePantalla = idReal.replace("pantalla-", "");

    // Si hay un examen activo, el usuario está conectado y se intenta salir de él, bloquear la navegación
    const tieneExamenActivo = !!localStorage.getItem("resiMed_examen_activo");
    const estaConectado = !!sessionStorage.getItem("resiMed_session");
    if (tieneExamenActivo && estaConectado && nombrePantalla !== "quiz" && nombrePantalla !== "resultados") {
      window.history.pushState({ pantalla: "quiz" }, "", "#quiz");
      alert("⚠️ Tienes una evaluación en curso. Debes finalizarla primero; no puedes salir de esta pantalla.");
      return;
    }

    // Protección para evitar entrar a la pantalla de evaluación (quiz) sin un examen activo
    if (nombrePantalla === "quiz" && !localStorage.getItem("resiMed_examen_activo")) {
      ui.mostrarPantalla("home", false);
      return;
    }

    if (pushState) {
      window.history.pushState({ pantalla: nombrePantalla }, "", "#" + nombrePantalla);
    }

    // Ocultar todas las pantallas del sistema de forma dinámica y robusta
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));

    const activa = document.getElementById(idReal);
    if (activa) {
      activa.classList.add("active");
      window.scrollTo({ top: 0, behavior: 'instant' });
      
      // Aplicar una micro-animación de entrada (fade-in)
      activa.style.opacity = "0";
      activa.style.transform = "translateY(8px)";
      activa.style.transition = "opacity 0.25s ease, transform 0.25s ease";
      
      requestAnimationFrame(() => {
        activa.style.opacity = "1";
        activa.style.transform = "translateY(0)";
      });
    }

    // Sincronizar item activo del menú lateral
    const sidebarItems = document.querySelectorAll(".sidebar-item");
    if (sidebarItems.length > 0) {
      sidebarItems.forEach(i => i.classList.remove("active"));
      
      let targetSelector = '.sidebar-item[data-target="simulacros"]'; // Por defecto
      if (nombrePantalla === "home" || nombrePantalla === "quiz" || nombrePantalla === "resultados") {
        targetSelector = '.sidebar-item[data-target="simulacros"]';
      } else if (nombrePantalla === "flashcards") {
        targetSelector = '.sidebar-item[data-target="preguntas"]';
      } else if (nombrePantalla === "perfil") {
        targetSelector = '.sidebar-item[data-target="estadisticas"]';
      } else if (nombrePantalla === "historial") {
        targetSelector = '.sidebar-item[data-target="historial"]';
      } else if (nombrePantalla === "errores") {
        targetSelector = '.sidebar-item[data-target="errores"]';
      } else if (nombrePantalla === "ajustes") {
        targetSelector = '.sidebar-item[data-target="ajustes"]';
      } else if (nombrePantalla.startsWith("battle")) {
        targetSelector = '.sidebar-item[data-target="ranking"]';
      }
      
      const targetItem = document.querySelector(targetSelector);
      if (targetItem) targetItem.classList.add("active");
    }

    // Sincronizar item activo de la barra de navegación inferior móvil
    const bottomNavItems = document.querySelectorAll(".bottom-nav-item");
    if (bottomNavItems.length > 0) {
      bottomNavItems.forEach(i => i.classList.remove("active"));
      
      let targetSelectorBottom = '.bottom-nav-item[data-target="simulacros"]'; // Por defecto
      if (nombrePantalla === "home" || nombrePantalla === "quiz" || nombrePantalla === "resultados") {
        targetSelectorBottom = '.bottom-nav-item[data-target="simulacros"]';
      } else if (nombrePantalla === "flashcards") {
        targetSelectorBottom = '.bottom-nav-item[data-target="preguntas"]';
      } else if (nombrePantalla === "perfil") {
        targetSelectorBottom = '.bottom-nav-item[data-target="estadisticas"]';
      } else if (nombrePantalla === "historial") {
        targetSelectorBottom = '.bottom-nav-item[data-target="historial"]';
      } else if (nombrePantalla === "errores") {
        targetSelectorBottom = '.bottom-nav-item[data-target="errores"]';
      } else if (nombrePantalla.startsWith("battle")) {
        targetSelectorBottom = '.bottom-nav-item[data-target="ranking"]';
      }
      
      const targetItemBottom = document.querySelector(targetSelectorBottom);
      if (targetItemBottom) targetItemBottom.classList.add("active");
    }

    // Refrescar analíticas y gamificación al cambiar al Home o Perfil
    if (nombrePantalla === "home") {
      ui.cargarDashboardHome();
      ui.cargarHistorialReciente();
    } else if (nombrePantalla === "perfil" || nombrePantalla === "historial") {
      ui.actualizarProgresoEstudiante();
    } else if (nombrePantalla === "errores") {
      ui.actualizarProgresoEstudiante();
    } else if (nombrePantalla === "ajustes") {
      ui.cargarAjustesUsuario();
    } else if (nombrePantalla === "flashcards") {
      // FASE 1: Cargar mazo por defecto "Todos" inmediatamente al acceder a la pantalla
      if (typeof flashcards !== "undefined" && typeof flashcards.inicializarMazo === "function") {
        flashcards.inicializarMazo();
      }
    }
  },

  // WIDGET DE GAMIFICACIÓN PREMIUM EN CABECERA (Eliminado para estética profesional sobria)
  actualizarWidgetGamificacion() {
    const gamificationEl = document.getElementById("widget-gamificacion-cabecera");
    if (gamificationEl) {
      gamificationEl.remove();
    }
  },

  // RENDERIZAR LISTA DE ESPECIALIDADES EN MI PERFIL
  // RENDERIZAR LISTA DE ESPECIALIDADES EN MI PERFIL (Modularizado en js/ui_dashboard.js)
  async inicializarGridEspecialidades() {
    // Se sobreescribe dinámicamente al cargar js/ui_dashboard.js
  },

  // Abrir Análisis de Especialidad (Modularizado en js/ui_dashboard.js)
  async abrirAnalisisEspecialidad(esp) {
    // Se sobreescribe dinámicamente al cargar js/ui_dashboard.js
  },


  async inicializarFiltrosFlashcards() {
    const select = document.getElementById("flashcard-filtro-tema");
    if (!select) return;

    let personalizadas = [];
    if (state.usuarioConectado) {
      try {
        personalizadas = await api.obtenerFlashcardsPersonalizadas(state.usuarioConectado.id);
      } catch (e) {
        console.warn("Falla al obtener flashcards personalizadas:", e);
      }
    }

    const totalEstaticas = (typeof baseDatosFlashcardsEstaticas !== "undefined") ? baseDatosFlashcardsEstaticas : [];
    const mazoCompleto = [...totalEstaticas, ...personalizadas];

    // Contar por materia de forma insensible a espacios/mayúsculas
    const conteo = {};
    mazoCompleto.forEach(c => {
      if (c && c.tema) {
        const key = c.tema.trim().toLowerCase();
        conteo[key] = (conteo[key] || 0) + 1;
      }
    });

    const totalMazo = mazoCompleto.length;
    select.innerHTML = `<option value="Todos" selected>Todas las materias (${totalMazo})</option>`;

    state.LISTA_ESPECIALIDADES.forEach(esp => {
      const key = esp.nombre.trim().toLowerCase();
      const cantidad = conteo[key] || 0;
      const opt = document.createElement("option");
      opt.value = esp.nombre;
      opt.textContent = `${esp.nombre} (${cantidad})`;
      select.appendChild(opt);
    });
  },

  async cargarFiltrosEspecialidad() {
    try {
      const temasDisponibles = await api.obtenerTemas();
      const select = document.getElementById("especialidad");
      if (!select) return;
      
      select.innerHTML = '<option value="Todos" selected>Todas las especialidades (Examen General)</option>';
      
      const mapaTemas = {};
      temasDisponibles.forEach(t => {
        if (t && t.tema) {
          mapaTemas[t.tema.trim().toLowerCase()] = t.total;
        }
      });

      state.LISTA_ESPECIALIDADES.forEach(esp => {
        const key = esp.nombre.trim().toLowerCase();
        const totalPreguntas = mapaTemas[key] || 0;
        
        const opt = document.createElement("option");
        opt.value = esp.nombre;
        opt.textContent = `${esp.nombre} (${totalPreguntas})`;
        select.appendChild(opt);
      });

      // FASE 3: Carga dinámica y autónoma de subtemas al cambiar de especialidad
      if (!select.dataset.hasChangeListener) {
        select.dataset.hasChangeListener = "true";
        select.addEventListener("change", async () => {
          const especialidad = select.value;
          const blockSubtema = document.getElementById("block-subtema");
          const selectorSubtema = document.getElementById("selector-subtema");
          
          if (!blockSubtema || !selectorSubtema) return;
          
          if (especialidad === "Todos") {
            blockSubtema.classList.add("hidden");
            selectorSubtema.innerHTML = "";
            return;
          }
          
          try {
            const subtemas = await api.obtenerSubtemas(especialidad);
            if (subtemas && subtemas.length > 0) {
              selectorSubtema.innerHTML = '<option value="Todos" selected>Todos los temas de esta especialidad</option>';
              subtemas.forEach(s => {
                const opt = document.createElement("option");
                opt.value = s;
                opt.textContent = s;
                selectorSubtema.appendChild(opt);
              });
              blockSubtema.classList.remove("hidden");
            } else {
              blockSubtema.classList.add("hidden");
              selectorSubtema.innerHTML = "";
            }
          } catch (err) {
            console.error("Error al cargar subtemas autónomamente:", err);
            blockSubtema.classList.add("hidden");
            selectorSubtema.innerHTML = "";
          }
        });
      }
    } catch (err) {
      console.error("Error cargando especialidades:", err);
    }
  },

  async cargarFiltrosAnos() {
    try {
      const examenes = await api.obtenerExamenes();
      const select = document.getElementById("selector-ano");
      if (!select) return;
      
      select.innerHTML = "";
      
      const examenesActivos = examenes.filter(e => e.activo === 1);
      
      if (examenesActivos.length === 0) {
        select.innerHTML = '<option value="Todos" selected>No hay exámenes oficiales registrados</option>';
        return;
      }
      
      select.innerHTML = '<option value="Todos" selected>Todos los exámenes disponibles</option>';
      examenesActivos.forEach(ex => {
        const opt = document.createElement("option");
        opt.value = ex.id;
        opt.textContent = `${ex.nombre} (${ex.cantidad_preguntas} q.)`;
        select.appendChild(opt);
      });
    } catch (err) {
      console.error("Error cargando exámenes oficiales:", err);
    }
  },

  // CARGAR DASHBOARD HOME CON GAMIFICACIÓN EN TIEMPO REAL (Modularizado en js/ui_dashboard.js)
  async cargarDashboardHome() {
    // Se sobreescribe dinámicamente al cargar js/ui_dashboard.js
  },


  async cargarHistorialReciente() {
    if (!state.usuarioConectado) return;
    try {
      const sesiones = await api.obtenerSesionesRecientes(state.usuarioConectado.id);
      const historialLista = document.getElementById("historial-lista");
      if (!historialLista) return;
      
      if (sesiones.length === 0) {
        historialLista.innerHTML = '<div class="history-empty">Aún no registras exámenes en tu cuenta.</div>';
        return;
      }
      
      historialLista.innerHTML = "";
      sesiones.forEach(s => {
        let clase = "mid";
        if (s.porcentaje >= 75) clase = "good";
        if (s.porcentaje < 65) clase = "bad";
        
        const item = document.createElement("div");
        item.className = "history-item";
        item.style.cursor = "pointer";
        item.style.transition = "background-color 0.2s";
        item.innerHTML = `
          <div class="history-info">
            <h4>${s.tema === "Todos" ? "Examen General" : s.tema}</h4>
            <p>${s.modo === "estudio" ? "Estudio" : s.modo === "guardia" ? "Intensivo" : "Simulacro"} • ${s.cantidad_preguntas} q. • Revisar</p>
          </div>
          <div class="history-badge ${clase}">${s.porcentaje}%</div>
        `;
        
        item.addEventListener("click", () => {
          state.pantallaDeRetorno = "home";
          ui.mostrarRevisionPasada(s);
        });
        historialLista.appendChild(item);
      });
    } catch (err) {
      console.error("Error cargando el historial:", err);
    }
  },

  mostrarRevisionPasada(sesion) {
    if (!sesion) return;

    if (!sesion.detalle) {
      alert("Esta evaluación no almacena desglose de preguntas para revisión.");
      return;
    }

    try {
      const preguntas = JSON.parse(sesion.detalle);
      if (!Array.isArray(preguntas) || preguntas.length === 0) {
        alert("No se pudieron cargar los detalles de las preguntas de esta sesión.");
        return;
      }

      document.getElementById("resultado-puntaje").textContent = `${sesion.correctas} / ${sesion.cantidad_preguntas}`;
      document.getElementById("resultado-porcentaje").textContent = `${sesion.porcentaje}%`;
      document.getElementById("resultado-tema").textContent = sesion.tema === "Todos" ? "Examen General" : sesion.tema;

      // Recuperar y formatear la duración de la sesión
      const segundosTotales = preguntas[0]?.duracionTotalSegundos || 0;
      let duracionFormateada = "N/D";
      if (segundosTotales > 0) {
        const minutos = Math.floor(segundosTotales / 60);
        const segundos = segundosTotales % 60;
        duracionFormateada = `${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`;
      }
      
      const resultadoTiempoEl = document.getElementById("resultado-tiempo");
      if (resultadoTiempoEl) {
        resultadoTiempoEl.textContent = duracionFormateada;
      }

      const revisionContainer = document.getElementById("revision-container");
      if (revisionContainer) {
        revisionContainer.innerHTML = "";

        preguntas.forEach((p, idx) => {
          const opcionesArray = state.safeParseOpciones(p.opciones);
          const seleccion = p.seleccionada;
          
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
          
          let badgeMarcadaHtml = "";
          if (p.marcada) {
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
                Materia: <strong>${p.tema || "General"}</strong> • Subtema: <strong>${p.subtema || "Varios"}</strong>
              </div>
            </div>
            <div class="review-q-text">${idx + 1}. ${p.texto}</div>
            <div class="review-options">${opcionesHtml}</div>
            <div class="review-exp-container">${ui.formatearExplicacionClinica(p.explicacion, p.fuente, p.explicacion_correcta, p.explicacion_incorrecta)}</div>
            ${botonesAccionHtml}
          `;
          revisionContainer.appendChild(div);
        });
        ui.filtrarRevision("todas");
      }

      ui.mostrarPantalla("resultados");
    } catch (error) {
      console.error("Error al procesar el detalle de revisión:", error);
      alert("Ocurrió un error al procesar los datos de revisión.");
    }
  },

  // REFRESCAR PROGRESO & BANCO DE ERRORES DEL PERFIL
  async actualizarProgresoEstudiante() {
    if (!state.usuarioConectado) return;

    try {
      // Asegurar que la grilla de especialidades esté inicializada (Fail-safe)
      const listContainer = document.getElementById("perfil-especialidades-lista");
      if (listContainer && listContainer.children.length === 0) {
        await ui.inicializarGridEspecialidades();
      }

      const user = state.usuarioConectado;
      
      // Sincronizar datos personales en cabecera del Perfil
      const nombreEl = document.getElementById("perfil-nombre");
      const correoEl = document.getElementById("perfil-correo");
      const rolBadge = document.getElementById("perfil-rol-badge");
      const aspiracionEl = document.getElementById("perfil-aspiracion");
      const metaEl = document.getElementById("perfil-meta-val");

      if (nombreEl) nombreEl.textContent = user.nombre;
      if (correoEl) correoEl.textContent = user.email;
      
      if (rolBadge) {
        rolBadge.textContent = user.rol === "admin" ? "⚡ Administrador" : "👨‍⚕️ Médico Residente";
        rolBadge.className = user.rol === "admin" ? "chip chip-primary" : "chip chip-soft";
        if (user.rol === "admin") rolBadge.style.background = "var(--warning)";
      }

      if (aspiracionEl) {
        aspiracionEl.textContent = user.especialidad_aspirada || "Ninguna";
      }

      if (metaEl) {
        metaEl.textContent = `${user.meta_semanal || 50} q.`;
      }

      const [datosResumen, personalizadas, srEstados, diarioFlashcards] = await Promise.all([
        api.obtenerResumenDashboard(user.id).catch(() => ({})),
        api.obtenerFlashcardsPersonalizadas(user.id).catch(() => []),
        api.obtenerRepeticionEspaciada(user.id).catch(() => []),
        api.obtenerHistorialDiarioFlashcards(user.id).catch(() => [])
      ]);
      
      const pExamenes = document.getElementById("progreso-total-examenes");
      const pPreguntas = document.getElementById("progreso-total-preguntas");
      const pPromedio = document.getElementById("progreso-promedio-global");
      const pFlashcardsActivas = document.getElementById("progreso-flashcards-activas");
      const pConceptosDebiles = document.getElementById("progreso-conceptos-debiles");

      if (pExamenes) pExamenes.textContent = (datosResumen && datosResumen.totalSesiones) || 0;
      if (pPreguntas) pPreguntas.textContent = (datosResumen && datosResumen.totalPreguntasRespondidas) || 0;
      
      const totalContestadas = (datosResumen && datosResumen.totalPreguntasRespondidas) || 0;
      // Las métricas avanzadas y gráficos permanecen desbloqueados permanentemente
      const overlayBloqueo = document.getElementById("seccion-graficos-metricas-bloqueo");
      if (overlayBloqueo) {
        overlayBloqueo.classList.add("hidden");
      }
      
      if (pPromedio) {
        const prom = (datosResumen && datosResumen.promedioGeneral) || 0;
        pPromedio.textContent = `${prom}%`;
        let colorPromedio = "var(--danger)";
        if (prom >= 75) {
          colorPromedio = "var(--success)";
        } else if (prom >= 50) {
          colorPromedio = "var(--warning)";
        }
        pPromedio.style.color = colorPromedio;
      }

      // FASE 4: Computar y renderizar métricas inteligentes de Flashcards y Conceptos Débiles
      const totalEstaticas = (typeof baseDatosFlashcardsEstaticas !== "undefined") ? baseDatosFlashcardsEstaticas.length : 0;
      const totalActivas = totalEstaticas + personalizadas.length;
      const conceptosDebiles = srEstados.filter(e => e.interval === 0 && e.flashcard_id).length;

      if (pFlashcardsActivas) pFlashcardsActivas.textContent = totalActivas;
      if (pConceptosDebiles) pConceptosDebiles.textContent = conceptosDebiles;

      // FASE 2: Computar y renderizar métricas diarias (Hoy)
      const hoy = new Date().toLocaleDateString('en-CA');
      const repasosHoy = srEstados.filter(e => e.last_reviewed_date === hoy && e.flashcard_id);
      
      const totalEvaluadasHoy = repasosHoy.length;
      const dominadasHoy = repasosHoy.filter(e => e.interval > 0).length;
      const falladasHoy = repasosHoy.filter(e => e.interval === 0).length;

      const pctEficiencia = totalEvaluadasHoy > 0 ? Math.round((dominadasHoy / totalEvaluadasHoy) * 100) : 0;
      const pctRepasar = totalEvaluadasHoy > 0 ? Math.round((falladasHoy / totalEvaluadasHoy) * 100) : 0;

      const dEvaluadas = document.getElementById("diario-tarjetas-evaluadas");
      const dEficiencia = document.getElementById("diario-porcentaje-eficiencia");
      const dRepasar = document.getElementById("diario-porcentaje-repasar");

      if (dEvaluadas) dEvaluadas.textContent = totalEvaluadasHoy;
      if (dEficiencia) dEficiencia.textContent = `${pctEficiencia}%`;
      if (dRepasar) dRepasar.textContent = `${pctRepasar}%`;

      const historial = await api.obtenerHistorialCompleto(user.id).catch(() => []) || [];
      console.log("DEBUG: actualizarProgresoEstudiante for user", user.id, "historial loaded with", historial.length, "items.");

      // Renderizar tabla de evaluaciones
      ui.renderizarTablaHistorial(historial);
      
      // Renderizar tabla de historial diario de flashcards
      ui.renderizarTablaDiarioFlashcards(diarioFlashcards);

      const toggleCajon = (seccion, estaActivo) => {
        if (!seccion) return;
        seccion.classList.toggle("activo", estaActivo);
        if (estaActivo) {
          seccion.style.maxHeight = seccion.scrollHeight + "px";
          seccion.style.opacity = "1";
          seccion.style.marginTop = "10px";
        } else {
          seccion.style.maxHeight = "0px";
          seccion.style.opacity = "0";
          seccion.style.marginTop = "0px";
        }
      };

      // Renderizar los gráficos analíticos avanzados (siempre visibles)
      const seccionGraficos = document.getElementById("seccion-graficos-desplegable");
      if (seccionGraficos) {
        ui.renderizarGraficosAvanzados(historial, srEstados, personalizadas.length);
      }

      // Vincular toggle del Cajón Desplegable del Historial de Evaluaciones
      const btnToggleEval = document.getElementById("btn-toggle-evaluaciones");
      if (btnToggleEval && !btnToggleEval.dataset.hasListener) {
        btnToggleEval.dataset.hasListener = "true";
        btnToggleEval.addEventListener("click", () => {
          const seccionEval = document.getElementById("seccion-evaluaciones-desplegable");
          if (seccionEval) {
            const estaActivoEval = !seccionEval.classList.contains("activo");
            toggleCajon(seccionEval, estaActivoEval);
            btnToggleEval.classList.toggle("activo", estaActivoEval);
            const iconoEval = document.getElementById("icono-toggle-evaluaciones");
            if (iconoEval) {
              iconoEval.textContent = estaActivoEval ? "▲" : "▼";
            }
          }
        });
      }



      // Vincular toggle del Cajón Desplegable de Historial Diario de Flashcards
      const btnToggleDiario = document.getElementById("btn-toggle-diario");
      if (btnToggleDiario && !btnToggleDiario.dataset.hasListener) {
        btnToggleDiario.dataset.hasListener = "true";
        btnToggleDiario.addEventListener("click", () => {
          const seccionDiario = document.getElementById("seccion-diario-desplegable");
          if (seccionDiario) {
            const estaActivoDiario = !seccionDiario.classList.contains("activo");
            toggleCajon(seccionDiario, estaActivoDiario);
            btnToggleDiario.classList.toggle("activo", estaActivoDiario);
            const iconoDiario = document.getElementById("icono-toggle-diario");
            if (iconoDiario) {
              iconoDiario.textContent = estaActivoDiario ? "▲" : "▼";
            }
          }
        });
      }

      // Añadir escuchador de resize único global para ajustar las alturas en caliente
      if (!window.hasAccordionResizeListener) {
        window.hasAccordionResizeListener = true;
        window.addEventListener("resize", () => {
          document.querySelectorAll(".cajon-desplegable.activo").forEach(seccion => {
            seccion.style.maxHeight = seccion.scrollHeight + "px";
          });
        });
      }
      
      // Analizar historial para analíticas de subtemas y debilidades
      const metricasAv = analytics.procesarMetricas(historial);
      ui.renderizarBancoDeErrores(historial, metricasAv);

      // Calcular preguntas contestadas esta semana
      const ahora = new Date();
      const haceSieteDias = new Date();
      haceSieteDias.setDate(ahora.getDate() - 7);
      
      let preguntasEstaSemana = 0;
      historial.forEach(s => {
        if (s.fecha) {
          const fechaSesion = new Date(s.fecha);
          if (fechaSesion >= haceSieteDias) {
            preguntasEstaSemana += s.cantidad_preguntas;
          }
        }
      });

      // Renderizar meta semanal en la UI
      const pBox = document.querySelector("#perfil-contenido-progreso .admin-box");
      if (pBox) {
        let metaWidget = document.getElementById("perfil-meta-semanal-widget");
        if (!metaWidget) {
          metaWidget = document.createElement("div");
          metaWidget.id = "perfil-meta-semanal-widget";
          metaWidget.className = "meta-semanal-container";
          
          const h4Element = pBox.querySelector("h4");
          if (h4Element) {
            pBox.insertBefore(metaWidget, h4Element);
          } else {
            pBox.appendChild(metaWidget);
          }
        }
        
        const objetivo = user.meta_semanal || 50;
        const porcentajeMeta = Math.min(100, Math.round((preguntasEstaSemana / objetivo) * 100));
        metaWidget.innerHTML = `
          <div class="meta-semanal-header">
            <span>📊 Objetivo Semanal: <strong>${preguntasEstaSemana} de ${objetivo} preguntas</strong></span>
            <span style="color: ${porcentajeMeta >= 100 ? "var(--success)" : "var(--warning)"}; font-weight: bold;">${porcentajeMeta}% completado</span>
          </div>
          <div class="meta-semanal-progress-bar">
            <div class="meta-semanal-progress-fill" style="width: ${porcentajeMeta}%; background: ${porcentajeMeta >= 100 ? "linear-gradient(90deg, var(--success) 0%, #10b981 100%)" : "linear-gradient(90deg, var(--warning) 0%, #d97706 100%)"};"></div>
          </div>
        `;
      }

      // Rendimiento por especialidad
      const conteoEspecialidades = {};
      state.LISTA_ESPECIALIDADES.forEach(esp => {
        conteoEspecialidades[esp.id] = { correctas: 0, totales: 0 };
      });

      historial.forEach(sesion => {
        if (sesion.detalle) {
          try {
            const preguntas = JSON.parse(sesion.detalle);
            if (Array.isArray(preguntas)) {
              preguntas.forEach(p => {
                const temaPregunta = p.tema || sesion.tema || "";
                const key = ui.normalizarTema(temaPregunta);
                if (conteoEspecialidades[key]) {
                  conteoEspecialidades[key].totales += 1;
                  if (p.seleccionada === p.correcta) {
                    conteoEspecialidades[key].correctas += 1;
                  }
                }
              });
            }
          } catch (e) {
            // Fallback si falla el parseo
            const key = ui.normalizarTema(sesion.tema);
            if (conteoEspecialidades[key]) {
              const correctasEnSesion = Math.round((sesion.porcentaje / 100) * sesion.cantidad_preguntas);
              conteoEspecialidades[key].correctas += correctasEnSesion;
              conteoEspecialidades[key].totales += sesion.cantidad_preguntas;
            }
          }
        } else {
          // Fallback para sesiones antiguas sin detalle
          const key = ui.normalizarTema(sesion.tema);
          if (conteoEspecialidades[key]) {
            const correctasEnSesion = Math.round((sesion.porcentaje / 100) * sesion.cantidad_preguntas);
            conteoEspecialidades[key].correctas += correctasEnSesion;
            conteoEspecialidades[key].totales += sesion.cantidad_preguntas;
          }
        }
      });

      // Recuperar coberturas en progreso desde la API
      let datosCobertura = {};
      try {
        datosCobertura = await api.obtenerCobertura(user.id);
      } catch (errCob) {
        console.warn("Falla al recuperar coberturas en progreso:", errCob);
      }
      if (!datosCobertura) datosCobertura = {};

      // Actualizar rendimiento, cobertura y badges por especialidad de manera unificada
      state.LISTA_ESPECIALIDADES.forEach(esp => {
        // 1. Rendimiento (Correctas / Totales)
        const info = conteoEspecialidades[esp.id];
        let porcentajeRendimiento = 0;
        if (info && info.totales > 0) {
          porcentajeRendimiento = Math.round((info.correctas / info.totales) * 100);
        }

        // 2. Cobertura (Respondidas / TotalBanco)
        const nombreBuscar = esp.nombre.trim().toLowerCase();
        let dataCob = { totalBanco: 0, respondidas: 0, porcentaje: 0 };
        
        const keysCob = Object.keys(datosCobertura);
        const claveReal = keysCob.find(k => k && k.trim().toLowerCase() === nombreBuscar);
        if (claveReal && datosCobertura[claveReal]) {
          dataCob = datosCobertura[claveReal];
        }

        // 3. Actualizar elementos DOM de la fila
        const barraRendimiento = document.getElementById(`barra-${esp.id}`);
        const textoRendimiento = document.getElementById(`porcentaje-${esp.id}`);
        const barraCobertura = document.getElementById(`cobertura-barra-${esp.id}`);
        const textoCobertura = document.getElementById(`cobertura-texto-${esp.id}`);
        
        const badgeContainer = document.getElementById(`badge-container-${esp.id}`);
        const badgeIcon = document.getElementById(`badge-icon-${esp.id}`);
        const badgeTitle = document.getElementById(`badge-title-${esp.id}`);
        const badgeDesc = document.getElementById(`badge-desc-${esp.id}`);

        if (barraRendimiento) {
          barraRendimiento.style.width = `${porcentajeRendimiento}%`;
        }
        if (textoRendimiento) {
          textoRendimiento.textContent = `${porcentajeRendimiento}%`;
        }
        if (barraCobertura) {
          barraCobertura.style.width = `${dataCob.porcentaje}%`;
        }
        if (textoCobertura) {
          textoCobertura.textContent = `${dataCob.porcentaje}%`;
          textoCobertura.setAttribute("data-vistas", dataCob.respondidas);
        }

        // 4. Lógica dinámica de badges de prioridad y textos detallados
        let badgeText = "En progreso";
        let badgeClass = "badge-inprogress";
        let badgeSubtext = "Rendimiento promedio, sigue practicando";
        let iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`;

        const haIniciado = (info && info.totales > 0) || dataCob.respondidas > 0;
        
        if (!haIniciado) {
          badgeText = "En progreso";
          badgeClass = "badge-inprogress";
          badgeSubtext = "Aún sin datos, inicia un entrenamiento";
        } else if (dataCob.porcentaje < 10 && porcentajeRendimiento < 40) {
          badgeText = "Prioridad";
          badgeClass = "badge-priority";
          badgeSubtext = "Baja cobertura y bajo rendimiento";
          iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`;
        } else if (porcentajeRendimiento >= 70) {
          if (dataCob.porcentaje >= 20) {
            badgeText = "Fortaleza";
            badgeClass = "badge-fortaleza";
            badgeSubtext = "Buen rendimiento y buena cobertura";
            iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
          } else {
            badgeText = "En progreso";
            badgeClass = "badge-inprogress";
            badgeSubtext = "Buen rendimiento, falta más cobertura";
            iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`;
          }
        } else if (porcentajeRendimiento < 50) {
          badgeText = "Reforzar";
          badgeClass = "badge-reforzar";
          badgeSubtext = "Rendimiento bajo, necesita más práctica";
          iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m18.7 8-5.1 5.2-2.8-2.7L7 14.3"/></svg>`;
        } else {
          badgeText = "En progreso";
          badgeClass = "badge-inprogress";
          badgeSubtext = "Rendimiento promedio, sigue practicando";
          iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`;
        }

        if (badgeContainer) {
          badgeContainer.className = `specialty-diagnostic-card ${badgeClass}`;
        }
        if (badgeIcon) {
          badgeIcon.innerHTML = iconSvg;
        }
        if (badgeTitle) {
          badgeTitle.textContent = badgeText;
        }
        if (badgeDesc) {
          badgeDesc.textContent = badgeSubtext;
        }
      });

      // Recalcular alturas de cajones desplegables que ya estén activos tras inyectar todo el progreso
      document.querySelectorAll(".cajon-desplegable.activo").forEach(seccion => {
        seccion.style.maxHeight = seccion.scrollHeight + "px";
      });

    } catch (error) {
      console.error("Error al cargar el progreso en tiempo real:", error);
    }
  },

  renderizarTablaHistorial(historial, mostrarTodos = false) {
    const tablaCuerpo = document.getElementById("tabla-progreso-cuerpo");
    const tablaVacio = document.getElementById("tabla-historial-vacio");
    const verMasBtnContainer = document.getElementById("btn-historial-ver-mas-container");
    const verMasBtn = document.getElementById("btn-historial-ver-mas");
    
    if (!tablaCuerpo) return;

    if (!historial || historial.length === 0) {
      tablaCuerpo.innerHTML = "";
      if (tablaVacio) tablaVacio.classList.remove("hidden");
      if (verMasBtnContainer) verMasBtnContainer.classList.add("hidden");
      return;
    }

    if (tablaVacio) tablaVacio.classList.add("hidden");
    tablaCuerpo.innerHTML = "";

    // Limitar a 5 elementos por defecto para optimizar el espacio
    const limite = mostrarTodos ? historial.length : Math.min(5, historial.length);
    const subconjunto = historial.slice(0, limite);

    subconjunto.forEach(sesion => {
      let fechaTxt = "Fecha desconocida";
      if (sesion.fecha) {
        try {
          const d = new Date(sesion.fecha);
          fechaTxt = d.toLocaleString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          });
        } catch (e) {
          fechaTxt = sesion.fecha;
        }
      }

      let colorNota = "var(--danger)";
      if (sesion.porcentaje >= 75) {
        colorNota = "var(--success)";
      } else if (sesion.porcentaje >= 50) {
        colorNota = "var(--warning)";
      }

      const esEstudio = sesion.modo === "estudio";
      const esGuardia = sesion.modo === "guardia";
      const claseModo = esEstudio ? "chip-primary" : esGuardia ? "chip-primary" : "chip-soft";
      const modoText = esEstudio ? "Estudio" : esGuardia ? "Intensivo" : "Simulacro";

      const fila = document.createElement("tr");
      fila.className = "tr-history-row";
      
      fila.innerHTML = `
        <td class="td-date">${fechaTxt}</td>
        <td class="td-topic">${sesion.tema === "Todos" ? "Examen General" : sesion.tema}</td>
        <td class="td-mode">
          <span class="chip ${claseModo} td-mode-chip">${modoText}</span>
        </td>
        <td class="td-questions">${sesion.cantidad_preguntas}</td>
        <td class="td-score">${sesion.correctas} / ${sesion.cantidad_preguntas}</td>
        <td class="td-percentage" style="color: ${colorNota};">${sesion.porcentaje}%</td>
        <td class="td-action">
          <button class="btn btn-ghost btn-revisar-sesion btn-revisar-sesion-custom">Revisar</button>
        </td>
      `;
      
      const btnRevisar = fila.querySelector(".btn-revisar-sesion");
      if (btnRevisar) {
        btnRevisar.addEventListener("click", (e) => {
          e.stopPropagation();
          state.pantallaDeRetorno = "perfil";
          ui.mostrarRevisionPasada(sesion);
        });
      }

      tablaCuerpo.appendChild(fila);
    });

    // Controlar visibilidad y acción del botón Ver más
    if (verMasBtnContainer && verMasBtn) {
      if (historial.length > 5 && !mostrarTodos) {
        verMasBtnContainer.classList.remove("hidden");
        // Reemplazar botón por clon para limpiar listeners viejos
        const nuevoBtn = verMasBtn.cloneNode(true);
        verMasBtn.parentNode.replaceChild(nuevoBtn, verMasBtn);
        nuevoBtn.addEventListener("click", () => {
          ui.renderizarTablaHistorial(historial, true);
        });
      } else {
        verMasBtnContainer.classList.add("hidden");
      }
    }
  },

  renderizarTablaDiarioFlashcards(historial, mostrarTodos = false) {
    const tablaCuerpo = document.getElementById("tabla-diario-flashcards-cuerpo");
    const tablaVacio = document.getElementById("tabla-diario-flashcards-vacio");
    const verMasBtnContainer = document.getElementById("btn-diario-ver-mas-container");
    const verMasBtn = document.getElementById("btn-diario-ver-mas");
    
    if (!tablaCuerpo) return;

    if (!historial || historial.length === 0) {
      tablaCuerpo.innerHTML = "";
      if (tablaVacio) tablaVacio.classList.remove("hidden");
      if (verMasBtnContainer) verMasBtnContainer.classList.add("hidden");
      return;
    }

    if (tablaVacio) tablaVacio.classList.add("hidden");
    tablaCuerpo.innerHTML = "";

    // Limitar a 5 días de estudio por defecto para conservar espacio
    const limite = mostrarTodos ? historial.length : Math.min(5, historial.length);
    const subconjunto = historial.slice(0, limite);

    subconjunto.forEach(registro => {
      let fechaTxt = "Fecha desconocida";
      if (registro.dia) {
        try {
          const partes = registro.dia.split('-');
          if (partes.length === 3) {
            fechaTxt = `${partes[2]}/${partes[1]}/${partes[0]}`;
          } else {
            fechaTxt = registro.dia;
          }
        } catch (e) {
          fechaTxt = registro.dia;
        }
      }

      const total = registro.total || 0;
      const aciertos = registro.aciertos || 0;
      const fallos = registro.fallos || 0;
      const pctEficiencia = total > 0 ? Math.round((aciertos / total) * 100) : 0;

      let colorNota = "var(--danger)";
      if (pctEficiencia >= 75) {
        colorNota = "var(--success)";
      } else if (pctEficiencia >= 50) {
        colorNota = "var(--warning)";
      }

      const fila = document.createElement("tr");
      fila.className = "tr-history-row";
      
      fila.innerHTML = `
        <td class="td-date" style="padding: 12px 16px;">${fechaTxt}</td>
        <td class="td-questions" style="padding: 12px 16px; text-align: center;">${total}</td>
        <td class="td-score" style="padding: 12px 16px; text-align: center; color: var(--success); font-weight: 600;">${aciertos}</td>
        <td class="td-score" style="padding: 12px 16px; text-align: center; color: var(--danger); font-weight: 600;">${fallos}</td>
        <td class="td-percentage" style="padding: 12px 16px; text-align: right; color: ${colorNota}; font-weight: bold;">${pctEficiencia}%</td>
      `;
      
      tablaCuerpo.appendChild(fila);
    });

    // Controlar visibilidad y acción del botón Ver más (Flashcards)
    if (verMasBtnContainer && verMasBtn) {
      if (historial.length > 5 && !mostrarTodos) {
        verMasBtnContainer.classList.remove("hidden");
        // Reemplazar botón por clon para limpiar listeners viejos
        const nuevoBtn = verMasBtn.cloneNode(true);
        verMasBtn.parentNode.replaceChild(nuevoBtn, verMasBtn);
        nuevoBtn.addEventListener("click", () => {
          ui.renderizarTablaDiarioFlashcards(historial, true);
        });
      } else {
        verMasBtnContainer.classList.add("hidden");
      }
    }
  },

  async renderizarGraficosAvanzados(historial, srEstados = [], totalPersonalizadas = 0) {
    if (typeof Chart === "undefined") {
      console.warn("Chart.js aún no se ha cargado.");
      return;
    }

    // Obtener Coberturas reales del Banco de Preguntas para el gráfico
    let datosCobertura = {};
    if (state.usuarioConectado && state.usuarioConectado.id) {
      try {
        datosCobertura = await api.obtenerCobertura(state.usuarioConectado.id);
      } catch (err) {
        console.warn("No se pudo obtener coberturas de especialidades en gráficos:", err);
      }
    }

    // ==========================================
    // ⚙️ FASE 1: CALCULOS ANALÍTICOS AVANZADOS ENURM
    // ==========================================
    
    // A. Pronóstico Ponderado de Nota ENURM
    let predictionScore = 0;
    let predictionAdvice = "Realiza simulacros para proyectar tu nota oficial.";
    let countValid = 0;
    
    if (historial && historial.length > 0) {
      const sorted = [...historial]
        .filter(s => s.porcentaje !== undefined && s.fecha)
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      
      if (sorted.length > 0) {
        let weightedSum = 0;
        let weightTotal = 0;
        sorted.forEach((sesion, index) => {
          // Incrementa el peso de exámenes más recientes exponencialmente
          const weight = 1 + (index / sorted.length) * 1.5;
          weightedSum += sesion.porcentaje * weight;
          weightTotal += weight;
        });
        predictionScore = Math.round(weightedSum / weightTotal);
        countValid = sorted.length;
        
        if (predictionScore < 60) {
          predictionAdvice = "Crítico: Requiere priorizar tu Especialidad Crítica.";
        } else if (predictionScore < 75) {
          predictionAdvice = "Intermedio: A las puertas del éxito. ¡Refuerza debilidades!";
        } else {
          predictionAdvice = "¡Competitivo! Tu perfil está listo para adjudicar plaza.";
        }
      }
    }

    // Actualizar Widgets en DOM
    const scoreEl = document.getElementById("metric-predict-score");
    const barEl = document.getElementById("metric-predict-bar");
    const adviceEl = document.getElementById("metric-predict-advice");
    if (scoreEl) scoreEl.textContent = countValid > 0 ? `${predictionScore}%` : "--%";

    // Actualizar Módulo de Dominio y Fortalezas Clínicas en base a 100 (Reemplazo Positivo)
    const pmUserPct = document.getElementById("prepmed-user-pct");
    const pmUserBar = document.getElementById("prepmed-user-bar");
    const pmPercentile = document.getElementById("prepmed-percentile");
    
    if (pmUserPct) pmUserPct.textContent = countValid > 0 ? `${predictionScore}%` : "--%";
    if (pmUserBar) pmUserBar.style.width = countValid > 0 ? `${predictionScore}%` : "0%";
    if (pmPercentile) pmPercentile.textContent = countValid > 0 ? `${predictionScore}%` : "--%";
    if (barEl) {
      barEl.style.width = countValid > 0 ? `${predictionScore}%` : "0%";
      if (predictionScore >= 75) {
        barEl.style.backgroundColor = "var(--success)";
      } else if (predictionScore >= 55) {
        barEl.style.backgroundColor = "var(--warning)";
      } else {
        barEl.style.backgroundColor = "var(--danger)";
      }
    }
    if (adviceEl) adviceEl.textContent = predictionAdvice;

    // B. Especialidad Líder y Crítica
    const conteoEspecialidades = {};
    state.LISTA_ESPECIALIDADES.forEach(esp => {
      conteoEspecialidades[esp.nombre.trim().toLowerCase()] = { 
        correctas: 0, 
        totales: 0, 
        emoji: esp.emoji || "🔬", 
        nombre: esp.nombre 
      };
    });

    historial.forEach(sesion => {
      if (sesion.detalle) {
        try {
          const preguntas = JSON.parse(sesion.detalle);
          if (Array.isArray(preguntas)) {
            preguntas.forEach(p => {
              const temaPregunta = (p.tema || sesion.tema || "").trim().toLowerCase();
              if (conteoEspecialidades[temaPregunta]) {
                conteoEspecialidades[temaPregunta].totales += 1;
                if (p.seleccionada === p.correcta) {
                  conteoEspecialidades[temaPregunta].correctas += 1;
                }
              }
            });
          }
        } catch (e) {
          const key = sesion.tema ? sesion.tema.trim().toLowerCase() : "";
          if (conteoEspecialidades[key]) {
            const correctasEnSesion = Math.round((sesion.porcentaje / 100) * sesion.cantidad_preguntas);
            conteoEspecialidades[key].correctas += correctasEnSesion;
            conteoEspecialidades[key].totales += sesion.cantidad_preguntas;
          }
        }
      } else {
        const key = sesion.tema ? sesion.tema.trim().toLowerCase() : "";
        if (conteoEspecialidades[key]) {
          const correctasEnSesion = Math.round((sesion.porcentaje / 100) * sesion.cantidad_preguntas);
          conteoEspecialidades[key].correctas += correctasEnSesion;
          conteoEspecialidades[key].totales += sesion.cantidad_preguntas;
        }
      }
    });

    let leaderName = "--";
    let leaderScore = 0;
    let leaderEmoji = "";
    
    let criticalName = "--";
    let criticalScore = 101;
    let criticalEmoji = "";
    
    let hasValidSpecData = false;

    Object.keys(conteoEspecialidades).forEach(key => {
      const info = conteoEspecialidades[key];
      if (info.totales > 0) {
        hasValidSpecData = true;
        const pct = Math.round((info.correctas / info.totales) * 100);
        if (pct > leaderScore) {
          leaderScore = pct;
          leaderName = info.nombre;
          leaderEmoji = info.emoji;
        }
        if (pct < criticalScore) {
          criticalScore = pct;
          criticalName = info.nombre;
          criticalEmoji = info.emoji;
        }
      }
    });

    if (criticalScore === 101) criticalScore = 0;

    // Actualizar Widgets Especialidades
    const leaderNameEl = document.getElementById("metric-leader-name");
    const leaderScoreEl = document.getElementById("metric-leader-score");
    if (leaderNameEl) leaderNameEl.textContent = hasValidSpecData ? `${leaderName}`.trim() : "Ninguna aún";
    if (leaderScoreEl) leaderScoreEl.textContent = hasValidSpecData ? `${leaderScore}% de precisión` : "Sin datos";

    const criticalNameEl = document.getElementById("metric-critical-name");
    const criticalScoreEl = document.getElementById("metric-critical-score");
    if (criticalNameEl) {
      criticalNameEl.textContent = hasValidSpecData 
        ? `${criticalName}`.trim() 
        : "Ninguna aún";
    }
    if (criticalScoreEl) {
      criticalScoreEl.textContent = hasValidSpecData ? `${criticalScore}% de precisión` : "Sin datos";
    }

    // Actualizar Módulo de Fortalezas Clínicas en Detalle (Reemplazo Positivo)
    const estrellaTextEl = document.getElementById("modulo-fortalezas-estrella-text");
    const solidoTextEl = document.getElementById("modulo-fortalezas-solido-text");
    
    if (estrellaTextEl) {
      estrellaTextEl.innerHTML = hasValidSpecData
        ? `<strong style="color: var(--success);">${leaderName}</strong> con un destacado <strong>${leaderScore}%</strong> de precisión acumulada.`
        : "Sin datos académicos acumulados aún.";
    }
    
    if (solidoTextEl) {
      if (hasValidSpecData) {
        // Encontrar consistencia
        let stdDevVal = 0;
        if (historial && historial.length > 1) {
          const scores = historial.filter(s => s.porcentaje !== undefined).map(s => s.porcentaje);
          if (scores.length > 1) {
            const sum = scores.reduce((a, b) => a + b, 0);
            const mean = sum / scores.length;
            const squareDiffs = scores.map(s => Math.pow(s - mean, 2));
            const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
            stdDevVal = Math.round(Math.sqrt(avgSquareDiff));
          }
        }
        solidoTextEl.innerHTML = stdDevVal > 0 
          ? `Consistencia con desviación estable de <strong>±${stdDevVal}%</strong>. ¡Perfil consolidado!`
          : "Tu desempeño inicial se mantiene estable y prometedor.";
      } else {
        solidoTextEl.textContent = "Continúa completando simulacros para perfilar la estabilidad de tu rendimiento.";
      }
    }

    // C. Consistencia Académica (Racha de días de estudio)
    const streakVal = (state.usuarioConectado && state.usuarioConectado.streak) || 0;
    const consistencyLabel = `${streakVal} ${streakVal === 1 ? "día" : "días"}`;
    const consistencyDetail = "Racha actual";

    const consistencyLabelEl = document.getElementById("metric-consistency-label");
    const consistencyDetailEl = document.getElementById("metric-consistency-detail");
    if (consistencyLabelEl) consistencyLabelEl.textContent = consistencyLabel;
    if (consistencyDetailEl) consistencyDetailEl.textContent = consistencyDetail;

    // ==========================================
    // 📊 FASE 2: CONSTRUCCIÓN DE GRÁFICOS PREMIUM
    // ==========================================

    // Destruir instancias previas
    if (!window.resiMedCharts) {
      window.resiMedCharts = { cobertura: null, doughnut: null };
    }
    if (window.resiMedCharts.cobertura) window.resiMedCharts.cobertura.destroy();
    if (window.resiMedCharts.doughnut) window.resiMedCharts.doughnut.destroy();

    const isDark = document.body.classList.contains("dark-mode");
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    // GRÁFICOS DINÁMICOS PREMIUM
    
    // (Gráfico 1 de Cobertura removido porque ahora se usa una tabla dinámica premium integrada)
    // GRÁFICO 3: Estado de Repetición Espaciada y Fuerza de Retención (Doughnut Chart con Plugin Central)
    const totalRepasos = srEstados.filter(e => e.flashcard_id);
    const dominadas = totalRepasos.filter(e => e.interval > 0).length;
    const criticas = totalRepasos.filter(e => e.interval === 0).length;

    const totalEstaticas = (typeof baseDatosFlashcardsEstaticas !== "undefined") ? baseDatosFlashcardsEstaticas.length : 0;
    const totalActivas = totalEstaticas + totalPersonalizadas;
    const sinRepasar = Math.max(0, totalActivas - totalRepasos.length);

    const ctxDona = document.getElementById('chart-repeticion-dona');
    if (ctxDona) {
      window.resiMedCharts.doughnut = new Chart(ctxDona, {
        type: 'doughnut',
        data: {
          labels: ['Dominadas (Memoria)', 'Críticas (En Repaso)', 'No Estudiadas'],
          datasets: [{
            data: [dominadas, criticas, sinRepasar],
            backgroundColor: [
              'rgba(16, 185, 129, 0.85)', // Emerald
              'rgba(239, 68, 68, 0.85)',  // Neon red
              'rgba(59, 130, 246, 0.85)'   // Sapphire blue
            ],
            borderWidth: isDark ? 2.5 : 1,
            borderColor: isDark ? '#0b0f19' : '#ffffff',
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: textColor,
                font: { size: 10.5, family: 'Inter', weight: '600' },
                boxWidth: 10,
                padding: 10
              }
            },
            tooltip: {
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              titleColor: isDark ? '#f8fafc' : '#0f172a',
              bodyColor: isDark ? '#cbd5e1' : '#334155',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              borderWidth: 1
            }
          }
        },
        plugins: [{
          id: 'centerText',
          afterDraw(chart) {
            const { ctx, chartArea: { top, bottom, left, right, width, height } } = chart;
            ctx.save();
            const active = chart.data.datasets[0].data[0]; // Dominadas
            const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            const pct = total > 0 ? Math.round((active / total) * 100) : 0;
            
            ctx.font = 'bold 22px Outfit, sans-serif';
            ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${pct}%`, left + width / 2, top + height / 2 - 8);
            
            ctx.font = '700 9px Inter, sans-serif';
            ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
            ctx.fillText('RETENCIÓN', left + width / 2, top + height / 2 + 12);
            ctx.restore();
          }
        }]
      });
    }
  },

  // RENDIMIENTO, COBERTURA Y BANCO DE ERRORES UNIFICADO POR ESPECIALIDAD (OBVIANDO IA)
  async renderizarBancoDeErrores(historial, metricas) {
    const containerEl = document.getElementById("banco-errores-especialidades-container");
    const vacioEl = document.getElementById("banco-errores-vacio");
    if (!containerEl) return;

    // 1. Extraer preguntas falladas únicas agrupadas por especialidad
    ui.bancoErroresPreguntas = {};
    const preguntasFalladasMap = new Map();
    historial.forEach(sesion => {
      if (sesion.detalle) {
        try {
          const preguntas = JSON.parse(sesion.detalle);
          if (Array.isArray(preguntas)) {
            preguntas.forEach(p => {
              if (p.seleccionada !== p.correcta) {
                preguntasFalladasMap.set(p.texto, {
                  id: p.id,
                  texto: p.texto,
                  opciones: p.opciones,
                  correcta: p.correcta,
                  seleccionada: p.seleccionada,
                  explicacion: p.explicacion,
                  explicacion_correcta: p.explicacion_correcta,
                  explicacion_incorrecta: p.explicacion_incorrecta,
                  fuente: p.fuente || "ResiMed ENURM",
                  tema: (p.tema || sesion.tema || "General").trim(),
                  subtema: (p.subtema || "Varios").trim(),
                  microtema: (p.microtema || "Varios").trim()
                });
              }
            });
          }
        } catch (e) {
          console.error("Error al estructurar banco de errores:", e);
        }
      }
    });

    const preguntasFalladas = Array.from(preguntasFalladasMap.values());
    console.log("DEBUG: renderizarBancoDeErrores called with", historial.length, "sessions. Found", preguntasFalladas.length, "failed questions.");

    if (preguntasFalladas.length === 0) {
      containerEl.innerHTML = "";
      if (vacioEl) vacioEl.classList.remove("hidden");
    } else {
      if (vacioEl) vacioEl.classList.add("hidden");
    }

    // 2. Calcular rendimiento general y subtemas por especialidad
    const conteoEspecialidades = {};
    state.LISTA_ESPECIALIDADES.forEach(esp => {
      conteoEspecialidades[esp.id] = {
        id: esp.id,
        nombre: esp.nombre,
        emoji: esp.emoji,
        correctas: 0,
        totales: 0,
        subtemas: {} // { "subtemaName": { correctas, totales, historialRespuestas: [] } }
      };
    });

    // Procesar todo el historial en orden cronológico (copia invertida)
    const historialCronologico = [...historial].reverse();
    
    historialCronologico.forEach(sesion => {
      if (sesion.detalle) {
        try {
          const preguntas = JSON.parse(sesion.detalle);
          if (Array.isArray(preguntas)) {
            preguntas.forEach(p => {
              const materiaRaw = (p.tema || sesion.tema || "General").trim();
              
              // Buscar especialidad correspondiente
              const espId = ui.normalizarTema(materiaRaw);
              const espInfo = conteoEspecialidades[espId];

              if (espInfo) {
                const esCorrecta = p.seleccionada === p.correcta;
                espInfo.totales += 1;
                if (esCorrecta) {
                  espInfo.correctas += 1;
                }

                // Subtemas específicos
                let sub = (p.subtema || "").trim();
                if (!sub || sub.toLowerCase() === "varios" || sub.toLowerCase() === "general" || sub.toLowerCase() === "generalidades") {
                  sub = espInfo.nombre;
                }

                if (!espInfo.subtemas[sub]) {
                  espInfo.subtemas[sub] = { correctas: 0, totales: 0, historialRespuestas: [] };
                }
                espInfo.subtemas[sub].totales += 1;
                if (esCorrecta) {
                  espInfo.subtemas[sub].correctas += 1;
                }
                espInfo.subtemas[sub].historialRespuestas.push(esCorrecta);
              }
            });
          }
        } catch (err) {
          console.warn("Falla al acumular historial por especialidades:", err);
        }
      }
    });

    // Obtener Coberturas reales del Banco de Preguntas
    let datosCobertura = {};
    if (state.usuarioConectado && state.usuarioConectado.id) {
      try {
        datosCobertura = await api.obtenerCobertura(state.usuarioConectado.id);
      } catch (err) {
        console.warn("No se pudo obtener coberturas de especialidades en errores:", err);
      }
    }

    if (!datosCobertura) {
      datosCobertura = {};
    }

    // Limpiar contenedor de especialidades
    containerEl.innerHTML = "";

    // 3. Renderizar cada Especialidad con su desglose académico y banco de errores particular
    state.LISTA_ESPECIALIDADES.forEach(esp => {
      try {
        const info = conteoEspecialidades[esp.id] || { totales: 0, correctas: 0, subtemas: {} };

        // Filtrar las preguntas falladas de esta especialidad de forma robusta y consistente
        const preguntasEsp = preguntasFalladas.filter(p => {
          if (!p || !p.tema) return false;
          return ui.normalizarTema(p.tema) === esp.id;
        });

        if (preguntasEsp.length === 0) return;

        // Guardar preguntas en memoria para lazy rendering
        ui.bancoErroresPreguntas[esp.id] = preguntasEsp;

        const totalRespondidas = info.totales || 0;
        const totalCorrectas = info.correctas || 0;
        const nota = totalRespondidas > 0 ? Math.round((totalCorrectas / totalRespondidas) * 100) : 0;

        // Obtener cobertura
        const nombreBuscar = esp.nombre.trim().toLowerCase();
        let dataCob = { totalBanco: 0, respondidas: 0, porcentaje: 0 };
        const keysCobertura = datosCobertura ? Object.keys(datosCobertura) : [];
        const claveReal = keysCobertura.find(k => k && k.trim().toLowerCase() === nombreBuscar);
        if (claveReal && datosCobertura[claveReal]) {
          dataCob = {
            totalBanco: datosCobertura[claveReal].totalBanco || 0,
            respondidas: datosCobertura[claveReal].respondidas || 0,
            porcentaje: datosCobertura[claveReal].porcentaje || 0
          };
        }

        // Colores de semáforo de nota
        let colorNota = "var(--text-dim)";
        let notaTexto = "Sin Datos";
        if (totalRespondidas > 0) {
          notaTexto = `${nota}%`;
          if (nota >= 75) {
            colorNota = "var(--success)";
          } else if (nota >= 50) {
            colorNota = "var(--warning)";
          } else {
            colorNota = "var(--danger)";
          }
        }

        const coberturaTexto = `Estudiado: ${dataCob.respondidas} de ${dataCob.totalBanco} preguntas (${dataCob.porcentaje}%)`;

        // Clasificar subtemas en Dominados vs A Reforzar (Obviando IA)
        const temasDominados = [];
        const temasAReforzar = [];

        const subtemasObj = info.subtemas || {};
        Object.keys(subtemasObj).forEach(subtemaName => {
          try {
            const subData = subtemasObj[subtemaName];
            if (!subData) return;
            const subTotales = subData.totales || 0;
            const subCorrectas = subData.correctas || 0;
            const subPorcentaje = subTotales > 0 ? Math.round((subCorrectas / subTotales) * 100) : 0;

            // Motor Adaptativo de Auto-Superación
            const historialRespuestas = subData.historialRespuestas || [];
            const ultimas = historialRespuestas.slice(-5);
            const correctasRecientes = ultimas.filter(r => r === true).length;
            const totalesRecientes = ultimas.length;
            const porcentajeReciente = totalesRecientes > 0 ? Math.round((correctasRecientes / totalesRecientes) * 100) : 0;

            const superadoPorRacha = ultimas.length >= 3 && ultimas.slice(-3).every(r => r === true);
            const superadoPorPrecision = totalesRecientes >= 3 && porcentajeReciente >= 75;

            if (subPorcentaje >= 70 || superadoPorRacha || superadoPorPrecision) {
              temasDominados.push({ nombre: subtemaName, porcentaje: subPorcentaje, totales: subTotales });
            } else if (subCorrectas < subTotales) {
              temasAReforzar.push({ nombre: subtemaName, porcentaje: subPorcentaje, totales: subTotales });
            }
          } catch (eSub) {
            console.warn("Falla al clasificar subtema:", subtemaName, eSub);
          }
        });

        // Ordenar listados
        temasDominados.sort((a, b) => b.porcentaje - a.porcentaje);
        temasAReforzar.sort((a, b) => a.porcentaje - b.porcentaje);

        // Generar HTML de subtemas
        let temasDominadosHtml = '<li style="color: var(--text-dim); font-style: italic; list-style: none; margin-left: -18px;">Aún no posees temas consolidados.</li>';
        if (temasDominados.length > 0) {
          temasDominadosHtml = temasDominados.map(t => 
            `<li><strong>${t.nombre}</strong> <span style="color: var(--success); font-weight:600; margin-left:6px;">(${t.porcentaje}% de aciertos)</span></li>`
          ).join("");
        }

        let temasAReforzarHtml = '<li style="color: var(--text-dim); font-style: italic; list-style: none; margin-left: -18px;">¡Excelente! No tienes temas a reforzar en este momento.</li>';
        if (temasAReforzar.length > 0) {
          temasAReforzarHtml = temasAReforzar.map(t => 
            `<li><strong>${t.nombre}</strong> <span style="color: var(--danger); font-weight:600; margin-left:6px;">(${t.porcentaje}% de precisión, ${t.totales} preguntas vistas)</span></li>`
          ).join("");
        }

        // Crear tarjeta de especialidad unificada (Fila Altamente Compacta)
        const panel = document.createElement("div");
        panel.className = "especialidad-panel";
        panel.style.cssText = "border: 1px solid var(--border); border-radius: 14px; background: var(--panel-soft); overflow: hidden; display: flex; flex-direction: column; transition: all 0.3s ease; margin-bottom: 8px;";

        panel.innerHTML = `
          <!-- CABECERA PRINCIPAL DE LA ESPECIALIDAD (Fila Compacta Activa) -->
          <div class="especialidad-header-clickable" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; cursor: pointer; padding: 14px 20px; user-select: none;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="text-align: left;">
                <h4 style="margin: 0; font-size: 15px; color: var(--text); font-weight: 700;">${esp.emoji} ${esp.nombre}</h4>
                <p style="margin: 2px 0 0 0; font-size: 11.5px; color: var(--text-soft); font-weight: 500;">${coberturaTexto}</p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="chip" style="background: ${totalRespondidas > 0 ? colorNota : 'rgba(255,255,255,0.02)'}; border-color: ${colorNota}; color: ${totalRespondidas > 0 ? '#fff' : 'var(--text-dim)'}; font-size: 11.5px; font-weight: 700; padding: 3px 10px; margin: 0; border-radius: 12px; display: inline-block;">
                ${notaTexto}
              </span>
              <span class="chip chip-soft" style="font-size: 11px; padding: 2px 8px; margin: 0; border-color: var(--border); display: inline-block;">
                Fallos: ${preguntasEsp.length}
              </span>
              <span class="icono-toggle-especialidad" style="transition: transform 0.25s ease; font-size: 11px; color: var(--text-soft); transform: rotate(0deg);">▼</span>
            </div>
          </div>

          <!-- BARRA DE PROGRESO DE LA ESPECIALIDAD DE 3PX (COMPACTA) -->
          <div style="background: rgba(255,255,255,0.03); height: 3px; width: 100%; overflow: hidden; position: relative;">
            <div style="background: ${colorNota}; height: 100%; width: ${totalRespondidas > 0 ? nota : 0}%; transition: width 0.4s ease;"></div>
          </div>

          <!-- CONTENIDO DESPLEGABLE DE LA ESPECIALIDAD -->
          <div class="especialidad-contenido-desplegable" style="max-height: 0px; overflow: hidden; opacity: 0; transition: max-height 0.35s ease-out, opacity 0.25s ease; border-top: 1px solid transparent; background: rgba(255,255,255,0.005); text-align: left;">
            <div style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
              <!-- Temas Consolidados vs Temas a Reforzar -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 14px;">
                <!-- Caja: Temas Dominados -->
                <div style="background: rgba(34, 197, 94, 0.005); border: 1px solid rgba(34, 197, 94, 0.05); border-radius: 10px; padding: 12px 14px;">
                  <h5 style="margin: 0 0 6px 0; font-size: 11.5px; color: var(--success); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Temas Dominados</h5>
                  <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: var(--text-soft); line-height: 1.5; display:flex; flex-direction:column; gap:3px; text-align: left;">
                    ${temasDominadosHtml}
                  </ul>
                </div>

                <!-- Caja: Temas a Reforzar -->
                <div style="background: rgba(239, 68, 68, 0.005); border: 1px solid rgba(239, 68, 68, 0.05); border-radius: 10px; padding: 12px 14px;">
                  <h5 style="margin: 0 0 6px 0; font-size: 11.5px; color: var(--warning); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Temas a Reforzar</h5>
                  <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: var(--text-soft); line-height: 1.5; display:flex; flex-direction:column; gap:3px; text-align: left;">
                    ${temasAReforzarHtml}
                  </ul>
                </div>
              </div>

              <!-- Listado de Preguntas Falladas -->
              <div style="margin-top: 4px;">
                <h5 style="margin: 0 0 10px 0; font-size: 12px; color: var(--text-dim); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; text-align: left;">Preguntas Falladas Registradas:</h5>
                <div class="preguntas-falladas-list-container" data-esp-id="${esp.id}" style="display: flex; flex-direction: column; gap: 12px;">
                  <div style="text-align: center; padding: 12px; color: var(--text-soft); font-size: 13px;">Cargando preguntas de la especialidad...</div>
                </div>
              </div>
            </div>
          </div>
        `;

        containerEl.appendChild(panel);

        // Programar interactividad de la cabecera colapsable de especialidad
        const headerClickable = panel.querySelector(".especialidad-header-clickable");
        const contentDiv = panel.querySelector(".especialidad-contenido-desplegable");
        const iconoToggle = panel.querySelector(".icono-toggle-especialidad");

        if (headerClickable && contentDiv) {
          headerClickable.addEventListener("click", () => {
            const isCollapsed = contentDiv.style.maxHeight === "0px" || !contentDiv.style.maxHeight || contentDiv.style.maxHeight === "0";
            if (isCollapsed) {
              ui.cargarPreguntasFalladasEnDesplegable(esp.id, contentDiv);
              contentDiv.style.maxHeight = `${contentDiv.scrollHeight + 5000}px`;
              contentDiv.style.opacity = "1";
              contentDiv.style.borderTop = "1px solid var(--border)";
              if (iconoToggle) iconoToggle.style.transform = "rotate(180deg)";
              panel.style.background = "var(--panel)";
            } else {
              contentDiv.style.maxHeight = "0";
              contentDiv.style.opacity = "0";
              contentDiv.style.borderTop = "1px solid transparent";
              if (iconoToggle) iconoToggle.style.transform = "rotate(0deg)";
              panel.style.background = "var(--panel-soft)";
            }
          });
        }
      } catch (errEsp) {
        console.error("Falla al renderizar especialidad:", esp.nombre, errEsp);
      }
    });

    if (containerEl.dataset && !containerEl.dataset.listenerSet) {
      containerEl.dataset.listenerSet = "true";
      containerEl.addEventListener("click", async (e) => {
        const btnTutor = e.target.closest(".btn-consultar-tutor");
        const btnFlashcard = e.target.closest(".btn-auto-flashcard");

        if (btnTutor) {
          const texto = btnTutor.getAttribute("data-texto");
          const seleccion = btnTutor.getAttribute("data-seleccion");
          if (typeof window.consultarTutorIASobrePregunta === "function") {
            window.consultarTutorIASobrePregunta(texto, seleccion);
          } else {
            alert("El servicio de consulta del tutor no está disponible en este momento.");
          }
        }

        if (btnFlashcard) {
          const tema = btnFlashcard.getAttribute("data-tema");
          const pregunta = btnFlashcard.getAttribute("data-pregunta");
          const respuesta = btnFlashcard.getAttribute("data-respuesta");
          if (typeof window.crearFlashcardAutogenerada === "function") {
            window.crearFlashcardAutogenerada(tema, pregunta, respuesta);
          } else {
            alert("No se pudo autogenerar la flashcard en esta pestaña.");
          }
        }

      });
    }
  },

  cargarPreguntasFalladasEnDesplegable(espId, contentDiv) {
    const listContainer = contentDiv.querySelector(`.preguntas-falladas-list-container[data-esp-id="${espId}"]`);
    if (!listContainer || listContainer.dataset.cargado === "true") return;

    const preguntasEsp = (ui.bancoErroresPreguntas && ui.bancoErroresPreguntas[espId]) || [];
    let preguntasHtml = "";

    if (preguntasEsp.length === 0) {
      preguntasHtml = `<div style="text-align: center; color: var(--text-dim); font-size: 13px; font-style: italic; padding: 12px; background: rgba(255,255,255,0.01); border-radius: 8px;">No posees preguntas falladas en esta especialidad actualmente.</div>`;
    } else {
      let idx = 0;
      preguntasEsp.forEach(p => {
        if (!p) return;
        idx++;
        const opcionesArray = p.opciones || [];
        const seleccion = p.seleccionada;

        let opcionesHtml = "";
        opcionesArray.forEach((o, oIdx) => {
          let claseOpt = "";
          if (oIdx === p.correcta) claseOpt = "correct";
          if (oIdx === seleccion) claseOpt = "wrong";
          opcionesHtml += `<div class="review-opt ${claseOpt}"><strong>${String.fromCharCode(65 + oIdx)}.</strong> ${o}</div>`;
        });

        const textoEscapado = (p.texto || "").replace(/"/g, "&quot;");
        const explicacionEscapada = (p.explicacion || "Sin desglose.").replace(/"/g, "&quot;");
        const temaEscapado = (p.tema || "General").replace(/"/g, "&quot;");

        const seleccionText = (seleccion !== null && seleccion !== undefined && opcionesArray[seleccion])
          ? opcionesArray[seleccion].replace(/"/g, "&quot;")
          : "Sin responder";

        preguntasHtml += `
          <div class="review-item" style="border: 1px solid var(--border); border-radius: 16px; padding: 18px; background: var(--panel); margin-bottom: 12px; text-align: left;">
            <div class="error-bank-header" style="display:flex; justify-content:space-between; gap:10px; margin-bottom: 12px;">
              <span class="chip chip-soft" style="font-size:11px; padding:4px 10px;">Tema: ${p.subtema || 'Varios'}</span>
            </div>
            <div class="review-q-text error-bank-q-text" style="font-size: 14.5px; font-weight: 700; color: var(--text); line-height: 1.5; margin-bottom: 12px;">${idx}. ${p.texto || ''}</div>
            <div class="review-options" style="display:flex; flex-direction:column; gap:8px;">${opcionesHtml}</div>
            <div class="review-exp-container" style="margin-top: 14px;">${ui.formatearExplicacionClinica(p.explicacion, p.fuente, p.explicacion_correcta, p.explicacion_incorrecta)}</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top: 14px; border-top: 1px solid var(--border); padding-top: 12px;">
              <button class="btn-ia btn-consultar-tutor" data-texto="${textoEscapado}" data-seleccion="${seleccionText}" type="button" style="font-size:11.5px; padding: 6px 12px; border-radius: 8px;">Consultar Tutor</button>
              <button class="btn btn-primary btn-auto-flashcard" data-tema="${temaEscapado}" data-pregunta="${textoEscapado}" data-respuesta="${explicacionEscapada}" style="background: var(--warning); color:#000; font-size:11.5px; padding:6px 12px; border:none; border-radius: 8px;" type="button">Crear Flashcard</button>
              <button class="btn btn-reportar-pregunta" data-id="${p.id}" type="button" style="font-size:11.5px; padding: 6px 12px; border-radius: 8px;">Reportar Error</button>
            </div>
          </div>`;
      });
    }

    listContainer.innerHTML = preguntasHtml;
    listContainer.dataset.cargado = "true";
    contentDiv.style.maxHeight = `${contentDiv.scrollHeight + 500}px`;
  },

  async cargarReportesAdministrador() {
    const badgeEl = document.getElementById("admin-reportes-badge");
    const listaEl = document.getElementById("admin-reportes-lista");
    const vacioEl = document.getElementById("admin-reportes-vacio");

    if (!listaEl) return;

    try {
      const reportes = await api.obtenerReportesError();
      const reportesNoLeidos = reportes.filter(r => r.leido === 0);

      if (badgeEl) {
        badgeEl.textContent = reportesNoLeidos.length;
        if (reportesNoLeidos.length > 0) {
          badgeEl.classList.remove("hidden");
        } else {
          badgeEl.classList.add("hidden");
        }
      }

      listaEl.innerHTML = "";

      if (reportes.length === 0) {
        if (vacioEl) vacioEl.classList.remove("hidden");
        return;
      }

      if (vacioEl) vacioEl.classList.add("hidden");

      // Group unresolved reports by specialty
      const espMap = {};
      state.LISTA_ESPECIALIDADES.forEach(e => {
        espMap[e.id] = { nombre: e.nombre, emoji: e.emoji, reportes: [] };
      });

      const reportesLeidos = [];

      reportes.forEach(r => {
        if (r.leido === 1) {
          reportesLeidos.push(r);
        } else {
          const norm = ui.normalizarTema(r.pregunta_tema);
          if (espMap[norm]) {
            espMap[norm].reportes.push(r);
          } else {
            if (!espMap[norm]) {
              espMap[norm] = { nombre: r.pregunta_tema || "General", emoji: "📁", reportes: [] };
            }
            espMap[norm].reportes.push(r);
          }
        }
      });

      // Render accordions for specialties that have unresolved reports
      Object.keys(espMap).forEach(key => {
        const item = espMap[key];
        if (item.reportes.length === 0) return;

        // Generate Accordion element
        const accContainer = document.createElement("div");
        accContainer.style.marginBottom = "12px";

        const btnToggle = document.createElement("button");
        btnToggle.type = "button";
        btnToggle.className = "btn btn-ghost";
        btnToggle.style.width = "100%";
        btnToggle.style.display = "flex";
        btnToggle.style.justifyContent = "space-between";
        btnToggle.style.alignItems = "center";
        btnToggle.style.padding = "10px 16px";
        btnToggle.style.borderRadius = "10px";
        btnToggle.style.background = "rgba(255, 255, 255, 0.02)";
        btnToggle.style.fontWeight = "700";
        btnToggle.style.border = "1px solid var(--border)";
        btnToggle.style.fontSize = "13px";
        btnToggle.style.color = "var(--text)";
        btnToggle.style.cursor = "pointer";

        btnToggle.innerHTML = `
          <span style="display: flex; align-items: center; gap: 8px;">
            ${item.emoji} ${item.nombre} <span class="chip chip-soft" style="background: rgba(239, 68, 68, 0.15); color: var(--danger); font-size: 11px; padding: 2px 6px; border-radius: 6px;">${item.reportes.length} pendientes</span>
          </span>
          <span class="icono-toggle" style="transition: transform 0.3s ease; font-size: 11px;">▼</span>
        `;

        const seccion = document.createElement("div");
        seccion.className = "cajon-desplegable";
        seccion.style.display = "flex";
        seccion.style.flexDirection = "column";
        seccion.style.gap = "12px";

        item.reportes.forEach(r => {
          const card = ui.crearReportCard(r);
          seccion.appendChild(card);
        });

        // Add event listener to toggle accordion
        btnToggle.addEventListener("click", () => {
          const estaActivo = !seccion.classList.contains("activo");
          seccion.classList.toggle("activo", estaActivo);
          const icono = btnToggle.querySelector(".icono-toggle");
          if (icono) {
            icono.style.transform = estaActivo ? "rotate(180deg)" : "rotate(0deg)";
          }
          if (estaActivo) {
            seccion.style.maxHeight = seccion.scrollHeight + "px";
            seccion.style.opacity = "1";
            seccion.style.marginTop = "10px";
          } else {
            seccion.style.maxHeight = "0px";
            seccion.style.opacity = "0";
            seccion.style.marginTop = "0px";
          }
        });

        accContainer.appendChild(btnToggle);
        accContainer.appendChild(seccion);
        listaEl.appendChild(accContainer);
      });

      // Render resolved reports (history) in their own accordion at the bottom if they exist
      if (reportesLeidos.length > 0) {
        const accContainer = document.createElement("div");
        accContainer.style.marginTop = "24px";
        accContainer.style.marginBottom = "12px";

        const btnToggle = document.createElement("button");
        btnToggle.type = "button";
        btnToggle.className = "btn btn-ghost";
        btnToggle.style.width = "100%";
        btnToggle.style.display = "flex";
        btnToggle.style.justifyContent = "space-between";
        btnToggle.style.alignItems = "center";
        btnToggle.style.padding = "10px 16px";
        btnToggle.style.borderRadius = "10px";
        btnToggle.style.background = "rgba(255, 255, 255, 0.01)";
        btnToggle.style.fontWeight = "600";
        btnToggle.style.border = "1px solid var(--border)";
        btnToggle.style.fontSize = "12.5px";
        btnToggle.style.color = "var(--text-soft)";
        btnToggle.style.cursor = "pointer";

        btnToggle.innerHTML = `
          <span style="display: flex; align-items: center; gap: 8px;">
            ✅ Historial de Reportes Resueltos <span class="chip chip-soft" style="background: rgba(16, 185, 129, 0.1); color: var(--success); font-size: 11px; padding: 2px 6px; border-radius: 6px;">${reportesLeidos.length} resueltos</span>
          </span>
          <span class="icono-toggle" style="transition: transform 0.3s ease; font-size: 11px;">▼</span>
        `;

        const seccion = document.createElement("div");
        seccion.className = "cajon-desplegable";
        seccion.style.display = "flex";
        seccion.style.flexDirection = "column";
        seccion.style.gap = "12px";

        reportesLeidos.forEach(r => {
          const card = ui.crearReportCard(r);
          seccion.appendChild(card);
        });

        btnToggle.addEventListener("click", () => {
          const estaActivo = !seccion.classList.contains("activo");
          seccion.classList.toggle("activo", estaActivo);
          const icono = btnToggle.querySelector(".icono-toggle");
          if (icono) {
            icono.style.transform = estaActivo ? "rotate(180deg)" : "rotate(0deg)";
          }
          if (estaActivo) {
            seccion.style.maxHeight = seccion.scrollHeight + "px";
            seccion.style.opacity = "1";
            seccion.style.marginTop = "10px";
          } else {
            seccion.style.maxHeight = "0px";
            seccion.style.opacity = "0";
            seccion.style.marginTop = "0px";
          }
        });

        accContainer.appendChild(btnToggle);
        accContainer.appendChild(seccion);
        listaEl.appendChild(accContainer);
      }

    } catch (error) {
      console.error("Error al cargar reportes para el admin:", error);
    }
  },

  crearReportCard(r) {
    const d = new Date(r.fecha);
    const fechaTxt = d.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const card = document.createElement("div");
    card.className = `report-card ${r.leido === 0 ? "unread" : "resolved"}`;
    card.id = `reporte-card-${r.id}`;

    let botonResolucionHtml = "";
    if (r.leido === 0) {
      botonResolucionHtml = `
        <div class="report-card-actions" style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px;">
          <button class="btn-corregir-pregunta-admin" type="button" style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); color: var(--warning); font-size: 11.5px; font-weight: 600; padding: 5px 10px; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;">Corregir Pregunta</button>
          <button class="btn-resolver-reporte" data-id="${r.id}" type="button">✓ Marcar como Resuelto</button>
        </div>
      `;
    } else {
      botonResolucionHtml = `
        <div class="report-card-actions" style="font-size: 11px; color: var(--success); font-weight: bold; margin-top: 10px; display: flex; justify-content: flex-end;">
          ✓ Resuelto y Verificado
        </div>
      `;
    }

    card.innerHTML = `
      <div class="report-card-header" style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-dim); margin-bottom: 6px;">
        <div>
          Reportante: <span class="report-card-reporter" style="font-weight: 600; color: var(--text-soft);">${r.usuario_nombre}</span> (${r.usuario_email})
        </div>
        <span class="report-card-date">${fechaTxt}</span>
      </div>
      <div style="font-size: 11.5px; color: var(--text-dim); margin-bottom: 4px;">
        Materia: <strong style="color: var(--primary);">${r.pregunta_tema}</strong>
      </div>
      <div class="report-card-qtext" style="font-size: 13px; color: var(--text); line-height: 1.4; margin-bottom: 6px; padding: 8px; background: rgba(255, 255, 255, 0.01); border: 1px solid var(--border); border-radius: 8px;">
        <strong>Pregunta:</strong> ${r.pregunta_texto}
      </div>
      <div style="margin-bottom: 6px;">
        <span class="report-card-category" style="background: rgba(239, 68, 68, 0.1); color: var(--danger); font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 12px; display: inline-block;">${r.motivo}</span>
      </div>
      <div class="report-card-comment" style="font-size: 12px; color: var(--text-soft); padding: 8px; background: rgba(0,0,0,0.1); border-radius: 8px; border-left: 3px solid var(--danger);">
        <strong>Comentario del médico:</strong> ${r.comentario || "Sin comentarios adicionales."}
      </div>
      ${botonResolucionHtml}
    `;

    // Bind event listeners
    if (r.leido === 0) {
      const btnCorregir = card.querySelector(".btn-corregir-pregunta-admin");
      if (btnCorregir) {
        btnCorregir.addEventListener("click", () => {
          ui.abrirModalCorreccionPregunta(r);
        });
      }

      const btnResolver = card.querySelector(".btn-resolver-reporte");
      if (btnResolver) {
        btnResolver.addEventListener("click", async (e) => {
          e.stopPropagation();
          try {
            await api.resolverReporteError(r.id);
            alert("✓ Reporte marcado como resuelto. ¡Excelente gestión!");
            await ui.cargarReportesAdministrador();
          } catch (err) {
            alert("✗ Error al resolver el reporte: " + err.message);
          }
        });
      }
    }

    return card;
  },

  abrirModalCorreccionPregunta(r) {
    const modal = document.getElementById("modal-corregir-pregunta");
    if (!modal) return;

    // Poblar IDs
    document.getElementById("modal-corregir-pregunta-id").value = r.pregunta_id;
    document.getElementById("modal-corregir-reporte-id").value = r.id;

    // Poblar Enunciado
    document.getElementById("modal-corregir-texto").value = r.pregunta_texto;

    // Parsear Opciones
    let opcionesArray = state.safeParseOpciones(r.pregunta_opciones);

    // Poblar Opciones en los inputs correspondientes
    for (let i = 0; i < 4; i++) {
      const opcInput = document.getElementById(`modal-corregir-opc${i}`);
      if (opcInput) {
        opcInput.value = opcionesArray[i] || "";
      }
    }

    // Poblar el resto de campos
    document.getElementById("modal-corregir-correcta").value = r.pregunta_correcta;
    document.getElementById("modal-corregir-tema").value = r.pregunta_tema;
    document.getElementById("modal-corregir-subtema").value = r.pregunta_subtema || "";
    document.getElementById("modal-corregir-explicacion").value = r.pregunta_explicacion || "";
    document.getElementById("modal-corregir-fuente").value = r.pregunta_fuente || "";

    // Poblar nuevos campos FASE 3 (Examen y Dificultad)
    const selectExamen = document.getElementById("modal-corregir-examen-id");
    if (selectExamen) {
      if (r.pregunta_examen_id) {
        let existeOpcion = false;
        for (let idxOpt = 0; idxOpt < selectExamen.options.length; idxOpt++) {
          if (parseInt(selectExamen.options[idxOpt].value) === parseInt(r.pregunta_examen_id)) {
            existeOpcion = true;
            break;
          }
        }
        if (!existeOpcion) {
          selectExamen.innerHTML += `<option value="${r.pregunta_examen_id}">${r.pregunta_fuente || 'Examen asociado'}</option>`;
        }
      }
      selectExamen.value = r.pregunta_examen_id || "";
    }
    const inputDificultad = document.getElementById("modal-corregir-dificultad");
    if (inputDificultad) {
      inputDificultad.value = r.pregunta_difficulty !== undefined ? r.pregunta_difficulty : 0.5;
    }

    // Abrir Modal
    modal.classList.add("active");
  },

  async cargarExamenesAdministrador() {
    const listaEl = document.getElementById("admin-examenes-lista");
    const selectCrearPregunta = document.getElementById("admin-pregunta-examen-id");
    const selectCorregirPregunta = document.getElementById("modal-corregir-examen-id");
    const selectCargaMasiva = document.getElementById("select-carga-masiva-examen-id");

    if (!listaEl) return;

    try {
      const examenes = await api.obtenerExamenes();
      
      // 1. Población de la lista visual de gestión de exámenes
      listaEl.innerHTML = "";
      if (examenes.length === 0) {
        listaEl.innerHTML = `<div class="history-empty" style="padding: 10px; font-size: 12px; color: var(--text-dim);">No hay exámenes oficiales registrados.</div>`;
      } else {
        examenes.forEach(ex => {
          const item = document.createElement("div");
          item.className = "review-item";
          item.style.padding = "10px 14px";
          item.style.display = "flex";
          item.style.alignItems = "center";
          item.style.justifyContent = "space-between";
          item.style.background = "rgba(255, 255, 255, 0.01)";
          item.style.border = "1px solid var(--border)";
          item.style.borderRadius = "8px";
          item.style.marginBottom = "4px";

          const estaActivo = ex.activo === 1;

          item.innerHTML = `
            <div style="text-align: left;">
              <span style="font-weight: 600; font-size: 13px; color: var(--text); display: block;">${ex.nombre}</span>
              <span style="font-size: 11px; color: var(--text-dim);">Año: ${ex.ano} • Preguntas Activas: <strong style="color: var(--warning);">${ex.cantidad_preguntas}</strong></span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <!-- Toggle switch premium -->
              <label class="switch" style="position: relative; display: inline-block; width: 34px; height: 18px; cursor: pointer;">
                <input type="checkbox" class="chk-examen-activo" data-id="${ex.id}" ${estaActivo ? "checked" : ""} style="opacity: 0; width: 0; height: 0;">
                <span class="slider round" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--border-strong); transition: .3s; border-radius: 18px;"></span>
              </label>
              <button class="btn btn-ghost btn-editar-examen" data-id="${ex.id}" style="padding: 4px 8px; font-size: 11px; min-width: auto;" type="button">✏️</button>
            </div>
          `;

          // Vincular evento de toggle de activación
          const chkActivo = item.querySelector(".chk-examen-activo");
          if (chkActivo) {
            chkActivo.addEventListener("change", async () => {
              const nuevoEstado = chkActivo.checked ? 1 : 0;
              try {
                await api.editarExamen(ex.id, ex.nombre, ex.ano, nuevoEstado);
                console.log(`Examen ${ex.nombre} cambiado a estado activo=${nuevoEstado}`);
              } catch (err) {
                chkActivo.checked = !chkActivo.checked; // restaurar estado visual si falla
                alert("Error al alternar estado activo del examen: " + err.message);
              }
            });
          }

          // Vincular evento de edición interactiva
          const btnEditar = item.querySelector(".btn-editar-examen");
          if (btnEditar) {
            btnEditar.addEventListener("click", () => {
              const nuevoNombre = prompt("Editar Nombre del Examen:", ex.nombre);
              if (nuevoNombre === null || nuevoNombre.trim() === "") return;
              const nuevoAno = prompt("Editar Año del Examen:", ex.ano);
              if (nuevoAno === null || nuevoAno.trim() === "") return;

              api.editarExamen(ex.id, nuevoNombre.trim(), parseInt(nuevoAno), ex.activo)
                .then(() => {
                  alert("✓ Examen actualizado correctamente.");
                  ui.cargarExamenesAdministrador();
                })
                .catch(err => {
                  alert("✗ Error al editar examen: " + err.message);
                });
            });
          }

          listaEl.appendChild(item);
        });
      }

      // 2. Población de los dropdowns de asociación a examen (Crear, Corregir y Carga Masiva)
      [selectCrearPregunta, selectCorregirPregunta, selectCargaMasiva].forEach(sel => {
        if (sel) {
          sel.innerHTML = `<option value="">-- Banco General (Sin Examen) --</option>`;
          examenes.forEach(ex => {
            if (ex.activo === 1) {
              sel.innerHTML += `<option value="${ex.id}">${ex.nombre} (Año: ${ex.ano})</option>`;
            }
          });
        }
      });

    } catch (error) {
      console.error("Error al cargar exámenes de administración:", error);
    }
  },


  filtrarRevision(tipo) {
    const revisionContainer = document.getElementById("revision-container");
    if (!revisionContainer) return;

    const items = revisionContainer.querySelectorAll(".review-item");
    items.forEach(item => {
      if (tipo === "todas") {
        item.classList.remove("hidden");
      } else if (tipo === "marcadas") {
        if (item.classList.contains("review-flagged")) {
          item.classList.remove("hidden");
        } else {
          item.classList.add("hidden");
        }
      } else if (tipo === "erradas") {
        if (item.classList.contains("review-wrong")) {
          item.classList.remove("hidden");
        } else {
          item.classList.add("hidden");
        }
      }
    });

    const btnTodas = document.getElementById("btn-filtro-revision-todas");
    const btnMarcadas = document.getElementById("btn-filtro-revision-marcadas");
    const btnErradas = document.getElementById("btn-filtro-revision-erradas");

    [btnTodas, btnMarcadas, btnErradas].forEach(b => {
      if (b) b.classList.remove("active");
    });

    if (tipo === "todas" && btnTodas) btnTodas.classList.add("active");
    if (tipo === "marcadas" && btnMarcadas) btnMarcadas.classList.add("active");
    if (tipo === "erradas" && btnErradas) btnErradas.classList.add("active");
  },

  formatearExplicacionClinica(explicacion, fuente, explicacionCorrecta, explicacionIncorrecta) {
    if (!explicacion && !explicacionCorrecta) return `<div class="exp-vacia" style="color: var(--text-dim); font-size: 13.5px; font-style: italic;">Sin explicación docente registrada.</div>`;

    let justificacion = "";
    let descarte = "";
    
    if (explicacionCorrecta || explicacionIncorrecta) {
      justificacion = explicacionCorrecta || "";
      descarte = explicacionIncorrecta || "";
    } else if (explicacion) {
      const regexJust = /(?:🔬\s*)?JUSTIFICACIÓN\s*\((?:Por\s+qué\s+SÍ|Por\s+que\s+SI)\):?/i;
      const regexDesc = /(?:🚫\s*)?DESCARTE\s*\((?:Por\s+qué\s+NO|Por\s+que\s+NO)\):?/i;
      
      let matchJust = explicacion.match(regexJust);
      let matchDesc = explicacion.match(regexDesc);
      
      if (matchJust && matchDesc) {
        const idxJust = matchJust.index;
        const lenJust = matchJust[0].length;
        const idxDesc = matchDesc.index;
        const lenDesc = matchDesc[0].length;
        
        if (idxJust < idxDesc) {
          justificacion = explicacion.substring(idxJust + lenJust, idxDesc).trim();
          descarte = explicacion.substring(idxDesc + lenDesc).trim();
        } else {
          descarte = explicacion.substring(idxDesc + lenDesc, idxJust).trim();
          justificacion = explicacion.substring(idxJust + lenJust).trim();
        }
      } else if (matchJust) {
        const idxJust = matchJust.index;
        const lenJust = matchJust[0].length;
        justificacion = explicacion.substring(idxJust + lenJust).trim();
      } else if (matchDesc) {
        const idxDesc = matchDesc.index;
        const lenDesc = matchDesc[0].length;
        descarte = explicacion.substring(idxDesc + lenDesc).trim();
      } else {
        justificacion = explicacion.trim();
      }
    }
    
    justificacion = justificacion.replace(/^\n+|\n+$/g, "").replace(/\n/g, "<br>");
    descarte = descarte.replace(/^\n+|\n+$/g, "").replace(/\n/g, "<br>");
    
    if (descarte) {
      const bullets = descarte.split("<br>");
      const bulletsFormateados = bullets.map(b => {
        const trimmed = b.trim();
        if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
          let contenido = trimmed.substring(1).trim();
          if (contenido.includes(":")) {
            const partes = contenido.split(":");
            const titulo = partes[0].trim();
            const resto = partes.slice(1).join(":").trim();
            return `<div class="descarte-bullet"><span class="descarte-bullet-dot"></span><div><span class="descarte-bullet-title">${titulo}:</span> ${resto}</div></div>`;
          }
          return `<div class="descarte-bullet"><span class="descarte-bullet-dot"></span><div>${contenido}</div></div>`;
        }
        return trimmed;
      }).filter(b => b.length > 0).join("");
      
      descarte = bulletsFormateados;
    }

    const fuenteHtml = fuente ? `
      <div class="clinical-source-box">
        <span class="clinical-source-label">Fuente oficial:</span>
        <span class="clinical-source-text">${fuente}</span>
      </div>
    ` : `
      <div class="clinical-source-box">
        <span class="clinical-source-label">Fuente oficial:</span>
        <span class="clinical-source-text">ENURM Referencia Académica Oficial</span>
      </div>
    `;

    let html = `<div class="clinical-explanation-wrapper">`;
    
    if (justificacion) {
      html += `
        <div class="clinical-box clinical-box-justification">
          <div class="clinical-box-header">
            <span class="clinical-box-title">JUSTIFICACIÓN (Respuesta Correcta)</span>
          </div>
          <div class="clinical-box-content">${justificacion}</div>
        </div>
      `;
    }
    
    if (descarte) {
      html += `
        <div class="clinical-box clinical-box-discard">
          <div class="clinical-box-header">
            <span class="clinical-box-title">EXPLICACIÓN DE OPCIONES INCORRECTAS</span>
          </div>
          <div class="clinical-box-content">${descarte}</div>
        </div>
      `;
    }
    
    html += fuenteHtml;
    html += `</div>`;
    
    return html;
  },

  // Cargar Ajustes del Usuario (Modularizado en js/ui_profile.js)
  cargarAjustesUsuario() {
    // Se sobreescribe dinámicamente al cargar js/ui_profile.js
  }
};


// FASE 4: Ruteo e interactividad con el botón Atrás del navegador
window.addEventListener("popstate", (e) => {
  const sesion = sessionStorage.getItem("resiMed_session");
  if (!sesion) {
    ui.mostrarPantalla("auth", false);
    return;
  }

  if (e.state && e.state.pantalla) {
    ui.mostrarPantalla(e.state.pantalla, false);
  } else {
    ui.mostrarPantalla("home", false);
  }
});

window.ui = ui;
