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

    if (pushState) {
      window.history.pushState({ pantalla: nombrePantalla }, "", "#" + nombrePantalla);
    }

    const pantallas = ["pantalla-auth", "pantalla-home", "pantalla-perfil", "pantalla-flashcards", "pantalla-quiz", "pantalla-resultados"];
    
    pantallas.forEach(pId => {
      const el = document.getElementById(pId);
      if (el) el.classList.remove("active");
    });

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

    // Refrescar analíticas y gamificación al cambiar al Home o Perfil
    if (nombrePantalla === "home") {
      ui.cargarDashboardHome();
      ui.cargarHistorialReciente();
    } else if (nombrePantalla === "perfil") {
      ui.actualizarProgresoEstudiante();
      const tabPerfilProgreso = document.getElementById("tab-perfil-progreso");
      if (tabPerfilProgreso) tabPerfilProgreso.click();
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

  // RENDERIZAR GRID DE ESPECIALIDADES EN MI PERFIL
  async inicializarGridEspecialidades() {
    const grid = document.getElementById("perfil-especialidades-grid");
    if (!grid) return;
    
    grid.innerHTML = "";
    state.LISTA_ESPECIALIDADES.forEach(esp => {
      const card = document.createElement("div");
      card.className = "specialty-analytics-card interactive";
      card.setAttribute("data-id", esp.id);
      
      card.innerHTML = `
        <div class="specialty-analytics-header">
          <span class="specialty-analytics-title">${esp.emoji} ${esp.nombre}</span>
          <div class="specialty-analytics-score-label">Nota: <span id="porcentaje-${esp.id}" class="specialty-analytics-score-val">0%</span></div>
        </div>
        <!-- Barra de Nota -->
        <div class="specialty-analytics-bar-bg">
          <div id="barra-${esp.id}" class="specialty-analytics-bar-fill"></div>
        </div>
        <!-- Cobertura -->
        <div class="specialty-analytics-coverage-header">
          <span>Cobertura del Banco:</span>
          <span id="cobertura-texto-${esp.id}" class="specialty-analytics-coverage-val">0 / 0 (0%)</span>
        </div>
        <div class="specialty-analytics-coverage-bar-bg">
          <div id="cobertura-barra-${esp.id}" class="specialty-analytics-coverage-bar-fill"></div>
        </div>
        <div style="font-size: 11px; text-align: center; color: var(--primary); margin-top: 4px; font-weight: 600;">🔍 Ver debilidades y libros</div>
      `;
      
      card.addEventListener("click", () => {
        ui.abrirAnalisisEspecialidad(esp);
      });
      
      grid.appendChild(card);
    });
  },

  async abrirAnalisisEspecialidad(esp) {
    const modal = document.getElementById("modal-debilidades-especialidad");
    if (!modal) return;

    // Poblar título y métricas iniciales desde el perfil
    const tituloEl = document.getElementById("modal-debilidades-titulo");
    if (tituloEl) tituloEl.textContent = `${esp.emoji} Análisis: ${esp.nombre}`;

    const notaEl = document.getElementById(`porcentaje-${esp.id}`);
    const coberturaEl = document.getElementById(`cobertura-texto-${esp.id}`);

    const modalNota = document.getElementById("modal-debilidades-nota");
    const modalCobertura = document.getElementById("modal-debilidades-cobertura");

    if (modalNota && notaEl) {
      modalNota.textContent = notaEl.textContent;
      modalNota.style.color = notaEl.style.color;
    }
    if (modalCobertura && coberturaEl) {
      modalCobertura.textContent = coberturaEl.textContent;
    }

    // Cargar Retroalimentación Académica Adaptativa (Fase 2)
    const retroEl = document.getElementById("modal-debilidades-retroalimentacion");
    if (retroEl) {
      const scoreText = (notaEl ? notaEl.textContent : "0%").replace("%", "");
      const score = parseInt(scoreText) || 0;
      const vistasText = (coberturaEl ? coberturaEl.textContent : "0 / 0").split(" ")[0];
      const vistas = parseInt(vistasText) || 0;

      let feedbackBadge = "";
      let feedbackText = "";
      let feedbackBg = "";
      let feedbackBorder = "";
      let feedbackColor = "";

      if (vistas === 0) {
        feedbackBadge = "⚪ Sin Datos";
        feedbackText = "Aún no has respondido preguntas de esta especialidad en tus simulacros. ¡Inicia un entrenamiento para evaluar tu nivel!";
        feedbackBg = "rgba(255,255,255,0.02)";
        feedbackBorder = "1px solid var(--border)";
        feedbackColor = "var(--text-soft)";
      } else if (score >= 85) {
        feedbackBadge = "🏆 Sobresaliente";
        feedbackText = "¡Rendimiento excepcional! Tu precisión y dominio conceptual en esta especialidad son sobresalientes. Sigue así y afianza repasando flashcards complejas.";
        feedbackBg = "rgba(34, 197, 94, 0.04)";
        feedbackBorder = "1px solid rgba(34, 197, 94, 0.2)";
        feedbackColor = "var(--success)";
      } else if (score >= 70) {
        feedbackBadge = "✅ Buen Nivel";
        feedbackText = "Buen rendimiento general. Demuestras bases sólidas en esta materia, pero te sugerimos revisar las debilidades listadas abajo para pulir tu precisión.";
        feedbackBg = "rgba(16, 185, 129, 0.03)";
        feedbackBorder = "1px solid rgba(16, 185, 129, 0.15)";
        feedbackColor = "#10b981";
      } else {
        feedbackBadge = "⚠️ Debe Mejorar";
        feedbackText = "Requieres reforzar esta materia de forma prioritaria. Te recomendamos revisar detalladamente las explicaciones de tus simulacros y la bibliografía oficial indicada abajo.";
        feedbackBg = "rgba(245, 158, 11, 0.03)";
        feedbackBorder = "1px solid rgba(245, 158, 11, 0.2)";
        feedbackColor = "var(--warning)";
      }

      retroEl.innerHTML = `
        <div style="background: ${feedbackBg}; border: ${feedbackBorder}; border-radius: 12px; padding: 14px 18px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
            <span style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-dim);">Evaluación de Nivel:</span>
            <span class="chip" style="background: rgba(255,255,255,0.03); border-color: ${feedbackColor}; color: ${feedbackColor}; font-size: 11px; font-weight: 700; padding: 3px 10px; margin:0;">${feedbackBadge}</span>
          </div>
          <p style="margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--text-soft); font-weight: 500;">${feedbackText}</p>
        </div>
      `;
    }

    // Calcular debilidades reales
    const listaTemasEl = document.getElementById("modal-debilidades-lista-temas");
    if (listaTemasEl) {
      listaTemasEl.innerHTML = '<div style="color: var(--text-dim); font-size:13px; font-style:italic;">Analizando historial académico...</div>';
    }

    try {
      const [historial, mapeoPreguntas] = await Promise.all([
        api.obtenerHistorialCompleto(state.usuarioConectado.id),
        api.obtenerMapeoTemas().catch(() => ({}))
      ]);
      const fallosPorSubtema = {};

      historial.forEach(sesion => {
        if (sesion.detalle) {
          try {
            const preguntas = JSON.parse(sesion.detalle);
            if (Array.isArray(preguntas)) {
              preguntas.forEach(p => {
                // Resolver el tema y subtema real de forma robusta cruzándolo con la base de datos
                let temaReal = p.tema;
                let subtemaReal = p.subtema;

                const deMapeo = (p.id && mapeoPreguntas[p.id]) || (p.texto && mapeoPreguntas[p.texto]);
                if (deMapeo) {
                  temaReal = deMapeo.tema || temaReal;
                  subtemaReal = deMapeo.subtema || subtemaReal;
                }

                const espIdPregunta = ui.normalizarTema(temaReal);

                if (espIdPregunta === esp.id && p.seleccionada !== p.correcta && p.seleccionada !== null) {
                  const subtema = (subtemaReal || "Conceptos Generales").trim();
                  fallosPorSubtema[subtema] = (fallosPorSubtema[subtema] || 0) + 1;
                }
              });
            }
          } catch (e) {
            console.warn("Falla en parseo de detalles de sesión:", e);
          }
        }
      });

      const subtemasOrdenados = Object.keys(fallosPorSubtema).map(key => ({
        nombre: key,
        conteo: fallosPorSubtema[key]
      })).sort((a, b) => b.conteo - a.conteo);

      if (listaTemasEl) {
        listaTemasEl.innerHTML = "";
        if (subtemasOrdenados.length === 0) {
          listaTemasEl.innerHTML = `
            <div style="background: rgba(34, 197, 94, 0.04); border: 1px solid rgba(34,197,94,0.15); padding: 12px; border-radius: 12px; font-size:12.5px; color: var(--success); display:flex; align-items:center; gap:8px;">
              <strong>¡Excelente rendimiento! No tienes fallas registradas en esta materia.</strong>
            </div>
          `;
        } else {
          const topDebilidades = subtemasOrdenados.slice(0, 3);
          topDebilidades.forEach((d, index) => {
            const row = document.createElement("div");
            row.style.display = "flex";
            row.style.alignItems = "center";
            row.style.justifyContent = "space-between";
            row.style.background = "rgba(255,255,255,0.02)";
            row.style.border = "1px solid var(--border)";
            row.style.padding = "10px 14px";
            row.style.borderRadius = "10px";
            row.innerHTML = `
              <div style="display:flex; align-items:center; gap:8px; font-size:13px;">
                <span style="width: 20px; height: 20px; background: rgba(239,68,68,0.1); color: var(--danger); border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:11px;">${index + 1}</span>
                <span style="font-weight: 600; color: var(--text);">${d.nombre}</span>
              </div>
              <span class="chip chip-soft" style="border-color: rgba(239,68,68,0.2); color: var(--danger); font-size:11px; padding:2px 8px; margin:0;">${d.conteo} fallos</span>
            `;
            listaTemasEl.appendChild(row);
          });
        }
      }
    } catch (err) {
      console.error("Falla al analizar debilidades:", err);
      if (listaTemasEl) {
        listaTemasEl.innerHTML = '<div style="color: var(--danger); font-size:13px;">✗ Error al cargar el análisis de rendimiento.</div>';
      }
    }

    const libroCoverEl = document.getElementById("modal-debilidades-libro-cover");
    const libroTituloEl = document.getElementById("modal-debilidades-libro-titulo");
    const libroDescEl = document.getElementById("modal-debilidades-libro-desc");

    let recLibro = {
      titulo: "Harrison's Principles of Internal Medicine, 21.ª Edición",
      desc: "Harrison es la referencia oficial principal de Medicina Interna para el ENURM. Enfócate en fisiopatología y esquemas terapéuticos.",
      cover: "🫁"
    };

    const espNombreLower = esp.nombre.trim().toLowerCase();

    if (espNombreLower === "pediatría") {
      recLibro = {
        titulo: "Nelson Textbook of Pediatrics, 21.ª Edición",
        desc: "Nelson es la biblia pediátrica del ENURM. Repasa a fondo el Capítulo de Enfermedades Respiratorias, Infectología y el esquema de vacunación oficial.",
        cover: "👶"
      };
    } else if (espNombreLower === "gineco-obstetricia") {
      recLibro = {
        titulo: "Williams Obstetrics, 26.ª Edición & Novak's Gynecology, 16.ª Edición",
        desc: "Williams y Novak son las guías de oro para Gineco-Obstetricia en el ENURM. Dedica tiempo a repasar hemorragias de la gestación y endocrinología ginecológica.",
        cover: "🤰"
      };
    } else if (espNombreLower === "cirugía general" || espNombreLower.includes("trauma")) {
      recLibro = {
        titulo: "Schwartz's Principles of Surgery, 11.ª Edición",
        desc: "Schwartz es la referencia quirúrgica por excelencia del ENURM. Repasa abdomen agudo, trauma hepático/esplénico y patología vesicular de elección.",
        cover: "🥼"
      };
    } else if (espNombreLower.includes("básicas")) {
      recLibro = {
        titulo: "Guyton & Hall Tratado de Fisiología Médica, 14.ª Edición",
        desc: "Guyton & Hall proporciona los cimientos moleculares para el bloque de Ciencias Básicas. Te ayudará a razonar de forma científica los descartes clínicos.",
        cover: "🧬"
      };
    }

    if (libroCoverEl) libroCoverEl.textContent = recLibro.cover;
    if (libroTituloEl) libroTituloEl.textContent = recLibro.titulo;
    if (libroDescEl) libroDescEl.textContent = recLibro.desc;

    modal.classList.add("active");
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

  // CARGAR DASHBOARD HOME CON GAMIFICACIÓN EN TIEMPO REAL
  async cargarDashboardHome() {
    if (!state.usuarioConectado) return;
    try {
      const datos = await api.obtenerResumenDashboard(state.usuarioConectado.id);
      
      // Sincronizar estado local con el backend por si cambió XP/Nivel
      state.usuarioConectado.xp = datos.xp;
      state.usuarioConectado.nivel = datos.nivel;
      state.usuarioConectado.streak = datos.streak;
      state.usuarioConectado.metaSemanal = datos.metaSemanal;
      localStorage.setItem("resiMed_session", JSON.stringify(state.usuarioConectado));

      document.getElementById("resumen-total-sesiones").textContent = datos.totalSesiones;
      document.getElementById("resumen-promedio-general").textContent = datos.promedioGeneral + "%";
      document.getElementById("dashboard-mejor-porcentaje").textContent = datos.mejorPorcentaje + "%";
      document.getElementById("dashboard-total-preguntas").textContent = datos.totalPreguntasRespondidas;

      ui.actualizarWidgetGamificacion();
    } catch (err) {
      console.error("Error al renderizar el dashboard:", err);
    }
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
        api.obtenerResumenDashboard(user.id),
        api.obtenerFlashcardsPersonalizadas(user.id).catch(() => []),
        api.obtenerRepeticionEspaciada(user.id).catch(() => []),
        api.obtenerHistorialDiarioFlashcards(user.id).catch(() => [])
      ]);
      
      const pExamenes = document.getElementById("progreso-total-examenes");
      const pPreguntas = document.getElementById("progreso-total-preguntas");
      const pPromedio = document.getElementById("progreso-promedio-global");
      const pFlashcardsActivas = document.getElementById("progreso-flashcards-activas");
      const pConceptosDebiles = document.getElementById("progreso-conceptos-debiles");

      if (pExamenes) pExamenes.textContent = datosResumen.totalSesiones || 0;
      if (pPreguntas) pPreguntas.textContent = datosResumen.totalPreguntasRespondidas || 0;
      
      if (pPromedio) {
        pPromedio.textContent = `${datosResumen.promedioGeneral || 0}%`;
        let colorPromedio = "var(--danger)";
        if (datosResumen.promedioGeneral >= 75) {
          colorPromedio = "var(--success)";
        } else if (datosResumen.promedioGeneral >= 50) {
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

      const historial = await api.obtenerHistorialCompleto(user.id);

      // Renderizar tabla de evaluaciones
      ui.renderizarTablaHistorial(historial);
      
      // Renderizar tabla de historial diario de flashcards
      ui.renderizarTablaDiarioFlashcards(diarioFlashcards);

      // Vincular toggle del Cajón Desplegable de Gráficos Analíticos
      const btnToggle = document.getElementById("btn-toggle-graficos");
      if (btnToggle && !btnToggle.dataset.hasListener) {
        btnToggle.dataset.hasListener = "true";
        btnToggle.addEventListener("click", () => {
          const seccion = document.getElementById("seccion-graficos-desplegable");
          if (seccion) {
            const estaActivo = seccion.classList.toggle("activo");
            btnToggle.classList.toggle("activo", estaActivo);
            const icono = document.getElementById("icono-toggle-graficos");
            if (icono) {
              icono.textContent = estaActivo ? "▲" : "▼";
            }
            if (estaActivo) {
              // Dibujar los gráficos dinámicos con Chart.js
              ui.renderizarGraficosAvanzados(historial, srEstados, personalizadas.length);
            }
          }
        });
      }
      
      // Si la sección de gráficos ya está activa al recargar el perfil, refrescarlos en caliente
      const seccionGraficos = document.getElementById("seccion-graficos-desplegable");
      if (seccionGraficos && seccionGraficos.classList.contains("activo")) {
        ui.renderizarGraficosAvanzados(historial, srEstados, personalizadas.length);
      }

      // Vincular toggle del Cajón Desplegable del Historial de Evaluaciones
      const btnToggleEval = document.getElementById("btn-toggle-evaluaciones");
      if (btnToggleEval && !btnToggleEval.dataset.hasListener) {
        btnToggleEval.dataset.hasListener = "true";
        btnToggleEval.addEventListener("click", () => {
          const seccionEval = document.getElementById("seccion-evaluaciones-desplegable");
          if (seccionEval) {
            const estaActivoEval = seccionEval.classList.toggle("activo");
            btnToggleEval.classList.toggle("activo", estaActivoEval);
            const iconoEval = document.getElementById("icono-toggle-evaluaciones");
            if (iconoEval) {
              iconoEval.textContent = estaActivoEval ? "▲" : "▼";
            }
          }
        });
      }

      // Vincular toggle del Cajón Desplegable de Cobertura por Especialidad
      const btnToggleEsp = document.getElementById("btn-toggle-especialidades");
      if (btnToggleEsp && !btnToggleEsp.dataset.hasListener) {
        btnToggleEsp.dataset.hasListener = "true";
        btnToggleEsp.addEventListener("click", () => {
          const seccionEsp = document.getElementById("seccion-especialidades-desplegable");
          if (seccionEsp) {
            const estaActivoEsp = seccionEsp.classList.toggle("activo");
            btnToggleEsp.classList.toggle("activo", estaActivoEsp);
            const iconoEsp = document.getElementById("icono-toggle-especialidades");
            if (iconoEsp) {
              iconoEsp.textContent = estaActivoEsp ? "▲" : "▼";
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
            const estaActivoDiario = seccionDiario.classList.toggle("activo");
            btnToggleDiario.classList.toggle("activo", estaActivoDiario);
            const iconoDiario = document.getElementById("icono-toggle-diario");
            if (iconoDiario) {
              iconoDiario.textContent = estaActivoDiario ? "▲" : "▼";
            }
          }
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

      // Actualizar barras de rendimiento por especialidad
      state.LISTA_ESPECIALIDADES.forEach(esp => {
        const info = conteoEspecialidades[esp.id];
        let porcentajeFinal = 0;
        if (info && info.totales > 0) {
          porcentajeFinal = Math.round((info.correctas / info.totales) * 100);
        }

        let colorSemaforo = "var(--danger)";
        if (porcentajeFinal >= 75) {
          colorSemaforo = "var(--success)";
        } else if (porcentajeFinal >= 50) {
          colorSemaforo = "var(--warning)";
        }

        const textoEl = document.getElementById(`porcentaje-${esp.id}`);
        const barraEl = document.getElementById(`barra-${esp.id}`);
        
        if (textoEl) {
          textoEl.textContent = `${porcentajeFinal}%`;
          textoEl.style.color = colorSemaforo;
        }
        if (barraEl) {
          barraEl.style.width = `${porcentajeFinal}%`;
          barraEl.style.backgroundColor = colorSemaforo;
        }
      });

      // Actualizar coberturas
      const datosCobertura = await api.obtenerCobertura(user.id);
      state.LISTA_ESPECIALIDADES.forEach(esp => {
        const nombreBuscar = esp.nombre.trim().toLowerCase();
        let data = { totalBanco: 0, respondidas: 0, porcentaje: 0 };
        
        const claveReal = Object.keys(datosCobertura).find(k => k.trim().toLowerCase() === nombreBuscar);
        if (claveReal) {
          data = datosCobertura[claveReal];
        }
        
        const textoEl = document.getElementById(`cobertura-texto-${esp.id}`);
        const barraEl = document.getElementById(`cobertura-barra-${esp.id}`);
        
        if (textoEl) {
          textoEl.textContent = `${data.respondidas} / ${data.totalBanco} (${data.porcentaje}%)`;
        }
        if (barraEl) {
          barraEl.style.width = `${data.porcentaje}%`;
        }
      });

    } catch (error) {
      console.error("Error al cargar el progreso en tiempo real:", error);
    }
  },

  renderizarTablaHistorial(historial) {
    const tablaCuerpo = document.getElementById("tabla-progreso-cuerpo");
    const tablaVacio = document.getElementById("tabla-historial-vacio");
    
    if (!tablaCuerpo) return;

    if (!historial || historial.length === 0) {
      tablaCuerpo.innerHTML = "";
      if (tablaVacio) tablaVacio.classList.remove("hidden");
      return;
    }

    if (tablaVacio) tablaVacio.classList.add("hidden");
    tablaCuerpo.innerHTML = "";

    historial.forEach(sesion => {
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
  },

  renderizarTablaDiarioFlashcards(historial) {
    const tablaCuerpo = document.getElementById("tabla-diario-flashcards-cuerpo");
    const tablaVacio = document.getElementById("tabla-diario-flashcards-vacio");
    
    if (!tablaCuerpo) return;

    if (!historial || historial.length === 0) {
      tablaCuerpo.innerHTML = "";
      if (tablaVacio) tablaVacio.classList.remove("hidden");
      return;
    }

    if (tablaVacio) tablaVacio.classList.add("hidden");
    tablaCuerpo.innerHTML = "";

    historial.forEach(registro => {
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
  },

  renderizarGraficosAvanzados(historial, srEstados, totalPersonalizadas = 0) {
    if (typeof Chart === "undefined") {
      console.warn("Chart.js aún no se ha cargado.");
      return;
    }

    // 1. Destruir de forma segura instancias de gráficos previas
    if (!window.resiMedCharts) {
      window.resiMedCharts = { line: null, bar: null, doughnut: null };
    }
    if (window.resiMedCharts.line) window.resiMedCharts.line.destroy();
    if (window.resiMedCharts.bar) window.resiMedCharts.bar.destroy();
    if (window.resiMedCharts.doughnut) window.resiMedCharts.doughnut.destroy();

    // 2. Extraer datos para el Gráfico 1: Curva de Rendimiento Académico (Line Chart)
    const ultimasSesiones = [...historial]
      .filter(s => s.porcentaje !== undefined && s.fecha)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .slice(-7);

    const labelsLinea = ultimasSesiones.map(s => {
      try {
        const d = new Date(s.fecha);
        return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
      } catch (e) {
        return "q.";
      }
    });
    const dataLinea = ultimasSesiones.map(s => s.porcentaje);

    // Si no hay datos, mostrar placeholders elegantes
    const lineLabels = labelsLinea.length > 0 ? labelsLinea : ["Vacío"];
    const lineData = dataLinea.length > 0 ? dataLinea : [0];

    // Gráfico 1: Line Chart
    const ctxLinea = document.getElementById('chart-rendimiento-linea');
    if (ctxLinea) {
      const isDark = document.body.classList.contains("dark-mode");
      const textColor = isDark ? '#94a3b8' : '#475569';
      const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

      const ctx = ctxLinea.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 200);
      gradient.addColorStop(0, isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(10, 102, 194, 0.25)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

      window.resiMedCharts.line = new Chart(ctx, {
        type: 'line',
        data: {
          labels: lineLabels,
          datasets: [{
            label: 'Precisión (%)',
            data: lineData,
            borderColor: isDark ? '#3b82f6' : '#0A66C2',
            borderWidth: 3,
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: isDark ? '#60a5fa' : '#0A66C2',
            pointBorderColor: isDark ? '#0f172a' : '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              titleColor: isDark ? '#f8fafc' : '#0f172a',
              bodyColor: isDark ? '#cbd5e1' : '#334155',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              borderWidth: 1,
              callbacks: {
                label: (context) => `Nota: ${context.raw}%`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: textColor, font: { size: 11 } }
            },
            y: {
              min: 0,
              max: 100,
              grid: { color: gridColor },
              ticks: { color: textColor, font: { size: 11 }, stepSize: 20 }
            }
          }
        }
      });
    }

    // 3. Extraer datos para el Gráfico 2: Cobertura por Especialidad (Horizontal Bar)
    const conteoEspecialidades = {};
    state.LISTA_ESPECIALIDADES.forEach(esp => {
      conteoEspecialidades[esp.nombre.trim().toLowerCase()] = { correctas: 0, totales: 0 };
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

    const labelsBar = [];
    const dataBar = [];
    const colorsBar = [];

    state.LISTA_ESPECIALIDADES.forEach(esp => {
      const info = conteoEspecialidades[esp.nombre.trim().toLowerCase()];
      if (info && info.totales > 0) {
        labelsBar.push(esp.emoji + " " + esp.nombre.split(" ")[0]);
        const pct = Math.round((info.correctas / info.totales) * 100);
        dataBar.push(pct);
        
        if (pct >= 75) colorsBar.push('rgba(34, 197, 94, 0.7)');
        else if (pct >= 50) colorsBar.push('rgba(245, 158, 11, 0.7)');
        else colorsBar.push('rgba(239, 68, 68, 0.7)');
      }
    });

    if (labelsBar.length === 0) {
      state.LISTA_ESPECIALIDADES.slice(0, 5).forEach(esp => {
        labelsBar.push(esp.emoji + " " + esp.nombre.split(" ")[0]);
        dataBar.push(0);
        colorsBar.push('rgba(148, 163, 184, 0.3)');
      });
    }

    const ctxBarras = document.getElementById('chart-especialidad-barras');
    if (ctxBarras) {
      const isDark = document.body.classList.contains("dark-mode");
      const textColor = isDark ? '#94a3b8' : '#475569';
      const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

      window.resiMedCharts.bar = new Chart(ctxBarras, {
        type: 'bar',
        data: {
          labels: labelsBar,
          datasets: [{
            data: dataBar,
            backgroundColor: colorsBar,
            borderRadius: 6,
            barThickness: 16
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              titleColor: isDark ? '#f8fafc' : '#0f172a',
              bodyColor: isDark ? '#cbd5e1' : '#334155',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              borderWidth: 1,
              callbacks: {
                label: (context) => `Precisión: ${context.raw}%`
              }
            }
          },
          scales: {
            x: {
              min: 0,
              max: 100,
              grid: { color: gridColor },
              ticks: { color: textColor, font: { size: 10 } }
            },
            y: {
              grid: { display: false },
              ticks: { color: textColor, font: { size: 10 } }
            }
          }
        }
      });
    }

    // 4. Extraer datos para el Gráfico 3: Estado de Repetición Espaciada (Doughnut Chart)
    const totalRepasos = srEstados.filter(e => e.flashcard_id);
    const dominadas = totalRepasos.filter(e => e.interval > 0).length;
    const criticas = totalRepasos.filter(e => e.interval === 0).length;

    const totalEstaticas = (typeof baseDatosFlashcardsEstaticas !== "undefined") ? baseDatosFlashcardsEstaticas.length : 0;
    const totalActivas = totalEstaticas + totalPersonalizadas;
    const sinRepasar = Math.max(0, totalActivas - totalRepasos.length);

    const ctxDona = document.getElementById('chart-repeticion-dona');
    if (ctxDona) {
      const isDark = document.body.classList.contains("dark-mode");
      const textColor = isDark ? '#f8fafc' : '#0f172a';

      window.resiMedCharts.doughnut = new Chart(ctxDona, {
        type: 'doughnut',
        data: {
          labels: ['Dominadas', 'Críticas', 'Sin Repasar'],
          datasets: [{
            data: [dominadas, criticas, sinRepasar],
            backgroundColor: [
              'rgba(16, 185, 129, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(59, 130, 246, 0.8)'
            ],
            borderWidth: isDark ? 2 : 1,
            borderColor: isDark ? '#08080a' : '#ffffff',
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: isDark ? '#94a3b8' : '#475569',
                font: { size: 11, weight: '600' },
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
          },
          cutout: '65%'
        }
      });
    }
  },

  // BANCO DE ERRORES DINÁMICO & ANÁLISIS DE DEBILIDADES
  renderizarBancoDeErrores(historial, metricas) {
    const listaEl = document.getElementById("banco-errores-lista");
    const vacioEl = document.getElementById("banco-errores-vacio");
    if (!listaEl) return;
    
    listaEl.innerHTML = "";
    
    // Inyectar sección de Debilidades Críticas en la cabecera si existen
    if (metricas.debilidadesDetectadas.length > 0) {
      const alertDebilidad = document.createElement("div");
      alertDebilidad.style.background = "rgba(239, 68, 68, 0.08)";
      alertDebilidad.style.border = "1px solid rgba(239, 68, 68, 0.25)";
      alertDebilidad.style.borderRadius = "14px";
      alertDebilidad.style.padding = "16px";
      alertDebilidad.style.marginBottom = "24px";
      
      let debilidadesHtml = "";
      metricas.debilidadesDetectadas.forEach(d => {
        debilidadesHtml += `<li><strong>${d.tema}</strong>: Precisión del ${d.porcentaje}% (${d.totales} preguntas analizadas).</li>`;
      });

      alertDebilidad.innerHTML = `
        <h4 style="color: var(--danger); margin:0 0 8px 0; font-size:14px; font-weight:bold; display:flex; align-items:center; gap:8px;">⚠️ Debilidades Clínicas Detectadas (Sección Adaptativa)</h4>
        <p style="font-size:12.5px; color: var(--text-soft); margin:0 0 10px 0;">El algoritmo analítico estima que requieres repasar prioritariamente los siguientes temas:</p>
        <ul style="font-size:12.5px; color: var(--text); padding-left:20px; margin:0;">${debilidadesHtml}</ul>
      `;
      listaEl.appendChild(alertDebilidad);
    }

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
                  tema: p.tema || sesion.tema,
                  subtema: p.subtema || "Varios",
                  microtema: p.microtema || "Varios"
                });
              }
            });
          }
        } catch (e) {
          console.error("Error al estructurar banco de errores:", e);
        }
      }
    });
    
    if (preguntasFalladasMap.size === 0) {
      if (vacioEl) vacioEl.classList.remove("hidden");
      return;
    }
    
    if (vacioEl) vacioEl.classList.add("hidden");
    
    let idx = 0;
    preguntasFalladasMap.forEach(p => {
      idx++;
      const opcionesArray = p.opciones;
      const seleccion = p.seleccionada;
      
      let opcionesHtml = "";
      opcionesArray.forEach((o, oIdx) => {
        let claseOpt = "";
        if (oIdx === p.correcta) claseOpt = "correct";
        if (oIdx === seleccion) claseOpt = "wrong";
        opcionesHtml += `<div class="review-opt ${claseOpt}"><strong>${String.fromCharCode(65 + oIdx)}.</strong> ${o}</div>`;
      });

      const textoEscapado = p.texto.replace(/"/g, "&quot;");
      const explicacionEscapada = (p.explicacion || "Sin desglose.").replace(/"/g, "&quot;");
      const temaEscapado = (p.tema || "General").replace(/"/g, "&quot;");
      
      const seleccionText = (seleccion !== null && opcionesArray[seleccion]) 
        ? opcionesArray[seleccion].replace(/"/g, "&quot;") 
        : "Sin responder";
      
      const div = document.createElement("div");
      div.className = "review-item";
      div.innerHTML = `
        <div class="error-bank-header">
          <span class="chip chip-soft error-bank-chip">Materia: ${p.tema || "General"}</span>
          <span class="chip chip-soft" style="font-size:11px;">Subtema: ${p.subtema || "Varios"}</span>
        </div>
        <div class="review-q-text error-bank-q-text">${idx}. ${p.texto}</div>
        <div class="review-options">${opcionesHtml}</div>
        <div class="review-exp-container">${ui.formatearExplicacionClinica(p.explicacion, p.fuente, p.explicacion_correcta, p.explicacion_incorrecta)}</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top: 10px;">
          <button class="btn-ia btn-consultar-tutor" data-texto="${textoEscapado}" data-seleccion="${seleccionText}" type="button">Consultar Tutor IA</button>
          <button class="btn btn-primary btn-auto-flashcard" data-tema="${temaEscapado}" data-pregunta="${textoEscapado}" data-respuesta="${explicacionEscapada}" style="background: var(--warning); color:#000; font-size:12px; padding:6px 12px; border:none;" type="button">Crear Flashcard</button>
          <button class="btn btn-reportar-pregunta" data-id="${p.id}" type="button">Reportar Error</button>
        </div>
      `;
      listaEl.appendChild(div);
    });
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

      reportes.forEach(r => {
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
            <div class="report-card-actions" style="display: flex; gap: 8px; justify-content: flex-end;">
              <button class="btn-corregir-pregunta-admin" type="button" style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); color: var(--warning); font-size: 11.5px; font-weight: 600; padding: 5px 10px; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;">Corregir Pregunta</button>
              <button class="btn-resolver-reporte" data-id="${r.id}" type="button">✓ Marcar como Resuelto</button>
            </div>
          `;
        } else {
          botonResolucionHtml = `
            <div class="report-card-actions" style="font-size: 11px; color: var(--success); font-weight: bold;">
              ✓ Resuelto y Verificado
            </div>
          `;
        }

        card.innerHTML = `
          <div class="report-card-header">
            <div>
              Reportante: <span class="report-card-reporter">${r.usuario_nombre}</span> (${r.usuario_email})
            </div>
            <span class="report-card-date">${fechaTxt}</span>
          </div>
          <div style="font-size: 11.5px; color: var(--text-dim); margin-top: 4px;">
            Materia: <strong>${r.pregunta_tema}</strong>
          </div>
          <div class="report-card-qtext" style="margin-top: 6px;">
            <strong>Pregunta:</strong> ${r.pregunta_texto}
          </div>
          <div style="margin-top: 6px;">
            <span class="report-card-category">${r.motivo}</span>
          </div>
          <div class="report-card-comment" style="margin-top: 6px;">
            <strong>Comentario del médico:</strong> ${r.comentario || "Sin comentarios adicionales."}
          </div>
          ${botonResolucionHtml}
        `;

        listaEl.appendChild(card);

        // Vincular listener en caliente para corregir pregunta (Fase 2)
        if (r.leido === 0) {
          const btnCorregir = card.querySelector(".btn-corregir-pregunta-admin");
          if (btnCorregir) {
            btnCorregir.addEventListener("click", () => {
              ui.abrirModalCorreccionPregunta(r);
            });
          }
        }
      });

      const botonesResolver = listaEl.querySelectorAll(".btn-resolver-reporte");
      botonesResolver.forEach(btn => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const rId = btn.getAttribute("data-id");
          try {
            await api.resolverReporteError(rId);
            alert("✓ Reporte marcado como resuelto. ¡Excelente gestión!");
            await ui.cargarReportesAdministrador();
          } catch (err) {
            alert("✗ Error al resolver el reporte: " + err.message);
          }
        });
      });

    } catch (error) {
      console.error("Error al cargar reportes para el admin:", error);
    }
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
  }
};

// FASE 4: Ruteo e interactividad con el botón Atrás del navegador
window.addEventListener("popstate", (e) => {
  const sesion = localStorage.getItem("resiMed_session");
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
