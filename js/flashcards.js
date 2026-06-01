// ====== CONTROLADOR DE FLASHCARDS ENURM (flashcards.js) ======

// Mazo estático base original de la plataforma
const baseDatosFlashcardsEstaticas = [
  {
    tema: "Pediatría",
    pregunta: "¿Cuál es el tratamiento preventivo de elección para evitar aneurismas coronarios en la Enfermedad de Kawasaki?",
    respuesta: "Inmunoglobulina Intravenosa (IGIV) a dosis altas (2 g/kg en infusión única) + Ácido Acetilsalicílico (Aspirina) a dosis antiinflamatorias."
  },
  {
    tema: "Pediatría",
    pregunta: "¿Cuál es la causa más común de bronquiolitis en lactantes y cuál es su manejo terapéutico principal?",
    respuesta: "Virus Sincitial Respiratorio (VSR). El manejo es puramente de soporte: oxigenoterapia (si SatO2 <90-92%), hidratación adecuada y aspiración de secreciones nasales."
  },
  {
    tema: "Pediatría",
    pregunta: "¿Cuál es la triada clásica de la Laringotraqueitis Aguda (Crup) en pediatría?",
    respuesta: "Estridor inspiratorio + Tos perruna (o de foca) + Disfonía."
  },
  {
    tema: "Gineco-Obstetricia",
    pregunta: "¿Cuál es la tríada diagnóstica patognomónica de sospecha para el Embarazo Ectópico?",
    respuesta: "Dolor abdominal bajo + Sangrado vaginal anormal + Amenorrea."
  },
  {
    tema: "Gineco-Obstetricia",
    pregunta: "¿Cómo se define la Preeclampsia con Criterios de Severidad según las cifras tensionales y síntomas?",
    respuesta: "Presión arterial ≥ 160/110 mmHg en dos ocasiones con diferencia de 4 horas, o presencia de disfunción de órgano diana (trombocitopenia, alteración hepática de aminotransferasas, cefalea severa, escotomas, etc.)."
  },
  {
    tema: "Gineco-Obstetricia",
    pregunta: "Sangrado transvaginal indoloro, rojo rutilante, abundante en el tercer trimestre de embarazo. Sin hipertonía uterina. ¿Sospecha diagnóstica principal?",
    respuesta: "Placenta Previa."
  },
  {
    tema: "Cirugía General",
    pregunta: "¿Cuáles son los componentes de la tríada de Charcot y la péntada de Reynolds para el diagnóstico de Colangitis Aguda?",
    respuesta: "Tríada de Charcot: Fiebre + Ictericia + Dolor en hipocondrio derecho.\nPéntada de Reynolds: Tríada de Charcot + Shock (hipotensión) + Confusión mental."
  },
  {
    tema: "Cirugía General",
    pregunta: "¿Cuál es el estudio de imagen inicial y el estándar de oro ('gold standard') para el diagnóstico de Colecistitis Aguda?",
    respuesta: "Inicial de elección: Ecografía abdominal (hipocondrio derecho).\nEstándar de Oro: Gammagrafía biliar (HIDA)."
  },
  {
    tema: "Cirugía General",
    pregunta: "¿Qué escala clínica se utiliza para estimar la probabilidad diagnóstica de Apendicitis Aguda?",
    respuesta: "Escala de Alvarado (valores ≥ 7 indican alta probabilidad y ameritan conducta quirúrgica o de imagen)."
  },
  {
    tema: "Medicina Interna",
    pregunta: "¿Cuál es la medida terapéutica inicial más crítica e inmediata en el manejo de la Cetoacidosis Diabética (CAD)?",
    respuesta: "Reposición agresiva de volumen intravascular con Solución Salina al 0.9% IV (típicamente 1-1.5 litros en la primera hora) antes de inyectar insulina."
  },
  {
    tema: "Medicina Interna",
    pregunta: "¿Cuál es el microorganismo bacteriano causante más común de la Neumonía Adquirida en la Comunidad (NAC)?",
    respuesta: "Streptococcus pneumoniae (Neumococo)."
  },
  {
    tema: "Medicina Interna",
    pregunta: "¿Cuál es el tratamiento antimicrobiano empírico de elección para una Meningitis Bacteriana aguda en adultos de 18-50 años?",
    respuesta: "Ceftriaxona (o Cefotaxima) + Vancomicina (para cubrir neumococo resistente a penicilina)."
  },
  {
    tema: "Ciencias Básicas",
    pregunta: "¿Cuál es el principal neurotransmisor con función excitatoria en el Sistema Nervioso Central del adulto?",
    respuesta: "Glutamato (actúa sobre receptores NMDA y AMPA)."
  },
  {
    tema: "Ciencias Básicas",
    pregunta: "¿Qué par craneal se encarga de la inervación motora de la musculatura mímica de la cara?",
    respuesta: "VII Par Craneal o Nervio Facial."
  },
  {
    tema: "Ciencias Básicas",
    pregunta: "¿Qué enzima es el marcapasos o limitante de velocidad en la vía metabólica de la Glucólisis anaerobia?",
    respuesta: "Fosfofructocinasa-1 (PFK-1)."
  },
  {
    tema: "Cardiología",
    pregunta: "¿Cuál es el hallazgo electrocardiográfico clásico y patognomónico del Taponamiento Cardíaco?",
    respuesta: "Alternancia eléctrica (variación en la amplitud de las ondas QRS latido a latido) + Bajo voltaje generalizado."
  },
  {
    tema: "Neumología",
    pregunta: "¿Cuál es el tratamiento farmacológico inicial de elección para una crisis asmática moderada a grave?",
    respuesta: "Agonistas beta-2 adrenérgicos de acción corta (SABA) inhalados (ej: Salbutamol) + Anticolinérgicos inhalados (Bromuro de Ipratropio) + Corticoides sistémicos."
  },
  {
    tema: "Gastroenterología",
    pregunta: "¿Qué escala pronóstica se utiliza de elección para evaluar la gravedad en pancreatitis aguda en las primeras 48 horas?",
    respuesta: "Criterios de Ranson o escala de APACHE II (esta última calculable en cualquier momento)."
  },
  {
    tema: "Nefrología y Urología",
    pregunta: "¿Cuál es la causa más común de Lesión Renal Aguda (LRA) intrínseca o renal en pacientes hospitalizados?",
    respuesta: "Necrosis Tubular Aguda (NTA), caracterizada en el sedimento urinario por cilindros granulosos ('marrón lodoso')."
  },
  {
    tema: "Neurología",
    pregunta: "¿Cuál es la ventana terapéutica máxima recomendada para realizar trombólisis intravenosa con rtPA en un Ictus Isquémico Agudo?",
    respuesta: "Hasta 4.5 horas desde el inicio de los síntomas, en ausencia de contraindicaciones absolutas."
  },
  {
    tema: "Infectología",
    pregunta: "¿Cuál es el tratamiento empírico de elección para un paciente adulto sospechoso de Cólera grave?",
    respuesta: "Doxiciclina a dosis única (300 mg VO) asociada a hidratación parenteral agresiva inmediata."
  }
];

