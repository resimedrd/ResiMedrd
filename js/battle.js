// ====== SISTEMA MULTIJUGADOR EN TIEMPO REAL - CLIENTE (battle.js) ======

const battle = {
  socket: null,
  salaCodigo: null,
  isHost: false,
  modalidadActual: null, // "amigos" o "aleatoria"
  preguntasBatalla: [],
  preguntaActualIndex: 0,
  timePerQuestion: 60,
  repasoBatallaPreguntas: [], // Almacén para revisión pospartida

  inicializar() {
    // 1. Vincular botones de navegación superior y dashboard
    const btnIrBatalla = document.getElementById("btn-ir-batalla");
    const btnHomeIrBatalla = document.getElementById("btn-home-ir-batalla");
    const btnResultsReturn = document.getElementById("btn-battle-results-return");

    const navegarABattleHub = () => {
      // Ocultar botón Volver al inicio si está en perfil
      const btnVerPerfil = document.getElementById("btn-ver-perfil");
      if (btnVerPerfil) btnVerPerfil.innerHTML = "👤 Mi Perfil";

      battle.mostrarPantallaBattle("battle");
      battle.conectarWebSocket();
    };

    if (btnIrBatalla) {
      btnIrBatalla.addEventListener("click", navegarABattleHub);
    }
    if (btnHomeIrBatalla) {
      btnHomeIrBatalla.addEventListener("click", navegarABattleHub);
    }



    if (btnResultsReturn) {
      btnResultsReturn.addEventListener("click", () => {
        battle.mostrarPantallaBattle("battle");
        if (battle.socket && battle.socket.readyState === WebSocket.OPEN) {
          battle.socket.send(JSON.stringify({ type: "leave_queue" })); // Asegurar limpieza
        }
      });
    }

    // 2. Vincular Acciones de Salas Privadas
    const btnBattleCreate = document.getElementById("btn-battle-create");
    const btnBattleJoin = document.getElementById("btn-battle-join");
    const btnBattleLobbyLeave = document.getElementById("btn-battle-lobby-leave");
    const btnBattleStart = document.getElementById("btn-battle-start");

    if (btnBattleCreate) {
      btnBattleCreate.addEventListener("click", () => {
        const qSelect = document.getElementById("battle-custom-questions");
        const tSelect = document.getElementById("battle-custom-time");
        const totalQ = qSelect ? parseInt(qSelect.value) : 15;
        const timeP = tSelect ? parseInt(tSelect.value) : 60;

        if (battle.socket && battle.socket.readyState === WebSocket.OPEN) {
          battle.socket.send(JSON.stringify({ 
            type: "create_room",
            settings: { totalQuestions: totalQ, timePerQuestion: timeP }
          }));
        } else {
          alert("Conexión perdida. Intentando reconectar...");
          battle.conectarWebSocket();
        }
      });
    }

    if (btnBattleJoin) {
      btnBattleJoin.addEventListener("click", () => {
        const codeInput = document.getElementById("battle-join-code");
        const code = codeInput ? codeInput.value.trim() : "";
        if (!code || code.length !== 6) {
          alert("Por favor, ingresa un código de sala válido de 6 caracteres.");
          return;
        }

        if (battle.socket && battle.socket.readyState === WebSocket.OPEN) {
          battle.socket.send(JSON.stringify({ type: "join_room", code: code }));
        } else {
          alert("Conexión perdida. Intentando reconectar...");
          battle.conectarWebSocket();
        }
      });
    }

    if (btnBattleLobbyLeave) {
      btnBattleLobbyLeave.addEventListener("click", () => {
        battle.mostrarPantallaBattle("battle");
        // Forzar reconexión para limpiar estado de sala
        battle.conectarWebSocket();
      });
    }

    if (btnBattleStart) {
      btnBattleStart.addEventListener("click", () => {
        if (battle.socket && battle.socket.readyState === WebSocket.OPEN) {
          battle.socket.send(JSON.stringify({ type: "start_battle_private" }));
        }
      });
    }

    // 3. Vincular Cola de Emparejamiento Aleatorio
    const btnQueueEnter = document.getElementById("btn-battle-queue-enter");
    const btnQueueLeave = document.getElementById("btn-battle-queue-leave");

    if (btnQueueEnter) {
      btnQueueEnter.addEventListener("click", () => {
        const qSelect = document.getElementById("battle-custom-questions");
        const tSelect = document.getElementById("battle-custom-time");
        const totalQ = qSelect ? parseInt(qSelect.value) : 15;
        const timeP = tSelect ? parseInt(tSelect.value) : 60;

        if (battle.socket && battle.socket.readyState === WebSocket.OPEN) {
          battle.socket.send(JSON.stringify({ 
            type: "enter_queue",
            settings: { totalQuestions: totalQ, timePerQuestion: timeP }
          }));
        } else {
          alert("Conexión perdida. Intentando reconectar...");
          battle.conectarWebSocket();
        }
      });
    }

    if (btnQueueLeave) {
      btnQueueLeave.addEventListener("click", () => {
        if (battle.socket && battle.socket.readyState === WebSocket.OPEN) {
          battle.socket.send(JSON.stringify({ type: "leave_queue" }));
        }
      });
    }

    // 4. Vincular Chat de la Sala
    const chatForm = document.getElementById("lobby-chat-form");
    if (chatForm) {
      chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = document.getElementById("lobby-chat-input");
        const text = input ? input.value.trim() : "";
        if (text && battle.socket && battle.socket.readyState === WebSocket.OPEN) {
          battle.socket.send(JSON.stringify({ type: "chat_message", text: text }));
          input.value = "";
        }
      });
    }

    // 5. Vincular Configuración en Caliente (Solo Host)
    const setQuestions = document.getElementById("battle-settings-questions");
    const setTime = document.getElementById("battle-settings-time");

    const enviarConfiguracion = () => {
      if (battle.isHost && battle.socket && battle.socket.readyState === WebSocket.OPEN) {
        battle.socket.send(JSON.stringify({
          type: "configure_room",
          settings: {
            totalQuestions: setQuestions.value,
            timePerQuestion: setTime.value
          }
        }));
      }
    };

    if (setQuestions) setQuestions.addEventListener("change", enviarConfiguracion);
    if (setTime) setTime.addEventListener("change", enviarConfiguracion);

    // 6. Botón de Abandono Rápido en la Arena de Batalla (Finalizar Batalla en caliente)
    const btnBattleQuit = document.getElementById("btn-battle-quit");
    if (btnBattleQuit) {
      btnBattleQuit.addEventListener("click", () => {
        if (confirm("¿Confirmas que deseas abandonar y finalizar esta batalla? Tu progreso actual en esta partida no se guardará.")) {
          if (battle.socket) {
            battle.socket.close();
          }
          battle.mostrarPantallaBattle("battle");
          battle.conectarWebSocket(); // Reconectar de inmediato para estar listo para la siguiente batalla
        }
      });
    }
  },

  mostrarPantallaBattle(pantallaId) {
    ui.mostrarPantalla(pantallaId, true);
  },

  conectarWebSocket() {
    if (battle.socket) {
      battle.socket.close();
    }

    // Resolver protocolo y host dinámico (Local vs Producción en Railway)
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}`;

    console.log("🔌 Conectando con servidor multijugador en:", wsUrl);
    battle.socket = new WebSocket(wsUrl);

    battle.socket.onopen = () => {
      console.log("✅ Conectado a la Arena Multijugador.");
      // Autenticar mediante JWT de forma segura
      const token = localStorage.getItem("resiMed_jwt_token");
      if (token) {
        battle.socket.send(JSON.stringify({ type: "auth", token: token }));
      }
    };

    battle.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        battle.procesarMensajeServidor(payload);
      } catch (err) {
        console.error("Error al parsear payload de la batalla:", err);
      }
    };

    battle.socket.onclose = () => {
      console.log("❌ Desconectado de la Arena Multijugador.");
    };

    battle.socket.onerror = (err) => {
      console.error("WebSocket Error en Modo Batalla:", err);
    };
  },

  procesarMensajeServidor(payload) {
    switch (payload.type) {
      case "authenticated":
        console.log("👤 Jugador autenticado en WebSocket:", payload.user.nombre);
        break;

      case "error":
        alert("⚠️ Error en Batalla: " + payload.message);
        break;

      // --- MÓDULO 1: ESTADÍSTICAS Y PANEL GENERAL ---
      case "battle_stats":
        battle.actualizarPerfilBattleUI(payload.stats, payload.historial);
        break;

      // --- MÓDULO 2: GESTIÓN DE COLA (MATCHMAKING) ---
      case "queue_entered": {
        const hud = document.getElementById("battle-queue-hud");
        if (hud) hud.classList.remove("hidden");
        break;
      }

      case "queue_left": {
        const hud = document.getElementById("battle-queue-hud");
        if (hud) hud.classList.add("hidden");
        break;
      }

      case "matchmaking_failed": {
        const hud = document.getElementById("battle-queue-hud");
        if (hud) hud.classList.add("hidden");
        alert(payload.message || "No se encontraron contrincantes disponibles. Por favor, intenta de nuevo.");
        break;
      }

      case "queue_status": {
        const lblTime = document.getElementById("queue-timer-val");
        const lblCount = document.getElementById("queue-players-count");
        if (lblTime) lblTime.textContent = `${payload.timeLeft}s`;
        if (lblCount) lblCount.textContent = payload.playersCount;
        break;
      }

      // --- MÓDULO 3: SALAS Y LOBBIES ---
      case "room_created":
        battle.salaCodigo = payload.code;
        battle.isHost = true;
        battle.modalidadActual = "amigos";
        battle.abrirLobby(payload);
        break;

      case "room_updated":
        battle.modalidadActual = "amigos";
        battle.actualizarLobby(payload);
        break;

      // --- MÓDULO 4: ARENA DE JUEGO MULTIJUGADOR ---
      case "battle_started":
        battle.modalidadActual = payload.modalidad;
        battle.mostrarPantallaBattle("battle-quiz");
        // Ocultar HUD de cola de matchmaking
        const hud = document.getElementById("battle-queue-hud");
        if (hud) hud.classList.add("hidden");
        break;

      case "new_question":
        battle.renderizarPreguntaArena(payload);
        break;

      case "timer_tick":
        battle.actualizarTemporizadorArena(payload.timeLeft);
        break;

      case "player_responded":
        battle.marcarJugadorRespondioLive(payload.playerId);
        break;

      case "question_feedback":
        battle.mostrarFeedbackInmediato(payload);
        break;

      case "feedback_tick":
        const lblFeedTimer = document.getElementById("battle-feedback-timer");
        if (lblFeedTimer) lblFeedTimer.textContent = payload.timeLeft;
        break;

      case "battle_finished":
        battle.finalizarArena(payload);
        break;

      // --- CHAT ---
      case "chat_broadcast":
        battle.agregarMensajeChat(payload.sender, payload.message);
        break;
    }
  },

  // --- RENDERIZACIÓN Y UI ---

  actualizarPerfilBattleUI(stats, historial) {
    const txtJugadas = document.getElementById("battle-stats-jugadas");
    const txtGanadas = document.getElementById("battle-stats-ganadas");
    const txtPerdidas = document.getElementById("battle-stats-perdidas");
    const txtRacha = document.getElementById("battle-stats-racha");
    const txtMejorRacha = document.getElementById("battle-stats-mejor-racha");

    if (txtJugadas) txtJugadas.textContent = stats.battle_jugadas || 0;
    if (txtGanadas) txtGanadas.textContent = stats.battle_ganadas || 0;
    if (txtPerdidas) txtPerdidas.textContent = stats.battle_perdidas || 0;
    if (txtRacha) txtRacha.textContent = stats.battle_racha_actual || 0;
    if (txtMejorRacha) txtMejorRacha.textContent = `${stats.battle_racha_mejor || 0} Victorias`;

    // Renderizar historial de combates
    const container = document.getElementById("battle-historial-lista");
    const emptyMsg = document.getElementById("battle-historial-vacio");

    if (container && emptyMsg) {
      container.innerHTML = "";
      if (historial.length === 0) {
        emptyMsg.classList.remove("hidden");
      } else {
        emptyMsg.classList.add("hidden");
        historial.forEach(h => {
          const item = document.createElement("div");
          item.className = "history-item";

          const contrincantes = JSON.parse(h.contrincantes).join(", ") || "Bots";
          const modText = h.modalidad === "amigos" ? "Sala Privada" : "Batalla Aleatoria";
          const gano = h.posicion === 1;

          item.innerHTML = `
            <div class="history-info">
              <h4>⚔️ vs ${contrincantes}</h4>
              <p>${modText} • ${new Date(h.fecha).toLocaleDateString('es-ES')}</p>
            </div>
            <div class="history-badge ${gano ? 'good' : 'bad'}" style="font-size: 14px;">
              ${gano ? '🥇 Ganador' : '🥈 ' + h.posicion + 'º Lugar'} (${h.correctas}/${h.total_preguntas})
            </div>
          `;
          container.appendChild(item);
        });
      }
    }
  },

  abrirLobby(payload) {
    battle.mostrarPantallaBattle("battle-lobby");
    const lblCode = document.getElementById("lobby-code-val");
    if (lblCode) lblCode.textContent = payload.code;

    // Configurar campos habilitados
    const setQuestions = document.getElementById("battle-settings-questions");
    const setTime = document.getElementById("battle-settings-time");
    const btnStart = document.getElementById("btn-battle-start");
    const waitMsg = document.getElementById("lobby-wait-msg");

    if (setQuestions) {
      setQuestions.disabled = !battle.isHost;
      setQuestions.value = payload.settings.totalQuestions;
    }
    if (setTime) {
      setTime.disabled = !battle.isHost;
      setTime.value = payload.settings.timePerQuestion;
    }

    if (btnStart) btnStart.style.display = battle.isHost ? "block" : "none";
    if (waitMsg) waitMsg.style.display = battle.isHost ? "none" : "block";

    // Limpiar Chat
    const chatMsgBox = document.getElementById("lobby-chat-messages");
    if (chatMsgBox) chatMsgBox.innerHTML = `
      <div class="chat-bubble system">✓ Sala creada de forma segura. Comparte el código con tus colegas.</div>
    `;

    battle.actualizarJugadoresLobby(payload.players);
  },

  actualizarLobby(payload) {
    // Si no somos el creador, podemos estar uniéndonos
    const userId = state.usuarioConectado ? state.usuarioConectado.id : null;
    const host = payload.players.find(p => p.isHost);
    battle.isHost = host && String(host.id) === String(userId);

    battle.abrirLobby({
      code: battle.salaCodigo || payload.code || document.getElementById("lobby-code-val").textContent,
      settings: payload.settings,
      players: payload.players
    });
  },

  actualizarJugadoresLobby(players) {
    const container = document.getElementById("lobby-players-container");
    if (container) {
      container.innerHTML = "";
      players.forEach(p => {
        const card = document.createElement("div");
        card.className = "lobby-player-card";
        card.innerHTML = `
          <span class="lobby-player-name">
            👨‍⚕️ ${p.nombre} ${p.isHost ? '<span class="chip chip-primary" style="font-size: 9px; padding: 2px 6px;">Creador</span>' : ""}
          </span>
          <span style="color: var(--success); font-size: 12.5px; font-weight: 600;">✓ Conectado</span>
        `;
        container.appendChild(card);
      });
    }
  },

  agregarMensajeChat(sender, message) {
    const chatMsgBox = document.getElementById("lobby-chat-messages");
    if (chatMsgBox) {
      const bubble = document.createElement("div");
      const esMio = state.usuarioConectado && sender === state.usuarioConectado.nombre;
      bubble.className = `chat-bubble ${esMio ? 'mine' : ''}`;
      
      // Sanitizar inyecciones de código HTML (XSS)
      const safeMessage = message
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
        
      bubble.innerHTML = `<strong>${esMio ? 'Yo' : sender}:</strong> ${safeMessage}`;
      
      chatMsgBox.appendChild(bubble);
      chatMsgBox.scrollTop = chatMsgBox.scrollHeight; // Auto-scroll al final
    }
  },

  renderizarPreguntaArena(payload) {
    battle.preguntaActualIndex = payload.questionIndex;
    battle.timePerQuestion = payload.timeLeft;

    // Resetear feedback
    const feedbackBox = document.getElementById("battle-feedback-box");
    if (feedbackBox) feedbackBox.classList.add("hidden");

    // Rellenar Tema y Pregunta Index
    const chipTema = document.getElementById("battle-chip-tema");
    const countPregunta = document.getElementById("battle-contador-pregunta");
    
    if (chipTema) chipTema.textContent = payload.tema || "General";
    if (countPregunta) countPregunta.textContent = `Pregunta ${payload.questionIndex + 1} de ${payload.totalQuestions}`;

    // Rellenar Barra de Progreso
    const progressFill = document.getElementById("battle-progress-fill");
    if (progressFill) {
      const pct = ((payload.questionIndex) / payload.totalQuestions) * 100;
      progressFill.style.width = `${pct}%`;
    }

    // Rellenar Enunciado
    const qTexto = document.getElementById("battle-pregunta-texto");
    if (qTexto) qTexto.textContent = payload.texto;

    // Rellenar Opciones
    const container = document.getElementById("battle-opciones-container");
    if (container) {
      container.innerHTML = "";
      const letras = ["A", "B", "C", "D"];
      
      payload.opciones.forEach((opc, index) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.type = "button";
        btn.innerHTML = `
          <span class="option-letter">${letras[index]})</span>
          <span class="option-text-content">${opc}</span>
        `;

        btn.addEventListener("click", () => {
          // Deshabilitar todas tras hacer click para evitar doble submit
          document.querySelectorAll("#battle-opciones-container .option-btn").forEach(b => {
            b.disabled = true;
          });
          btn.classList.add("selected");

          // Enviar respuesta
          if (battle.socket && battle.socket.readyState === WebSocket.OPEN) {
            battle.socket.send(JSON.stringify({
              type: "submit_answer",
              questionIndex: payload.questionIndex,
              answerIndex: index
            }));
          }
        });

        container.appendChild(btn);
      });
    }

    // Inicializar visualización de Contrincantes
    battle.actualizarLiveTrackOponentes(payload.players || []);
  },

  actualizarTemporizadorArena(timeLeft) {
    const ring = document.getElementById("battle-temporizador-circular");
    const radialFill = document.getElementById("radial-timer-fill");
    
    if (ring) {
      ring.textContent = timeLeft < 10 ? `0${timeLeft}` : timeLeft;
      
      // Sincronizar el trazo radial SVG (276.4 es el perímetro de r=44)
      if (radialFill) {
        const totalTime = battle.timePerQuestion || 60;
        const pct = Math.max(0, Math.min(1, timeLeft / totalTime));
        const offset = 276.4 * (1 - pct);
        radialFill.style.strokeDashoffset = offset;
        
        // Cambiar color radial de advertencia si quedan menos de 10s
        if (timeLeft <= 10) {
          radialFill.style.stroke = "var(--danger)";
          ring.style.color = "var(--danger)";
        } else {
          radialFill.style.stroke = "var(--warning)";
          ring.style.color = "var(--warning)";
        }
      }
    }
  },

  actualizarLiveTrackOponentes(customPlayers) {
    // Al iniciar una batalla o durante el matchmaking, el servidor no puede enviar WS concurrentes de track.
    // Nosotros construiremos la barra lateral usando las conexiones de la sala
    const container = document.getElementById("battle-opponents-track-container");
    if (container) {
      container.innerHTML = "";
      
      // Nota: Si no hay contrincantes cargados en payload, el motor los renderizará desde el lobby local
      // Para mayor robustez, recuperamos los nombres de los oponentes de la sala actual
      const lobbyPlayers = document.querySelectorAll("#lobby-players-container .lobby-player-name");
      const oponentes = [];

      if (lobbyPlayers.length > 0) {
        lobbyPlayers.forEach(p => {
          const rawName = p.textContent.replace("👨‍⚕️", "").replace("Creador", "").trim();
          if (state.usuarioConectado && rawName !== state.usuarioConectado.nombre) {
            oponentes.push({ nombre: rawName, id: Math.random() });
          }
        });
      } else {
        // Fallback de Bots o contrincantes en batalla aleatoria
        oponentes.push({ nombre: "Dra. Castillo (Live)", id: 1 }, { nombre: "Dr. Almonte (Live)", id: 2 });
      }

      oponentes.forEach(op => {
        const row = document.createElement("div");
        row.className = "opponent-track-row";
        row.id = `track-row-${op.nombre.replace(/\s+/g, '')}`;
        row.innerHTML = `
          <div class="opponent-track-info">
            <span style="font-size: 13px; font-weight: 600; color: var(--text-soft);">👨‍⚕️ ${op.nombre}</span>
            <div class="opponent-track-bar-bg">
              <div class="opponent-track-bar-fill" id="track-fill-${op.nombre.replace(/\s+/g, '')}"></div>
            </div>
          </div>
          <div class="opponent-responded-indicator" id="track-check-${op.nombre.replace(/\s+/g, '')}" style="color: var(--text-dim); font-size: 12px; font-weight: bold; display: flex; align-items: center; gap: 6px;">
            <span class="opponent-pulse-dot" id="track-dot-${op.nombre.replace(/\s+/g, '')}"></span>
            <span class="opponent-status-text" id="track-text-${op.nombre.replace(/\s+/g, '')}">Pensando</span>
          </div>
        `;
        container.appendChild(row);
      });
    }
  },

  marcarJugadorRespondioLive(playerId) {
    // Encontrar al oponente correspondiente
    const indicators = document.querySelectorAll(".opponent-responded-indicator");
    for (const ind of indicators) {
      const statusText = ind.querySelector(".opponent-status-text");
      if (statusText && statusText.textContent === "Pensando") {
        statusText.textContent = "Listo";
        statusText.style.color = "var(--success)";
        
        const pulseDot = ind.querySelector(".opponent-pulse-dot");
        if (pulseDot) {
          pulseDot.classList.add("ready");
        }
        
        // Simular que su barra de progreso avanza un poco
        const barId = ind.id.replace("track-check-", "track-fill-");
        const fill = document.getElementById(barId);
        if (fill) {
          fill.style.width = `${((battle.preguntaActualIndex + 1) / 15) * 100}%`;
        }
        break;
      }
    }
  },

  mostrarFeedbackInmediato(payload) {
    const qIndex = payload.questionIndex;
    const correctIndex = payload.correcta;
    
    // Rellenar explicaciones en la tarjeta principal
    const feedbackBox = document.getElementById("battle-feedback-box");
    const feedEstado = document.getElementById("battle-feedback-estado");
    const feedExp = document.getElementById("battle-feedback-explicacion");
    const feedFuente = document.getElementById("battle-feedback-fuente");
    const btnOpciones = document.querySelectorAll("#battle-opciones-container .option-btn");

    if (feedbackBox && feedEstado && feedExp && feedFuente) {
      // 1. Iluminar opciones correctas e incorrectas
      btnOpciones.forEach((btn, index) => {
        btn.disabled = true;
        if (index === correctIndex) {
          btn.classList.add("correct");
        } else if (btn.classList.contains("selected")) {
          btn.classList.add("wrong");
        }
      });

      // 2. Determinar si "Yo" acerté
      const miAns = payload.results.find(r => state.usuarioConectado && r.nombre === state.usuarioConectado.nombre);
      const acertado = miAns ? miAns.correct : false;

      if (acertado) {
        feedEstado.textContent = "✓ ¡RESPUESTA CORRECTA!";
        feedEstado.className = "feedback-estado correct";
        // Feedback háptico táctil para móviles ante aciertos
        if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
      } else {
        feedEstado.textContent = "✗ ¡RESPUESTA INCORRECTA!";
        feedEstado.className = "feedback-estado wrong";
        // Feedback háptico táctil para móviles ante errores
        if (navigator.vibrate) navigator.vibrate(250);
      }

      feedExp.innerHTML = payload.explicacion.replace(/\n/g, "<br/>");
      feedFuente.textContent = payload.fuente;
      
      feedbackBox.classList.remove("hidden");
      feedbackBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  },

  finalizarArena(payload) {
    battle.mostrarPantallaBattle("battle-results");
    battle.repasoBatallaPreguntas = payload.questions || [];

    // 1. Renderizar el Podio 3D Premium
    const podiumContainer = document.getElementById("battle-podium-container");
    if (podiumContainer) {
      podiumContainer.innerHTML = "";

      // Tomar los 3 primeros del podio
      const primero = payload.podio.find(p => p.posicion === 1);
      const segundo = payload.podio.find(p => p.posicion === 2);
      const tercero = payload.podio.find(p => p.posicion === 3);

      const items = [
        { place: 2, p: segundo, class: "podium-2", emoji: "🥈" },
        { place: 1, p: primero, class: "podium-1", emoji: "🥇" },
        { place: 3, p: tercero, class: "podium-3", emoji: "🥉" }
      ];

      items.forEach(item => {
        const col = document.createElement("div");
        col.className = "podium-place";

        if (item.p) {
          col.innerHTML = `
            ${item.place === 1 ? '<div class="podium-crown">👑</div>' : ''}
            <div class="podium-avatar">${item.place === 1 ? '👨‍⚕️' : '🩺'}</div>
            <div class="podium-column ${item.class}">
              <span>${item.place}º</span>
            </div>
            <div class="podium-name">${item.p.nombre}</div>
            <div class="podium-score-tag">${item.p.score} pts</div>
          `;
        } else {
          // Columna vacía si no hay 2do o 3ro
          col.innerHTML = `
            <div class="podium-avatar" style="opacity: 0.2;">💨</div>
            <div class="podium-column ${item.class}" style="opacity: 0.15;">
              <span>${item.place}º</span>
            </div>
            <div class="podium-name" style="color: var(--text-dim);">Vacío</div>
          `;
        }
        podiumContainer.appendChild(col);
      });
      
      // Disparar crecimiento progresivo elástico del podio 3D premium
      requestAnimationFrame(() => {
        setTimeout(() => {
          const col1 = document.querySelector(".podium-column.podium-1");
          const col2 = document.querySelector(".podium-column.podium-2");
          const col3 = document.querySelector(".podium-column.podium-3");
          
          if (col1) col1.style.setProperty("height", "180px", "important");
          if (col2) col2.style.setProperty("height", "130px", "important");
          if (col3) col3.style.setProperty("height", "90px", "important");
        }, 100);
      });
    }

    // 2. Rellenar Tabla Clasificatoria Completa
    const tablaCuerpo = document.getElementById("battle-tabla-resultados-cuerpo");
    if (tablaCuerpo) {
      tablaCuerpo.innerHTML = "";
      
      payload.podio.forEach(p => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid var(--border)";
        
        const gano = p.posicion === 1;
        const nombreResaltado = state.usuarioConectado && p.nombre === state.usuarioConectado.nombre;

        tr.innerHTML = `
          <td style="padding: 14px 16px; text-align: center; font-weight: 800; color: ${gano ? 'var(--warning)' : 'var(--text-soft)'};">
            ${p.posicion}º
          </td>
          <td style="padding: 14px 16px; font-weight: ${nombreResaltado ? 'bold' : 'normal'}; color: ${nombreResaltado ? 'var(--primary)' : 'var(--text-soft)'};">
            👨‍⚕️ ${p.nombre} ${p.isBot ? '<span class="chip chip-soft" style="font-size: 8.5px; padding: 2px 6px;">Colega Bot</span>' : ""}
          </td>
          <td style="padding: 14px 16px; text-align: center; font-weight: 700;">
            ${p.score} pts
          </td>
          <td style="padding: 14px 16px; text-align: center; font-weight: 700; color: ${gano ? 'var(--success)' : 'var(--text-dim)'};">
            ${gano ? '🏆 GANADOR' : 'FIN'}
          </td>
        `;
        tablaCuerpo.appendChild(tr);
      });
    }

    // 3. Habilitar Módulo de Revisión si existen preguntas de respaldo
    const reviewSection = document.getElementById("battle-review-section");
    const reviewContainer = document.getElementById("battle-review-questions-container");

    if (reviewSection && reviewContainer) {
      reviewContainer.innerHTML = "";

      if (battle.repasoBatallaPreguntas.length > 0) {
        reviewSection.classList.remove("hidden");
        
        // Renderizar cada pregunta fallada o acertada en el módulo de revisión pospartida
        battle.repasoBatallaPreguntas.forEach((q, qIdx) => {
          const card = document.createElement("article");
          card.className = "feedback-box";
          card.style.borderColor = "var(--border)";
          card.style.background = "var(--panel-soft)";

          const letras = ["A", "B", "C", "D"];
          let opcsHtml = "";
          
          q.opciones.forEach((opc, opcIdx) => {
            const esCorrecta = opcIdx === q.correcta;
            opcsHtml += `
              <div style="padding: 10px 14px; border-radius: 8px; border: 1px solid ${esCorrecta ? 'var(--success)' : 'var(--border)'}; background: ${esCorrecta ? 'var(--success-soft)' : 'transparent'}; margin-bottom: 6px; font-size: 13.5px; display: flex; align-items: center; gap: 8px;">
                <strong style="color: ${esCorrecta ? 'var(--success)' : 'var(--text-dim)'};">${letras[opcIdx]})</strong>
                <span style="color: ${esCorrecta ? 'var(--success)' : 'var(--text-soft)'};">${opc}</span>
              </div>
            `;
          });

          card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span class="chip chip-primary" style="font-size: 10px;">Pregunta ${qIdx + 1}</span>
              <span style="font-size: 12px; color: var(--text-dim); font-style: italic;">Fuente: ${q.fuente}</span>
            </div>
            <h4 style="font-size: 15px; font-weight: 700; line-height: 1.5; margin-bottom: 16px; color: var(--text);">${q.texto}</h4>
            <div style="margin-bottom: 16px;">${opcsHtml}</div>
            <div style="border-top: 1px dashed var(--border); padding-top: 12px; font-size: 13.5px; line-height: 1.5; color: var(--text-soft);">
              <strong>🔬 EXPLICACIÓN ACADÉMICA:</strong><br/>
              <p style="margin-top: 6px;">${q.explicacion.replace(/\n/g, "<br/>")}</p>
            </div>
          `;
          
          reviewContainer.appendChild(card);
        });
      } else {
        reviewSection.classList.add("hidden");
      }
    }
  }
};

window.battle = battle;
