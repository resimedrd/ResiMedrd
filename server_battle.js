const ws = require("ws");
const jwt = require("jsonwebtoken");

// Estado global de salas y cola en memoria
const activeRooms = new Map(); // code -> room
let matchmakingQueue = [];     // Array de { id, nombre, ws, joinedAt }
let matchmakingTimer = null;
let queueTimeLeft = 30;         // Segundos para el temporizador de cola

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

function inicializarBatallas(server, db, JWT_SECRET) {
  const wss = new ws.Server({ noServer: true });

  // Manejo de upgrade HTTP a WebSocket de forma segura
  server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (wsConn) => {
      wss.emit("connection", wsConn, request);
    });
  });

  wss.on("connection", (wsConn) => {
    let usuarioAutenticado = null;
    let salaActualCodigo = null;

    wsConn.on("message", async (messageStr) => {
      try {
        const message = JSON.parse(messageStr);

        // 1. Manejo exclusivo de Autenticación
        if (message.type === "auth") {
          jwt.verify(message.token, JWT_SECRET, async (err, decoded) => {
            if (err) {
              wsConn.send(JSON.stringify({ type: "error", message: "Token inválido o expirado." }));
              wsConn.close();
            } else {
              try {
                // Recuperar el nombre real del usuario de la base de datos SQLite para evitar undefined
                const userRow = await db.get("SELECT nombre FROM usuarios WHERE id = ?", [decoded.id]);
                const nombreUsuario = userRow ? userRow.nombre : "Colega Médico";

                usuarioAutenticado = {
                  id: decoded.id,
                  nombre: nombreUsuario,
                  rol: decoded.rol
                };

                wsConn.send(JSON.stringify({ 
                  type: "authenticated", 
                  user: { id: decoded.id, nombre: nombreUsuario } 
                }));

                // Sincronizar estadísticas competitivas iniciales
                enviarEstadisticasBatalla(wsConn, decoded.id);
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
            const room = {
              code: roomCode,
              modalidad: "amigos",
              settings: { totalQuestions: totalQ, timePerQuestion: timeP },
              hostId: userId,
              players: [{ id: userId, nombre: userNombre, ws: wsConn, score: 0, answers: [] }],
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
            } else {
              room.players.push({ id: userId, nombre: userNombre, ws: wsConn, score: 0, answers: [] });
            }

            salaActualCodigo = code;

            broadcastToRoom(room, {
              type: "room_updated",
              code: room.code,
              settings: room.settings,
              players: room.players.map(p => ({ id: p.id, nombre: p.nombre, isHost: p.id === room.hostId }))
            });
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

            broadcastToRoom(room, {
              type: "room_updated",
              code: room.code,
              settings: room.settings,
              players: room.players.map(p => ({ id: p.id, nombre: p.nombre, isHost: p.id === room.hostId }))
            });
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
                timePerQuestion: room.settings.timePerQuestion
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
            const timeP = message.settings ? (parseInt(message.settings.timePerQuestion) || 60) : 60;
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
              // Evitar doble respuesta
              if (player.answers.some(ans => ans.questionIndex === qIndex)) {
                return;
              }

              const correct = room.questions[qIndex].correcta === message.answerIndex;
              if (correct) {
                player.score += 1;
              }

              player.answers.push({
                questionIndex: qIndex,
                answerIndex: message.answerIndex,
                correct: correct
              });

              // Informar que el jugador respondió
              broadcastToRoom(room, {
                type: "player_responded",
                playerId: userId
              });

              // Evaluar si todos los jugadores reales han respondido
              const reales = room.players.filter(p => !p.isBot);
              const todosRespondieron = reales.every(p => p.answers.some(ans => ans.questionIndex === qIndex));

              if (todosRespondieron) {
                procesarAvancePregunta(room);
              }
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

    wsConn.on("close", () => {
      // Remover de la cola de emparejamiento si se desconecta
      matchmakingQueue = matchmakingQueue.filter(p => p.ws !== wsConn);

      // Si estaba en una sala
      if (salaActualCodigo) {
        const room = activeRooms.get(salaActualCodigo);
        if (room) {
          // Desconectar o marcar desconectado
          room.players = room.players.filter(p => p.ws !== wsConn);

          if (room.players.length === 0 || room.players.every(p => p.isBot)) {
            // Si la sala queda vacía de humanos, eliminarla
            if (room.timerInterval) clearInterval(room.timerInterval);
            activeRooms.delete(salaActualCodigo);
          } else {
            // Si es sala privada y se va el host, reasignar host
            if (room.modalidad === "amigos" && room.hostId === usuarioAutenticado.id) {
              const nuevoHost = room.players.find(p => !p.isBot);
              if (nuevoHost) {
                room.hostId = nuevoHost.id;
              }
            }

            broadcastToRoom(room, {
              type: "room_updated",
              code: room.code,
              settings: room.settings,
              players: room.players.map(p => ({ id: p.id, nombre: p.nombre, isHost: p.id === room.hostId }))
            });
          }
        }
      }
    });
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
    const db = require("./server.js").db; // Obtener db en caliente
    if (db) {
      const stats = await db.get(
        "SELECT battle_jugadas, battle_ganadas, battle_perdidas, battle_racha_actual, battle_racha_mejor FROM usuarios WHERE id = ?",
        [userId]
      );
      
      const historial = await db.all(
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
      if (matchmakingQueue.length >= 2) {
        // Iniciar con los jugadores reales que tengamos
        iniciarBatallaAleatoria(db, matchmakingQueue.splice(0, matchmakingQueue.length));
      } else if (matchmakingQueue.length === 1) {
        // ¡ PREMIUM TOUCH ! Auto-completamos con Bots para garantizar juego inmediato
        const unicoJugadorReal = matchmakingQueue.shift();
        const bots = [];
        const numBots = 2 + Math.floor(Math.random() * 3); // 2 a 4 bots
        
        // Barajar nombres de bots de forma aleatoria
        const nombresDisponibles = [...BOT_NAMES].sort(() => 0.5 - Math.random());
        
        for (let i = 0; i < numBots; i++) {
          bots.push({
            id: 9999 + i,
            nombre: nombresDisponibles[i],
            isBot: true,
            score: 0,
            answers: []
          });
        }

        iniciarBatallaAleatoria(db, [unicoJugadorReal], bots);
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
  const timeP = firstPlayer && firstPlayer.settings ? (firstPlayer.settings.timePerQuestion || 60) : 60;

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
      timePerQuestion: timeP
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
    enviarPreguntaSincronizada(room);

  } catch (err) {
    console.error("Error al inicializar batalla aleatoria:", err);
    for (const j of jugadoresReales) {
      j.ws.send(JSON.stringify({ type: "error", message: "Falla al iniciar partida multijugador." }));
    }
    activeRooms.delete(roomCode);
  }
}

function enviarPreguntaSincronizada(room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
  }

  const qIndex = room.currentQuestionIndex;
  const question = room.questions[qIndex];

  // Estructura segura de pregunta para el cliente (ocultando respuesta correcta temporalmente)
  const questionPayload = {
    type: "new_question",
    questionIndex: qIndex,
    totalQuestions: room.questions.length,
    texto: question.texto,
    opciones: question.opciones,
    tema: question.tema,
    timeLeft: room.settings.timePerQuestion
  };

  broadcastToRoom(room, questionPayload);

  // Iniciar temporizador regresivo del lado del servidor
  let timeLeft = room.settings.timePerQuestion;
  
  // Programar a los bots si es modalidad continua o inmediata
  simularRespuestasDeBots(room, qIndex);

  room.timerInterval = setInterval(() => {
    timeLeft -= 1;
    
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

      procesarAvancePregunta(room);
    }
  }, 1000);
}

function simularRespuestasDeBots(room, qIndex) {
  const bots = room.players.filter(p => p.isBot);
  for (const bot of bots) {
    // Los bots responden en un tiempo aleatorio entre 4s y 15s (o antes de que el tiempo expire)
    const delay = 4000 + Math.floor(Math.random() * 8000);
    setTimeout(() => {
      // Verificar que la sala sigue activa y jugando esta misma pregunta
      if (room.state === "playing" && room.currentQuestionIndex === qIndex) {
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

        // Evaluar si todos respondieron tras el click del bot
        const reales = room.players.filter(p => !p.isBot);
        const todosRespondieron = reales.every(p => p.answers.some(ans => ans.questionIndex === qIndex));

        if (todosRespondieron) {
          procesarAvancePregunta(room);
        }
      }
    }, delay);
  }
}

function procesarAvancePregunta(room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
  }
  avanzarSiguientePregunta(room);
}

function avanzarSiguientePregunta(room) {
  room.currentQuestionIndex += 1;
  if (room.currentQuestionIndex < room.questions.length) {
    enviarPreguntaSincronizada(room);
  } else {
    // Finalizar batalla y calcular podio
    finalizarBatalla(room);
  }
}

async function finalizarBatalla(room) {
  room.state = "results";

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
      isBot: p.isBot || false
    });
    scoreAnterior = p.score;
  }

  // Notificar resultados definitivos
  broadcastToRoom(room, {
    type: "battle_finished",
    podio: podio,
    questions: room.questions // Para la revisión pospartida en Batalla Aleatoria
  });

  // Guardar en la base de datos local SQLite para los jugadores reales
  const db = require("./server.js").db;
  if (db) {
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
        await db.run("BEGIN TRANSACTION");

        // 1. Guardar en el historial
        await db.run(`
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
        const user = await db.get(
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
          await db.run(`
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

        await db.run("COMMIT");
        
        // Reconectar estadísticas actualizadas
        const updatedSocket = room.players.find(p => p.id === player.id).ws;
        if (updatedSocket && updatedSocket.readyState === ws.OPEN) {
          enviarEstadisticasBatalla(updatedSocket, player.id);
        }

      } catch (dbErr) {
        await db.run("ROLLBACK");
        console.error("Falla al registrar resultados de la batalla para el usuario:", player.id, dbErr);
      }
    }
  }

  // Eliminar la sala después de un delay prudente (para permitir la revisión)
  setTimeout(() => {
    activeRooms.delete(room.code);
  }, 10 * 60 * 1000); // 10 minutos activa en memoria para revisión pospartida
}

module.exports = {
  inicializarBatallas
};
