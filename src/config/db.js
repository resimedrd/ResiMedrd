const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

let dbInstance = null;
const ADMIN_EMAIL = "frank@resimed.com";

async function conectarBaseDeDatos() {
  if (dbInstance) return dbInstance;
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, "../../resimed.db");
  console.log("Conectando a base de datos en:", dbPath);
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  await iniciarBaseDeDatos(dbInstance);
  return dbInstance;
}

function getDB() {
  if (!dbInstance) {
    throw new Error("Base de datos no inicializada. Llama a conectarBaseDeDatos primero.");
  }
  return dbInstance;
}

async function iniciarBaseDeDatos(db) {

  // Habilitar el modo de alta concurrencia Write-Ahead Logging
  try {
    await db.exec(`PRAGMA journal_mode = WAL;`);
    await db.exec(`PRAGMA synchronous = NORMAL;`);
  } catch (walErr) {
    console.warn("Falla al activar modo WAL en SQLite:", walErr);
  }

  // 0. Tabla de Exámenes (FASE 3)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS examenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      ano INTEGER UNIQUE NOT NULL,
      cantidad_preguntas INTEGER DEFAULT 0,
      activo INTEGER DEFAULT 1
    )
  `);

  // 1. Tabla de Usuarios
  await db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol TEXT DEFAULT 'usuario',
      fecha_nacimiento TEXT,
      biografia TEXT,
      fecha_registro TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Tabla de Preguntas
  await db.exec(`
    CREATE TABLE IF NOT EXISTS preguntas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      texto TEXT NOT NULL,
      opciones TEXT NOT NULL,
      correcta INTEGER NOT NULL,
      explicacion TEXT,
      tema TEXT NOT NULL,
      fuente TEXT DEFAULT 'ENURM 2024'
    )
  `);

  // 3. Tabla de Sesiones
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sesiones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      tema TEXT NOT NULL,
      modo TEXT NOT NULL,
      cantidad_preguntas INTEGER NOT NULL,
      correctas INTEGER NOT NULL,
      porcentaje INTEGER NOT NULL,
      fecha TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Asegurar la columna 'detalle' para compatibilidad retroactiva
  try {
    await db.exec(`ALTER TABLE sesiones ADD COLUMN detalle TEXT`);
  } catch (error) {
    // La columna ya existe, ignorar error
  }

  // 4. Tabla de spaced_repetition (SaaS Spaced Repetition)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS spaced_repetition (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      pregunta_id INTEGER,
      flashcard_id TEXT,
      stability REAL DEFAULT 2.0,
      difficulty REAL DEFAULT 0.5,
      ease REAL DEFAULT 2.5,
      repetitions INTEGER DEFAULT 0,
      interval INTEGER DEFAULT 0,
      next_review TEXT,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `);

  // 5. Tabla de flashcards_personalizadas (Autoinyección desde errores)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS flashcards_personalizadas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      tema TEXT NOT NULL,
      pregunta TEXT NOT NULL,
      respuesta TEXT NOT NULL,
      fecha TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `);

  // 5.1. Tabla de historial_flashcards (Registro cronológico de repasos diarios FASE 10)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS historial_flashcards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      flashcard_id TEXT NOT NULL,
      tema TEXT NOT NULL,
      se_la_sabia INTEGER NOT NULL,
      dificultad INTEGER NOT NULL,
      fecha TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `);

  // 6. Tabla de reportes_error (SaaS Feedback Loop)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS reportes_error (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      pregunta_id INTEGER NOT NULL,
      motivo TEXT NOT NULL,
      comentario TEXT,
      leido INTEGER DEFAULT 0,
      fecha TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
      FOREIGN KEY (pregunta_id) REFERENCES preguntas(id)
    )
  `);

  // 7. Tabla de batalla_historial (Modo Batalla)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS batalla_historial (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      modalidad TEXT NOT NULL,
      contrincantes TEXT NOT NULL,
      correctas INTEGER NOT NULL,
      total_preguntas INTEGER NOT NULL,
      posicion INTEGER NOT NULL,
      fecha TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `);

  // Migraciones retrocompatibles para la tabla usuarios
  const columnasUsuarios = [
    { nombre: "xp", definicion: "INTEGER DEFAULT 0" },
    { nombre: "streak", definicion: "INTEGER DEFAULT 0" },
    { nombre: "nivel", definicion: "INTEGER DEFAULT 1" },
    { nombre: "meta_semanal", definicion: "INTEGER DEFAULT 50" },
    { nombre: "last_active_date", definicion: "TEXT" },
    { nombre: "especialidad_aspirada", definicion: "TEXT DEFAULT 'Ninguna'" },
    { nombre: "battle_jugadas", definicion: "INTEGER DEFAULT 0" },
    { nombre: "battle_ganadas", definicion: "INTEGER DEFAULT 0" },
    { nombre: "battle_perdidas", definicion: "INTEGER DEFAULT 0" },
    { nombre: "battle_racha_actual", definicion: "INTEGER DEFAULT 0" },
    { nombre: "battle_racha_mejor", definicion: "INTEGER DEFAULT 0" },
    { nombre: "fecha_nacimiento", definicion: "TEXT" },
    { nombre: "biografia", definicion: "TEXT" },
    { nombre: "fecha_registro", definicion: "TEXT DEFAULT CURRENT_TIMESTAMP" }
  ];

  for (const col of columnasUsuarios) {
    try {
      await db.exec(`ALTER TABLE usuarios ADD COLUMN ${col.nombre} ${col.definicion}`);
    } catch (e) {
      // Ignorar si la columna ya existe
    }
  }

  // Migraciones retrocompatibles para la tabla preguntas
  const columnasPreguntas = [
    { nombre: "difficulty", definicion: "REAL DEFAULT 0.5" },
    { nombre: "subtema", definicion: "TEXT" },
    { nombre: "microtema", definicion: "TEXT" },
    { nombre: "tags", definicion: "TEXT" },
    { nombre: "success_rate", definicion: "REAL DEFAULT 0.0" },
    { nombre: "veces_respondida", definicion: "INTEGER DEFAULT 0" },
    { nombre: "veces_fallada", definicion: "INTEGER DEFAULT 0" },
    { nombre: "discrimination_index", definicion: "REAL DEFAULT 0.0" },
    { nombre: "especialidad", definicion: "TEXT" },
    { nombre: "ano_examen", definicion: "INTEGER" },
    { nombre: "explicacion_correcta", definicion: "TEXT" },
    { nombre: "explicacion_incorrecta", definicion: "TEXT" },
    { nombre: "activo", definicion: "INTEGER DEFAULT 1" },
    { nombre: "examen_id", definicion: "INTEGER REFERENCES examenes(id)" }
  ];

  for (const col of columnasPreguntas) {
    try {
      await db.exec(`ALTER TABLE preguntas ADD COLUMN ${col.nombre} ${col.definicion}`);
    } catch (e) {
      // Ignorar si la columna ya existe
    }
  }

  // Migración retrocompatible para la tabla spaced_repetition (FASE 2)
  try {
    await db.exec(`ALTER TABLE spaced_repetition ADD COLUMN last_reviewed_date TEXT`);
  } catch (e) {
    // Ignorar si ya existe
  }

  // Crear índices de alto rendimiento para acelerar las consultas
  try {
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_preguntas_examen_id ON preguntas(examen_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_preguntas_tema ON preguntas(tema)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_preguntas_activo ON preguntas(activo)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_preguntas_ano_examen ON preguntas(ano_examen)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_spaced_rep_usuario ON spaced_repetition(usuario_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_spaced_rep_next_review ON spaced_repetition(next_review)`);
    console.log("📈 Índices de alto rendimiento creados con éxito en SQLite.");
  } catch (errIndexes) {
    console.error("Error al crear índices de rendimiento:", errIndexes);
  }

  // 🏥 Parche de migración automática: Corregir pregunta de Cólera si está vacía
  try {
    const checkColera = await db.get(`SELECT id FROM preguntas WHERE (opciones = '[]' OR opciones = '' OR opciones IS NULL) AND texto LIKE '%Paciente de 10 años diagnosticada con cólera grave%'`);
    if (checkColera) {
      await db.run(`
        UPDATE preguntas 
        SET opciones = '["a) > 10 ml/kg/hora","b) < 5 ml/kg/hora","c) > 20 ml/kg/hora","d) < 1 ml/kg/hora"]'
        WHERE id = ?
      `, [checkColera.id]);
      console.log("🩹 Parche aplicado con éxito: Pregunta de cólera (ID: " + checkColera.id + ") actualizada con opciones oficiales.");
    }
  } catch (errColeraPatch) {
    console.error("Error al aplicar parche de cólera:", errColeraPatch);
  }

  // Cargar banco inicial premium de 14 especialidades si está vacío o con explicaciones antiguas
  try {
    let totalPreguntas = await db.get(`SELECT COUNT(*) as total FROM preguntas`);
    
    // Si existen preguntas iniciales pero tienen explicaciones antiguas sin justificación o fuentes desactualizadas, forzamos su actualización premium
    if (totalPreguntas && totalPreguntas.total > 0) {
      const primeraP = await db.get(`SELECT explicacion, fuente, explicacion_correcta FROM preguntas ORDER BY id LIMIT 1`);
      if (primeraP && (!primeraP.explicacion || !primeraP.explicacion_correcta || !primeraP.explicacion.includes("JUSTIFICACIÓN") || primeraP.fuente === 'ENURM 2024')) {
        console.log("Detectadas explicaciones antiguas o migración de Fase 1 requerida. Limpiando banco base para re-siembra premium...");
        await db.run(`DELETE FROM preguntas`);
        totalPreguntas.total = 0;
      }
    }

    if (totalPreguntas && totalPreguntas.total === 0) {
      const iniciales = [
        {
          texto: "¿Cuál es el tratamiento preventivo de elección para evitar aneurismas coronarios en la Enfermedad de Kawasaki?",
          opciones: JSON.stringify([
            "Inmunoglobulina Intravenosa (IGIV) + Aspirina",
            "Corticoides a dosis altas",
            "Ciclofosfamida + Heparina",
            "Antibioticoterapia de amplio espectro"
          ]),
          correcta: 0,
          explicacion: "🔬 JUSTIFICACIÓN (Por qué SÍ):\nLa inmunoglobulina intravenosa (IGIV) a dosis altas (2 g/kg en infusión única de 10-12 horas) administrada conjuntamente con Ácido Acetilsalicílico (Aspirina) a dosis antiinflamatorias en los primeros 10 días desde el inicio de la fiebre, reduce la incidencia de aneurismas coronarios de un 20-25% a menos del 5%.\n\n🚫 DESCARTE (Por qué NO):\n• Corticoides: No son el tratamiento inicial de elección y su uso aislado en fase aguda se ha asociado con un aumento paradojal de aneurismas, reservándose solo para casos refractarios a IGIV.\n• Ciclofosfamida + Heparina: Son inmunosupresores y anticoagulantes sistémicos agresivos indicados únicamente en complicaciones vasculares tardías refractarias severas.\n• Antibióticos: Es una enfermedad autoinmune (vasculitis sistémica de vasos de mediano calibre), por lo que no tiene base etiológica infecciosa tratable con antimicrobianos.",
          tema: "Pediatría",
          fuente: "Nelson Tratado de Pediatría, 21.ª Edición - Capítulo 385 (Enfermedad de Kawasaki)"
        },
        {
          texto: "¿Cuál es la causa más común de bronquiolitis en lactantes y cuál es su manejo principal?",
          opciones: JSON.stringify([
            "Virus Sincitial Respiratorio (VSR) - Soporte y oxigenoterapia",
            "Adenovirus - Antibióticos y corticoides",
            "Influenza - Salbutamol e hidratación",
            "Rinovirus - Nebulizaciones con adrenalina"
          ]),
          correcta: 0,
          explicacion: "🔬 JUSTIFICACIÓN (Por qué SÍ):\nEl Virus Sincitial Respiratorio (VSR) es el agente causal de más del 80% de los casos de bronquiolitis aguda en lactantes. Dado que es una patología viral autolimitada, el pilar fundamental del tratamiento es puramente de soporte: asegurar la hidratación y nutrición adecuadas, realizar aspiración nasal frecuente de secreciones y proveer oxigenoterapia suplementaria humidificada si la saturación de O2 cae por debajo del 90-92%.\n\n🚫 DESCARTE (Por qué NO):\n• Adenovirus / Antibióticos: Los antibióticos carecen de efectividad contra virus y los corticoides sistemáticos no demuestran reducción en la tasa de hospitalización ni mejoría clínica.\n• Influenza / Salbutamol: El Salbutamol inhalado no está recomendado de rutina dado que la obstrucción fisiológica en lactantes se debe al edema de la mucosa y moco acumulado, no a broncoespasmo de músculo liso.\n• Rinovirus / Adrenalina: La adrenalina nebulizada no es un pilar estándar de soporte y no tiene efectividad sostenida comprobada para el manejo clínico general.",
          tema: "Pediatría",
          fuente: "Nelson Tratado de Pediatría, 21.ª Edición - Capítulo 409 (Bronquiolitis Aguda)"
        },
        {
          texto: "¿Cuál es la tríada diagnóstica de sospecha para el Embarazo Ectópico?",
          opciones: JSON.stringify([
            "Dolor abdominal bajo + Sangrado vaginal + Amenorrea",
            "Fiebre + Dolor anexial + Leucorrea",
            "Hiperemesis + Dolor pélvico + Masa palpable",
            "Hipertensión + Proteinuria + Edema"
          ]),
          correcta: 0,
          explicacion: "🔬 JUSTIFICACIÓN (Por qué SÍ):\nLa tríada clínica clásica del embarazo ectópico se compone de dolor abdominal/pélvico bajo unilateral (presente en >95% de casos), sangrado transvaginal anormal de volumen variable (en >75% de casos) y un periodo de amenorrea precedente (en >75% de casos). Esta tríada obliga siempre a descartar la implantación ectópica mediante determinación cuantitativa de beta-hCG y ecografía transvaginal.\n\n🚫 DESCARTE (Por qué NO):\n• Fiebre + Dolor + Leucorrea: Es la presentación característica de la Enfermedad Inflamatoria Pélvica (EIP) o absceso tuboovárico, no de embarazo ectópico.\n• Hiperemesis + Dolor + Masa: Son datos inespecíficos compatibles con quistes ováricos torcidos o embarazos molares complicados.\n• Hipertensión + Proteinuria + Edema: Corresponde a la tríada histórica definitoria de Preeclampsia, una vasculopatía del embarazo que típicamente ocurre después de las 20 semanas de gestación.",
          tema: "Gineco-Obstetricia",
          fuente: "Williams Obstetricia, 26.ª Edición - Capítulo 12 (Embarazo Ectópico)"
        },
        {
          texto: "¿Cómo se define la Preeclampsia con Criterios de Severidad?",
          opciones: JSON.stringify([
            "Presión arterial ≥140/90 mmHg + Cefalea leve",
            "Presión arterial ≥160/110 mmHg o disfunción de órgano blanco",
            "Proteinuria >300 mg en 24 horas únicamente",
            "Edema generalizado + Aumento de peso repentino"
          ]),
          correcta: 1,
          explicacion: "🔬 JUSTIFICACIÓN (Por qué SÍ):\nLa preeclampsia con criterios de severidad se establece ante una presión arterial sistólica ≥160 mmHg o diastólica ≥110 mmHg medida en dos ocasiones con al menos 4 horas de diferencia, o en presencia de disfunción de órgano blanco (trombocitopenia <100,000/uL, elevación de enzimas hepáticas al doble, dolor severo en cuadrante superior derecho, creatinina >1.1 mg/dL, cefalea severa de novo o alteraciones visuales).\n\n🚫 DESCARTE (Por qué NO):\n• PA ≥140/90 mmHg + Cefalea leve: Corresponde a preeclampsia sin criterios de severidad (leve) o hipertensión gestacional si no hay proteinuria u otros datos.\n• Proteinuria >300 mg/24h: Es el criterio clásico para definir Preeclampsia basal, pero su cuantía no establece severidad por sí sola según los consensos actuales de la ACOG.\n• Edema generalizado: Fue retirado como criterio diagnóstico formal hace años por su alta tasa de falsos positivos en gestantes sanas.",
          tema: "Gineco-Obstetricia",
          fuente: "Williams Obstetricia, 26.ª Edición - Capítulo 40 (Trastornos Hipertensivos del Embarazo)"
        },
        {
          texto: "¿Qué escala clínica se utiliza para estimar la probabilidad diagnóstica de Apendicitis Aguda?",
          opciones: JSON.stringify([
            "Escala de Alvarado",
            "Criterios de Ranson",
            "Escala de Glasgow",
            "Escala de Hinchey"
          ]),
          correcta: 0,
          explicacion: "🔬 JUSTIFICACIÓN (Por qué SÍ):\nLa escala de Alvarado (también llamada MANTRELS) es el sistema de puntuación clínica más validado a nivel mundial para estimar la probabilidad de apendicitis aguda. Evalúa síntomas (migración del dolor, anorexia, náuseas/vómitos), signos (dolor en cuadrante inferior derecho, rebote, fiebre) y laboratorio (leucocitosis, desviación a la izquierda), con un puntaje máximo de 10.\n\n🚫 DESCARTE (Por qué NO):\n• Criterios de Ranson: Es una escala diseñada para clasificar y predecir la severidad y el pronóstico de la pancreatitis aguda en las primeras 48 horas.\n• Escala de Glasgow: Mide cuantitativamente el nivel de conciencia en pacientes con daño cerebral o traumatismo craneoencefálico.\n• Escala de Hinchey: Clasifica la gravedad y extensión de la perforación o abscesos en pacientes cursando con diverticulitis aguda del colon.",
          tema: "Cirugía General",
          fuente: "Schwartz Principios de Cirugía, 11.ª Edición - Capítulo 30 (El Apéndice)"
        },
        {
          texto: "¿Cuáles son los componentes de la tríada de Charcot para Colangitis Aguda?",
          opciones: JSON.stringify([
            "Fiebre + Ictericia + Dolor en hipocondrio derecho",
            "Dolor abdominal + Vómitos + Distensión",
            "Fiebre + Sepsis + Confusión mental",
            "Ictericia + Pérdida de peso + Masa palpable"
          ]),
          correcta: 0,
          explicacion: "🔬 JUSTIFICACIÓN (Por qué SÍ):\nLa tríada de Charcot describe los tres síntomas y signos cardinales de la colangitis aguda por obstrucción biliar e infección bacteriana ascendente: Fiebre con escalofríos (por bacteriemia), Ictericia (por colestasis obstructiva) y Dolor en el hipocondrio derecho (por distensión de la vía biliar). La presencia de esta tríada exige descompresión urgente de la vía biliar.\n\n🚫 DESCARTE (Por qué NO):\n• Dolor + Vómitos + Distensión: Es la tríada clásica sugestiva de una Obstrucción Intestinal mecánica baja o alta.\n• Fiebre + Sepsis + Confusión: Son manifestaciones sistémicas graves de disfunción neurológica e infección, pero no son específicas de patología biliar.\n• Ictericia + Pérdida de peso + Masa: Es la presentación insidiosa típica de sospecha de un Cáncer de Cabeza de Páncreas o Colangiocarcinoma (Ictericia silenciosa de Courvoisier-Terrier).",
          tema: "Cirugía General",
          fuente: "Schwartz Principios de Cirugía, 11.ª Edición - Capítulo 32 (Vías Biliares)"
        },
        {
          texto: "¿Cuál es la medida inicial más crítica e inmediata en la Cetoacidosis Diabética?",
          opciones: JSON.stringify([
            "Administración de insulina en infusión",
            "Reposición de potasio intravenoso",
            "Rehidratación enérgica con Solución Salina al 0.9%",
            "Bicarbonato de sodio intravenoso"
          ]),
          correcta: 2,
          explicacion: "🔬 JUSTIFICACIÓN (Por qué SÍ):\nLa medida terapéutica inicial más crítica, inmediata y con mayor impacto en la supervivencia en la Cetoacidosis Diabética (CAD) es la reposición agresiva de volumen intravascular mediante infusión rápida de Solución Salina Isotónica al 0.9% (típicamente 1-1.5 litros en la primera hora). Esto restaura la perfusión renal, disminuye las hormonas contrarreguladoras y diluye los niveles séricos de glucosa sanguínea.\n\n🚫 DESCARTE (Por qué NO):\n• Insulina en infusión: Nunca debe iniciarse de forma ciega si el paciente se encuentra chocado o si el potasio sérico se sitúa por debajo de 3.3 mEq/L, ya que la insulina meterá el potasio a las células agravando la hipopotasemia severa.\n• Reposición de potasio: Es fundamental, pero solo se inicia tras asegurar un gasto urinario adecuado y tras el inicio de la fluidoterapia.\n• Bicarbonato: Su uso es altamente controversial y solo se indica en casos extremos de acidosis metabólica con un pH sanguíneo inferior a 6.9.",
          tema: "Medicina Interna",
          fuente: "Harrison Principios de Medicina Interna, 21.ª Edición - Capítulo 403 (Cetoacidosis Diabética)"
        },
        {
          texto: "¿Cuál es el microorganismo bacteriano causante más común de la Neumonía Adquirida en la Comunidad?",
          opciones: JSON.stringify([
            "Streptococcus pneumoniae",
            "Mycoplasma pneumoniae",
            "Haemophilus influenzae",
            "Staphylococcus aureus"
          ]),
          correcta: 0,
          explicacion: "🔬 JUSTIFICACIÓN (Por qué SÍ):\nEl Streptococcus pneumoniae (Neumococo) es el patógeno bacteriano aislado con mayor frecuencia en todos los grupos de edad a nivel mundial para Neumonía Adquirida en la Comunidad (NAC), siendo responsable de aproximadamente un 30-50% de los casos bacterianos confirmados.\n\n🚫 DESCARTE (Por qué NO):\n• Mycoplasma pneumoniae: Es el agente bacteriano atípico más común, afectando de forma característica a jóvenes y adultos sanos en brotes cerrados.\n• Haemophilus influenzae: Es frecuente en pacientes adultos mayores o con antecedente patológico de EPOC o tabaquismo crónico.\n• Staphylococcus aureus: Es una causa bacteriana severa y necrotizante, típicamente secundaria a una infección viral previa por Influenza en pacientes hospitalizados.",
          tema: "Medicina Interna",
          fuente: "Harrison Principios de Medicina Interna, 21.ª Edición - Capítulo 121 (Neumonía Adquirida en la Comunidad)"
        },
        {
          texto: "¿Cuál es el principal neurotransmisor excitatorio del Sistema Nervioso Central del adulto?",
          opciones: JSON.stringify([
            "GABA",
            "Glutamato",
            "Glicina",
            "Acetilcolina"
          ]),
          correcta: 1,
          explicacion: "🔬 JUSTIFICACIÓN (Por qué SÍ):\nEl glutamato es el neurotransmisor excitatorio más abundante y metabólicamente activo del Sistema Nervioso Central (SNC) en mamíferos adultos, mediando la transmisión de señales en la gran mayoría de las sinapsis cerebrales y jugando un rol clave en la plasticidad neuronal, aprendizaje y memoria.\n\n🚫 DESCARTE (Por qué NO):\n• GABA: Es el principal neurotransmisor con función netamente inhibitoria del SNC en el cerebro.\n• Glicina: Es un neurotransmisor inhibitorio que actúa principalmente a nivel del tronco encefálico y la médula espinal.\n• Acetilcolina: Es el neurotransmisor principal de la placa motora, del sistema nervioso autónomo parasimpático y con funciones mixtas reguladoras a nivel cerebral.",
          tema: "Ciencias Básicas",
          fuente: "Guyton & Hall Tratado de Fisiología Médica, 14.ª Edición - Capítulo 46 (Sustancias Transmisoras del SNC)"
        },
        {
          texto: "¿Cuál es el hallazgo electrocardiográfico clásico y patognomónico del Taponamiento Cardíaco?",
          opciones: JSON.stringify([
            "Alternancia eléctrica + Bajo voltaje generalizado",
            "Elevación difusa del segmento ST en forma de silla de montar",
            "Bloqueo auriculoventricular de tercer grado",
            "Ondas T picudas y simétricas en derivaciones precordiales"
          ]),
          correcta: 0,
          explicacion: "🔬 JUSTIFICACIÓN (Por qué SÍ):\nLa alternancia eléctrica (variación periódica de la amplitud y polaridad de la onda P, el complejo QRS y la onda T en latidos sucesivos) asociada a bajo voltaje en las derivaciones de los miembros es patognomónica del taponamiento cardíaco severo. Ocurre por el balanceo anatómico del corazón de adelante hacia atrás dentro de un saco pericárdico tenso lleno de líquido.\n\n🚫 DESCARTE (Por qué NO):\n• ST difuso en silla de montar: Es el hallazgo electrocardiográfico definitorio de la primera fase de la Pericarditis Aguda no obstructiva.\n• Bloqueo AV de 3er grado: Es un trastorno de conducción eléctrica nodal severo por desconexión completa aurículo-ventricular, no relacionado a compresión pericárdica.\n• Ondas T picudas: Es el marcador electrocardiográfico inicial característico de la Hiperpotasemia (potasio alto en sangre).",
          tema: "Cardiología",
          fuente: "Braunwald Tratado de Cardiología, 12.ª Edición - Capítulo 84 (Enfermedades del Pericardio)"
        },
        {
          texto: "¿Cuál es el tratamiento de elección para una crisis asmática moderada a grave?",
          opciones: JSON.stringify([
            "Salbutamol inhalado + Corticoide sistémico + Bromuro de ipratropio",
            "Antihistamínicos orales + Teofilina",
            "Corticoides inhalados solos a dosis bajas",
            "Antibióticos empíricos + Oxigenoterapia"
          ]),
          correcta: 0,
          explicacion: "🔬 JUSTIFICACIÓN (Por qué SÍ):\nEl manejo agudo de una crisis asmática moderada-severa asocia agonistas beta-2 adrenérgicos de acción corta (SABA, ej: Salbutamol) inhalados frecuentemente, un anticolinérgico inhalado (Bromuro de Ipratropio) para un efecto sinérgico de broncodilatación, y corticoide sistémico temprano (metilprednisolona IV o prednisona VO) para revertir la inflamación de la vía aérea.\n\n🚫 DESCARTE (Por qué NO):\n• Antihistamínicos / Teofilina: Los antihistamínicos no tienen ningún rol en el broncoespasmo agudo y la teofilina tiene un estrecho margen terapéutico y baja eficacia en agudo.\n• Corticoides inhalados solos: Son la base del tratamiento de control a largo plazo del asma crónica, no del rescate urgente en crisis.\n• Antibióticos: Las crisis de asma son desencadenadas principalmente por infecciones virales o alérgenos, por lo que los antibióticos no están indicados a menos que haya sospecha clara de neumonía bacteriana concomitante.",
          tema: "Neumología",
          fuente: "Harrison Principios de Medicina Interna, 21.ª Edición - Capítulo 281 (Asma Bronquial)"
        },
        {
          texto: "¿Qué escala pronóstica se utiliza de elección para evaluar la gravedad en pancreatitis aguda en las primeras 48 horas?",
          opciones: JSON.stringify([
            "Criterios de Ranson",
            "Escala de Alvarado",
            "Escala de Hinchey",
            "Clasificación de Forrest"
          ]),
          correcta: 0,
          explicacion: "🔬 JUSTIFICACIÓN (Por qué SÍ):\nLos criterios de Ranson constituyen la herramienta de predicción de severidad y mortalidad más tradicional y validada en pancreatitis aguda, evaluando 5 criterios al momento del ingreso y 6 criterios adicionales a las 48 horas de evolución clínica.\n\n🚫 DESCARTE (Por qué NO):\n• Escala de Alvarado: Se utiliza clínicamente para el diagnóstico de apendicitis aguda en urgencias.\n• Escala de Hinchey: Clasifica la severidad quirúrgica y anatómica de la diverticulitis del colon izquierdo.\n• Clasificación de Forrest: Categoriza las úlceras pépticas sangrantes por endoscopía para valorar el riesgo de resangrado inmediato.",
          tema: "Gastroenterología",
          fuente: "Harrison Principios de Medicina Interna, 21.ª Edición - Capítulo 341 (Pancreatitis Aguda y Crónica)"
        },
        {
          texto: "¿Cuál es la causa más común de Lesión Renal Aguda intrínseca en pacientes hospitalizados?",
          opciones: JSON.stringify([
            "Necrosis Tubular Aguda (NTA)",
            "Glomerulonefritis postinfecciosa",
            "Nefritis tubulointersticial aguda",
            "Estenosis bilateral de la arteria renal"
          ]),
          correcta: 0,
          explicacion: "🔬 JUSTIFICACIÓN (Por qué SÍ):\nLa Necrosis Tubular Aguda (NTA) isquémica o nefrotóxica es la causa responsable de más del 80-85% de los casos de lesión renal aguda (LRA) de origen intrínseco (parenquimatoso) detectados en el entorno intrahospitalario, típicamente secundaria a sepsis grave, hipotensión prolongada o fármacos nefrotóxicos.\n\n🚫 DESCARTE (Por qué NO):\n• Glomerulonefritis postinfecciosa: Es una patología glomerular mediada por complejos inmunes que afecta predominantemente a niños tras infecciones estreptocócicas.\n• Nefritis tubulointersticial aguda: Es una reacción inflamatoria/inmune intersticial, comúnmente de origen alérgico por medicamentos (AINEs, antibióticos), mucho menos frecuente.\n• Estenosis de la arteria renal: Causa LRA de tipo prerrenal crónico o nefroangioesclerosis renal, no intrínseca aguda común.",
          tema: "Nefrología y Urología",
          fuente: "Harrison Principios de Medicina Interna, 21.ª Edición - Capítulo 304 (Lesión Renal Aguda)"
        },
        {
          texto: "¿Cuál es la ventana terapéutica máxima recomendada para realizar trombólisis con rtPA en Ictus Isquémico Agudo?",
          opciones: JSON.stringify([
            "Hasta 4.5 horas desde el inicio de los síntomas",
            "Hasta 12 horas desde el inicio de los síntomas",
            "Hasta 24 horas únicamente con RM normal",
            "No existe ventana límite de tiempo"
          ]),
          correcta: 0,
          explicacion: "🔬 JUSTIFICACIÓN (Por qué SÍ):\nLa administración intravenosa del activador tisular del plasminógeno recombinante (rtPA) tiene un beneficio clínico y de supervivencia demostrado y recomendado únicamente dentro de las primeras 4.5 horas desde el inicio exacto de los síntomas neurológicos deficitarios en pacientes con ictus isquémico agudo.\n\n🚫 DESCARTE (Por qué NO):\n• Hasta 12 horas: Excede el tiempo seguro de reperfusión por rtPA intravenoso debido a un incremento exponencial del riesgo de transformación hemorrágica del infarto.\n• Hasta 24 horas: Es una ventana considerada únicamente para la trombectomía mecánica endovascular en oclusiones de grandes vasos con viabilidad de tejido demostrada por perfusión en centros avanzados, no para rtPA IV.\n• Sin límite de tiempo: Es totalmente incorrecto; el cerebro es extremadamente sensible a la isquemia (tiempo es cerebro) y el tratamiento de reperfusión debe ser inmediato.",
          tema: "Neurología",
          fuente: "Harrison Principios de Medicina Interna, 21.ª Edición - Capítulo 420 (Enfermedades Cerebrovasculares)"
        },
        {
          texto: "¿Cuál es el tratamiento empírico de elección para un paciente adulto con Cólera grave?",
          opciones: JSON.stringify([
            "Doxiciclina a dosis única + Hidratación agresiva",
            "Penicilina G benzatínica intramuscular",
            "Amoxicilina oral por 7 días",
            "Ceftriaxona intravenosa por 10 días"
          ]),
          correcta: 0,
          explicacion: "🔬 JUSTIFICACIÓN (Por qué SÍ):\nLa Doxiciclina a dosis única (300 mg por vía oral) es el antimicrobiano de elección recomendado por la OMS para el cólera grave en adultos, ya que reduce el volumen de evacuaciones, disminuye los requerimientos de líquidos y acorta el periodo de excreción bacteriana, sumado siempre a la fluidoterapia enérgica.\n\n🚫 DESCARTE (Por qué NO):\n• Penicilina G benzatínica: No tiene ninguna efectividad frente al Vibrio cholerae (bacilo Gram negativo facultativo anaerobio).\n• Amoxicilina oral: Tiene altas tasas de resistencia bacteriana global y prolongar el tratamiento no aporta beneficio clínico demostrado frente a dosis única de tetraciclina.\n• Ceftriaxona IV: No es la terapia empírica de primera línea y su uso innecesario promueve resistencia y encarece la terapia en brotes masivos.",
          tema: "Infectología",
          fuente: "Harrison Principios de Medicina Interna, 21.ª Edición - Capítulo 160 (Cólera y otras Infecciones por Vibrio)"
        },
        {
          texto: "¿Cuál es la complicación neurovascular más común de la luxación posterior de rodilla?",
          opciones: JSON.stringify([
            "Lesión de la arteria poplítea y del nervio peroneo",
            "Lesión del nervio femoral",
            "Trombosis venosa profunda inmediata",
            "Sección del tendón rotuliano"
          ]),
          correcta: 0,
          explicacion: "🔬 JUSTIFICACIÓN (Por qué SÍ):\nDebido a la relación anatómica tan estrecha del fémur y la tibia a nivel de la fosa poplítea, la luxación posterior de rodilla causa con gran frecuencia el cizallamiento o desgarro de la arteria poplítea (en hasta un 30-40% de casos) y el estiramiento o tracción del nervio peroneo común (peroneo lateral externo), lo que exige valoración inmediata por doppler y exploración vascular.\n\n🚫 DESCARTE (Por qué NO):\n• Lesión del nervio femoral: Pasa muy por delante a nivel inguinal y el muslo anterior, por lo que no es expuesto a traumatismos en el hueco poplíteo.\n• Trombosis venosa profunda inmediata: Es una complicación tardía o subaguda por estasis e inmovilización, no una complicación mecánica aguda/neurovascular directa del desgarro.\n• Sección del tendón rotuliano: Es una lesión puramente tendinosa del aparato extensor anterior, no un componente neurovascular comprometido por el desplazamiento óseo posterior.",
          tema: "Traumatología y Ortopedia",
          fuente: "Campbell Cirugía Ortopédica, 14.ª Edición - Capítulo 43 (Luxaciones Traumáticas de la Rodilla)"
        },
        {
          texto: "¿Cuál es el tratamiento de primera elección para el trastorno afectivo bipolar en fase de mantenimiento?",
          opciones: JSON.stringify([
            "Carbonato de Litio",
            "Fluoxetina",
            "Haloperidol",
            "Diazepam"
          ]),
          correcta: 0,
          explicacion: "🔬 JUSTIFICACIÓN (Por qué SÍ):\nEl Carbonato de Litio sigue siendo el estabilizador del estado de ánimo estándar de oro a nivel mundial para el trastorno afectivo bipolar en fase de mantenimiento. Ha demostrado de manera contundente prevenir tanto las recaídas maníacas como las depresivas, y es el único fármaco psiquiátrico con un efecto anti-suicida estadísticamente demostrado.\n\n🚫 DESCARTE (Por qué NO):\n• Fluoxetina: Es un antidepresivo inhibidor selectivo de la recaptación de serotonina (ISRS) que, si se administra como monoterapia en el trastorno bipolar, puede inducir un viraje maníaco severo peligroso.\n• Haloperidol: Es un antipsicótico típico de primera generación excelente para las fases de manía psicótica aguda, pero no está indicado como tratamiento de mantenimiento primario de rutina por sus efectos extrapiramidales.\n• Diazepam: Es una benzodiazepina con propiedades ansiolíticas y sedantes útiles en las crisis agudas de agitación, pero carece de propiedades estabilizadoras del ánimo a largo plazo.",
          tema: "Psiquiatría",
          fuente: "Kaplan & Sadock Sinopsis de Psiquiatría, 12.ª Edición - Capítulo 13 (Trastornos del Estado de Ánimo)"
        },
        {
          texto: "¿Cómo se define la Sensibilidad de una prueba diagnóstica?",
          opciones: JSON.stringify([
            "La probabilidad de que resulte positiva en un paciente enfermo",
            "La probabilidad de que resulte negativa en un paciente sano",
            "La proporción de verdaderos negativos del test",
            "El valor predictivo positivo ajustado a prevalencia"
          ]),
          correcta: 0,
          explicacion: "🔬 JUSTIFICACIÓN (Por qué SÍ):\nLa sensibilidad es la capacidad intrínseca de una prueba diagnóstica para identificar correctamente a los individuos enfermos. Matemáticamente es la probabilidad condicionada de obtener un resultado positivo en la prueba diagnóstica dado que el sujeto de estudio está realmente enfermo (Verdaderos Positivos / Total de Enfermos).\n\n🚫 DESCARTE (Por qué NO):\n• Probabilidad de que resulte negativa en sanos: Corresponde a la definición de la Especificidad diagnóstica (Verdaderos Negativos / Total de Sanos).\n• Proporción de verdaderos negativos: Es el número crudo de pacientes sanos detectados correctamente, no una tasa probabilística condicionada.\n• Valor predictivo positivo: Es la probabilidad de que un paciente esté realmente enfermo si el test resultó positivo, el cual depende directamente de la prevalencia de la enfermedad.",
          tema: "Salud Pública y Epidemiología",
          fuente: "Argimon Pallás, Métodos de Investigación Clínica, 5.ª Edición - Capítulo 28 (Pruebas Diagnósticas)"
        }
      ];

      for (const p of iniciales) {
        // Mapear taxonomía médica inteligente en base al tema o pregunta
        let subtema = "Generalidades";
        let microtema = "Conceptos Clave";
        let tags = p.tema + ",ENURM";
        let difficulty = 0.5;

        const textoLower = p.texto.toLowerCase();
        if (textoLower.includes("kawasaki")) {
          subtema = "Cardiología Pediátrica";
          microtema = "Enfermedad de Kawasaki";
          tags = "Pediatría,Kawasaki,Coronarias";
          difficulty = 0.6;
        } else if (textoLower.includes("bronquiolitis")) {
          subtema = "Neumología Pediátrica";
          microtema = "Bronquiolitis Aguda";
          tags = "Pediatría,VSR,Lactante";
          difficulty = 0.4;
        } else if (textoLower.includes("crup") || textoLower.includes("laringotraqueitis")) {
          subtema = "Laringología Pediátrica";
          microtema = "Laringotraqueitis Aguda";
          tags = "Pediatría,Crup,Virus";
          difficulty = 0.5;
        } else if (textoLower.includes("ectópico")) {
          subtema = "Obstetricia Patológica";
          microtema = "Embarazo Ectópico";
          tags = "Ginecología,Obstetricia,Ectópico,Urgencia";
          difficulty = 0.65;
        } else if (textoLower.includes("preeclampsia")) {
          subtema = "Estados Hipertensivos del Embarazo";
          microtema = "Preeclampsia Grave";
          tags = "Ginecología,Obstetricia,Hipertensión,Preeclampsia";
          difficulty = 0.7;
        } else if (textoLower.includes("apendicitis") || textoLower.includes("alvarado")) {
          subtema = "Abdomen Agudo";
          microtema = "Apendicitis Aguda";
          tags = "Cirugía,Apendicitis,Alvarado";
          difficulty = 0.35;
        } else if (textoLower.includes("charcot") || textoLower.includes("colangitis")) {
          subtema = "Patología Biliar";
          microtema = "Colangitis Aguda";
          tags = "Cirugía,Colangitis,Charcot,Sepsis";
          difficulty = 0.75;
        } else if (textoLower.includes("cetoacidosis") || textoLower.includes("cad")) {
          subtema = "Endocrinología";
          microtema = "Cetoacidosis Diabética";
          tags = "Medicina Interna,Diabetes,Cetoacidosis,Urgencia";
          difficulty = 0.6;
        } else if (textoLower.includes("neumonía")) {
          subtema = "Infectología Pulmonar";
          microtema = "Neumonía Adquirida en la Comunidad";
          tags = "Medicina Interna,Neumonía,Neumococo";
          difficulty = 0.45;
        } else if (textoLower.includes("glutamato")) {
          subtema = "Neurofisiología";
          microtema = "Neurotransmisores";
          tags = "Básicas,Fisiología,Glutamato,Sinapsis";
          difficulty = 0.5;
        } else if (textoLower.includes("taponamiento")) {
          subtema = "Cardiología de Urgencia";
          microtema = "Taponamiento Cardíaco";
          tags = "Cardiología,Taponamiento,Pericardio";
          difficulty = 0.65;
        } else if (textoLower.includes("asma")) {
          subtema = "Enfermedades Obstructivas";
          microtema = "Crisis Asmática";
          tags = "Neumología,Asma,Salbutamol";
          difficulty = 0.4;
        } else if (textoLower.includes("pancreatitis")) {
          subtema = "Gastroenterología Aguda";
          microtema = "Pancreatitis Aguda";
          tags = "Gastroenterología,Pancreatitis,Ranson";
          difficulty = 0.6;
        } else if (textoLower.includes("lesión renal") || textoLower.includes("nta")) {
          subtema = "Nefrología Clínica";
          microtema = "Necrosis Tubular Aguda";
          tags = "Nefrología,LRA,NTA,Riñón";
          difficulty = 0.7;
        } else if (textoLower.includes("ictus") || textoLower.includes("trombólisis")) {
          subtema = "Neurología Vascular";
          microtema = "Ictus Isquémico Agudo";
          tags = "Neurología,Ictus,rtPA,Urgencia";
          difficulty = 0.75;
        } else if (textoLower.includes("cólera")) {
          subtema = "Infectología Gastrointestinal";
          microtema = "Cólera Grave";
          tags = "Infectología,Cólera,Doxiciclina";
          difficulty = 0.5;
        } else if (textoLower.includes("luxación") || textoLower.includes("poplítea")) {
          subtema = "Ortopedia y Trauma";
          microtema = "Luxación Posterior de Rodilla";
          tags = "Traumatología,Rodilla,Poplítea";
          difficulty = 0.7;
        } else if (textoLower.includes("bipolar") || textoLower.includes("litio")) {
          subtema = "Psiquiatría Clínica";
          microtema = "Trastorno Afectivo Bipolar";
          tags = "Psiquiatría,Bipolar,Litio";
          difficulty = 0.55;
        } else if (textoLower.includes("sensibilidad")) {
          subtema = "Epidemiología Clínica";
          microtema = "Sensibilidad y Especificidad";
          tags = "Salud Pública,Epidemiología,Diagnóstico";
          difficulty = 0.5;
        }

        let explicacionCorrecta = "";
        let explicacionIncorrecta = "";
        
        if (p.explicacion) {
          const partes = p.explicacion.split("🚫 DESCARTE (Por qué NO):");
          if (partes.length > 1) {
            explicacionCorrecta = partes[0].replace("🔬 JUSTIFICACIÓN (Por qué SÍ):\n", "").trim();
            explicacionIncorrecta = partes[1].trim();
          } else {
            explicacionCorrecta = p.explicacion;
            explicacionIncorrecta = "No disponible.";
          }
        }

        let anoExamen = 2024;
        const fuenteStr = p.fuente || "ENURM 2024";
        const matchAno = fuenteStr.match(/\d{4}/);
        if (matchAno) {
          anoExamen = parseInt(matchAno[0]);
        }

        await db.run(
          `INSERT INTO preguntas (texto, opciones, correcta, explicacion, tema, subtema, microtema, tags, difficulty, fuente, especialidad, ano_examen, explicacion_correcta, explicacion_incorrecta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [p.texto, p.opciones, p.correcta, p.explicacion, p.tema, subtema, microtema, tags, difficulty, fuenteStr, p.tema, anoExamen, explicacionCorrecta, explicacionIncorrecta]
        );
      }
    }

    // 🧠 INYECCIÓN SEGURA DEL EXAMEN ENURM 2025 A (Fase 4 - Producción Persistente)
    const fs = require("fs");
    const total2025 = await db.get(`SELECT COUNT(*) as total FROM preguntas WHERE ano_examen = 2025`);
    if (total2025 && total2025.total === 0) {
      const jsonPath = path.join(__dirname, "preguntas_enurm_2025.json");
      if (fs.existsSync(jsonPath)) {
        console.log("📂 Detectado preguntas_enurm_2025.json. Sembrando en base de datos de producción...");
        const rawJson = fs.readFileSync(jsonPath, "utf-8");
        const preguntas2025 = JSON.parse(rawJson);
        
        for (const p of preguntas2025) {
          const subtema = "Evaluación Oficial";
          const microtema = "Bloque de Reactivos";
          const tags = `${p.tema},ENURM,2025`;
          const difficulty = 0.5;
          
          await db.run(
            `INSERT INTO preguntas (texto, opciones, correcta, explicacion, tema, subtema, microtema, tags, difficulty, fuente, especialidad, ano_examen, explicacion_correcta, explicacion_incorrecta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [p.texto, p.opciones, p.correcta, p.explicacion, p.tema, subtema, microtema, tags, difficulty, p.fuente, p.especialidad, p.ano_examen, p.explicacion_correcta, p.explicacion_incorrecta]
          );
        }
        console.log(`✅ ¡Éxito! Se inyectaron ${preguntas2025.length} preguntas oficiales del ENURM 2025 en producción.`);
      }
    }

    // 📊 AUTO-ENLACE Y MIGRACIÓN DE EXÁMENES (Fase 3 - Etapa 1)
    try {
      // 1. Obtener todos los años únicos presentes en preguntas
      const anosExistentes = await db.all(`SELECT DISTINCT ano_examen FROM preguntas WHERE ano_examen IS NOT NULL`);
      
      await db.run("BEGIN TRANSACTION");
      
      try {
        for (const { ano_examen } of anosExistentes) {
          const nombreExamen = `ENURM ${ano_examen}`;
          
          // Insertar el examen si no existe
          await db.run(
            `INSERT OR IGNORE INTO examenes (nombre, ano, activo) VALUES (?, ?, 1)`,
            [nombreExamen, ano_examen]
          );
          
          // Obtener el id del examen recién insertado o existente
          const examenObj = await db.get(`SELECT id FROM examenes WHERE ano = ?`, [ano_examen]);
          if (examenObj) {
            // Actualizar preguntas que correspondan a este año y que no tengan examen_id asignado
            await db.run(
              `UPDATE preguntas SET examen_id = ? WHERE ano_examen = ? AND examen_id IS NULL`,
              [examenObj.id, ano_examen]
            );
          }
        }
        
        // 2. Recalcular cantidad de preguntas activas por examen
        const todosExamenes = await db.all(`SELECT id FROM examenes`);
        for (const ex of todosExamenes) {
          const countRow = await db.get(
            `SELECT COUNT(*) as total FROM preguntas WHERE examen_id = ? AND (activo = 1 OR activo IS NULL)`,
            [ex.id]
          );
          const cantidad = countRow ? countRow.total : 0;
          await db.run(`UPDATE examenes SET cantidad_preguntas = ? WHERE id = ?`, [cantidad, ex.id]);
        }
        
        await db.run("COMMIT");
        console.log("✅ Auto-enlace y conteo de exámenes completado de forma retrocompatible.");
      } catch (transactionError) {
        await db.run("ROLLBACK");
        throw transactionError;
      }
    } catch (errExamenes) {
      console.error("Error al auto-enlazar preguntas con exámenes:", errExamenes);
    }
  } catch (err) {
    console.error("Error al inyectar banco inicial o ENURM 2025:", err);
  }
}

/* ==========================================================================
   RUTAS DE ADMINISTRACIÓN PROTEGIDAS (REVISIÓN DE IDENTIDAD REAL)
   ========================================================================== */

// 1. Guardar una sola pregunta de forma segura (Soporte FASE 3)

module.exports = {
  conectarBaseDeDatos,
  getDB,
  ADMIN_EMAIL
};
