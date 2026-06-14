// ====== SISTEMA MULTIJUGADOR EN TIEMPO REAL - CLIENTE (battle.js) ======

const battle = {
  socket: null,
  salaCodigo: null,
  isHost: false,
  modalidadActual: null, // "amigos" o "aleatoria"
  estadoActual: "idle", // "idle", "queue", "lobby", "playing", "results"
  preguntasBatalla: [],
  preguntaActualIndex: 0,
  timePerQuestion: 60,
  repasoBatallaPreguntas: [], // Almacén para revisión pospartida
  respuestasUsuarioBatalla: [], // Respuestas del usuario para reporte pospartida
  jugadoresDeLaBatalla: [], // Jugadores activos en la partida actual

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
        if (battle.socket && battle.socket.readyState === WebSocket.OPEN) {
          battle.socket.send(JSON.stringify({ type: "leave_room" }));
        }
        battle.mostrarPantallaBattle("battle");
        battle.estadoActual = "idle";
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
        if (battle.socket && battle.socket.readyState === WebSocket.OPEN) {
          battle.socket.send(JSON.stringify({ type: "leave_room" }));
        }
        battle.mostrarPantallaBattle("battle");
        battle.estadoActual = "idle";
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
        const totalQ = qSelect ? parseInt(qSelect.value) : 15;

        if (battle.socket && battle.socket.readyState === WebSocket.OPEN) {
          battle.socket.send(JSON.stringify({ 
            type: "enter_queue",
            settings: { totalQuestions: totalQ, timePerQuestion: 30 } // Forzado a 30 segundos
          }));
          // Scroll automático suave hacia el HUD de búsqueda
          setTimeout(() => {
            const hud = document.getElementById("battle-queue-hud");
            if (hud) {
              hud.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 80);
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
    const setFastMode = document.getElementById("battle-settings-fastmode");

    const enviarConfiguracion = () => {
      if (battle.isHost && battle.socket && battle.socket.readyState === WebSocket.OPEN) {
        battle.socket.send(JSON.stringify({
          type: "configure_room",
          settings: {
            totalQuestions: setQuestions.value,
            timePerQuestion: setTime.value,
            fastMode: setFastMode ? setFastMode.value : "normal"
          }
        }));
      }
    };

    if (setQuestions) setQuestions.addEventListener("change", enviarConfiguracion);
    if (setTime) setTime.addEventListener("change", enviarConfiguracion);
    if (setFastMode) setFastMode.addEventListener("change", enviarConfiguracion);

    // 6. Botón de Abandono Rápido en la Arena de Batalla (Finalizar Batalla en caliente)
    const btnBattleQuit = document.getElementById("btn-battle-quit");
    if (btnBattleQuit) {
      btnBattleQuit.addEventListener("click", () => {
        if (confirm("¿Confirmas que deseas abandonar y finalizar esta batalla? Tu progreso actual en esta partida no se guardará.")) {
          if (battle.socket && battle.socket.readyState === WebSocket.OPEN) {
            battle.socket.send(JSON.stringify({ type: "leave_room" }));
          }
          battle.mostrarPantallaBattle("battle");
          battle.estadoActual = "idle";
        }
      });
    }

    // 7. Botones de Control de Consenso Manual (Batalla con amigos modo normal)
    const btnCorregir = document.getElementById("btn-battle-corregir");
    const btnSiguiente = document.getElementById("btn-battle-siguiente");

    if (btnCorregir) {
      btnCorregir.addEventListener("click", () => {
        if (battle.socket && battle.socket.readyState === WebSocket.OPEN) {
          battle.socket.send(JSON.stringify({ type: "request_correction" }));
          btnCorregir.disabled = true; // Deshabilitar temporalmente tras votar
        }
      });
    }

    if (btnSiguiente) {
      btnSiguiente.addEventListener("click", () => {
        if (battle.socket && battle.socket.readyState === WebSocket.OPEN) {
          battle.socket.send(JSON.stringify({ type: "request_next_question" }));
          btnSiguiente.disabled = true; // Deshabilitar temporalmente tras votar
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

      case "reconnected":
        battle.salaCodigo = payload.code;
        battle.modalidadActual = payload.settings ? (payload.settings.timePerQuestion === 30 ? "aleatoria" : "amigos") : "amigos";
        battle.estadoActual = payload.state;
        battle.jugadoresDeLaBatalla = payload.players || [];
        if (payload.state === "playing") {
          battle.mostrarPantallaBattle("battle-quiz");
        } else if (payload.state === "results") {
          battle.mostrarPantallaBattle("battle-results");
        } else {
          battle.mostrarPantallaBattle("battle-lobby");
        }
        break;

      // --- MÓDULO 1: ESTADÍSTICAS Y PANEL GENERAL ---
      case "battle_stats":
        battle.actualizarPerfilBattleUI(payload.stats, payload.historial);
        break;

      // --- MÓDULO 2: GESTIÓN DE COLA (MATCHMAKING) ---
      case "queue_entered": {
        const hud = document.getElementById("battle-queue-hud");
        if (hud) hud.classList.remove("hidden");
        battle.estadoActual = "queue";
        break;
      }

      case "queue_left": {
        const hud = document.getElementById("battle-queue-hud");
        if (hud) hud.classList.add("hidden");
        battle.estadoActual = "idle";
        break;
      }

      case "matchmaking_failed": {
        const hud = document.getElementById("battle-queue-hud");
        if (hud) hud.classList.add("hidden");
        battle.estadoActual = "idle";
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
        battle.estadoActual = "lobby";
        battle.abrirLobby(payload);
        break;

      case "room_updated":
        battle.modalidadActual = "amigos";
        battle.salaCodigo = payload.code;
        if (battle.estadoActual !== "playing" && battle.estadoActual !== "results") {
          battle.estadoActual = "lobby";
          battle.actualizarLobby(payload);
        } else {
          battle.actualizarJugadoresLobby(payload.players);
        }
        break;

      // --- MÓDULO 4: ARENA DE JUEGO MULTIJUGADOR ---
      case "battle_started":
        battle.modalidadActual = payload.modalidad;
        battle.jugadoresDeLaBatalla = payload.players || [];
        battle.respuestasUsuarioBatalla = []; // Resetear respuestas
        battle.estadoActual = "playing";
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

      case "correction_vote_updated": {
        const countSpan = document.getElementById("battle-corregir-count");
        const totalSpan = document.getElementById("battle-corregir-total");
        if (countSpan) countSpan.textContent = payload.count;
        if (totalSpan) totalSpan.textContent = payload.total;
        break;
      }

      case "next_question_vote_updated": {
        const countSpan = document.getElementById("battle-siguiente-count");
        const totalSpan = document.getElementById("battle-siguiente-total");
        if (countSpan) countSpan.textContent = payload.count;
        if (totalSpan) totalSpan.textContent = payload.total;
        break;
      }

      case "question_feedback":
        battle.mostrarFeedbackInmediato(payload);
        break;

      case "feedback_tick":
        const lblFeedTimer = document.getElementById("battle-feedback-timer");
        if (lblFeedTimer) lblFeedTimer.textContent = payload.timeLeft;
        break;

      case "battle_finished":
        battle.estadoActual = "results";
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
    const setFastMode = document.getElementById("battle-settings-fastmode");
    if (setFastMode && payload.settings && payload.settings.fastMode) {
      setFastMode.disabled = !battle.isHost;
      setFastMode.value = payload.settings.fastMode;
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

    // Inicializar respuesta del usuario para esta pregunta en null
    if (battle.respuestasUsuarioBatalla[payload.questionIndex] === undefined) {
      battle.respuestasUsuarioBatalla[payload.questionIndex] = null;
    }

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
          // Remover clase selected de todas las opciones en esta pregunta
          document.querySelectorAll("#battle-opciones-container .option-btn").forEach(b => {
            b.classList.remove("selected");
          });
          btn.classList.add("selected");

          // Guardar selección del usuario
          battle.respuestasUsuarioBatalla[payload.questionIndex] = index;

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

    // Inicializar visualización del Temporizador
    battle.actualizarTemporizadorArena(payload.timeLeft);

    // Configurar controles de consenso manual si aplica
    const totalPlayers = (battle.jugadoresDeLaBatalla && battle.jugadoresDeLaBatalla.length) || 2;
    const manualControls = document.getElementById("battle-manual-controls");
    const btnCorregir = document.getElementById("btn-battle-corregir");
    const btnSiguiente = document.getElementById("btn-battle-siguiente");

    if (battle.modalidadActual === "amigos" && payload.fastMode === "normal") {
      if (manualControls) manualControls.classList.remove("hidden");
      if (btnCorregir) {
        btnCorregir.classList.remove("hidden");
        btnCorregir.disabled = false;
        const countSpan = document.getElementById("battle-corregir-count");
        const totalSpan = document.getElementById("battle-corregir-total");
        if (countSpan) countSpan.textContent = "0";
        if (totalSpan) totalSpan.textContent = totalPlayers;
      }
      if (btnSiguiente) {
        btnSiguiente.classList.add("hidden");
        btnSiguiente.disabled = false;
        const countSpan = document.getElementById("battle-siguiente-count");
        const totalSpan = document.getElementById("battle-siguiente-total");
        if (countSpan) countSpan.textContent = "0";
        if (totalSpan) totalSpan.textContent = totalPlayers;
      }
    } else {
      if (manualControls) manualControls.classList.add("hidden");
    }
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
    const container = document.getElementById("battle-opponents-track-container");
    if (container) {
      container.innerHTML = "";
      
      const oponentes = [];

      if (battle.jugadoresDeLaBatalla && battle.jugadoresDeLaBatalla.length > 0) {
        battle.jugadoresDeLaBatalla.forEach(p => {
          if (state.usuarioConectado && p.nombre !== state.usuarioConectado.nombre) {
            oponentes.push({ nombre: p.nombre, id: p.id });
          }
        });
      } else {
        // En salas privadas (modalidad amigos) si no se tiene cargado jugadoresDeLaBatalla
        const lobbyPlayers = document.querySelectorAll("#lobby-players-container .lobby-player-name");
        if (lobbyPlayers.length > 0) {
          lobbyPlayers.forEach(p => {
            const rawName = p.textContent.replace("👨‍⚕️", "").replace("Creador", "").trim();
            if (state.usuarioConectado && rawName !== state.usuarioConectado.nombre) {
              oponentes.push({ nombre: rawName, id: Math.random() });
            }
          });
        }
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
    const jugador = battle.jugadoresDeLaBatalla.find(p => p.id === playerId);
    if (!jugador) return;
    
    const nameKey = jugador.nombre.replace(/\s+/g, '');
    const statusText = document.getElementById(`track-text-${nameKey}`);
    const pulseDot = document.getElementById(`track-dot-${nameKey}`);
    const fill = document.getElementById(`track-fill-${nameKey}`);

    if (statusText && statusText.textContent === "Pensando") {
      statusText.textContent = "Listo";
      statusText.style.color = "var(--success)";
      
      if (pulseDot) {
        pulseDot.classList.add("ready");
      }
      
      if (fill) {
        const totalQ = battle.repasoBatallaPreguntas.length || 15;
        fill.style.width = `${((battle.preguntaActualIndex + 1) / totalQ) * 100}%`;
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

      // Si estamos en modo manual de amigos, ocultar Corregir y mostrar Siguiente Pregunta
      const btnCorregir = document.getElementById("btn-battle-corregir");
      const btnSiguiente = document.getElementById("btn-battle-siguiente");
      const setFastMode = document.getElementById("battle-settings-fastmode");
      const isManualMode = battle.modalidadActual === "amigos" && setFastMode && setFastMode.value === "normal";

      if (isManualMode) {
        if (btnCorregir) btnCorregir.classList.add("hidden");
        if (btnSiguiente) {
          btnSiguiente.classList.remove("hidden");
          btnSiguiente.disabled = false;
        }
      }
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

    // 2.2 Rellenar Matriz Comparativa de la Competencia preguntando en qué falló y en qué ganó
    const matrixHeader = document.getElementById("battle-matrix-header");
    const matrixCuerpo = document.getElementById("battle-matrix-cuerpo");
    
    if (matrixHeader && matrixCuerpo) {
      matrixHeader.innerHTML = `<th style="padding: 12px 16px; width: 200px; text-align: left;">Médico</th>`;
      
      const numQuestions = battle.repasoBatallaPreguntas.length || (payload.questions ? payload.questions.length : 0) || 15;
      
      // Inyectar cabeceras P1, P2...
      for (let i = 1; i <= numQuestions; i++) {
        matrixHeader.innerHTML += `<th style="padding: 12px 16px; text-align: center;">P${i}</th>`;
      }
      matrixHeader.innerHTML += `<th style="padding: 12px 16px; text-align: center; width: 100px;">Nota</th>`;
      
      matrixCuerpo.innerHTML = "";
      
      payload.podio.forEach(p => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid var(--border)";
        
        const esMiUsuario = state.usuarioConectado && p.nombre === state.usuarioConectado.nombre;
        
        let rowHtml = `
          <td style="padding: 12px 16px; font-weight: ${esMiUsuario ? 'bold' : 'normal'}; color: ${esMiUsuario ? 'var(--primary)' : 'var(--text-soft)'}; text-align: left;">
            👨‍⚕️ ${p.nombre} ${esMiUsuario ? '(Tú)' : ''}
          </td>
        `;
        
        // Iterar por cada pregunta
        for (let qIdx = 0; qIdx < numQuestions; qIdx++) {
          const ans = p.answers ? p.answers.find(a => a.questionIndex === qIdx) : null;
          let statusText = "⚪"; // Sin responder
          
          if (ans) {
            statusText = ans.correct ? "✅" : "❌";
          }
          
          rowHtml += `<td style="padding: 12px 16px; text-align: center; font-size: 15px;">${statusText}</td>`;
        }
        
        rowHtml += `
          <td style="padding: 12px 16px; text-align: center; font-weight: 700; color: var(--primary);">
            ${p.score}/${numQuestions}
          </td>
        `;
        
        tr.innerHTML = rowHtml;
        matrixCuerpo.appendChild(tr);
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
          const div = document.createElement("div");
          div.className = "review-item";
          
          const seleccion = battle.respuestasUsuarioBatalla[qIdx];
          const esCorrecta = seleccion === q.correcta;
          
          if (!esCorrecta) {
            div.classList.add("review-wrong");
          }

          const letras = ["A", "B", "C", "D"];
          let opcionesHtml = "";
          
          q.opciones.forEach((opc, opcIdx) => {
            let claseOpt = "";
            if (opcIdx === q.correcta) claseOpt = "correct";
            if (opcIdx === seleccion && seleccion !== q.correcta) claseOpt = "wrong";
            
            let oLimpia = opc;
            const regexPrefijo = /^[a-d](?:\)|\.-|\.\s|\s-\s)\s*/i;
            oLimpia = oLimpia.replace(regexPrefijo, "");
            
            opcionesHtml += `<div class="review-opt ${claseOpt}"><strong>${letras[opcIdx]}.</strong> ${oLimpia}</div>`;
          });

          let botonesAccionHtml = `<div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;">`;
          const textoEscapado = q.texto.replace(/"/g, "&quot;");
          const explicacionEscapada = (q.explicacion || "Sin desglose.").replace(/"/g, "&quot;");
          const temaEscapado = (q.tema || "General").replace(/"/g, "&quot;");

          if (seleccion !== q.correcta) {
            const seleccionText = (seleccion !== null && seleccion !== undefined && q.opciones[seleccion]) 
              ? q.opciones[seleccion].replace(/"/g, "&quot;") 
              : "Sin responder";
            botonesAccionHtml += `
              <button class="btn-ia btn-consultar-tutor" data-texto="${textoEscapado}" data-seleccion="${seleccionText}" type="button">Consultar Tutor IA</button>
              <button class="btn btn-primary btn-auto-flashcard" data-tema="${temaEscapado}" data-pregunta="${textoEscapado}" data-respuesta="${explicacionEscapada}" style="background: var(--warning); color:#000; font-size:12px; padding:6px 12px; border:none;" type="button">Crear Flashcard</button>
            `;
          }
          
          botonesAccionHtml += `
            <button class="btn btn-secondary btn-reportar-pregunta" data-id="${q.id}" style="border-color: var(--danger); color: var(--danger); font-size:12px; padding:6px 12px; min-width: auto; background: transparent; cursor: pointer; border-radius: 8px; font-weight: 600;" type="button">⚠️ Reportar Error</button>
          `;
          
          botonesAccionHtml += `</div>`;

          let statusChipHtml = "";
          if (seleccion === null || seleccion === undefined) {
            statusChipHtml = `<span class="chip chip-soft" style="color: var(--text-dim); border-color: var(--border);">⏱️ SIN RESPONDER</span>`;
          } else if (esCorrecta) {
            statusChipHtml = `<span class="chip chip-soft" style="color: var(--success); border-color: var(--success); background: var(--success-soft);">✓ RESPUESTA CORRECTA</span>`;
          } else {
            statusChipHtml = `<span class="chip chip-soft" style="color: var(--danger); border-color: var(--danger); background: var(--danger-soft);">✗ RESPUESTA INCORRECTA</span>`;
          }

          div.innerHTML = `
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <div style="font-size: 11px; color: var(--text-dim);">
                Materia: <strong>${q.tema || "General"}</strong>
              </div>
              ${statusChipHtml}
            </div>
            <div class="review-q-text">${qIdx + 1}. ${q.texto}</div>
            <div class="review-options">${opcionesHtml}</div>
            <div class="review-exp-container">${ui.formatearExplicacionClinica(q.explicacion, q.fuente)}</div>
            ${botonesAccionHtml}
          `;
          
          reviewContainer.appendChild(div);
        });
      } else {
        reviewSection.classList.add("hidden");
      }
    }
  }
};

window.battle = battle;
