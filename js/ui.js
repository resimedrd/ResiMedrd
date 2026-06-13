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
        const tabErrores = document.getElementById("tab-perfil-errores");
        if (tabErrores && tabErrores.classList.contains("active")) {
          targetSelector = '.sidebar-item[data-target="errores"]';
        } else {
          targetSelector = '.sidebar-item[data-target="estadisticas"]';
        }
      } else if (nombrePantalla.startsWith("battle")) {
        targetSelector = '.sidebar-item[data-target="ranking"]';
      }
      
      const targetItem = document.querySelector(targetSelector);
      if (targetItem) targetItem.classList.add("active");
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
          <span class="specialty-analytics-title">${esp.nombre}</span>
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
        <div style="font-size: 11px; text-align: center; color: var(--primary); margin-top: 4px; font-weight: 600;">Ver análisis de temas y bibliografía</div>
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
    if (tituloEl) tituloEl.textContent = `Análisis: ${esp.nombre}`;

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
        feedbackBadge = "Sin Datos";
        feedbackText = "Aún no has respondido preguntas de esta especialidad en tus simulacros. ¡Inicia un entrenamiento para evaluar tu nivel!";
        feedbackBg = "rgba(255,255,255,0.02)";
        feedbackBorder = "1px solid var(--border)";
        feedbackColor = "var(--text-soft)";
      } else if (score >= 85) {
        feedbackBadge = "Sobresaliente";
        feedbackText = "¡Rendimiento excepcional! Tu precisión y dominio conceptual en esta especialidad son sobresalientes. Sigue así y afianza repasando flashcards complejas.";
        feedbackBg = "rgba(34, 197, 94, 0.04)";
        feedbackBorder = "1px solid rgba(34, 197, 94, 0.2)";
        feedbackColor = "var(--success)";
      } else if (score >= 70) {
        feedbackBadge = "Buen Nivel";
        feedbackText = "Buen rendimiento general. Demuestras bases sólidas en esta materia, pero te sugerimos revisar las debilidades listadas abajo para pulir tu precisión.";
        feedbackBg = "rgba(16, 185, 129, 0.03)";
        feedbackBorder = "1px solid rgba(16, 185, 129, 0.15)";
        feedbackColor = "#10b981";
      } else {
        feedbackBadge = "Debe Mejorar";
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

    // Calcular debilidades y fortalezas reales
    const listaTemasEl = document.getElementById("modal-debilidades-lista-temas");
    const listaFortalezasEl = document.getElementById("modal-fortalezas-lista-temas");
    
    if (listaTemasEl) {
      listaTemasEl.innerHTML = '<div style="color: var(--text-dim); font-size:13px; font-style:italic;">Analizando historial académico...</div>';
    }
    if (listaFortalezasEl) {
      listaFortalezasEl.innerHTML = '<div style="color: var(--text-dim); font-size:13px; font-style:italic;">Analizando historial académico...</div>';
    }

    try {
      const [historial, mapeoPreguntas] = await Promise.all([
        api.obtenerHistorialCompleto(state.usuarioConectado.id),
        api.obtenerMapeoTemas().catch(() => ({}))
      ]);
      
      const fallosPorSubtema = {};
      const aciertosPorSubtema = {};
      const totalesPorSubtema = {};

      historial.forEach(sesion => {
        if (sesion.detalle) {
          try {
            const preguntas = JSON.parse(sesion.detalle);
            if (Array.isArray(preguntas)) {
              preguntas.forEach(p => {
                let temaReal = p.tema;
                let subtemaReal = p.subtema;

                const deMapeo = (p.id && mapeoPreguntas[p.id]) || (p.texto && mapeoPreguntas[p.texto]);
                if (deMapeo) {
                  temaReal = deMapeo.tema || temaReal;
                  subtemaReal = deMapeo.subtema || subtemaReal;
                }

                const espIdPregunta = ui.normalizarTema(temaReal);

                if (espIdPregunta === esp.id) {
                  const subtema = (subtemaReal || "Conceptos Generales").trim();
                  totalesPorSubtema[subtema] = (totalesPorSubtema[subtema] || 0) + 1;

                  if (p.seleccionada === p.correcta) {
                    aciertosPorSubtema[subtema] = (aciertosPorSubtema[subtema] || 0) + 1;
                  } else if (p.seleccionada !== null) {
                    fallosPorSubtema[subtema] = (fallosPorSubtema[subtema] || 0) + 1;
                  }
                }
              });
            }
          } catch (e) {
            console.warn("Falla en parseo de detalles de sesión:", e);
          }
        }
      });

      // Procesar temas fallados (debilidades)
      const subtemasMalos = [];
      Object.keys(totalesPorSubtema).forEach(subtema => {
        const totales = totalesPorSubtema[subtema];
        const fallos = fallosPorSubtema[subtema] || 0;
        const aciertos = aciertosPorSubtema[subtema] || 0;
        const porcentaje = Math.round((aciertos / totales) * 100);
        
        if (fallos > 0) {
          subtemasMalos.push({
            nombre: subtema,
            totales: totales,
            fallos: fallos,
            porcentaje: porcentaje
          });
        }
      });
      subtemasMalos.sort((a, b) => b.fallos - a.fallos || a.porcentaje - b.porcentaje);

      // Procesar temas buenos (fortalezas)
      const subtemasBuenos = [];
      Object.keys(totalesPorSubtema).forEach(subtema => {
        const totales = totalesPorSubtema[subtema];
        const fallos = fallosPorSubtema[subtema] || 0;
        const aciertos = aciertosPorSubtema[subtema] || 0;
        const porcentaje = Math.round((aciertos / totales) * 100);
        
        if (porcentaje >= 70) {
          subtemasBuenos.push({
            nombre: subtema,
            totales: totales,
            aciertos: aciertos,
            porcentaje: porcentaje
          });
        }
      });
      subtemasBuenos.sort((a, b) => b.porcentaje - a.porcentaje || b.totales - a.totales);

      // Inyectar Temas Fallados (Debilidades)
      if (listaTemasEl) {
        listaTemasEl.innerHTML = "";
        if (subtemasMalos.length === 0) {
          listaTemasEl.innerHTML = `
            <div style="background: rgba(34, 197, 94, 0.04); border: 1px solid rgba(34,197,94,0.15); padding: 12px; border-radius: 12px; font-size:12.5px; color: var(--success); display:flex; align-items:center; gap:8px;">
              <strong>Excelente rendimiento. No tienes fallas registradas en esta materia.</strong>
            </div>
          `;
        } else {
          const topDebilidades = subtemasMalos.slice(0, 3);
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
              <span class="chip chip-soft" style="border-color: rgba(239,68,68,0.2); color: var(--danger); font-size:11px; padding:2px 8px; margin:0; font-weight:700;">${d.fallos} fallos (${d.porcentaje}% acierto)</span>
            `;
            listaTemasEl.appendChild(row);
          });
        }
      }

      // Inyectar Temas Dominados (Fortalezas)
      if (listaFortalezasEl) {
        listaFortalezasEl.innerHTML = "";
        if (subtemasBuenos.length === 0) {
          listaFortalezasEl.innerHTML = `
            <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); padding: 12px; border-radius: 12px; font-size:12.5px; color: var(--text-soft); display:flex; align-items:center; gap:8px;">
              Aún no registras temas con alta precisión en esta materia. ¡Sigue practicando!
            </div>
          `;
        } else {
          const topFortalezas = subtemasBuenos.slice(0, 3);
          topFortalezas.forEach((d, index) => {
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
                <span style="width: 20px; height: 20px; background: rgba(52,211,153,0.1); color: var(--success); border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:11px;">${index + 1}</span>
                <span style="font-weight: 600; color: var(--text);">${d.nombre}</span>
              </div>
              <span class="chip chip-soft" style="border-color: rgba(52,211,153,0.2); color: var(--success); font-size:11px; padding:2px 8px; margin:0; font-weight:700;">${d.porcentaje}% acierto (${d.aciertos} aciertos)</span>
            `;
            listaFortalezasEl.appendChild(row);
          });
        }
      }
    } catch (err) {
      console.error("Falla al analizar rendimiento de especialidades:", err);
      if (listaTemasEl) {
        listaTemasEl.innerHTML = '<div style="color: var(--danger); font-size:13px;">Error al cargar el análisis de rendimiento.</div>';
      }
      if (listaFortalezasEl) {
        listaFortalezasEl.innerHTML = '<div style="color: var(--danger); font-size:13px;">Error al cargar el análisis de rendimiento.</div>';
      }
    }

    const libroCoverEl = document.getElementById("modal-debilidades-libro-cover");
    const libroTituloEl = document.getElementById("modal-debilidades-libro-titulo");
    const libroDescEl = document.getElementById("modal-debilidades-libro-desc");

    let recLibro = {
      titulo: "Harrison's Principles of Internal Medicine, 21.ª Edición",
      desc: "Harrison es la referencia oficial principal de Medicina Interna para el ENURM. Enfócate en fisiopatología y esquemas terapéuticos.",
      cover: "Harrison"
    };

    const espNombreLower = esp.nombre.trim().toLowerCase();

    if (espNombreLower === "pediatría") {
      recLibro = {
        titulo: "Nelson Textbook of Pediatrics, 21.ª Edición",
        desc: "Nelson es la biblia pediátrica del ENURM. Repasa a fondo el Capítulo de Enfermedades Respiratorias, Infectología y el esquema de vacunación oficial.",
        cover: "Nelson"
      };
    } else if (espNombreLower === "gineco-obstetricia") {
      recLibro = {
        titulo: "Williams Obstetrics, 26.ª Edición & Novak's Gynecology, 16.ª Edición",
        desc: "Williams y Novak son las guías de oro para Gineco-Obstetricia en el ENURM. Dedica tiempo a repasar hemorragias de la gestación y endocrinología ginecológica.",
        cover: "Williams"
      };
    } else if (espNombreLower === "cirugía general" || espNombreLower.includes("trauma")) {
      recLibro = {
        titulo: "Schwartz's Principles of Surgery, 11.ª Edición",
        desc: "Schwartz es la referencia quirúrgica por excelencia del ENURM. Repasa abdomen agudo, trauma hepático/esplénico y patología vesicular de elección.",
        cover: "Schwartz"
      };
    } else if (espNombreLower.includes("básicas")) {
      recLibro = {
        titulo: "Guyton & Hall Tratado de Fisiología Médica, 14.ª Edición",
        desc: "Guyton & Hall proporciona los cimientos moleculares para el bloque de Ciencias Básicas. Te ayudará a razonar de forma científica los descartes clínicos.",
        cover: "Guyton"
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
      const user = state.usuarioConectado;
      const datos = await api.obtenerResumenDashboard(user.id);
      
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

      // Vincular toggle del Cajón Desplegable de Gráficos Analíticos
      const btnToggle = document.getElementById("btn-toggle-graficos");
      if (btnToggle && !btnToggle.dataset.hasListener) {
        btnToggle.dataset.hasListener = "true";
        btnToggle.addEventListener("click", () => {
          const seccion = document.getElementById("seccion-graficos-desplegable");
          if (seccion) {
            const estaActivo = !seccion.classList.contains("activo");
            toggleCajon(seccion, estaActivo);
            btnToggle.classList.toggle("activo", estaActivo);
            const icono = document.getElementById("icono-toggle-graficos");
            if (icono) {
              icono.textContent = estaActivo ? "▲" : "▼";
            }
            if (estaActivo) {
              // Dibujar los gráficos dinámicos con Chart.js
              ui.renderizarGraficosAvanzados(historial, srEstados, personalizadas.length);
              // Forzar ajuste de altura después de dibujar los gráficos
              setTimeout(() => {
                seccion.style.maxHeight = seccion.scrollHeight + "px";
              }, 50);
            }
          }
        });
      }
      
      // Si la sección de gráficos ya está activa al recargar el perfil, refrescarlos en caliente y ajustar altura
      const seccionGraficos = document.getElementById("seccion-graficos-desplegable");
      if (seccionGraficos && seccionGraficos.classList.contains("activo")) {
        ui.renderizarGraficosAvanzados(historial, srEstados, personalizadas.length);
        seccionGraficos.style.maxHeight = seccionGraficos.scrollHeight + "px";
        seccionGraficos.style.opacity = "1";
        seccionGraficos.style.marginTop = "10px";
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

      // Vincular toggle del Cajón Desplegable de Cobertura por Especialidad
      const btnToggleEsp = document.getElementById("btn-toggle-especialidades");
      if (btnToggleEsp && !btnToggleEsp.dataset.hasListener) {
        btnToggleEsp.dataset.hasListener = "true";
        btnToggleEsp.addEventListener("click", () => {
          const seccionEsp = document.getElementById("seccion-especialidades-desplegable");
          if (seccionEsp) {
            const estaActivoEsp = !seccionEsp.classList.contains("activo");
            toggleCajon(seccionEsp, estaActivoEsp);
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
      let datosCobertura = {};
      try {
        datosCobertura = await api.obtenerCobertura(user.id);
      } catch (errCob) {
        console.warn("Falla al recuperar coberturas en progreso:", errCob);
      }
      if (!datosCobertura) datosCobertura = {};

      state.LISTA_ESPECIALIDADES.forEach(esp => {
        const nombreBuscar = esp.nombre.trim().toLowerCase();
        let data = { totalBanco: 0, respondidas: 0, porcentaje: 0 };
        
        const keysCob = Object.keys(datosCobertura);
        const claveReal = keysCob.find(k => k && k.trim().toLowerCase() === nombreBuscar);
        if (claveReal && datosCobertura[claveReal]) {
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

      // Recalcular alturas de cajones desplegables que ya estén activos tras inyectar todo el progreso
      document.querySelectorAll(".cajon-desplegable.activo").forEach(seccion => {
        seccion.style.maxHeight = seccion.scrollHeight + "px";
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

    // C. Consistencia Académica (Desviación Estándar)
    let consistencyLabel = "Estableciendo...";
    let consistencyDetail = "0% Desviación";
    if (historial && historial.length > 1) {
      const scores = historial.filter(s => s.porcentaje !== undefined).map(s => s.porcentaje);
      if (scores.length > 1) {
        const sum = scores.reduce((a, b) => a + b, 0);
        const mean = sum / scores.length;
        const squareDiffs = scores.map(s => Math.pow(s - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        const stdDev = Math.round(Math.sqrt(avgSquareDiff));
        
        consistencyDetail = `Desviación de ±${stdDev}%`;
        if (stdDev <= 6) {
          consistencyLabel = "Excelente (Estable)";
        } else if (stdDev <= 14) {
          consistencyLabel = "Consistente";
        } else {
          consistencyLabel = "Inconstante / Variable";
        }
      }
    }

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
    
    // GRÁFICO 1: Cobertura de Preguntas por Especialidad (Horizontal Bar Chart)
    const labelsCob = [];
    const dataCob = [];
    const colorsCob = [];
    
    state.LISTA_ESPECIALIDADES.forEach(esp => {
      const key = esp.nombre.trim().toLowerCase();
      let cobPorcentaje = 0;
      
      const claveReal = Object.keys(datosCobertura).find(k => k.trim().toLowerCase() === key);
      if (claveReal) {
        cobPorcentaje = datosCobertura[claveReal].porcentaje || 0;
      }
      
      labelsCob.push(esp.nombre);
      dataCob.push(cobPorcentaje);
      
      if (cobPorcentaje >= 80) {
        colorsCob.push('rgba(34, 197, 94, 0.85)');
      } else if (cobPorcentaje >= 40) {
        colorsCob.push('rgba(245, 158, 11, 0.85)');
      } else {
        colorsCob.push('rgba(239, 68, 68, 0.85)');
      }
    });

    const ctxCob = document.getElementById('chart-cobertura-barras');
    if (ctxCob) {
      window.resiMedCharts.cobertura = new Chart(ctxCob, {
        type: 'bar',
        data: {
          labels: labelsCob,
          datasets: [
            {
              label: 'Preguntas Estudiadas (%)',
              data: dataCob,
              backgroundColor: colorsCob,
              borderRadius: 6,
              barThickness: 14
            }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              titleColor: isDark ? '#f8fafc' : '#0f172a',
              bodyColor: isDark ? '#cbd5e1' : '#334155',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              borderWidth: 1,
              callbacks: {
                label: (context) => {
                  const score = context.raw;
                  const key = context.label.trim().toLowerCase();
                  let respondidas = 0;
                  let totalBanco = 0;
                  const claveReal = Object.keys(datosCobertura).find(k => k.trim().toLowerCase() === key);
                  if (claveReal) {
                    respondidas = datosCobertura[claveReal].respondidas || 0;
                    totalBanco = datosCobertura[claveReal].totalBanco || 0;
                  }
                  return [
                    `Tu Cobertura: ${score}%`,
                    `Preguntas Respondidas: ${respondidas} de ${totalBanco}`
                  ];
                }
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
              ticks: { color: textColor, font: { size: 10, weight: '700' } }
            }
          }
        }
      });
    }



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

        // Generar HTML de preguntas falladas
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
              <span class="icono-toggle-especialidad" style="transition: transform 0.25s ease; font-size: 11px; color: var(--text-soft);">▼</span>
            </div>
          </div>

          <!-- BARRA DE PROGRESO DE LA ESPECIALIDAD DE 3PX (COMPACTA) -->
          <div style="background: rgba(255,255,255,0.03); height: 3px; width: 100%; overflow: hidden; position: relative;">
            <div style="background: ${colorNota}; height: 100%; width: ${totalRespondidas > 0 ? nota : 0}%; transition: width 0.4s ease;"></div>
          </div>

          <!-- CONTENIDO DESPLEGABLE DE LA ESPECIALIDAD -->
          <div class="especialidad-contenido-desplegable" style="max-height: 0; overflow: hidden; opacity: 0; transition: max-height 0.35s ease-out, opacity 0.25s ease; border-top: 1px solid transparent; background: rgba(255,255,255,0.005); text-align: left;">
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
                <div style="display: flex; flex-direction: column; gap: 12px;">
                  ${preguntasHtml}
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
