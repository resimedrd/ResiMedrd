// ====== COMPONENTE MODULAR DE UI: PERFIL Y AJUSTES DE USUARIO (ui_profile.js) ======

(function() {
  if (!window.ui) window.ui = {};

  // Cargar Ajustes del Usuario
  window.ui.cargarAjustesUsuario = function() {
    const user = state.usuarioConectado;
    if (!user) return;

    // Rellenar campos de texto simples
    const txtNombre = document.getElementById("ajustes-perfil-nombre");
    const txtEmail = document.getElementById("ajustes-perfil-email");
    const txtNacimiento = document.getElementById("ajustes-perfil-nacimiento");
    const txtMeta = document.getElementById("ajustes-perfil-meta");
    const txtRegistro = document.getElementById("ajustes-perfil-registro");
    const txtBiografia = document.getElementById("ajustes-perfil-biografia");
    const selectAspiracion = document.getElementById("ajustes-perfil-aspiracion");

    if (txtNombre) txtNombre.value = user.nombre || "";
    if (txtEmail) txtEmail.value = user.email || "";
    if (txtNacimiento) txtNacimiento.value = user.fecha_nacimiento || "";
    if (txtMeta) txtMeta.value = user.meta_semanal || 50;
    if (txtBiografia) txtBiografia.value = user.biografia || "";

    // Formatear fecha de registro
    if (txtRegistro) {
      if (user.fecha_registro) {
        const fecha = new Date(user.fecha_registro);
        txtRegistro.value = isNaN(fecha.getTime()) ? user.fecha_registro : fecha.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      } else {
        txtRegistro.value = "Fecha no disponible";
      }
    }

    // Poblar selector de especialidad aspirada
    if (selectAspiracion) {
      selectAspiracion.innerHTML = '<option value="Ninguna">Ninguna (Aún Decidiendo)</option>';
      state.LISTA_ESPECIALIDADES.forEach(esp => {
        const opt = document.createElement("option");
        opt.value = esp.nombre;
        opt.textContent = `${esp.emoji} ${esp.nombre}`;
        if (user.especialidad_aspirada === esp.nombre) {
          opt.selected = true;
        }
        selectAspiracion.appendChild(opt);
      });
    }
  };
})();
