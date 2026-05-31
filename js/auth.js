// ====== CONTROLADOR DE AUTENTICACIÓN (auth.js) ======

const auth = {
  inicializar() {
    const formLogin = document.getElementById("form-login");
    const formRegistro = document.getElementById("form-registro");
    const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");
    const tabLogin = document.getElementById("tab-login");
    const tabRegistro = document.getElementById("tab-registro");
    const authMensaje = document.getElementById("auth-mensaje");

    if (tabLogin && tabRegistro && formLogin && formRegistro) {
      tabLogin.addEventListener("click", () => {
        tabLogin.classList.add("active");
        tabRegistro.classList.remove("active");
        formLogin.classList.remove("hidden");
        formRegistro.classList.add("hidden");
        if (authMensaje) authMensaje.textContent = "";
      });

      tabRegistro.addEventListener("click", () => {
        tabRegistro.classList.add("active");
        tabLogin.classList.remove("active");
        formRegistro.classList.remove("hidden");
        formLogin.classList.add("hidden");
        if (authMensaje) authMensaje.textContent = "";
      });
    }

    if (formRegistro) {
      formRegistro.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (authMensaje) {
          authMensaje.textContent = "Registrando profesional médico...";
          authMensaje.style.color = "var(--text-soft)";
        }

        const nombre = document.getElementById("reg-nombre").value.trim();
        const email = document.getElementById("reg-email").value.trim();
        const password = document.getElementById("reg-password").value;

        try {
          const datos = await api.registro(nombre, email, password);
          if (authMensaje) {
            authMensaje.textContent = "✓ Registro completado. Ya puedes iniciar sesión.";
            authMensaje.style.color = "var(--success)";
          }
          formRegistro.reset();
          if (tabLogin) tabLogin.click();
        } catch (err) {
          if (authMensaje) {
            authMensaje.textContent = `✗ ${err.message}`;
            authMensaje.style.color = "var(--danger)";
          }
        }
      });
    }

    if (formLogin) {
      formLogin.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (authMensaje) {
          authMensaje.textContent = "Verificando credenciales médicas...";
          authMensaje.style.color = "var(--text-soft)";
        }

        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;

        try {
          const datos = await api.login(email, password);
          state.usuarioConectado = datos.usuario;
          
          localStorage.setItem("resiMed_session", JSON.stringify(datos.usuario));
          localStorage.setItem("resiMed_jwt_token", datos.token);

          formLogin.reset();
          if (authMensaje) authMensaje.textContent = "";
          
          await auth.inicializarEntornoUsuario();
        } catch (err) {
          if (authMensaje) {
            authMensaje.textContent = `✗ ${err.message}`;
            authMensaje.style.color = "var(--danger)";
          }
        }
      });
    }

    if (btnCerrarSesion) {
      btnCerrarSesion.addEventListener("click", () => {
        auth.logout();
      });
    }

    // Configurar temporizador de inactividad de 15 minutos
    auth.configurarTemporizadorInactividad();
  },

  async restaurarSesion() {
    try {
      const sesionGuardada = localStorage.getItem("resiMed_session");
      const token = localStorage.getItem("resiMed_jwt_token");
      
      if (sesionGuardada && token) {
        state.usuarioConectado = JSON.parse(sesionGuardada);
        await auth.inicializarEntornoUsuario();
      } else {
        ui.mostrarPantalla("auth");
      }
    } catch (err) {
      console.warn("⚠️ Sesión local corrupta o desactualizada. Limpiando almacenamiento...", err);
      localStorage.removeItem("resiMed_session");
      localStorage.removeItem("resiMed_jwt_token");
      ui.mostrarPantalla("auth");
    } finally {
      // Ocultar y remover el Boot Loader con una transición suave y premium
      const loader = document.getElementById("boot-loader");
      if (loader) {
        loader.style.opacity = "0";
        loader.style.visibility = "hidden";
        setTimeout(() => loader.remove(), 400);
      }
    }
  },

  async inicializarEntornoUsuario() {
    if (!state.usuarioConectado) return;

    const saludoUsuario = document.getElementById("saludo-usuario");
    const btnIrInicio = document.getElementById("btn-ir-inicio");
    const btnVerPerfil = document.getElementById("btn-ver-perfil");
    const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");
    const panelAdministrador = document.getElementById("panel-administrador");

    if (saludoUsuario) {
      saludoUsuario.textContent = `Sesión activa: ${state.usuarioConectado.nombre}`;
    }
    const btnIrBatalla = document.getElementById("btn-ir-batalla");
    if (btnIrInicio) btnIrInicio.classList.remove("hidden");
    if (btnIrBatalla) btnIrBatalla.classList.remove("hidden");
    if (btnVerPerfil) {
      btnVerPerfil.classList.remove("hidden");
      btnVerPerfil.innerHTML = "👤 Mi Perfil";
    }
    if (btnCerrarSesion) btnCerrarSesion.classList.remove("hidden");

    // Decidir inmediatamente la pantalla de destino en primer plano para un inicio instantáneo (Non-blocking Boot)
    let enrutadoExamen = false;
    const tieneExamenActivo = localStorage.getItem("resiMed_examen_activo");
    if (tieneExamenActivo) {
      enrutadoExamen = quiz.restaurarExamenActivo();
    }

    if (!enrutadoExamen) {
      const hash = window.location.hash.replace("#", "");
      const pantallasValidas = ["home", "perfil", "flashcards", "quiz", "resultados"];
      
      if (hash === "resultados") {
        const restaurado = quiz.restaurarUltimoResultado();
        if (restaurado) {
          ui.mostrarPantalla("resultados", false);
        } else {
          ui.mostrarPantalla("home", false);
        }
      } else if (pantallasValidas.includes(hash)) {
        ui.mostrarPantalla(hash, false);
      } else {
        ui.mostrarPantalla("home", false);
      }
    }

    // Inicializar y cargar datos en segundo plano sin bloquear el hilo principal (Non-blocking Background Queries)
    if (state.usuarioConectado.rol === "admin") {
      if (panelAdministrador) panelAdministrador.classList.remove("hidden");
      ui.cargarReportesAdministrador().catch(err => console.error("Error al cargar reportes admin:", err));
      ui.cargarExamenesAdministrador().catch(err => console.error("Error al cargar exámenes admin:", err));
    } else {
      if (panelAdministrador) panelAdministrador.classList.add("hidden");
    }

    // Cargar componentes de la UI dinámica de forma concurrente protegiendo fallas individuales (Robust boot)
    const inicializaciones = [
      ui.inicializarGridEspecialidades(),
      ui.inicializarFiltrosFlashcards(),
      ui.cargarFiltrosEspecialidad(),
      ui.cargarFiltrosAnos(),
      ui.cargarDashboardHome(),
      ui.cargarHistorialReciente()
    ];

    inicializaciones.forEach(p => {
      if (p && typeof p.catch === "function") {
        p.catch(err => console.warn("Falla en sub-módulo de inicialización:", err));
      }
    });
  },

  logout() {
    if (auth.inactivityTimeout) {
      clearTimeout(auth.inactivityTimeout);
      auth.inactivityTimeout = null;
    }
    state.usuarioConectado = null;
    localStorage.removeItem("resiMed_session");
    localStorage.removeItem("resiMed_jwt_token");
    localStorage.removeItem("resiMed_ultimo_resultado");
    
    // FASE 4: Limpiar estado de examen activo al cerrar sesión
    if (window.quiz && quiz.limpiarEstadoExamenActivo) {
      quiz.limpiarEstadoExamenActivo();
    }

    const btnIrInicio = document.getElementById("btn-ir-inicio");
    const btnIrBatalla = document.getElementById("btn-ir-batalla");
    const btnVerPerfil = document.getElementById("btn-ver-perfil");
    const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");
    const saludoUsuario = document.getElementById("saludo-usuario");

    if (btnIrInicio) btnIrInicio.classList.add("hidden");
    if (btnIrBatalla) btnIrBatalla.classList.add("hidden");
    if (btnVerPerfil) btnVerPerfil.classList.add("hidden");
    if (btnCerrarSesion) btnCerrarSesion.classList.add("hidden");
    if (saludoUsuario) saludoUsuario.textContent = "Cargando entorno médico...";

    ui.mostrarPantalla("auth");
  },

  configurarTemporizadorInactividad() {
    const eventos = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click'];
    eventos.forEach(evt => {
      window.addEventListener(evt, auth.resetearTemporizadorInactividad, { passive: true });
    });
    auth.resetearTemporizadorInactividad();
  },

  resetearTemporizadorInactividad() {
    if (auth.inactivityTimeout) {
      clearTimeout(auth.inactivityTimeout);
    }
    if (state.usuarioConectado) {
      const quinceMinutos = 15 * 60 * 1000;
      auth.inactivityTimeout = setTimeout(() => {
        console.log("Sesión expirada por inactividad de 15 minutos.");
        auth.logout();
        alert("Tu sesión ha expirado por inactividad de 15 minutos. Inicia sesión de nuevo para proteger tu progreso.");
      }, quinceMinutos);
    }
  }
};

window.auth = auth;
