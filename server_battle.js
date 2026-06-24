const ws = require("ws");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

let publicKey = null;
try {
  publicKey = fs.readFileSync(path.join(__dirname, "src/config/supabase_public_key.pem"), "utf8");
} catch (err) {
  console.error("❌ ERROR AL CARGAR CLAVE PÚBLICA DE SUPABASE EN SERVER_BATTLE:", err);
}

// Estado global de salas y cola en memoria
const activeRooms = new Map(); // code -> room
let matchmakingQueue = [];     // Array de { id, nombre, ws, joinedAt }
let matchmakingTimer = null;
let queueTimeLeft = 30;         // Segundos para el temporizador de cola
let dbInstance = null;         // Variable local para albergar la referencia a la base de datos

// Nombres de médicos ficticios para bots (cuando no hay suficientes jugadores reales en cola)
const BOT_NAMES = [
  "Dr. Martínez", "Dra. Castillo", "Dr. Almonte", "Dra. Reyes", 
  "Dr. Sánchez", "Dra. Rosario", "Dr. Pichardo", "Dra. De la Cruz",
  "Dr. Ventura", "Dra. Guzmán"
];

function generarCodigoSala() {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Evitamos O, 0, I, 1
  let codigo = "";
  for (let i = 0; i < 6; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
}

async function guardarSalaEnBD(room) {
  if (!dbInstance) return;
  try {
    const query = `
      INSERT INTO salas_activas (
        codigo, modalidad, settings, host_id, state, 
        current_question_index, phase, question_time_left, feedback_time_left, 
        questions, players, corrections_requested, next_questions_requested, podio
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(codigo) DO UPDATE SET
        modalidad = excluded.modalidad,
        settings = excluded.settings,
        host_id = excluded.host_id,
        state = excluded.state,
        current_question_index = excluded.current_question_index,
        phase = excluded.phase,
        question_time_left = excluded.question_time_left,
        feedback_time_left = excluded.feedback_time_left,
        questions = excluded.questions,
        players = excluded.players,
        corrections_requested = excluded.corrections_requested,
        next_questions_requested = excluded.next_questions_requested,
        podio = excluded.podio,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    const settingsStr = JSON.stringify(room.settings);
    const questionsStr = JSON.stringify(room.questions || []);
    const playersData = room.players.map(p => ({
      id: p.id,
      nombre: p.nombre,
      score: p.score,
      answers: p.answers,
      isBot: p.isBot || false,
      isConnected: p.isConnected !== false
    }));
    const playersStr = JSON.stringify(playersData);
    const correctionsStr = JSON.stringify(Array.from(room.correctionsRequested || []));
    const nextQuestionsStr = JSON.stringify(Array.from(room.nextQuestionsRequested || []));
    const podioStr = room.podio ? JSON.stringify(room.podio) : null;

    await dbInstance.run(query, [
      room.code,
      room.modalidad,
      settingsStr,
      room.hostId,
      room.state,
      room.currentQuestionIndex,
      room.phase || null,
      room.questionTimeLeft !== undefined ? room.questionTimeLeft : null,
      room.feedbackTimeLeft !== undefined ? room.feedbackTimeLeft : null,
      questionsStr,
      playersStr,
      correctionsStr,
      nextQuestionsStr,
      podioStr
    ]);
  } catch (err) {
    console.error(`❌ Error al persistir sala ${room.code} en BD:`, err);
  }
}

async function eliminarSalaDeBD(code) {
  if (!dbInstance) return;
  try {
    await dbInstance.run("DELETE FROM salas_activas WHERE codigo = ?", [code]);
  } catch (err) {
    console.error(`❌ Error al eliminar sala ${code} de BD:`, err);
  }
}

async function restaurarSalasActivasDesdeBD(db) {
  try {
    const rows = await db.all("SELECT * FROM salas_activas");
    console.log(`🏰 Restaurando ${rows.length} salas de batalla activas desde SQLite...`);
    for (const row of rows) {
      const room = {
        code: row.codigo,
        modalidad: row.modalidad,
        settings: JSON.parse(row.settings),
        hostId: row.host_id,
        state: row.state,
        currentQuestionIndex: row.current_question_index,
        phase: row.phase,
        questionTimeLeft: row.question_time_left,
        feedbackTimeLeft: row.feedback_time_left,
        questions: JSON.parse(row.questions),
        players: JSON.parse(row.players).map(p => ({
          ...p,
          ws: null,
          isConnected: false
        })),
        correctionsRequested: new Set(JSON.parse(row.corrections_requested || "[]")),
        nextQuestionsRequested: new Set(JSON.parse(row.next_questions_requested || "[]")),
        podio: row.podio ? JSON.parse(row.podio) : null
      };

      activeRooms.set(room.code, room);

      if (room.state === "playing") {
        resumirBucleDeBatalla(room);
      }
    }
  } catch (err) {
    console.error("❌ Error al restaurar salas de batalla desde BD:", err);
  }
}

function simularRespuestasDeBotsRestaurados(room, qIndex) {
  const bots = room.players.filter(p => p.isBot);
  for (const bot of bots) {
    if (bot.answers.some(ans => ans.questionIndex === qIndex)) {
      continue;
    }
    const timeLeft = room.questionTimeLeft || room.settings.timePerQuestion;
    const delay = Math.min(timeLeft * 1000, 2000 + Math.floor(Math.random() * 6000));
    
    setTimeout(async () => {
      if (room.state === "playing" && room.currentQuestionIndex === qIndex && room.phase === "question") {
        const correctIndex = room.questions[qIndex].correcta;
        const acierta = Math.random() < 0.70;
        let selectedIndex = correctIndex;
        if (!acierta) {
          const opciones = [0, 1, 2, 3].filter(o => o !== correctIndex);
          selectedIndex = opciones[Math.floor(Math.random() * opciones.length)];
        }

        bot.answers.push({
          questionIndex: qIndex,
          answerIndex: selectedIndex,
          correct: selectedIndex === correctIndex
        });

        if (selectedIndex === correctIndex) {
          bot.score += 1;
        }

        if (room.modalidad === "amigos") {
          broadcastToRoom(room, {
            type: "player_responded",
            playerId: bot.id
          });
        }
        
        await guardarSalaEnBD(room);
      }
    }, delay);
  }
}

function resumirBucleDeBatalla(room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
  }

  const qIndex = room.currentQuestionIndex;
  if (qIndex < 0 || qIndex >= room.questions.length) {
    finalizarBatalla(room);
    return;
  }

  if (room.phase === "question") {
    let timeLeft = room.questionTimeLeft !== null ? room.questionTimeLeft : room.settings.timePerQuestion;
    if (timeLeft <= 0) {
      procesarAvancePregunta(room);
      return;
    }

    simularRespuestasDeBotsRestaurados(room, qIndex);

    room.timerInterval = setInterval(async () => {
      timeLeft -= 1;
      room.questionTimeLeft = timeLeft;

      broadcastToRoom(room, {
        type: "timer_tick",
        timeLeft: timeLeft
      });

      if (timeLeft <= 0) {
        clearInterval(room.timerInterval);
        
        for (const p of room.players) {
          if (!p.answers.some(ans => ans.questionIndex === qIndex)) {
            p.answers.push({
              questionIndex: qIndex,
              answerIndex: -1,
              correct: false
            });
          }
        }
        procesarAvancePregunta(room);
      }
    }, 1000);

  } else if (room.phase === "feedback") {
    const isFastMode = room.modalidad === "aleatoria" || (room.settings && room.settings.fastMode === "rapido");
    if (isFastMode) {
      let feedbackTimeLeft = room.feedbackTimeLeft !== null ? room.feedbackTimeLeft : 10;
      if (feedbackTimeLeft <= 0) {
        avanzarSiguientePregunta(room);
        return;
      }

      room.timerInterval = setInterval(() => {
        feedbackTimeLeft -= 1;
        room.feedbackTimeLeft = feedbackTimeLeft;

        broadcastToRoom(room, {
          type: "feedback_tick",
          timeLeft: feedbackTimeLeft
        });

        if (feedbackTimeLeft <= 0) {
          clearInterval(room.timerInterval);
          avanzarSiguientePregunta(room);
        }
      }, 1000);
    } else {
      broadcastToRoom(room, {
        type: "feedback_tick",
        timeLeft: -1
      });
    }
  }
}

async function inicializarBatallas(server, db, JWT_SECRET) {
  const wss = new ws.Server({ noServer: true });
  dbInstance = db;
  
  // Restaurar salas guardadas antes de aceptar conexiones
  await restaurarSalasActivasDesdeBD(db);

  // Manejo de upgrade HTTP a WebSocket de forma segura
  server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (wsConn) => {
      wss.emit("connection", wsConn, request);
    });
  });

  wss.on("connection", (wsConn) => {
    wsConn.isAlive = true;
    wsConn.on("pong", () => {
      wsConn.isAlive = true;
    });

    let usuarioAutenticado = null;
    let salaActualCodigo = null;

    wsConn.on("message", async (messageStr) => {
      try {
        const message = JSON.parse(messageStr);

        // 1. Manejo exclusivo de Autenticación
        if (message.type === "auth") {
          jwt.verify(message.token, publicKey, { algorithms: ["ES256"] }, async (err, decoded) => {
            if (err) {
              wsConn.send(JSON.stringify({ type: "error", message: "Token inválido o expirado." }));
              wsConn.close();
            } else {
              try {
                decoded.id = decoded.sub; // Map UUID to decoded.id for compatibility
                // Recuperar el nombre real y rol del usuario de la base de datos para evitar undefined
                const userRow = await db.get("SELECT nombre, rol FROM usuarios WHERE id = ?", [decoded.id]);
                const nombreUsuario = userRow ? userRow.nombre : "Colega Médico";
                const userRol = userRow ? userRow.rol : "usuario";

                usuarioAutenticado = {
                  id: decoded.id,
                  nombre: nombreUsuario,
                  rol: userRol
                };

                wsConn.send(JSON.stringify({ 
                  type: "authenticated", 
                  user: { id: decoded.id, nombre: nombreUsuario } 
                }));

                 // Sincronizar estadísticas competitivas iniciales
                enviarEstadisticasBatalla(wsConn, decoded.id);

                // Buscar si este usuario pertenece a una sala activa jugando
                for (const [code, r] of activeRooms.entries()) {
                  const existingPlayer = r.players.find(p => p.id === decoded.id);
                  if (existingPlayer) {
                    existingPlayer.ws = wsConn;
                    existingPlayer.isConnected = true;
                    salaActualCodigo = code;
                    
                    wsConn.send(JSON.stringify({
                      type: "reconnected",
                      code: r.code,
                      state: r.state,
                      settings: r.settings,
                      currentQuestionIndex: r.currentQuestionIndex,
                      totalQuestions: r.questions.length,
                      timePerQuestion: r.settings.timePerQuestion,
                      players: r.players.map(p => ({ id: p.id, nombre: p.nombre }))
                    }));
                    
                    // Si la batalla está activa, enviarle la pregunta actual o el feedback de inmediato
                    if (r.state === "playing" && r.currentQuestionIndex >= 0) {
                      const question = r.questions[r.currentQuestionIndex];
                      if (r.phase === "question" || !r.phase) {
                        wsConn.send(JSON.stringify({
                          type: "new_question",
                          questionIndex: r.currentQuestionIndex,
                          totalQuestions: r.questions.length,
                          texto: question.texto,
                          opciones: question.opciones,
                          tema: question.tema,
                          timeLeft: (r.questionTimeLeft !== undefined) ? r.questionTimeLeft : r.settings.timePerQuestion
                        }));
                      } else if (r.phase === "feedback") {
                        const results = r.players.map(pl => {
                          const ans = pl.answers.find(a => a.questionIndex === r.currentQuestionIndex);
                          return {
                            nombre: pl.nombre,
                            correct: ans ? ans.correct : false
                          };
                        });
                        wsConn.send(JSON.stringify({
                          type: "question_feedback",
                          questionIndex: r.currentQuestionIndex,
                          correcta: question.correcta,
                          explicacion: question.explicacion || "Sin desglose.",
                          fuente: question.fuente || "ENURM Oficial",
                          results: results
                        }));
                        wsConn.send(JSON.stringify({
                          type: "feedback_tick",
                          timeLeft: (r.feedbackTimeLeft !== undefined) ? r.feedbackTimeLeft : 10
                        }));
                      }
                    } else if (r.state === "results" && r.podio) {
                      wsConn.send(JSON.stringify({
                        type: "battle_finished",
                        podio: r.podio,
                        questions: r.questions
                      }));
                    }
                    
                    broadcastToRoom(r, {
                      type: "room_updated",
                      code: r.code,
                      settings: r.settings,
                      players: r.players.map(pl => ({ id: pl.id, nombre: pl.nombre, isHost: pl.id === r.hostId, isConnected: true }))
                    });

                    await guardarSalaEnBD(r);
                    break;
                  }
                }
              } catch (dbErr) {
                console.error("Error al autenticar usuario en WebSocket de batalla:", dbErr);
                wsConn.send(JSON.stringify({ type: "error", message: "Error interno en el servidor." }));
                wsConn.close();
              }
            }
          });
          return;
        }

        // Proteger todos los comandos si no está autenticado
        if (!usuarioAutenticado) {
          wsConn.send(JSON.stringify({ type: "error", message: "No autenticado." }));
          return;
        }

        const userId = usuarioAutenticado.id;
        const userNombre = usuarioAutenticado.nombre;

        switch (message.type) {
          // --- MÓDULO 1: SALAS PRIVADAS (AMIGOS) ---
          case "create_room": {
            const roomCode = generarCodigoSala();
            const totalQ = message.settings ? (parseInt(message.settings.totalQuestions) || 15) : 15;
            const timeP = message.settings ? (parseInt(message.settings.timePerQuestion) || 60) : 60;
            const fastM = message.settings ? (message.settings.fastMode || "normal") : "normal";
            const room = {
              code: roomCode,
              modalidad: "amigos",
              settings: { totalQuestions: totalQ, timePerQuestion: timeP, fastMode: fastM },
              hostId: userId,
              players: [{ id: userId, nombre: userNombre, ws: wsConn, score: 0, answers: [], isConnected: true }],
              questions: [],
              currentQuestionIndex: -1,
              state: "lobby"
            };

            activeRooms.set(roomCode, room);
            salaActualCodigo = roomCode;

            wsConn.send(JSON.stringify({
              type: "room_created",
              code: roomCode,
              settings: room.settings,
              players: [{ id: userId, nombre: userNombre }]
            }));
            await guardarSalaEnBD(room);
            break;
          }

          case "join_room": {
            const code = message.code.toUpperCase().trim();
            const room = activeRooms.get(code);

            if (!room) {
              wsConn.send(JSON.stringify({ type: "error", message: "La sala no existe o el código es incorrecto." }));
              return;
            }

            if (room.state !== "lobby") {
              wsConn.send(JSON.stringify({ type: "error", message: "La partida ya ha comenzado." }));
              return;
            }

            if (room.players.length >= 5) {
              wsConn.send(JSON.stringify({ type: "error", message: "La sala está llena (máximo 5 jugadores)." }));
              return;
            }

            // Evitar duplicados
            if (room.players.some(p => p.id === userId)) {
              // Si se reconecta, actualizar socket
              const p = room.players.find(p => p.id === userId);
              p.ws = wsConn;
              p.isConnected = true;
            } else {
              room.players.push({ id: userId, nombre: userNombre, ws: wsConn, score: 0, answers: [], isConnected: true });
            }

            salaActualCodigo = code;

            broadcastToRoom(room, {
              type: "room_updated",
              code: room.code,
              settings: room.settings,
              players: room.players.map(p => ({ id: p.id, nombre: p.nombre, isHost: p.id === room.hostId }))
            });
            await guardarSalaEnBD(room);
            break;
          }

          case "configure_room": {
            const code = salaActualCodigo;
            const room = activeRooms.get(code);

            if (!room || room.hostId !== userId) {
              wsConn.send(JSON.stringify({ type: "error", message: "No tienes permiso para configurar esta sala." }));
              return;
            }

            room.settings.totalQuestions = parseInt(message.settings.totalQuestions) || 15;
            room.settings.timePerQuestion = parseInt(message.settings.timePerQuestion) || 60;
            room.settings.fastMode = message.settings.fastMode || "normal";

            broadcastToRoom(room, {
              type: "room_updated",
              code: room.code,
              settings: room.settings,
              players: room.players.map(p => ({ id: p.id, nombre: p.nombre, isHost: p.id === room.hostId }))
            });
            await guardarSalaEnBD(room);
            break;
          }

          case "start_battle_private": {
            const code = salaActualCodigo;
            const room = activeRooms.get(code);

            if (!room || room.hostId !== userId) {
              wsConn.send(JSON.stringify({ type: "error", message: "No tienes permiso para iniciar la partida." }));
              return;
            }

            if (room.players.length < 2) {
              wsConn.send(JSON.stringify({ type: "error", message: "Se requieren al menos 2 jugadores para iniciar la batalla." }));
              return;
            }

            // Obtener preguntas desde SQLite
            try {
              const query = `
                SELECT id, texto, opciones, correcta, explicacion, fuente, tema 
                FROM preguntas 
                WHERE activo = 1 
                ORDER BY RANDOM() 
                LIMIT ?
              `;
              const rows = await db.all(query, [room.settings.totalQuestions]);
              
              if (rows.length < room.settings.totalQuestions) {
                wsConn.send(JSON.stringify({ type: "error", message: "No hay suficientes preguntas en el banco para la cantidad configurada." }));
                return;
              }

              room.questions = rows.map(r => ({
                id: r.id,
                texto: r.texto,
                opciones: JSON.parse(r.opciones),
                correcta: r.correcta,
                explicacion: r.explicacion,
                fuente: r.fuente || "ENURM Oficial",
                tema: r.tema
              }));

              room.state = "playing";
              room.currentQuestionIndex = 0;

              broadcastToRoom(room, {
                type: "battle_started",
                modalidad: "amigos",
                totalQuestions: room.settings.totalQuestions,
                timePerQuestion: room.settings.timePerQuestion,
                players: room.players.map(p => ({ id: p.id, nombre: p.nombre }))
              });

              enviarPreguntaSincronizada(room);
            } catch (dbErr) {
              console.error("Error al extraer preguntas para batalla:", dbErr);
              wsConn.send(JSON.stringify({ type: "error", message: "Falla interna de base de datos." }));
            }
            break;
          }

          // --- MÓDULO 2: BATALLAS ALEATORIAS (MATCHMAKING) ---
          case "enter_queue": {
            const totalQ = message.settings ? (parseInt(message.settings.totalQuestions) || 15) : 15;
            const timeP = 30; // Las salas aleatorias siempre duran 30 segundos por pregunta
            // Evitar duplicados en cola
            if (!matchmakingQueue.some(p => p.id === userId)) {
              matchmakingQueue.push({
                id: userId,
                nombre: userNombre,
                ws: wsConn,
                joinedAt: Date.now(),
                settings: { totalQuestions: totalQ, timePerQuestion: timeP }
              });
            }

            wsConn.send(JSON.stringify({ type: "queue_entered" }));
            iniciarMatchmakingLoop(db);
            break;
          }

          case "leave_queue": {
            matchmakingQueue = matchmakingQueue.filter(p => p.id !== userId);
            wsConn.send(JSON.stringify({ type: "queue_left" }));
            break;
          }

          case "leave_room": {
            if (salaActualCodigo) {
              const room = activeRooms.get(salaActualCodigo);
              if (room) {
                // Remover al jugador inmediatamente de la sala en memoria
                room.players = room.players.filter(p => p.id !== userId);
                salaActualCodigo = null;

                // Si la sala se queda vacía de jugadores reales, purgarla
                const tieneReales = room.players.some(p => !p.isBot);
                if (!tieneReales) {
                  if (room.timerInterval) {
                    clearInterval(room.timerInterval);
                  }
                  activeRooms.delete(room.code);
                  await eliminarSalaDeBD(room.code);
                  console.log(`🧹 Sala ${room.code} purgada inmediatamente al salir el último jugador real.`);
                } else {
                  // Reasignar host si el host era el que salía
                  if (room.modalidad === "amigos" && room.hostId === userId) {
                    const nuevoHost = room.players.find(p => !p.isBot);
                    if (nuevoHost) {
                      room.hostId = nuevoHost.id;
                    }
                  }
                  broadcastToRoom(room, {
                    type: "room_updated",
                    code: room.code,
                    settings: room.settings,
                    players: room.players.map(p => ({
                      id: p.id,
                      nombre: p.nombre,
                      isHost: p.id === room.hostId,
                      isConnected: p.isConnected !== false
                    }))
                  });
                  await guardarSalaEnBD(room);
                }
              }
            }
            break;
          }

          case "request_correction": {
            const code = salaActualCodigo;
            const room = activeRooms.get(code);
            if (!room || room.state !== "playing" || room.phase !== "question") return;

            room.correctionsRequested.add(userId);

            const totalActivePlayers = room.players.filter(p => p.isConnected).length;
            const votesCount = room.correctionsRequested.size;

            broadcastToRoom(room, {
              type: "correction_vote_updated",
              count: votesCount,
              total: totalActivePlayers
            });

            if (votesCount >= totalActivePlayers) {
              procesarAvancePregunta(room);
            }
            await guardarSalaEnBD(room);
            break;
          }

          case "request_next_question": {
            const code = salaActualCodigo;
            const room = activeRooms.get(code);
            if (!room || room.state !== "playing" || room.phase !== "feedback") return;

            room.nextQuestionsRequested.add(userId);

            const totalActivePlayers = room.players.filter(p => p.isConnected).length;
            const votesCount = room.nextQuestionsRequested.size;

            broadcastToRoom(room, {
              type: "next_question_vote_updated",
              count: votesCount,
              total: totalActivePlayers
            });

            if (votesCount >= totalActivePlayers) {
              avanzarSiguientePregunta(room);
            }
            await guardarSalaEnBD(room);
            break;
          }

          // --- CONTROL GENERAL DE PARTIDA ---
          case "submit_answer": {
            const code = salaActualCodigo;
            const room = activeRooms.get(code);

            if (!room || room.state !== "playing") {
              return;
            }

            const qIndex = room.currentQuestionIndex;
            if (qIndex !== message.questionIndex) {
              return; // Ignorar respuestas fuera de tiempo o desincronizadas
            }

            const player = room.players.find(p => p.id === userId);
            if (player) {
              let existingAns = player.answers.find(ans => ans.questionIndex === qIndex);
              const correct = room.questions[qIndex].correcta === message.answerIndex;

              if (existingAns) {
                // Si cambia la respuesta, ajustar puntuación acumulativa de forma diferencial
                if (existingAns.correct && !correct) {
                  player.score = Math.max(0, player.score - 1);
                } else if (!existingAns.correct && correct) {
                  player.score += 1;
                }
                existingAns.answerIndex = message.answerIndex;
                existingAns.correct = correct;
              } else {
                if (correct) {
                  player.score += 1;
                }
                player.answers.push({
                  questionIndex: qIndex,
                  answerIndex: message.answerIndex,
                  correct: correct
                });
              }

              // Informar que el jugador respondió
              broadcastToRoom(room, {
                type: "player_responded",
                playerId: userId
              });
              await guardarSalaEnBD(room);
            }
            break;
          }

          // --- CHAT DE LOBBY ---
          case "chat_message": {
            const code = salaActualCodigo;
            const room = activeRooms.get(code);
            if (room) {
              broadcastToRoom(room, {
                type: "chat_broadcast",
                sender: userNombre,
                message: message.text
              });
            }
            break;
          }
        }
      } catch (err) {
        console.error("Error al procesar mensaje WS:", err);
      }
    });

    wsConn.on("close", async () => {
      // Remover de la cola de emparejamiento si se desconecta
      matchmakingQueue = matchmakingQueue.filter(p => p.ws !== wsConn);

      // Si estaba en una sala
      if (salaActualCodigo) {
        const room = activeRooms.get(salaActualCodigo);
        if (room) {
          // Desconectar o marcar desconectado
          const player = room.players.find(p => p.ws === wsConn);
          if (player) {
            player.isConnected = false;
            player.ws = null;
            await guardarSalaEnBD(room);

            // Si es la fase de juego, le damos 25s de gracia
            if (room.state === "playing") {
              setTimeout(async () => {
                const r = activeRooms.get(salaActualCodigo);
                if (r) {
                  const p = r.players.find(pl => pl.id === player.id);
                  if (p && !p.isConnected) {
                    // Si sigue desconectado tras 25s, purgar
                    r.players = r.players.filter(pl => pl.id !== player.id);
                    if (r.players.length === 0 || r.players.every(pl => pl.isBot)) {
                      if (r.timerInterval) clearInterval(r.timerInterval);
                      activeRooms.delete(salaActualCodigo);
                      await eliminarSalaDeBD(salaActualCodigo);
                    } else {
                      // Si era el host, reasignar host
                      if (r.modalidad === "amigos" && r.hostId === player.id) {
                        const nuevoHost = r.players.find(pl => !pl.isBot);
                        if (nuevoHost) r.hostId = nuevoHost.id;
                      }
                      broadcastToRoom(r, {
                        type: "room_updated",
                        code: r.code,
                        settings: r.settings,
                        players: r.players.map(pl => ({ id: pl.id, nombre: pl.nombre, isHost: pl.id === r.hostId, isConnected: pl.isConnected !== false }))
                      });
                      await guardarSalaEnBD(r);
                    }
                  }
                }
              }, 25000);
            } else {
              // Si está en lobby, purgar inmediatamente
              room.players = room.players.filter(p => p.id !== player.id);
              if (room.players.length === 0) {
                if (room.timerInterval) clearInterval(room.timerInterval);
                activeRooms.delete(salaActualCodigo);
                await eliminarSalaDeBD(salaActualCodigo);
              } else {
                if (room.modalidad === "amigos" && room.hostId === player.id) {
                  const nuevoHost = room.players.find(p => !p.isBot);
                  if (nuevoHost) room.hostId = nuevoHost.id;
                }
                broadcastToRoom(room, {
                  type: "room_updated",
                  code: room.code,
                  settings: room.settings,
                  players: room.players.map(p => ({ id: p.id, nombre: p.nombre, isHost: p.id === room.hostId, isConnected: true }))
                });
                await guardarSalaEnBD(room);
              }
            }
          }
        }
      }
    });
  });

  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((wsConn) => {
      if (wsConn.isAlive === false) {
        console.log("WebSocket client inactive, terminating connection.");
        return wsConn.terminate();
      }
      wsConn.isAlive = false;
      wsConn.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });
}

function broadcastToRoom(room, payload) {
  const jsonStr = JSON.stringify(payload);
  for (const player of room.players) {
    if (player.ws && player.ws.readyState === ws.OPEN) {
      player.ws.send(jsonStr);
    }
  }
}

async function enviarEstadisticasBatalla(clientWs, userId) {
  // Nota: Recuperamos el perfil competitivo independiente directo de SQLite
  try {
    if (dbInstance) {
      const stats = await dbInstance.get(
        "SELECT battle_jugadas, battle_ganadas, battle_perdidas, battle_racha_actual, battle_racha_mejor FROM usuarios WHERE id = ?",
        [userId]
      );
      
      const historial = await dbInstance.all(
        "SELECT modalidad, contrincantes, correctas, total_preguntas, posicion, fecha FROM batalla_historial WHERE usuario_id = ? ORDER BY id DESC LIMIT 10",
        [userId]
      );

      clientWs.send(JSON.stringify({
        type: "battle_stats",
        stats: stats || { battle_jugadas: 0, battle_ganadas: 0, battle_perdidas: 0, battle_racha_actual: 0, battle_racha_mejor: 0 },
        historial: historial || []
      }));
    }
  } catch (err) {
    console.error("Error al recuperar estadísticas de batalla:", err);
  }
}

function iniciarMatchmakingLoop(db) {
  if (matchmakingTimer) return;

  queueTimeLeft = 30;
  console.log("⏱️ Búsqueda de emparejamiento aleatorio activa.");

  // Informar tiempo inicial de cola
  broadcastQueueStatus();

  matchmakingTimer = setInterval(async () => {
    queueTimeLeft -= 1;

    // Verificar si ya tenemos un grupo completo (5 personas)
    if (matchmakingQueue.length >= 5) {
      iniciarBatallaAleatoria(db, matchmakingQueue.splice(0, 5));
    } else if (queueTimeLeft <= 0) {
      // El temporizador de 30 segundos terminó
      if (matchmakingQueue.length >= 1) {
        const jugadoresReales = matchmakingQueue.splice(0, matchmakingQueue.length);
        const botsParaInyectar = [];
        const cantidadBots = 5 - jugadoresReales.length;
        const nombresDisponibles = [...BOT_NAMES];
        
        for (let i = 0; i < cantidadBots; i++) {
          const indiceAleatorio = Math.floor(Math.random() * nombresDisponibles.length);
          const nombreBot = nombresDisponibles.splice(indiceAleatorio, 1)[0] || `Médico ${i + 1}`;
          
          botsParaInyectar.push({
            id: `bot_${Date.now()}_${i}`,
            nombre: `${nombreBot} (Virtual)`,
            ws: null,
            score: 0,
            answers: [],
            isBot: true
          });
        }
        
        console.log(`🤖 Matchmaking finalizado: Emparejando ${jugadoresReales.length} jugador(es) real(es) con ${cantidadBots} bots.`);
        iniciarBatallaAleatoria(db, jugadoresReales, botsParaInyectar);
      }

      // Detener bucle
      clearInterval(matchmakingTimer);
      matchmakingTimer = null;
    } else {
      broadcastQueueStatus();
    }
  }, 1000);
}

function broadcastQueueStatus() {
  const payload = JSON.stringify({
    type: "queue_status",
    timeLeft: queueTimeLeft,
    playersCount: matchmakingQueue.length
  });

  for (const player of matchmakingQueue) {
    if (player.ws && player.ws.readyState === ws.OPEN) {
      player.ws.send(payload);
    }
  }
}

async function iniciarBatallaAleatoria(db, jugadoresReales, bots = []) {
  const roomCode = generarCodigoSala();
  const firstPlayer = jugadoresReales[0];
  const totalQ = firstPlayer && firstPlayer.settings ? (firstPlayer.settings.totalQuestions || 15) : 15;
  const timeP = 30; // Las salas aleatorias siempre duran 30 segundos por pregunta.

  const room = {
    code: roomCode,
    modalidad: "aleatoria",
    settings: { totalQuestions: totalQ, timePerQuestion: timeP },
    hostId: null,
    players: [],
    questions: [],
    currentQuestionIndex: -1,
    state: "playing"
  };

  // Agregar jugadores reales
  for (const j of jugadoresReales) {
    room.players.push({
      id: j.id,
      nombre: j.nombre,
      ws: j.ws,
      score: 0,
      answers: []
    });
  }

  // Agregar bots
  for (const b of bots) {
    room.players.push(b);
  }

  activeRooms.set(roomCode, room);

  // Informar códigos de sala asignados a los jugadores reales
  for (const j of jugadoresReales) {
    j.ws.send(JSON.stringify({
      type: "battle_started",
      modalidad: "aleatoria",
      totalQuestions: totalQ,
      timePerQuestion: timeP,
      players: room.players.map(p => ({ id: p.id, nombre: p.nombre }))
    }));
  }

  // Extraer preguntas aleatorias
  try {
    const query = `
      SELECT id, texto, opciones, correcta, explicacion, fuente, tema 
      FROM preguntas 
      WHERE activo = 1 
      ORDER BY RANDOM() 
      LIMIT ?
    `;
    const rows = await db.all(query, [totalQ]);

    room.questions = rows.map(r => ({
      id: r.id,
      texto: r.texto,
      opciones: JSON.parse(r.opciones),
      correcta: r.correcta,
      explicacion: r.explicacion,
      fuente: r.fuente || "ENURM Oficial",
      tema: r.tema
    }));

    room.currentQuestionIndex = 0;
    await enviarPreguntaSincronizada(room);

  } catch (err) {
    console.error("Error al inicializar batalla aleatoria:", err);
    for (const j of jugadoresReales) {
      if (j.ws && j.ws.readyState === ws.OPEN) {
        j.ws.send(JSON.stringify({ type: "error", message: "Falla al iniciar partida multijugador." }));
      }
    }
    activeRooms.delete(roomCode);
    await eliminarSalaDeBD(roomCode);
  }
}

async function enviarPreguntaSincronizada(room) {
  room.phase = "question";
  room.correctionsRequested = new Set();
  room.nextQuestionsRequested = new Set();

  if (room.timerInterval) {
    clearInterval(room.timerInterval);
  }

  const qIndex = room.currentQuestionIndex;
  const question = room.questions[qIndex];

  // Set the absolute expiration timestamp
  room.questionTimeLeft = Date.now() + room.settings.timePerQuestion * 1000;

  // Estructura segura de pregunta para el cliente (ocultando respuesta correcta temporalmente)
  const questionPayload = {
    type: "new_question",
    questionIndex: qIndex,
    totalQuestions: room.questions.length,
    texto: question.texto,
    opciones: question.opciones,
    tema: question.tema,
    timeLeft: room.settings.timePerQuestion,
    fastMode: room.settings.fastMode || "normal"
  };

  broadcastToRoom(room, questionPayload);

  // Persistir en la BD
  await guardarSalaEnBD(room);

  // Programar a los bots si es modalidad continua o inmediata
  simularRespuestasDeBots(room, qIndex);

  room.timerInterval = setInterval(async () => {
    const timeLeft = Math.max(0, Math.round((room.questionTimeLeft - Date.now()) / 1000));
    
    // Broadcast de tick del temporizador
    broadcastToRoom(room, {
      type: "timer_tick",
      timeLeft: timeLeft
    });

    if (timeLeft <= 0) {
      clearInterval(room.timerInterval);
      
      // Auto-responder a los jugadores que no respondieron
      for (const p of room.players) {
        if (!p.answers.some(ans => ans.questionIndex === qIndex)) {
          p.answers.push({
            questionIndex: qIndex,
            answerIndex: -1, // Sin respuesta
            correct: false
          });
        }
      }

      await procesarAvancePregunta(room);
    }
  }, 1000);
}

function simularRespuestasDeBots(room, qIndex) {
  const bots = room.players.filter(p => p.isBot);
  for (const bot of bots) {
    // Los bots responden en un tiempo aleatorio entre 4s y 15s (o antes de que el tiempo expire)
    const delay = 4000 + Math.floor(Math.random() * 8000);
    setTimeout(async () => {
      // Verificar que la sala sigue activa y jugando esta misma pregunta
      if (room.state === "playing" && room.currentQuestionIndex === qIndex && room.phase === "question") {
        const correctIndex = room.questions[qIndex].correcta;
        // Probabilidad de respuesta correcta basada en dificultad (ej. 70% acierto)
        const acierta = Math.random() < 0.70;
        let selectedIndex = correctIndex;
        if (!acierta) {
          // Elegir una incorrecta de forma aleatoria
          const opciones = [0, 1, 2, 3].filter(o => o !== correctIndex);
          selectedIndex = opciones[Math.floor(Math.random() * opciones.length)];
        }

        bot.answers.push({
          questionIndex: qIndex,
          answerIndex: selectedIndex,
          correct: selectedIndex === correctIndex
        });

        if (selectedIndex === correctIndex) {
          bot.score += 1;
        }

        // Si es batalla privada, informar que respondió
        if (room.modalidad === "amigos") {
          broadcastToRoom(room, {
            type: "player_responded",
            playerId: bot.id
          });
        }

        await guardarSalaEnBD(room);
      }
    }, delay);
  }
}

async function procesarAvancePregunta(room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
  }
  const isFastMode = room.modalidad === "aleatoria" || (room.settings && room.settings.fastMode === "rapido");
  if (isFastMode) {
    await avanzarSiguientePregunta(room);
  } else {
    await iniciarFeedbackPregunta(room);
  }
}

async function iniciarFeedbackPregunta(room) {
  room.phase = "feedback";
  const qIndex = room.currentQuestionIndex;
  const question = room.questions[qIndex];

  // 1. Recopilar resultados de aciertos de esta pregunta para cada jugador en la sala
  const results = room.players.map(p => {
    const ans = p.answers.find(a => a.questionIndex === qIndex);
    return {
      nombre: p.nombre,
      correct: ans ? ans.correct : false
    };
  });

  // 2. Broadcast de feedback inmediato
  broadcastToRoom(room, {
    type: "question_feedback",
    questionIndex: qIndex,
    correcta: question.correcta,
    explicacion: question.explicacion || "Sin desglose.",
    fuente: question.fuente || "ENURM Oficial",
    results: results
  });

  const isFastMode = room.modalidad === "aleatoria" || (room.settings && room.settings.fastMode === "rapido");

  if (isFastMode) {
    // 3. Iniciar cuenta regresiva de feedback automática de 10s
    room.feedbackTimeLeft = Date.now() + 10 * 1000;

    await guardarSalaEnBD(room);

    // Broadcast del tick inicial de feedback
    broadcastToRoom(room, {
      type: "feedback_tick",
      timeLeft: 10
    });

    room.timerInterval = setInterval(async () => {
      const timeLeft = Math.max(0, Math.round((room.feedbackTimeLeft - Date.now()) / 1000));

      broadcastToRoom(room, {
        type: "feedback_tick",
        timeLeft: timeLeft
      });

      if (timeLeft <= 0) {
        clearInterval(room.timerInterval);
        await avanzarSiguientePregunta(room);
      }
    }, 1000);
  } else {
    // Modo Manual: No hay temporizador regresivo automático de avance
    room.feedbackTimeLeft = null;
    await guardarSalaEnBD(room);

    broadcastToRoom(room, {
      type: "feedback_tick",
      timeLeft: -1
    });
  }
}

async function avanzarSiguientePregunta(room) {
  room.currentQuestionIndex += 1;
  if (room.currentQuestionIndex < room.questions.length) {
    await enviarPreguntaSincronizada(room);
  } else {
    // Finalizar batalla y calcular podio
    await finalizarBatalla(room);
  }
}

async function finalizarBatalla(room) {
  room.state = "results";

  // Guardar estado final de la sala
  await guardarSalaEnBD(room);

  // Clasificar posiciones ordenadas por puntuación descendente
  const clasificados = [...room.players].sort((a, b) => b.score - a.score);

  // Calcular ranking respetando empates
  let rankingActual = 1;
  let scoreAnterior = -1;
  const podio = [];

  for (let i = 0; i < clasificados.length; i++) {
    const p = clasificados[i];
    if (p.score !== scoreAnterior) {
      rankingActual = i + 1;
    }
    podio.push({
      id: p.id,
      nombre: p.nombre,
      score: p.score,
      posicion: rankingActual,
      isBot: p.isBot || false,
      answers: p.answers || []
    });
    scoreAnterior = p.score;
  }

  // Notificar resultados definitivos
  room.podio = podio;
  broadcastToRoom(room, {
    type: "battle_finished",
    podio: podio,
    questions: room.questions // Para la revisión pospartida en Batalla Aleatoria
  });

  // Guardar en la base de datos local SQLite para los jugadores reales
  if (dbInstance) {
    for (const player of room.players) {
      if (player.isBot) continue;

      const playerResult = podio.find(p => p.id === player.id);
      const posicion = playerResult ? playerResult.posicion : 99;
      const gano = posicion === 1; // Primer lugar compartido o individual

      // Listar contrincantes
      const contrincantes = room.players
        .filter(p => p.id !== player.id)
        .map(p => p.nombre);

      try {
        await dbInstance.run("BEGIN TRANSACTION");

        // 1. Guardar en el historial
        await dbInstance.run(`
          INSERT INTO batalla_historial (usuario_id, modalidad, contrincantes, correctas, total_preguntas, posicion)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          player.id, 
          room.modalidad, 
          JSON.stringify(contrincantes), 
          player.score, 
          room.questions.length, 
          posicion
        ]);

        // 2. Recuperar stats actuales
        const user = await dbInstance.get(
          "SELECT battle_jugadas, battle_ganadas, battle_perdidas, battle_racha_actual, battle_racha_mejor FROM usuarios WHERE id = ?",
          [player.id]
        );

        if (user) {
          const nuevasJugadas = (user.battle_jugadas || 0) + 1;
          const nuevasGanadas = (user.battle_ganadas || 0) + (gano ? 1 : 0);
          const nuevasPerdidas = (user.battle_perdidas || 0) + (gano ? 0 : 1);
          
          let nuevaRacha = 0;
          if (gano) {
            nuevaRacha = (user.battle_racha_actual || 0) + 1;
          } else {
            nuevaRacha = 0; // Se corta la racha
          }

          const mejorRacha = Math.max(user.battle_racha_mejor || 0, nuevaRacha);

          // 3. Actualizar perfil competitivo independiente del usuario
          await dbInstance.run(`
            UPDATE usuarios 
            SET battle_jugadas = ?, battle_ganadas = ?, battle_perdidas = ?, battle_racha_actual = ?, battle_racha_mejor = ?
            WHERE id = ?
          `, [
            nuevasJugadas, 
            nuevasGanadas, 
            nuevasPerdidas, 
            nuevaRacha, 
            mejorRacha, 
            player.id
          ]);
        }

        await dbInstance.run("COMMIT");
        
        // Reconectar estadísticas actualizadas
        const updatedSocket = room.players.find(p => p.id === player.id).ws;
        if (updatedSocket && updatedSocket.readyState === ws.OPEN) {
          enviarEstadisticasBatalla(updatedSocket, player.id);
        }

      } catch (dbErr) {
        try {
          await dbInstance.run("ROLLBACK");
        } catch (rollbackErr) {
          console.error("Falla al hacer rollback:", rollbackErr);
        }
        console.error("Falla al registrar resultados de la batalla para el usuario:", player.id, dbErr);
      }
    }
  }

  // Eliminar la sala después de un delay de gracia
  setTimeout(async () => {
    if (room.timerInterval) clearInterval(room.timerInterval);
    activeRooms.delete(room.code);
    await eliminarSalaDeBD(room.code);
    console.log(`🧹 Sala ${room.code} purgada con éxito de la memoria y base de datos.`);
  }, 5000); // 5 segundos activa en memoria para revisión pospartida
}

module.exports = {
  inicializarBatallas
};
