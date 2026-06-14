// ====== COORDINDADOR DE ARRANQUE / PUNTO DE ENTRADA (main.js) ======

document.addEventListener("DOMContentLoaded", async () => {
  // 0. Inicializar y controlar el sistema de Tema Dual (Claro / Oscuro)
  const btnToggleTheme = document.getElementById("btn-toggle-theme");
  
  const aplicarTema = (tema) => {
    if (tema === "dark") {
      document.body.classList.add("dark-mode");
      document.documentElement.classList.add("dark-mode");
      if (btnToggleTheme) {
        btnToggleTheme.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #fbbf24; filter: drop-shadow(0 0 4px rgba(251,191,36,0.6));">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>`;
      }
    } else {
      document.body.classList.remove("dark-mode");
      document.documentElement.classList.remove("dark-mode");
      if (btnToggleTheme) {
        btnToggleTheme.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #475569;">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>`;
      }
    }
  };

  const temaGuardado = localStorage.getItem("resiMed_theme") || "light";
  aplicarTema(temaGuardado);

  if (btnToggleTheme) {
    btnToggleTheme.addEventListener("click", () => {
      const esOscuro = document.body.classList.contains("dark-mode");
      const nuevoTema = esOscuro ? "light" : "dark";
      localStorage.setItem("resiMed_theme", nuevoTema);
      aplicarTema(nuevoTema);
    });
  }

  // 1. Vincular botones interactivos de modalidades del panel principal (Modo Intensivo y Modo Batalla)
  const btnGuardia = document.getElementById("btn-modo-guardia");
  if (btnGuardia) {
    btnGuardia.addEventListener("click", () => {
      quiz.solicitarConfirmacionInicio("guardia");
    });
  }

  const btnModoBatalla = document.getElementById("btn-modo-batalla");
  if (btnModoBatalla) {
    btnModoBatalla.addEventListener("click", () => {
      // Ocultar botón Volver al inicio si está en perfil
      const btnVerPerfil = document.getElementById("btn-ver-perfil");
      if (btnVerPerfil) btnVerPerfil.innerHTML = "👤 Mi Perfil";

      battle.mostrarPantallaBattle("battle");
      battle.conectarWebSocket();
    });
  }

  // 2. Vincular botones de cambio de pantalla Perfil e Inicio
  const btnVerPerfil = document.getElementById("btn-ver-perfil");
  const btnIrInicio = document.getElementById("btn-ir-inicio");
  const btnPerfilRegresar = document.getElementById("btn-perfil-regresar");

  if (btnVerPerfil) {
    btnVerPerfil.addEventListener("click", () => {
      ui.mostrarPantalla("perfil");
    });
  }

  if (btnIrInicio) {
    btnIrInicio.addEventListener("click", () => {
      ui.mostrarPantalla("home");
    });
  }

  // Vincular click en el logo/brand de ResiMed en la Topbar y en la Sidebar para ir a Inicio (Home)
  const topbarBrand = document.getElementById("topbar-brand-home");
  const sidebarBrand = document.getElementById("sidebar-brand-home");

  [topbarBrand, sidebarBrand].forEach(brand => {
    if (brand) {
      brand.addEventListener("click", () => {
        ui.mostrarPantalla("home");
      });
    }
  });

  if (btnPerfilRegresar) {
    btnPerfilRegresar.addEventListener("click", () => {
      ui.mostrarPantalla("home");
    });
  }

  const btnReiniciar = document.getElementById("btn-reiniciar");
  if (btnReiniciar) {
    btnReiniciar.addEventListener("click", () => {
      const pantallaDestino = state.pantallaDeRetorno || "home";
      ui.mostrarPantalla(pantallaDestino);
      state.pantallaDeRetorno = null;
    });
  }

  // Vincular click en el logo de ResiMed para volver al Inicio (Fase 3)
  const brandLogo = document.querySelector(".brand");
  if (brandLogo) {
    brandLogo.addEventListener("click", () => {
      if (state.usuarioConectado) {
        ui.mostrarPantalla("home");
      }
    });
  }

  // === FASE 1: EVENT LISTENERS DE CONFIGURACIÓN DE EXAMEN ===
  const tabSimEspecialidad = document.getElementById("tab-sim-especialidad");
  const tabSimAno = document.getElementById("tab-sim-ano");
  const blockEspecialidad = document.getElementById("block-especialidad");
  const blockAno = document.getElementById("block-ano");

  state.tipoSimulacroSeleccionado = "especialidad";

  if (tabSimEspecialidad && tabSimAno && blockEspecialidad && blockAno) {
    tabSimEspecialidad.addEventListener("click", () => {
      tabSimEspecialidad.classList.add("active");
      tabSimAno.classList.remove("active");
      blockEspecialidad.classList.remove("hidden");
      blockAno.classList.add("hidden");
      
      const selectEsp = document.getElementById("especialidad");
      const blockSubtema = document.getElementById("block-subtema");
      const selectorSubtema = document.getElementById("selector-subtema");
      if (selectEsp && blockSubtema && selectorSubtema && selectEsp.value !== "Todos" && selectorSubtema.options.length > 0) {
        blockSubtema.classList.remove("hidden");
      }
      
      state.tipoSimulacroSeleccionado = "especialidad";
    });

    tabSimAno.addEventListener("click", () => {
      tabSimAno.classList.add("active");
      tabSimEspecialidad.classList.remove("active");
      blockAno.classList.remove("hidden");
      blockEspecialidad.classList.add("hidden");
      
      const blockSubtema = document.getElementById("block-subtema");
      if (blockSubtema) {
        blockSubtema.classList.add("hidden");
      }
      
      state.tipoSimulacroSeleccionado = "ano";
    });
  }

  const btnModoEstudio = document.getElementById("btn-modo-estudio");
  const btnModoSimulacro = document.getElementById("btn-modo-simulacro");

  state.modoActual = "estudio";

  if (btnModoEstudio && btnModoSimulacro) {
    btnModoEstudio.addEventListener("click", () => {
      btnModoEstudio.classList.add("active");
      btnModoEstudio.style.borderColor = "#0A66C2";
      btnModoEstudio.style.borderWidth = "2px";
      
      btnModoSimulacro.classList.remove("active");
      btnModoSimulacro.style.borderColor = "var(--border)";
      btnModoSimulacro.style.borderWidth = "1px";
      
      state.modoActual = "estudio";
    });

    btnModoSimulacro.addEventListener("click", () => {
      btnModoSimulacro.classList.add("active");
      btnModoSimulacro.style.borderColor = "#0A66C2";
      btnModoSimulacro.style.borderWidth = "2px";
      
      btnModoEstudio.classList.remove("active");
      btnModoEstudio.style.borderColor = "var(--border)";
      btnModoEstudio.style.borderWidth = "1px";
      
      state.modoActual = "simulacro";
    });
  }

  // 3. Inicializar módulos
  auth.inicializar();
  quiz.inicializar();
  flashcards.inicializar();
  battle.inicializar();

  // === INICIALIZACIÓN DE LA BARRA LATERAL (SIDEBAR NAVIGATION) ===
  const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");
  const appSidebar = document.getElementById("app-sidebar");
  const sidebarBackdrop = document.getElementById("sidebar-backdrop");

  if (btnToggleSidebar && appSidebar) {
    btnToggleSidebar.addEventListener("click", () => {
      if (window.innerWidth <= 850) {
        appSidebar.classList.toggle("active-mobile");
        sidebarBackdrop?.classList.toggle("active");
      } else {
        appSidebar.classList.toggle("collapsed");
      }
    });
  }

  if (sidebarBackdrop && appSidebar) {
    sidebarBackdrop.addEventListener("click", () => {
      appSidebar.classList.remove("active-mobile");
      sidebarBackdrop.classList.remove("active");
    });
  }

  const sidebarItems = document.querySelectorAll(".sidebar-item");
  sidebarItems.forEach(item => {
    item.addEventListener("click", () => {
      // Remover clase active de todos los items
      sidebarItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");
      
      // Auto colapsar en móvil al pulsar una opción
      if (window.innerWidth <= 850 && appSidebar) {
        appSidebar.classList.remove("active-mobile");
        sidebarBackdrop?.classList.remove("active");
      }
      
      const target = item.dataset.target;
      if (target === "home") {
        ui.mostrarPantalla("home");
      } else if (target === "simulacros") {
        ui.mostrarPantalla("home");
        // Scroll suave al selector de simulacro
        setTimeout(() => {
          const configSection = document.getElementById("tab-sim-especialidad");
          if (configSection) {
            configSection.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
      } else if (target === "preguntas") {
        ui.mostrarPantalla("flashcards");
      } else if (target === "estadisticas") {
        ui.mostrarPantalla("perfil");
      } else if (target === "historial") {
        ui.mostrarPantalla("perfil");
        
        // Auto expandir historial
        const seccionEval = document.getElementById("seccion-evaluaciones-desplegable");
        if (seccionEval && !seccionEval.classList.contains("activo")) {
          const btnToggleEval = document.getElementById("btn-toggle-evaluaciones");
          if (btnToggleEval) btnToggleEval.click();
        }
        // Auto expandir diario
        const seccionDiario = document.getElementById("seccion-diario-desplegable");
        if (seccionDiario && !seccionDiario.classList.contains("activo")) {
          const btnToggleDiario = document.getElementById("btn-toggle-diario");
          if (btnToggleDiario) btnToggleDiario.click();
        }
        
        setTimeout(() => {
          const scrollTarget = document.getElementById("contenedor-evaluaciones-acordeon");
          if (scrollTarget) scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
      } else if (target === "errores") {
        ui.mostrarPantalla("errores");
      } else if (target === "ranking") {
        battle.mostrarPantallaBattle("battle");
        battle.conectarWebSocket();
      } else if (target === "ajustes") {
        ui.mostrarPantalla("perfil");
        const btnPerfilEditar = document.getElementById("btn-perfil-editar");
        if (btnPerfilEditar) btnPerfilEditar.click();
      }
    });
  });

  // 4. Modal del Tutor IA - Vincular Cerrar e interactividad de fondo
  const modalTutorIA = document.getElementById("modal-tutor-ia");
  const modalIABody = document.getElementById("modal-ia-body");
  const btnModalIACerrar = document.getElementById("btn-modal-ia-cerrar");

  if (btnModalIACerrar && modalTutorIA) {
    btnModalIACerrar.addEventListener("click", () => {
      modalTutorIA.classList.remove("active");
    });
    
    modalTutorIA.addEventListener("click", (e) => {
      if (e.target === modalTutorIA) {
        modalTutorIA.classList.remove("active");
      }
    });
  }

  // Escuchar llamadas al Tutor IA de forma delegada
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-consultar-tutor");
    if (!btn) return;
    
    const preguntaTexto = btn.getAttribute("data-texto");
    const seleccionText = btn.getAttribute("data-seleccion");
    
    if (!modalTutorIA || !modalIABody) return;
    
    modalIABody.innerHTML = `
      <div class="spinner-ia-container">
        <div class="spinner-ia"></div>
        <p style="color: var(--text-dim); font-size: 14px; font-weight: 500;">El Tutor IA está consultando la literatura médica oficial...</p>
      </div>
    `;
    modalTutorIA.classList.add("active");
    
    try {
      const data = await api.consultarTutorIA(preguntaTexto, seleccionText);
      if (data && data.explicacionIA) {
        modalIABody.innerHTML = data.explicacionIA;
      } else {
        modalIABody.innerHTML = `
          <div style="color: var(--danger); padding: 20px 0; text-align: center;">
            <p><strong>✗ Error de Consulta</strong></p>
            <p style="font-size: 13px; margin-top: 6px;">No se pudo obtener la explicación del Tutor IA en este momento.</p>
          </div>
        `;
      }
    } catch (err) {
      modalIABody.innerHTML = `
        <div style="color: var(--danger); padding: 20px 0; text-align: center;">
          <p><strong>✗ Error de Conexión</strong></p>
          <p style="font-size: 13px; margin-top: 6px;">Ocurrió una falla al conectar con el servidor.</p>
        </div>
      `;
    }
  });



  // === 6. MODAL INTERACTIVO DE CREACIÓN DE FLASHCARDS MANUALES ===
  const modalCrearFlashcard = document.getElementById("modal-crear-flashcard");
  const btnFlashcardCrearManual = document.getElementById("btn-flashcard-crear-manual");
  const btnModalFlashcardCerrar = document.getElementById("btn-modal-flashcard-cerrar");
  const formCrearFlashcard = document.getElementById("form-crear-flashcard");
  const selectFlashcardTema = document.getElementById("modal-flashcard-tema");

  if (btnFlashcardCrearManual && modalCrearFlashcard && btnModalFlashcardCerrar) {
    btnFlashcardCrearManual.addEventListener("click", () => {
      // Poblar el selector de especialidades de forma dinamica
      if (selectFlashcardTema) {
        selectFlashcardTema.innerHTML = "";
        state.LISTA_ESPECIALIDADES.forEach(esp => {
          const opt = document.createElement("option");
          opt.value = esp.nombre;
          opt.textContent = `${esp.emoji} ${esp.nombre}`;
          selectFlashcardTema.appendChild(opt);
        });
      }
      modalCrearFlashcard.classList.add("active");
    });

    btnModalFlashcardCerrar.addEventListener("click", () => {
      modalCrearFlashcard.classList.remove("active");
    });

    modalCrearFlashcard.addEventListener("click", (e) => {
      if (e.target === modalCrearFlashcard) {
        modalCrearFlashcard.classList.remove("active");
      }
    });
  }

  if (formCrearFlashcard) {
    formCrearFlashcard.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!state.usuarioConectado) return;

      const tema = document.getElementById("modal-flashcard-tema").value;
      const pregunta = document.getElementById("modal-flashcard-pregunta").value.trim();
      const respuesta = document.getElementById("modal-flashcard-respuesta").value.trim();

      try {
        await api.guardarFlashcardPersonalizada(state.usuarioConectado.id, tema, pregunta, respuesta);
        formCrearFlashcard.reset();
        modalCrearFlashcard.classList.remove("active");
        alert("✓ ¡Flashcard inyectada al mazo con éxito!");
        
        // Recargar mazo de flashcards en caliente
        await flashcards.inicializarMazo();
        if (typeof ui !== "undefined" && typeof ui.inicializarFiltrosFlashcards === "function") {
          await ui.inicializarFiltrosFlashcards();
        }
      } catch (err) {
        alert("✗ Falla al guardar la flashcard: " + err.message);
      }
    });
  }


  // === MODAL INTERACTIVO DE DEBILIDADES POR ESPECIALIDAD (FASE 1) ===
  const modalDebilidades = document.getElementById("modal-debilidades-especialidad");
  const btnModalDebilidadesCerrar = document.getElementById("btn-modal-debilidades-cerrar");

  if (modalDebilidades && btnModalDebilidadesCerrar) {
    btnModalDebilidadesCerrar.addEventListener("click", () => {
      modalDebilidades.classList.remove("active");
    });
    modalDebilidades.addEventListener("click", (e) => {
      if (e.target === modalDebilidades) {
        modalDebilidades.classList.remove("active");
      }
    });
  }



  // === FILTROS EN REVISIÓN DE RESULTADOS (FASE 4) ===
  const btnFiltroTodas = document.getElementById("btn-filtro-revision-todas");
  const btnFiltroMarcadas = document.getElementById("btn-filtro-revision-marcadas");
  const btnFiltroErradas = document.getElementById("btn-filtro-revision-erradas");

  if (btnFiltroTodas) {
    btnFiltroTodas.addEventListener("click", () => ui.filtrarRevision("todas"));
  }
  if (btnFiltroMarcadas) {
    btnFiltroMarcadas.addEventListener("click", () => ui.filtrarRevision("marcadas"));
  }
  if (btnFiltroErradas) {
    btnFiltroErradas.addEventListener("click", () => ui.filtrarRevision("erradas"));
  }



  // === FORMULARIO NUEVO EXAMEN (FASE 3) ===
  const formNuevoExamen = document.getElementById("form-nuevo-examen");
  if (formNuevoExamen) {
    formNuevoExamen.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!state.usuarioConectado || state.usuarioConectado.rol !== "admin") return;

      const nombre = document.getElementById("admin-examen-nombre").value.trim();
      const ano = parseInt(document.getElementById("admin-examen-ano").value);

      try {
        await api.guardarExamen(nombre, ano, 1);
        formNuevoExamen.reset();
        alert("✓ Examen creado con éxito en el banco.");
        await ui.cargarExamenesAdministrador();
      } catch (err) {
        alert("✗ Falla al crear examen: " + err.message);
      }
    });
  }

  // === 7. MODAL INTERACTIVO DE EDICIÓN DEL PERFIL MÉDICO ===
  const modalEditarPerfil = document.getElementById("modal-editar-perfil");
  const btnPerfilEditar = document.getElementById("btn-perfil-editar");
  const btnModalPerfilCerrar = document.getElementById("btn-modal-perfil-cerrar");
  const formEditarPerfil = document.getElementById("form-editar-perfil");
  const selectPerfilAspiracion = document.getElementById("modal-perfil-aspiracion");

  if (btnPerfilEditar && modalEditarPerfil && btnModalPerfilCerrar) {
    btnPerfilEditar.addEventListener("click", () => {
      const user = state.usuarioConectado;
      if (!user) return;

      // Poblar el selector de especialidades aspiradas
      if (selectPerfilAspiracion) {
        selectPerfilAspiracion.innerHTML = '<option value="Ninguna">Ninguna (Aún Decidiendo)</option>';
        state.LISTA_ESPECIALIDADES.forEach(esp => {
          const opt = document.createElement("option");
          opt.value = esp.nombre;
          opt.textContent = `${esp.emoji} ${esp.nombre}`;
          if (user.especialidad_aspirada === esp.nombre) {
            opt.selected = true;
          }
          selectPerfilAspiracion.appendChild(opt);
        });
      }

      // Pre-cargar valores en los inputs
      const inputNombre = document.getElementById("modal-perfil-nombre");
      const selectMeta = document.getElementById("modal-perfil-meta");

      if (inputNombre) inputNombre.value = user.nombre;
      if (selectMeta) selectMeta.value = user.meta_semanal || 50;

      modalEditarPerfil.classList.add("active");
    });

    btnModalPerfilCerrar.addEventListener("click", () => {
      modalEditarPerfil.classList.remove("active");
    });

    modalEditarPerfil.addEventListener("click", (e) => {
      if (e.target === modalEditarPerfil) {
        modalEditarPerfil.classList.remove("active");
      }
    });
  }

  if (formEditarPerfil) {
    formEditarPerfil.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!state.usuarioConectado) return;

      const nombre = document.getElementById("modal-perfil-nombre").value.trim();
      const especialidadAspirada = document.getElementById("modal-perfil-aspiracion").value;
      const metaSemanal = parseInt(document.getElementById("modal-perfil-meta").value) || 50;

      try {
        const data = await api.actualizarPerfil(nombre, especialidadAspirada, metaSemanal);
        
        // Actualizar estado global y localStorage
        state.usuarioConectado = data.usuario;
        localStorage.setItem("resiMed_session", JSON.stringify(data.usuario));

        modalEditarPerfil.classList.remove("active");
        alert("✓ ¡Datos de perfil guardados de forma segura!");
        
        // Refrescar perfil en caliente
        await ui.actualizarProgresoEstudiante();
      } catch (err) {
        alert("✗ Falla al actualizar perfil: " + err.message);
      }
    });
  }

  // === 8. MANEJO EXCLUSIVO DEL PANEL DE ADMINISTRACIÓN (FASE 4) ===
  const formNuevaPregunta = document.getElementById("form-nueva-pregunta");
  const adminMensaje = document.getElementById("admin-mensaje");

  if (formNuevaPregunta) {
    formNuevaPregunta.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!state.usuarioConectado || state.usuarioConectado.rol !== "admin") return;

      const texto = document.getElementById("admin-texto").value.trim();
      const opciones = [
        document.getElementById("admin-opc0").value.trim(),
        document.getElementById("admin-opc1").value.trim(),
        document.getElementById("admin-opc2").value.trim(),
        document.getElementById("admin-opc3").value.trim()
      ];
      const correcta = parseInt(document.getElementById("admin-correcta").value);
      const tema = document.getElementById("admin-tema").value.trim();
      const explicacion = document.getElementById("admin-explicacion").value.trim();
      const fuente = document.getElementById("admin-fuente").value.trim();
      const examen_id = document.getElementById("admin-pregunta-examen-id").value;
      const difficulty = document.getElementById("admin-dificultad").value;

      if (adminMensaje) {
        adminMensaje.textContent = "Guardando pregunta en el banco...";
        adminMensaje.style.color = "var(--text-soft)";
      }

      try {
        await api.guardarPregunta(texto, opciones, correcta, tema, explicacion, fuente, state.usuarioConectado.id, examen_id, difficulty);
        if (adminMensaje) {
          adminMensaje.textContent = "✓ Pregunta indexada al banco con éxito.";
          adminMensaje.style.color = "var(--success)";
        }
        formNuevaPregunta.reset();
        
        // Recargar dashboard e indicadores
        await ui.cargarFiltrosEspecialidad();
      } catch (err) {
        if (adminMensaje) {
          adminMensaje.textContent = "✗ Error: " + err.message;
          adminMensaje.style.color = "var(--danger)";
        }
      }
    });
  }

  const btnSubirMasivo = document.getElementById("btn-subir-masivo");
  const inputArchivoMasivo = document.getElementById("input-archivo-masivo");
  const mensajeCargaMasiva = document.getElementById("mensaje-carga-masiva");

  if (btnSubirMasivo && inputArchivoMasivo) {
    btnSubirMasivo.addEventListener("click", () => {
      if (!state.usuarioConectado || state.usuarioConectado.rol !== "admin") return;

      const archivo = inputArchivoMasivo.files[0];
      if (!archivo) {
        alert("Por favor, selecciona un archivo JSON primero.");
        return;
      }

      const examen_id = document.getElementById("select-carga-masiva-examen-id").value;

      const lector = new FileReader();
      lector.onload = async (e) => {
        try {
          const preguntasArray = JSON.parse(e.target.result);
          if (!Array.isArray(preguntasArray)) {
            throw new Error("El archivo no contiene un array de preguntas.");
          }

          if (mensajeCargaMasiva) {
            mensajeCargaMasiva.textContent = "Inyectando banco masivo...";
            mensajeCargaMasiva.style.color = "var(--text-soft)";
          }

          await api.cargarMasivo(preguntasArray, state.usuarioConectado.id, examen_id);
          
          if (mensajeCargaMasiva) {
            mensajeCargaMasiva.textContent = `✓ Éxito: ${preguntasArray.length} preguntas importadas correctamente.`;
            mensajeCargaMasiva.style.color = "var(--success)";
          }
          inputArchivoMasivo.value = "";
          
          await ui.cargarFiltrosEspecialidad();
          await ui.cargarExamenesAdministrador();
        } catch (err) {
          if (mensajeCargaMasiva) {
            mensajeCargaMasiva.textContent = "✗ Falla al procesar: " + err.message;
            mensajeCargaMasiva.style.color = "var(--danger)";
          }
        }
      };
      lector.readAsText(archivo);
    });
  }

  // === 8b. REPORTES DE ERROR Y CORRECCIÓN DE PREGUNTAS (FASE 6) ===
  const formReportarError = document.getElementById("form-reportar-error");
  const modalReportarError = document.getElementById("modal-reportar-error");
  const btnModalReporteCerrar = document.getElementById("btn-modal-reporte-cerrar");

  if (modalReportarError && btnModalReporteCerrar) {
    btnModalReporteCerrar.addEventListener("click", () => {
      modalReportarError.classList.remove("active");
    });
    modalReportarError.addEventListener("click", (e) => {
      if (e.target === modalReportarError) {
        modalReportarError.classList.remove("active");
      }
    });
  }

  if (formReportarError) {
    formReportarError.addEventListener("submit", async (e) => {
      e.preventDefault();
      const preguntaId = document.getElementById("modal-reporte-pregunta-id").value;
      const motivo = document.getElementById("modal-reporte-motivo").value;
      const comentario = document.getElementById("modal-reporte-comentario").value.trim();

      try {
        await api.guardarReporteError(preguntaId, motivo, comentario);
        alert("✓ Reporte registrado de manera exitosa. Revisaremos el caso médico a la brevedad.");
        modalReportarError.classList.remove("active");
        formReportarError.reset();
      } catch (err) {
        alert("✗ Falla al enviar reporte de error: " + err.message);
      }
    });
  }

  const formCorregirPregunta = document.getElementById("form-corregir-pregunta");
  const modalCorregirPregunta = document.getElementById("modal-corregir-pregunta");
  const btnModalCorregirCerrar = document.getElementById("btn-modal-corregir-cerrar");

  if (modalCorregirPregunta && btnModalCorregirCerrar) {
    btnModalCorregirCerrar.addEventListener("click", () => {
      modalCorregirPregunta.classList.remove("active");
    });
    modalCorregirPregunta.addEventListener("click", (e) => {
      if (e.target === modalCorregirPregunta) {
        modalCorregirPregunta.classList.remove("active");
      }
    });
  }

  if (formCorregirPregunta) {
    formCorregirPregunta.addEventListener("submit", async (e) => {
      e.preventDefault();
      const preguntaId = document.getElementById("modal-corregir-pregunta-id").value;
      const reporteId = document.getElementById("modal-corregir-reporte-id").value;

      const texto = document.getElementById("modal-corregir-texto").value.trim();
      const opciones = [
        document.getElementById("modal-corregir-opc0").value.trim(),
        document.getElementById("modal-corregir-opc1").value.trim(),
        document.getElementById("modal-corregir-opc2").value.trim(),
        document.getElementById("modal-corregir-opc3").value.trim()
      ];
      const correcta = parseInt(document.getElementById("modal-corregir-correcta").value);
      const tema = document.getElementById("modal-corregir-tema").value.trim();
      const subtema = document.getElementById("modal-corregir-subtema").value.trim();
      const fuente = document.getElementById("modal-corregir-fuente").value.trim();
      const examen_id = document.getElementById("modal-corregir-examen-id").value;
      const difficulty = document.getElementById("modal-corregir-dificultad").value;
      const explicacion = document.getElementById("modal-corregir-explicacion").value.trim();

      const data = {
        texto,
        opciones,
        correcta,
        tema,
        subtema,
        fuente,
        examen_id: examen_id ? parseInt(examen_id) : null,
        difficulty: difficulty !== "" ? parseFloat(difficulty) : 0.5,
        explicacion,
        activo: 1
      };

      try {
        await api.editarPregunta(preguntaId, data);
        await api.resolverReporteError(reporteId);
        
        alert("✓ Pregunta corregida y reporte resuelto con éxito.");
        modalCorregirPregunta.classList.remove("active");
        formCorregirPregunta.reset();
        
        await ui.cargarReportesAdministrador();
      } catch (err) {
        alert("✗ Falla al guardar la corrección: " + err.message);
      }
    });
  }

  const btnRefrescarReportes = document.getElementById("btn-admin-refrescar-reportes");
  if (btnRefrescarReportes) {
    btnRefrescarReportes.addEventListener("click", async () => {
      await ui.cargarReportesAdministrador();
    });
  }

  // Escuchar clicks globales para abrir el modal de reportar error en preguntas
  document.addEventListener("click", (e) => {
    const btnReportar = e.target.closest(".btn-reportar-pregunta");
    if (btnReportar) {
      const preguntaId = btnReportar.getAttribute("data-id");
      const modal = document.getElementById("modal-reportar-error");
      if (modal) {
        const inputId = document.getElementById("modal-reporte-pregunta-id");
        if (inputId) inputId.value = preguntaId;
        modal.classList.add("active");
      }
    }
  });

  // 9. Intentar restaurar sesión guardada (Carga del ciclo de vida inicial)
  await auth.restaurarSesion();

  // Validar si la sesión expiró previamente
  if (sessionStorage.getItem("resiMed_session_expired") === "true") {
    sessionStorage.removeItem("resiMed_session_expired");
    alert("🔒 Tu sesión de estudio ha finalizado por seguridad. Por favor, accede de nuevo a tu panel médico.");
  }
});