// Completamos las demás estáticas
baseDatosFlashcardsEstaticas[21] = {
  tema: "Traumatología y Ortopedia",
  pregunta: "¿Cuál es la complicación neurovascular más común y temida de la luxación posterior de rodilla?",
  respuesta: "Lesión de la arteria poplítea y afectación del nervio peroneo común."
};
baseDatosFlashcardsEstaticas[22] = {
  tema: "Psiquiatría",
  pregunta: "¿Cuál es el tratamiento de primera elección para el trastorno afectivo bipolar en fase de mantenimiento?",
  respuesta: "Carbonato de Litio (vigilando estrechamente los niveles séricos de litemia para evitar toxicidad)."
};
baseDatosFlashcardsEstaticas[23] = {
  tema: "Salud Pública y Epidemiología",
  pregunta: "¿Cómo se define la Sensibilidad de una prueba diagnóstica?",
  respuesta: "La probabilidad de que la prueba resulte positiva si el paciente realmente tiene la enfermedad (Tasa de Verdaderos Positivos)."
};

const flashcards = {
  inicializar() {
    state.modoFlashcard = "classic"; // "classic" or "active"

    const btnIrFlashcards = document.getElementById("btn-ir-flashcards");
    const btnFlashcardsRegresar = document.getElementById("btn-flashcards-regresar");
    const btnFlashcardPrev = document.getElementById("btn-flashcard-prev");
    const btnFlashcardNext = document.getElementById("btn-flashcard-next");
    const btnFlashcardKnow = document.getElementById("btn-flashcard-know");
    const btnFlashcardDont = document.getElementById("btn-flashcard-dont");
    const btnFlashcardReiniciar = document.getElementById("btn-flashcard-reiniciar");
    const btnFlashcardCongratsRegresar = document.getElementById("btn-flashcard-congrats-regresar");
    const flashcardFiltroTema = document.getElementById("flashcard-filtro-tema");
    const flashcardClickTrigger = document.getElementById("flashcard-click-trigger");

    // Modalidad selectores
    const btnClassic = document.getElementById("btn-flashcard-mode-classic");
    const btnActive = document.getElementById("btn-flashcard-mode-active");
    const inputActiveBox = document.getElementById("flashcard-active-input-box");
    const comparisonBox = document.getElementById("flashcard-active-comparison-box");

    if (btnClassic && btnActive) {
      btnClassic.addEventListener("click", () => {
        state.modoFlashcard = "classic";
        btnClassic.classList.add("active");
        btnActive.classList.remove("active");
        if (inputActiveBox) inputActiveBox.classList.add("hidden");
        if (comparisonBox) {
          comparisonBox.classList.add("hidden");
          comparisonBox.classList.remove("good-match", "mid-match", "bad-match");
        }
        if (flashcardClickTrigger) {
          flashcardClickTrigger.classList.remove("active-mode-card");
          flashcardClickTrigger.style.pointerEvents = "auto";
        }
        flashcards.renderizarActual();
      });

      btnActive.addEventListener("click", () => {
        state.modoFlashcard = "active";
        btnActive.classList.add("active");
        btnClassic.classList.remove("active");
        if (inputActiveBox) inputActiveBox.classList.remove("hidden");
        if (comparisonBox) {
          comparisonBox.classList.add("hidden");
          comparisonBox.classList.remove("good-match", "mid-match", "bad-match");
        }
        if (flashcardClickTrigger) {
          flashcardClickTrigger.classList.add("active-mode-card");
          flashcardClickTrigger.style.pointerEvents = "none";
        }
        flashcards.renderizarActual();
      });
    }

    // Botón de comparar respuesta escrita
    const btnComparar = document.getElementById("btn-flashcard-comparar");
    if (btnComparar) {
      btnComparar.addEventListener("click", () => {
        const card = state.mazoActualFlashcards[state.indiceActualFlashcard];
        if (!card) return;

        const txtRespuesta = document.getElementById("flashcard-txt-respuesta");
        const respuestaEscrita = txtRespuesta ? txtRespuesta.value.trim() : "";

        if (respuestaEscrita === "") {
          alert("Por favor, escribe una respuesta antes de comparar.");
          return;
        }

        // Ejecutar algoritmo de similitud conceptual
        const resultado = flashcards.compararRespuestas(card.respuesta, respuestaEscrita);

        // Actualizar visualmente la caja de comparación
        const compCorrecta = document.getElementById("flashcard-comp-correcta");
        const compEscrita = document.getElementById("flashcard-comp-escrita");
        const badge = document.getElementById("flashcard-similarity-badge");
        const veredicto = document.getElementById("flashcard-feedback-veredicto");

        if (compCorrecta) compCorrecta.innerHTML = resultado.correctaHtml;
        if (compEscrita) compEscrita.innerHTML = resultado.escritaHtml;
        
        if (badge) {
          badge.textContent = `Similitud: ${resultado.score}%`;
          badge.className = "chip"; // reset
          
          if (resultado.colorClass === "success") {
            badge.classList.add("flashcard-similarity-good");
          } else if (resultado.colorClass === "warning") {
            badge.classList.add("flashcard-similarity-mid");
          } else {
            badge.classList.add("flashcard-similarity-bad");
          }
        }

        if (veredicto) {
          veredicto.textContent = resultado.veredicto;
          
          if (resultado.colorClass === "success") {
            veredicto.style.background = "var(--success-soft)";
            veredicto.style.color = "var(--success)";
            veredicto.style.border = "1px solid rgba(34, 197, 94, 0.2)";
          } else if (resultado.colorClass === "warning") {
            veredicto.style.background = "var(--warning-soft)";
            veredicto.style.color = "var(--warning)";
            veredicto.style.border = "1px solid rgba(245, 158, 11, 0.2)";
          } else {
            veredicto.style.background = "var(--danger-soft)";
            veredicto.style.color = "var(--danger)";
            veredicto.style.border = "1px solid rgba(239, 68, 68, 0.2)";
          }
        }

        if (comparisonBox) {
          comparisonBox.classList.remove("hidden", "good-match", "mid-match", "bad-match");
          if (resultado.colorClass === "success") {
            comparisonBox.classList.add("good-match");
          } else if (resultado.colorClass === "warning") {
            comparisonBox.classList.add("mid-match");
          } else {
            comparisonBox.classList.add("bad-match");
          }
        }

        // Voltear automáticamente la tarjeta para revelar el reverso
        if (flashcardClickTrigger) {
          flashcardClickTrigger.classList.add("flipped");
        }

        // Mostrar caja de autoevaluación (dont/know)
        const flashcardEvalBox = document.getElementById("flashcard-eval-box");
        if (flashcardEvalBox) flashcardEvalBox.classList.remove("hidden");
      });
    }

    if (btnIrFlashcards) {
      btnIrFlashcards.addEventListener("click", () => ui.mostrarPantalla("flashcards"));
    }
    if (btnFlashcardsRegresar) {
      btnFlashcardsRegresar.addEventListener("click", () => ui.mostrarPantalla("home"));
    }
    if (btnFlashcardPrev) {
      btnFlashcardPrev.addEventListener("click", () => {
        if (state.indiceActualFlashcard > 0) {
          state.indiceActualFlashcard--;
          flashcards.renderizarActual();
        }
      });
    }
    if (btnFlashcardNext) {
      btnFlashcardNext.addEventListener("click", () => {
        if (state.indiceActualFlashcard < state.mazoActualFlashcards.length - 1) {
          state.indiceActualFlashcard++;
          flashcards.renderizarActual();
        }
      });
    }
    if (btnFlashcardKnow) {
      btnFlashcardKnow.addEventListener("click", () => flashcards.avanzar(true));
    }
    if (btnFlashcardDont) {
      btnFlashcardDont.addEventListener("click", () => flashcards.avanzar(false));
    }
    if (btnFlashcardReiniciar) {
      btnFlashcardReiniciar.addEventListener("click", () => flashcards.inicializarMazo());
    }
    if (btnFlashcardCongratsRegresar) {
      btnFlashcardCongratsRegresar.addEventListener("click", () => ui.mostrarPantalla("home"));
    }
    if (flashcardFiltroTema) {
      flashcardFiltroTema.addEventListener("change", () => flashcards.inicializarMazo());
    }

    if (flashcardClickTrigger) {
      flashcardClickTrigger.addEventListener("click", () => {
        // En modo Respuesta Activa, no permitimos hacer click directo para voltear
        if (state.modoFlashcard === "active") return;

        flashcardClickTrigger.classList.toggle("flipped");
        const flashcardEvalBox = document.getElementById("flashcard-eval-box");
        if (flashcardClickTrigger.classList.contains("flipped")) {
          if (flashcardEvalBox) flashcardEvalBox.classList.remove("hidden");
        } else {
          if (flashcardEvalBox) flashcardEvalBox.classList.add("hidden");
        }
      });
    }

    // Listener para inyectar flashcards automáticas desde errores (Fase 5)
    document.addEventListener("click", async (e) => {
      const btn = e.target.closest(".btn-auto-flashcard");
      if (!btn) return;
      
      const tema = btn.getAttribute("data-tema");
      const pregunta = btn.getAttribute("data-pregunta");
      const respuesta = btn.getAttribute("data-respuesta");
      
      try {
        await api.guardarFlashcardPersonalizada(state.usuarioConectado.id, tema, pregunta, respuesta);
        btn.disabled = true;
        btn.textContent = "⚡ Flashcard Guardada";
        btn.style.background = "var(--success)";
        if (typeof ui !== "undefined" && typeof ui.inicializarFiltrosFlashcards === "function") {
          await ui.inicializarFiltrosFlashcards();
        }
      } catch (err) {
        alert("Falla al guardar flashcard personalizada: " + err.message);
      }
    });
  },

  // Implementación del algoritmo Fisher-Yates Shuffle para aleatoriedad genuina
  barajarMazo(array) {
    let m = array.length, t, i;
    while (m) {
      i = Math.floor(Math.random() * m--);
      t = array[m];
      array[m] = array[i];
      array[i] = t;
    }
    return array;
  },

  // CARGAR MAZO EN BASE A MATERIA (Filtro Insensible & Carga de Personalizadas)
  async inicializarMazo() {
    const selectorFiltro = document.getElementById("flashcard-filtro-tema");
    const filtroTema = selectorFiltro ? selectorFiltro.value.trim().toLowerCase() : "todos";
    let filtrados = [];
    
    state.mazoFalladasSesion = []; // Limpiar acumulador de falladas

    try {
      // 1. Obtener flashcards personalizadas creadas por el usuario desde el servidor
      let personalizadas = [];
      if (state.usuarioConectado) {
        personalizadas = await api.obtenerFlashcardsPersonalizadas(state.usuarioConectado.id);
      }

      // 2. Unir mazos
      const mazoCompleto = [...baseDatosFlashcardsEstaticas, ...personalizadas];

      // 3. Filtrar por materia de forma insensible a espacios/mayúsculas
      if (filtroTema === "todos") {
        filtrados = [...mazoCompleto];
      } else {
        filtrados = mazoCompleto.filter(c => c.tema.trim().toLowerCase() === filtroTema);
      }

      // 4. Integrar con Spaced Repetition (Filtro de Enfriamiento por Dominio y Dashboard Estadístico)
      let estados = {};
      if (state.usuarioConectado) {
        const srEstados = await api.obtenerRepeticionEspaciada(state.usuarioConectado.id);
        
        let totalTarjetas = 0;
        let pendientesHoy = 0;
        let enAprendizaje = 0;
        let dominadas = 0;
        const ahora = new Date();

        srEstados.forEach(e => {
          if (e.flashcard_id) {
            totalTarjetas++;
            
            const nextReviewDate = e.next_review ? new Date(e.next_review) : ahora;
            if (e.interval >= 7) {
              dominadas++;
            } else if (e.interval > 0) {
              enAprendizaje++;
            }
            
            if (nextReviewDate <= ahora) {
              pendientesHoy++;
            }
            
            estados[e.flashcard_id] = e;
          }
        });

        // Actualizar la UI del cuadro de retención global de Flashcards
        const fcTotalesEl = document.getElementById("fc-global-totales");
        const fcPendientesEl = document.getElementById("fc-global-pendientes");
        const fcAprendizajeEl = document.getElementById("fc-global-aprendizaje");
        const fcDominadasEl = document.getElementById("fc-global-dominadas");

        if (fcTotalesEl) fcTotalesEl.textContent = totalTarjetas;
        if (fcPendientesEl) fcPendientesEl.textContent = pendientesHoy;
        if (fcAprendizajeEl) fcAprendizajeEl.textContent = enAprendizaje;
        if (fcDominadasEl) fcDominadasEl.textContent = dominadas;
      }

      // Segmentar en dos bloques en caliente: prioritario (interval === 0) y enfriamiento (interval > 0)
      const prioritario = [];
      const enfriamiento = [];

      filtrados.forEach(c => {
        const estado = estados[c.pregunta] || { interval: 0, repetitions: 0 };
        if (estado.interval === 0) {
          prioritario.push(c);
        } else {
          enfriamiento.push(c);
        }
      });

      // Barajar de forma independiente cada bloque para conservar el azar genuino
      flashcards.barajarMazo(prioritario);
      flashcards.barajarMazo(enfriamiento);

      // Concatenar colocando los prioritarios al principio de la sesión y las dominadas al final
      state.mazoActualFlashcards = [...prioritario, ...enfriamiento];
      state.indiceActualFlashcard = 0;
      state.dominadasFlashcards = 0;
      state.repasoFlashcards = 0;

      const flashcardsEstudioZona = document.getElementById("flashcards-estudio-zona");
      const flashcardsCongratsZona = document.getElementById("flashcards-congrats-zona");

      if (flashcardsEstudioZona) flashcardsEstudioZona.classList.remove("hidden");
      if (flashcardsCongratsZona) flashcardsCongratsZona.classList.add("hidden");

      flashcards.actualizarContadores();
      flashcards.renderizarActual();
    } catch (e) {
      console.error("Error al inyectar mazo adaptativo:", e);
    }
  },

  renderizarActual() {
    const flashcardClickTrigger = document.getElementById("flashcard-click-trigger");
    const flashcardEvalBox = document.getElementById("flashcard-eval-box");
    const indicador = document.getElementById("flashcard-contador-indicador");

    if (flashcardClickTrigger) flashcardClickTrigger.classList.remove("flipped");
    if (flashcardEvalBox) flashcardEvalBox.classList.add("hidden");

    // Reset de Respuesta Activa
    const txtRespuesta = document.getElementById("flashcard-txt-respuesta");
    if (txtRespuesta) txtRespuesta.value = "";
    
    const comparisonBox = document.getElementById("flashcard-active-comparison-box");
    if (comparisonBox) {
      comparisonBox.classList.add("hidden");
      comparisonBox.classList.remove("good-match", "mid-match", "bad-match");
    }

    const inputActiveBox = document.getElementById("flashcard-active-input-box");
    if (inputActiveBox) {
      if (state.modoFlashcard === "active") {
        inputActiveBox.classList.remove("hidden");
        if (flashcardClickTrigger) {
          flashcardClickTrigger.classList.add("active-mode-card");
          flashcardClickTrigger.style.pointerEvents = "none";
        }
      } else {
        inputActiveBox.classList.add("hidden");
        if (flashcardClickTrigger) {
          flashcardClickTrigger.classList.remove("active-mode-card");
          flashcardClickTrigger.style.pointerEvents = "auto";
        }
      }
    }

    if (state.mazoActualFlashcards.length === 0) {
      if (indicador) indicador.textContent = "0 de 0 Tarjetas";
      document.getElementById("flashcard-front-tag").textContent = "Vacío";
      document.getElementById("flashcard-front-texto").textContent = "No hay flashcards registradas para esta materia.";
      document.getElementById("flashcard-back-tag").textContent = "Vacío";
      document.getElementById("flashcard-back-texto").textContent = "Prueba con otra materia en el selector superior.";
      return;
    }

    if (indicador) {
      indicador.textContent = `Tarjeta ${state.indiceActualFlashcard + 1} de ${state.mazoActualFlashcards.length}`;
    }

    const card = state.mazoActualFlashcards[state.indiceActualFlashcard];

    document.getElementById("flashcard-front-tag").textContent = card.tema;
    document.getElementById("flashcard-front-texto").textContent = card.pregunta;
    document.getElementById("flashcard-back-tag").textContent = `Respuesta • ${card.tema}`;
    document.getElementById("flashcard-back-texto").textContent = card.respuesta;
  },

  compararRespuestas(correcta, escrita) {
    if (!escrita || escrita.trim() === "") {
      return {
        score: 0,
        correctaHtml: correcta,
        escritaHtml: "(No ingresaste respuesta)",
        veredicto: "No se ingresó ninguna respuesta escrita.",
        colorClass: "danger"
      };
    }

    // Limpieza de texto para comparación conceptual médica
    const limpiar = (txt) => {
      return txt
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // quitar acentos
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, " ") // cambiar puntuación por espacios
        .split(/\s+/)
        .filter(w => w.trim().length > 2); // palabras con más de 2 letras
    };

    const palabrasCorrectas = limpiar(correcta);
    const palabrasEscritas = limpiar(escrita);

    if (palabrasCorrectas.length === 0) {
      return { score: 100, correctaHtml: correcta, escritaHtml: escrita, veredicto: "✓ Coincidencia completa.", colorClass: "success" };
    }

    // Filtro de stop words comunes en español
    const stopWords = new Set([
      "del", "que", "con", "por", "una", "uno", "los", "las", "para", "como", "mas",
      "este", "esta", "estos", "estas", "todo", "toda", "todos", "todas", "donde", "cuando"
    ]);
    
    // Conceptos médicos clave (excluyendo stop words)
    const palabrasClaveCorrectas = palabrasCorrectas.filter(w => !stopWords.has(w));
    const setEscritas = new Set(palabrasEscritas);
    
    let coincidentes = 0;
    palabrasClaveCorrectas.forEach(w => {
      if (setEscritas.has(w)) {
        coincidentes++;
      }
    });

    // Recall score: porcentaje de conceptos clave correctos incluidos
    const score = palabrasClaveCorrectas.length > 0 
      ? Math.round((coincidentes / palabrasClaveCorrectas.length) * 100) 
      : 0;

    // Resaltar palabras coincidentes en el HTML
    const resaltarMatch = (original, matches) => {
      let palabras = original.split(/\s+/);
      return palabras.map(p => {
        const limpiaPalabra = p.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
          
        if (matches.has(limpiaPalabra) && limpiaPalabra.length > 2 && !stopWords.has(limpiaPalabra)) {
          return `<span class="flashcard-match-highlight">${p}</span>`;
        }
        return p;
      }).join(" ");
    };

    const matchesSet = new Set(palabrasClaveCorrectas.filter(w => setEscritas.has(w)));
    const correctaHtml = resaltarMatch(correcta, matchesSet);
    const escritaHtml = resaltarMatch(escrita, matchesSet);

    let veredicto = "";
    let colorClass = "";
    if (score >= 70) {
      veredicto = "🏆 ¡Excelente coincidencia! Has incluido los conceptos fundamentales de la literatura médica oficial.";
      colorClass = "success";
    } else if (score >= 35) {
      veredicto = "⚠️ Coincidencia parcial. Cubres algunos términos clave, pero necesitas mayor precisión académica.";
      colorClass = "warning";
    } else {
      veredicto = "❌ Coincidencia baja. Repasa los criterios de diagnóstico y tratamiento oficiales de esta materia.";
      colorClass = "danger";
    }

    return {
      score,
      correctaHtml,
      escritaHtml,
      veredicto,
      colorClass
    };
  },

  // AVANZAR TARJETA CON MOTOR DE SPACED REPETITION (SM-2 / FSRS) PERSISTENTE
  async avanzar(seLaSabia) {
    const card = state.mazoActualFlashcards[state.indiceActualFlashcard];
    
    // Sincronizar FSRS/SM-2 persistente en el servidor
    // SeLaSabia: true -> Bien (2), false -> Fallado (0)
    await spacedRepetition.sincronizarEstado(null, card.pregunta, seLaSabia, seLaSabia ? 2 : 0);

    if (seLaSabia) {
      state.dominadasFlashcards++;
    } else {
      state.repasoFlashcards++;
      // Mazo secundario seguro para evitar fallos de splicing en caliente
      state.mazoFalladasSesion.push(card);
    }

    flashcards.actualizarContadores();

    const flashcardClickTrigger = document.getElementById("flashcard-click-trigger");
    const flashcardEvalBox = document.getElementById("flashcard-eval-box");

    if (state.indiceActualFlashcard < state.mazoActualFlashcards.length - 1) {
      state.indiceActualFlashcard++;
      if (flashcardClickTrigger) flashcardClickTrigger.classList.remove("flipped");
      if (flashcardEvalBox) flashcardEvalBox.classList.add("hidden");
      setTimeout(() => {
        flashcards.renderizarActual();
      }, 150);
    } else {
      // Fin del mazo
      if (state.mazoFalladasSesion.length > 0) {
        state.mazoActualFlashcards = [...state.mazoFalladasSesion];
        state.mazoFalladasSesion = [];
        state.indiceActualFlashcard = 0;

        alert("Comenzando mazo de repaso rápido de tus tarjetas falladas en esta sesión");

        if (flashcardClickTrigger) flashcardClickTrigger.classList.remove("flipped");
        if (flashcardEvalBox) flashcardEvalBox.classList.add("hidden");
        setTimeout(() => {
          flashcards.renderizarActual();
        }, 150);
      } else {
        const flashcardsEstudioZona = document.getElementById("flashcards-estudio-zona");
        const flashcardsCongratsZona = document.getElementById("flashcards-congrats-zona");
        if (flashcardsEstudioZona) flashcardsEstudioZona.classList.add("hidden");
        if (flashcardsCongratsZona) flashcardsCongratsZona.classList.remove("hidden");
      }
    }
  },

  actualizarContadores() {
    const domEl = document.getElementById("flashcard-stat-dominadas");
    const repEl = document.getElementById("flashcard-stat-repaso");
    const retEl = document.getElementById("flashcard-stat-retencion");

    if (domEl) domEl.textContent = state.dominadasFlashcards;
    if (repEl) repEl.textContent = state.repasoFlashcards;

    const totalRespondidas = state.dominadasFlashcards + state.repasoFlashcards;
    const porcentaje = totalRespondidas > 0 ? Math.round((state.dominadasFlashcards / totalRespondidas) * 100) : 0;
    
    if (retEl) {
      retEl.textContent = `${porcentaje}%`;
      if (porcentaje >= 75) {
        retEl.style.color = "var(--success)";
      } else if (porcentaje >= 50) {
        retEl.style.color = "var(--warning)";
      } else {
        retEl.style.color = "var(--danger)";
      }
    }
  }
};

window.flashcards = flashcards;
