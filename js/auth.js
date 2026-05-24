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
  },

  async restaurarSesion() {
    const sesionGuardada = localStorage.getItem("resiMed_session");
    const token = localStorage.getItem("resiMed_jwt_token");
    
    if (sesionGuardada && token) {
      state.usuarioConectado = JSON.parse(sesionGuardada);
      await auth.inicializarEntornoUsuario();
    } else {
      ui.mostrarPantalla("auth");
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
    if (btnIrInicio) btnIrInicio.classList.remove("hidden");
    if (btnVerPerfil) {
      btnVerPerfil.classList.remove("hidden");
      btnVerPerfil.innerHTML = "👤 Mi Perfil";
    }
    if (btnCerrarSesion) btnCerrarSesion.classList.remove("hidden");

    if (state.usuarioConectado.rol === "admin") {
      if (panelAdministrador) panelAdministrador.classList.remove("hidden");
      await ui.cargarReportesAdministrador();
    } else {
      if (panelAdministrador) panelAdministrador.classList.add("hidden");
    }

    // Inicializar los componentes de la UI dinámica del usuario
    await ui.inicializarGridEspecialidades();
    await ui.inicializarFiltrosFlashcards();
    await ui.cargarFiltrosEspecialidad();
    await ui.cargarDashboardHome();
    await ui.cargarHistorialReciente();

    ui.mostrarPantalla("home");
  },

  logout() {
    state.usuarioConectado = null;
    localStorage.removeItem("resiMed_session");
    localStorage.removeItem("resiMed_jwt_token");

    const btnIrInicio = document.getElementById("btn-ir-inicio");
    const btnVerPerfil = document.getElementById("btn-ver-perfil");
    const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");
    const saludoUsuario = document.getElementById("saludo-usuario");

    if (btnIrInicio) btnIrInicio.classList.add("hidden");
    if (btnVerPerfil) btnVerPerfil.classList.add("hidden");
    if (btnCerrarSesion) btnCerrarSesion.classList.add("hidden");
    if (saludoUsuario) saludoUsuario.textContent = "Cargando entorno médico...";

    ui.mostrarPantalla("auth");
  }
};

window.auth = auth;
