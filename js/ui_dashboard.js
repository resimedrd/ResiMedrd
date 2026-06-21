// ====== COMPONENTE MODULAR DE UI: DASHBOARD Y WIDGETS DE ESTADÍSTICAS (ui_dashboard.js) ======

(function() {
  if (!window.ui) window.ui = {};

  // Renderizar Lista de Especialidades en Mi Perfil
  window.ui.inicializarGridEspecialidades = async function() {
    const list = document.getElementById("perfil-especialidades-lista");
    if (!list) return;
    
    list.innerHTML = "";
    
    // Mapa de especialidades a íconos SVG personalizados y colores de fondo circulares
    const iconsMap = {
      pediatria: {
        bg: "rgba(59, 130, 246, 0.12)",
        color: "#3b82f6",
        svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`
      },
      ginecologia: {
        bg: "rgba(236, 72, 153, 0.12)",
        color: "#ec4899",
        svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><line x1="12" y1="15" x2="12" y2="22"/><line x1="9" y1="18" x2="15" y2="18"/></svg>`
      },
      cirugia: {
        bg: "rgba(20, 184, 166, 0.12)",
        color: "#20b8a6",
        svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l4-4a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-4 4z"/><path d="M14.7 7.7L2 20.4a2 2 0 0 0 0 2.8 2 2 0 0 0 2.8 0L17.5 10.5"/></svg>`
      },
      interna: {
        bg: "rgba(239, 68, 68, 0.12)",
        color: "#ef4444",
        svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`
      },
      basicas: {
        bg: "rgba(100, 116, 139, 0.12)",
        color: "#64748b",
        svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 10.5C5 7.5 7.5 5 10.5 4.5"/><path d="M13.5 19.5c3-.5 5.5-3 6-6"/><path d="M19.5 4.5C19 7.5 16.5 10 13.5 10.5"/><path d="M10.5 13.5c-3 .5-5.5 3-6 6"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="12" cy="12" r="1"/></svg>`
      },
      cardiologia: {
        bg: "rgba(244, 63, 94, 0.12)",
        color: "#f43f5e",
        svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
      },
      neumologia: {
        bg: "rgba(56, 189, 248, 0.12)",
        color: "#38bdf8",
        svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M12 12v10"/><path d="M9 18h6"/></svg>`
      },
      gastro: {
        bg: "rgba(245, 158, 11, 0.12)",
        color: "#f59e0b",
        svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21a9 9 0 0 0 9-9 9 9 0 0 0-9-9 9 9 0 0 0-9 9 9 9 0 0 0 9 9Z"/><path d="M12 7v10"/><path d="M8 12h8"/></svg>`
      },
      nefro: {
        bg: "rgba(99, 102, 241, 0.12)",
        color: "#6366f1",
        svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z"/></svg>`
      },
      neurologia: {
        bg: "rgba(139, 92, 246, 0.12)",
        color: "#8b5cf6",
        svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1 0-3.88 2.5 2.5 0 0 1 0-3.88 2.5 2.5 0 0 1 0-3.88A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 0-3.88 2.5 2.5 0 0 0 0-3.88 2.5 2.5 0 0 0 0-3.88A2.5 2.5 0 0 0 14.5 2Z"/></svg>`
      },
      infectologia: {
        bg: "rgba(132, 204, 22, 0.12)",
        color: "#84cc16",
        svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="m4.9 19.1 1.4-1.4"/><path d="m17.7 6.3 1.4-1.4"/></svg>`
      },
      trauma: {
        bg: "rgba(217, 119, 6, 0.12)",
        color: "#d97706",
        svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2 2 0 1 1 2 2L5 19a2 2 0 1 1-2-2L17 3z"/></svg>`
      },
      psiquiatria: {
        bg: "rgba(244, 114, 182, 0.12)",
        color: "#f472b6",
        svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`
      },
      salud: {
        bg: "rgba(20, 184, 166, 0.12)",
        color: "#20b8a6",
        svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`
      }
    };

    state.LISTA_ESPECIALIDADES.forEach(esp => {
      const row = document.createElement("div");
      row.className = "specialty-row interactive";
      row.setAttribute("data-id", esp.id);
      
      const config = iconsMap[esp.id] || { bg: "rgba(255,255,255,0.05)", color: "#ffffff", svg: "🔬" };
      
      row.innerHTML = `
        <div class="specialty-info">
          <div class="specialty-icon-container" style="background: ${config.bg}; color: ${config.color};">
            ${config.svg}
          </div>
          <span class="specialty-name">${esp.nombre}</span>
        </div>
        <div class="specialty-bars-container">
          <div class="specialty-bar-row">
            <span class="specialty-bar-label">Cobertura</span>
            <div class="specialty-bar-bg">
              <div id="cobertura-barra-${esp.id}" class="specialty-bar-fill blue" style="width: 0%;"></div>
            </div>
            <span id="cobertura-texto-${esp.id}" class="specialty-pct">0%</span>
          </div>
          <div class="specialty-bar-row">
            <span class="specialty-bar-label">Rendimiento</span>
            <div class="specialty-bar-bg">
              <div id="barra-${esp.id}" class="specialty-bar-fill green" style="width: 0%;"></div>
            </div>
            <span id="porcentaje-${esp.id}" class="specialty-pct">0%</span>
          </div>
        </div>
        <div class="specialty-status-wrapper">
          <div id="badge-container-${esp.id}" class="specialty-diagnostic-card badge-inprogress">
            <div class="diagnostic-header">
              <span id="badge-icon-${esp.id}" class="diagnostic-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
              </span>
              <span id="badge-title-${esp.id}" class="diagnostic-title">En progreso</span>
            </div>
            <span id="badge-desc-${esp.id}" class="diagnostic-desc">Rendimiento promedio, sigue practicando</span>
          </div>
        </div>
      `;
      
      row.addEventListener("click", () => {
        ui.abrirAnalisisEspecialidad(esp);
      });
      
      list.appendChild(row);
    });
  };

  // Abrir Análisis de Especialidad (Debilidades y Fortalezas)
  window.ui.abrirAnalisisEspecialidad = async function(esp) {
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

    // Cargar Retroalimentación Académica Adaptativa
    const retroEl = document.getElementById("modal-debilidades-retroalimentacion");
    if (retroEl) {
      const scoreText = (notaEl ? notaEl.textContent : "0%").replace("%", "");
      const score = parseInt(scoreText) || 0;
      let vistas = 0;
      if (coberturaEl) {
        if (coberturaEl.hasAttribute("data-vistas")) {
          vistas = parseInt(coberturaEl.getAttribute("data-vistas")) || 0;
        } else {
          vistas = parseInt(coberturaEl.textContent.split(" ")[0]) || 0;
        }
      }

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
  };

  // Cargar Dashboard Home con Gamificación en Tiempo Real
  window.ui.cargarDashboardHome = async function() {
    if (!state.usuarioConectado) return;
    try {
      const user = state.usuarioConectado;
      const datos = await api.obtenerResumenDashboard(user.id);
      
      // Sincronizar estado local con el backend por si cambió XP/Nivel
      state.usuarioConectado.xp = datos.xp;
      state.usuarioConectado.nivel = datos.nivel;
      state.usuarioConectado.streak = datos.streak;
      state.usuarioConectado.metaSemanal = datos.metaSemanal;
      sessionStorage.setItem("resiMed_session", JSON.stringify(state.usuarioConectado));
      
      const elSesiones = document.getElementById("resumen-total-sesiones");
      const elPromedio = document.getElementById("resumen-promedio-general");
      const elMejor = document.getElementById("dashboard-mejor-porcentaje");
      const elTotal = document.getElementById("dashboard-total-preguntas");

      if (elSesiones) elSesiones.textContent = datos.totalSesiones;
      if (elPromedio) elPromedio.textContent = datos.promedioGeneral + "%";
      if (elMejor) elMejor.textContent = datos.mejorPorcentaje + "%";
      if (elTotal) elTotal.textContent = datos.totalPreguntasRespondidas;

      ui.actualizarWidgetGamificacion();
      ui.inicializarGridEspecialidades();
    } catch (err) {
      console.error("Error al renderizar el dashboard:", err);
    }
  };
})();
