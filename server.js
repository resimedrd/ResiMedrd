const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const jwt = require("jsonwebtoken");
const os = require("os");

const JWT_SECRET = "resiMed_secret_key_ultra_premium_amboss";

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "resimed.db");

// 🔑 CORREO MAESTRO: Administrador principal
const ADMIN_EMAIL = "frank@resimed.com";

app.use(cors());
app.use(express.json({ limit: "50mb" })); // Aumentamos el límite para soportar textos largos de preguntas
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Interceptor robusto de errores de parsing de JSON (SyntaxError)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error("❌ ERROR CRÍTICO DE PARSING DE JSON EN EL SERVIDOR:");
    console.error("Mensaje:", err.message);
    console.error("Cuerpo que causó la falla:", err.body);
    return res.status(400).json({ 
      error: "JSON Inválido enviado por el cliente.", 
      detalle: err.message,
      cuerpoRecibido: err.body 
    });
  }
  next();
});

app.use(express.static(__dirname));

let db = null;

// Inicialización de la Base de Datos
async function iniciarBaseDeDatos() {
  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  // 1. Tabla de Usuarios
  await db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol TEXT DEFAULT 'usuario'
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

  // Migraciones retrocompatibles para la tabla usuarios
  const columnasUsuarios = [
    { nombre: "xp", definicion: "INTEGER DEFAULT 0" },
    { nombre: "streak", definicion: "INTEGER DEFAULT 0" },
    { nombre: "nivel", definicion: "INTEGER DEFAULT 1" },
    { nombre: "meta_semanal", definicion: "INTEGER DEFAULT 50" },
    { nombre: "last_active_date", definicion: "TEXT" },
    { nombre: "especialidad_aspirada", definicion: "TEXT DEFAULT 'Ninguna'" }
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
    { nombre: "discrimination_index", definicion: "REAL DEFAULT 0.0" }
  ];

  for (const col of columnasPreguntas) {
    try {
      await db.exec(`ALTER TABLE preguntas ADD COLUMN ${col.nombre} ${col.definicion}`);
    } catch (e) {
      // Ignorar si la columna ya existe
    }
  }

  // Cargar banco inicial premium de 14 especialidades si está vacío o con explicaciones antiguas
  try {
    let totalPreguntas = await db.get(`SELECT COUNT(*) as total FROM preguntas`);
    
    // Si existen preguntas iniciales pero tienen explicaciones antiguas sin justificación o fuentes desactualizadas, forzamos su actualización premium
    if (totalPreguntas && totalPreguntas.total > 0) {
      const primeraP = await db.get(`SELECT explicacion, fuente FROM preguntas ORDER BY id LIMIT 1`);
      if (primeraP && (!primeraP.explicacion || !primeraP.explicacion.includes("JUSTIFICACIÓN") || primeraP.fuente === 'ENURM 2024')) {
        console.log("Detectadas explicaciones o fuentes antiguas. Limpiando banco base para re-siembra premium...");
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

        await db.run(
          `INSERT INTO preguntas (texto, opciones, correcta, explicacion, tema, subtema, microtema, tags, difficulty, fuente) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [p.texto, p.opciones, p.correcta, p.explicacion, p.tema, subtema, microtema, tags, difficulty, p.fuente || "ENURM 2024"]
        );
      }
    }
  } catch (err) {
    console.error("Error al inyectar banco inicial:", err);
  }
}

/* ==========================================================================
   RUTAS DE ADMINISTRACIÓN PROTEGIDAS (REVISIÓN DE IDENTIDAD REAL)
   ========================================================================== */

// 1. Guardar una sola pregunta de forma segura
app.post("/api/preguntas", async (req, res) => {
  try {
    const { texto, opciones, correcta, tema, explicacion, fuente, usuarioId } = req.body;

    // REVISIÓN INTEGRAL: En vez de creerle al texto "admin", le preguntamos directamente 
    // a la base de datos quién es este usuario usando su ID único de cuenta.
    if (!usuarioId) {
      return res.status(401).json({ error: "No tienes permiso. Inicia sesión nuevamente." });
    }

    const usuarioReal = await db.get(`SELECT rol FROM usuarios WHERE id = ?`, [usuarioId]);
    
    if (!usuarioReal || usuarioReal.rol !== "admin") {
      return res.status(403).json({ error: "Acceso denegado. No eres administrador." });
    }

    // Si la base de datos confirma que sí es administrador, guardamos la pregunta con su fuente
    const opcionesJSON = JSON.stringify(opciones);
    await db.run(
      `INSERT INTO preguntas (texto, opciones, correcta, tema, explicacion, fuente) VALUES (?, ?, ?, ?, ?, ?)`,
      [texto, opcionesJSON, correcta, tema, explicacion, fuente || "ENURM Referencia Académica Oficial"]
    );

    res.status(201).json({ mensaje: "Pregunta guardada con éxito por el administrador." });
  } catch (error) {
    res.status(500).json({ error: "Error al guardar la pregunta." });
  }
});

// 2. Cargar muchas preguntas en bloque de forma segura
app.post("/api/admin/cargar-masivo", async (req, res) => {
  try {
    const { preguntas, usuarioId } = req.body;

    // Volvemos a preguntar a la base de datos si el ID realmente es un administrador
    if (!usuarioId) {
      return res.status(401).json({ error: "No tienes permiso. Inicia sesión nuevamente." });
    }

    const usuarioReal = await db.get(`SELECT rol FROM usuarios WHERE id = ?`, [usuarioId]);
    
    if (!usuarioReal || usuarioReal.rol !== "admin") {
      return res.status(403).json({ error: "Acceso denegado. No eres administrador." });
    }

    if (!Array.isArray(preguntas)) {
      return res.status(400).json({ error: "El formato de los datos no es correcto." });
    }

    // Si todo está bien, guardamos el bloque completo de preguntas con sus respectivas fuentes
    for (const p of preguntas) {
      const opcionesJSON = JSON.stringify(p.opciones);
      await db.run(
        `INSERT INTO preguntas (texto, opciones, correcta, tema, explicacion, fuente) VALUES (?, ?, ?, ?, ?, ?)`,
        [p.texto, opcionesJSON, p.correcta, p.tema, p.explicacion, p.fuente || "ENURM Referencia Académica Oficial"]
      );
    }

    res.status(200).json({ mensaje: `¡Éxito! Se cargaron ${preguntas.length} preguntas correctamente.` });
  } catch (error) {
    res.status(500).json({ error: "Error en la carga masiva." });
  }
});

/* ==========================================================================
   RUTAS DE AUTENTICACIÓN (LOGIN Y REGISTRO ENCRIPTADOS CON JWT Y GAMIFICACIÓN)
   ========================================================================== */

function autenticarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Acceso denegado. Token no proporcionado." });
  }

  jwt.verify(token, JWT_SECRET, (err, usuario) => {
    if (err) {
      return res.status(403).json({ error: "Sesión inválida o expirada. Inicia sesión nuevamente." });
    }
    req.usuario = usuario;
    next();
  });
}

app.post("/api/auth/registro", async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) return res.status(400).json({ error: "Campos obligatorios." });

    // Encriptar contraseña
    const saltRounds = 10;
    const passwordEncriptada = await bcrypt.hash(password, saltRounds);

    const rol = (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) ? "admin" : "usuario";

    // Guardar usuario inicializado en la base de datos
    const resultado = await db.run(
      `INSERT INTO usuarios (nombre, email, password, rol, xp, streak, nivel, meta_semanal) VALUES (?, ?, ?, ?, 0, 0, 1, 50)`,
      [nombre, email.toLowerCase(), passwordEncriptada, rol]
    );

    const id = resultado.lastID;
    const token = jwt.sign({ id, email: email.toLowerCase(), rol }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({ 
      mensaje: "Usuario registrado con éxito.", 
      token,
      usuario: { id, nombre, email, rol, xp: 0, streak: 0, nivel: 1, meta_semanal: 50, especialidad_aspirada: "Ninguna" } 
    });
  } catch (error) {
    console.error("❌ ERROR DETALLADO EN REGISTRO EN EL SERVIDOR:", error);
    if (error.message && error.message.includes("UNIQUE")) return res.status(400).json({ error: "El correo ya existe." });
    res.status(500).json({ error: `Error en el registro: ${error.message || error}` });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Buscar al usuario
    const usuario = await db.get(`SELECT * FROM usuarios WHERE email = ?`, [email.toLowerCase()]);
    if (!usuario) return res.status(401).json({ error: "Credenciales incorrectas." });

    // Verificar contraseña
    const passwordCorrecta = await bcrypt.compare(password, usuario.password);
    if (!passwordCorrecta) return res.status(401).json({ error: "Credenciales incorrectas." });

    const token = jwt.sign({ id: usuario.id, email: usuario.email, rol: usuario.rol }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ 
      token,
      usuario: { 
        id: usuario.id, 
        nombre: usuario.nombre, 
        email: usuario.email, 
        rol: usuario.rol,
        xp: usuario.xp || 0,
        streak: usuario.streak || 0,
        nivel: usuario.nivel || 1,
        meta_semanal: usuario.meta_semanal || 50,
        especialidad_aspirada: usuario.especialidad_aspirada || "Ninguna"
      } 
    });
  } catch (error) {
    console.error("❌ ERROR DETALLADO EN LOGIN EN EL SERVIDOR:", error);
    res.status(500).json({ error: `Error en el servidor: ${error.message || error}` });
  }
});

app.put("/api/usuario/actualizar", autenticarToken, async (req, res) => {
  try {
    const { nombre, especialidadAspirada, metaSemanal } = req.body;
    const usuarioId = req.usuario.id;

    if (!nombre || !especialidadAspirada || metaSemanal === undefined) {
      return res.status(400).json({ error: "Faltan campos requeridos." });
    }

    const meta = parseInt(metaSemanal) || 50;

    await db.run(
      `UPDATE usuarios SET nombre = ?, especialidad_aspirada = ?, meta_semanal = ? WHERE id = ?`,
      [nombre, especialidadAspirada, meta, usuarioId]
    );

    // Obtener los datos actualizados del usuario
    const usuarioActualizado = await db.get(
      `SELECT id, nombre, email, rol, xp, streak, nivel, meta_semanal, especialidad_aspirada FROM usuarios WHERE id = ?`,
      [usuarioId]
    );

    res.json({
      mensaje: "Perfil actualizado con éxito.",
      usuario: {
        id: usuarioActualizado.id,
        nombre: usuarioActualizado.nombre,
        email: usuarioActualizado.email,
        rol: usuarioActualizado.rol,
        xp: usuarioActualizado.xp || 0,
        streak: usuarioActualizado.streak || 0,
        nivel: usuarioActualizado.nivel || 1,
        meta_semanal: usuarioActualizado.meta_semanal || 50,
        especialidad_aspirada: usuarioActualizado.especialidad_aspirada || "Ninguna"
      }
    });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).json({ error: "Error interno del servidor al actualizar perfil." });
  }
});

/* ==========================================================================
   RUTAS DE FUNCIONAMIENTO DE SIMULACROS
   ========================================================================== */
app.get("/api/preguntas", async (req, res) => {
  try {
    const { tema, limite } = req.query;
    const maxPreguntas = parseInt(limite) || 10;
    let filas;
    if (!tema || tema.trim().toLowerCase() === "todos") {
      filas = await db.all(`SELECT * FROM preguntas ORDER BY RANDOM() LIMIT ?`, [maxPreguntas]);
    } else {
      filas = await db.all(`SELECT * FROM preguntas WHERE LOWER(TRIM(tema)) = LOWER(?) ORDER BY RANDOM() LIMIT ?`, [tema.trim(), maxPreguntas]);
    }
    res.json(filas);
  } catch (error) {
    res.status(500).json({ error: "Error al extraer preguntas." });
  }
});

app.get("/api/preguntas/mapeo-temas", autenticarToken, async (req, res) => {
  try {
    const filas = await db.all(`SELECT id, texto, tema, subtema FROM preguntas`);
    const mapeo = {};
    filas.forEach(f => {
      const data = { tema: f.tema, subtema: f.subtema };
      mapeo[f.id] = data;
      mapeo[f.texto] = data; // También mapeamos por texto para sesiones antiguas que no tengan ID
    });
    res.json(mapeo);
  } catch (error) {
    res.status(500).json({ error: "Error al mapear preguntas." });
  }
});

app.get("/api/temas", async (req, res) => {
  try {
    const filas = await db.all(`SELECT tema, COUNT(*) as total FROM preguntas GROUP BY tema ORDER BY tema ASC`);
    res.json(filas);
  } catch (error) {
    res.status(500).json({ error: "Error al mapear especialidades." });
  }
});

app.post("/api/sesiones", autenticarToken, async (req, res) => {
  try {
    const { usuarioId, tema, modo, cantidadPreguntas, correctas, porcentaje, detalle } = req.body;
    
    if (parseInt(usuarioId) !== req.usuario.id) {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }

    await db.run(
      `INSERT INTO sesiones (usuario_id, tema, modo, cantidad_preguntas, correctas, porcentaje, detalle) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId, tema, modo, cantidadPreguntas, correctas, porcentaje, detalle]
    );

    // Calcular XP: 10 XP por acierto + 30 XP por completar simulacro
    const xpGanado = (correctas * 10) + 30 + (porcentaje === 100 ? 50 : 0);

    const usuario = await db.get(`SELECT xp, streak, nivel, last_active_date FROM usuarios WHERE id = ?`, [usuarioId]);
    let nuevoXp = xpGanado;
    let nuevoNivel = 1;
    let nuevoStreak = 0;
    
    if (usuario) {
      nuevoXp = (usuario.xp || 0) + xpGanado;
      nuevoNivel = Math.floor(nuevoXp / 1000) + 1;
      nuevoStreak = usuario.streak || 0;
      
      const hoy = new Date().toISOString().split("T")[0];
      if (!usuario.last_active_date) {
        nuevoStreak = 1;
      } else {
        const ayerDate = new Date();
        ayerDate.setDate(ayerDate.getDate() - 1);
        const ayer = ayerDate.toISOString().split("T")[0];
        
        if (usuario.last_active_date === ayer) {
          nuevoStreak += 1;
        } else if (usuario.last_active_date !== hoy) {
          nuevoStreak = 1;
        }
      }
      
      await db.run(
        `UPDATE usuarios SET xp = ?, nivel = ?, streak = ?, last_active_date = ? WHERE id = ?`,
        [nuevoXp, nuevoNivel, nuevoStreak, hoy, usuarioId]
      );
    }

    res.status(201).json({ 
      mensaje: "Examen guardado con éxito.", 
      xpGanado,
      usuarioActualizado: {
        xp: nuevoXp,
        nivel: nuevoNivel,
        streak: nuevoStreak
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Error al guardar historial." });
  }
});

app.get("/api/sesiones", autenticarToken, async (req, res) => {
  try {
    const { usuarioId } = req.query;
    if (parseInt(usuarioId) !== req.usuario.id) {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }
    const filas = await db.all(`SELECT * FROM sesiones WHERE usuario_id = ? ORDER BY fecha DESC LIMIT 5`, [usuarioId]);
    res.json(filas);
  } catch (error) {
    res.status(500).json({ error: "Error al leer historial." });
  }
});

app.get("/api/historial", autenticarToken, async (req, res) => {
  try {
    const { usuarioId } = req.query;
    if (!usuarioId) {
      return res.status(400).json({ error: "Falta el ID de usuario." });
    }
    if (parseInt(usuarioId) !== req.usuario.id) {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }
    const filas = await db.all(`SELECT * FROM sesiones WHERE usuario_id = ? ORDER BY fecha DESC`, [usuarioId]);
    res.json(filas);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener historial completo." });
  }
});

app.get("/api/dashboard/resumen", autenticarToken, async (req, res) => {
  try {
    const { usuarioId } = req.query;
    if (parseInt(usuarioId) !== req.usuario.id) {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }
    const totalSesionesRow = await db.get(`SELECT COUNT(*) AS total FROM sesiones WHERE usuario_id = ?`, [usuarioId]);
    const promedioRow = await db.get(`SELECT ROUND(AVG(porcentaje), 0) AS promedio FROM sesiones WHERE usuario_id = ?`, [usuarioId]);
    const mejorRow = await db.get(`SELECT MAX(porcentaje) AS mejor FROM sesiones WHERE usuario_id = ?`, [usuarioId]);
    const totalRespondidasRow = await db.get(`SELECT SUM(cantidad_preguntas) AS total FROM sesiones WHERE usuario_id = ?`, [usuarioId]);

    // Obtener datos de gamificación
    const userRow = await db.get(`SELECT xp, streak, nivel, meta_semanal FROM usuarios WHERE id = ?`, [usuarioId]);

    res.json({
      totalSesiones: totalSesionesRow?.total || 0,
      promedioGeneral: promedioRow?.promedio || 0,
      mejorPorcentaje: mejorRow?.mejor || 0,
      totalPreguntasRespondidas: totalRespondidasRow?.total || 0,
      xp: userRow?.xp || 0,
      streak: userRow?.streak || 0,
      nivel: userRow?.nivel || 1,
      metaSemanal: userRow?.meta_semanal || 50
    });
  } catch (error) {
    res.status(500).json({ error: "Error estadístico." });
  }
});

app.get("/api/dashboard/cobertura", autenticarToken, async (req, res) => {
  try {
    const { usuarioId } = req.query;
    if (!usuarioId) {
      return res.status(400).json({ error: "Falta el ID de usuario." });
    }
    if (parseInt(usuarioId) !== req.usuario.id) {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }

    // 1. Obtener todas las especialidades y su total absoluto en el banco
    const especialidadesBanco = await db.all(
      `SELECT tema, COUNT(*) as total FROM preguntas GROUP BY tema`
    );

    // 2. Obtener todas las sesiones de este usuario para calcular cobertura
    const sesiones = await db.all(
      `SELECT tema, cantidad_preguntas, detalle FROM sesiones WHERE usuario_id = ?`,
      [usuarioId]
    );

    // Mapa para acumular preguntas únicas vistas (por su texto) por especialidad (clave insensible)
    const preguntasVistasPorTema = {};
    // Acumulador de cantidad para sesiones antiguas sin detalle (clave insensible)
    const cantAntiguasPorTema = {};

    especialidadesBanco.forEach(esp => {
      const key = esp.tema.trim().toLowerCase();
      preguntasVistasPorTema[key] = new Set();
      cantAntiguasPorTema[key] = 0;
    });

    sesiones.forEach(s => {
      const tema = s.tema;
      if (s.detalle) {
        try {
          const preguntas = JSON.parse(s.detalle);
          if (Array.isArray(preguntas)) {
            preguntas.forEach(p => {
              const temaPregunta = p.tema || tema; // fallback al tema de la sesión
              const key = temaPregunta ? temaPregunta.trim().toLowerCase() : "";
              if (key) {
                if (!preguntasVistasPorTema[key]) {
                  preguntasVistasPorTema[key] = new Set();
                }
                preguntasVistasPorTema[key].add(p.texto);
              }
            });
          }
        } catch (e) {
          const key = tema ? tema.trim().toLowerCase() : "";
          if (key) {
            cantAntiguasPorTema[key] = (cantAntiguasPorTema[key] || 0) + s.cantidad_preguntas;
          }
        }
      } else {
        const key = tema ? tema.trim().toLowerCase() : "";
        if (key) {
          cantAntiguasPorTema[key] = (cantAntiguasPorTema[key] || 0) + s.cantidad_preguntas;
        }
      }
    });

    // 3. Compilar el resultado de cobertura
    const cobertura = {};
    especialidadesBanco.forEach(esp => {
      const tema = esp.tema;
      const key = tema.trim().toLowerCase();
      const totalBanco = esp.total;
      
      const unicasNuevas = preguntasVistasPorTema[key] ? preguntasVistasPorTema[key].size : 0;
      const cantidadAntiguas = cantAntiguasPorTema[key] || 0;
      
      // Estimación combinada capada al máximo del banco
      const respondidasEstimado = Math.min(unicasNuevas + cantidadAntiguas, totalBanco);
      const porcentaje = totalBanco > 0 ? Math.round((respondidasEstimado / totalBanco) * 100) : 0;

      cobertura[tema] = {
        totalBanco,
        respondidas: respondidasEstimado,
        porcentaje
      };
    });

    res.json(cobertura);
  } catch (error) {
    console.error("Error al calcular cobertura:", error);
    res.status(500).json({ error: "Error al calcular la cobertura del banco." });
  }
});

app.post("/api/ia/consultar", async (req, res) => {
  try {
    const { preguntaTexto, seleccionText } = req.body;
    if (!preguntaTexto) {
      return res.status(400).json({ error: "Falta el texto del caso clínico." });
    }

    const textoLower = preguntaTexto.toLowerCase();
    let especialidad = "Medicina General";
    let libroCita = "Guía de Práctica Clínica (GPC) de Referencia Nacional";
    let explicacion = "";

    if (
      textoLower.includes("kawasaki") || 
      textoLower.includes("bronquiolitis") || 
      textoLower.includes("vsr") || 
      textoLower.includes("crup") || 
      textoLower.includes("laringotraqueitis") || 
      textoLower.includes("lactante") || 
      textoLower.includes("niño") || 
      textoLower.includes("pediatra") || 
      textoLower.includes("pediatría")
    ) {
      especialidad = "Pediatría";
      libroCita = "Nelson Tratado de Pediatría, 21.ª Edición, Cap. 140";
      if (textoLower.includes("kawasaki")) {
        explicacion = "La Enfermedad de Kawasaki es una vasculitis aguda multisistémica de medianos vasos con especial predilección por las arterias coronarias. La inmunoglobulina intravenosa (IGIV) a dosis de 2 g/kg en infusión única administrada dentro de los primeros 10 días del inicio de la fiebre reduce la incidencia de aneurismas coronarios del 25% a menos del 5%. El ácido acetilsalicílico (Aspirina) se añade inicialmente a dosis antiinflamatorias elevadas y luego a dosis antiagregantes plaquetarias.";
      } else if (textoLower.includes("bronquiolitis")) {
        explicacion = "La bronquiolitis aguda es la infección de vías respiratorias inferiores más común en lactantes, siendo el Virus Sincitial Respiratorio (VSR) el agente causal en >80% de los casos. Según el Tratado de Pediatría de Nelson, no hay evidencia clínica robusta que respalde el uso sistemático de broncodilatadores, corticoides ni nebulizaciones con solución salina hipertónica. La base del tratamiento es el soporte hídrico y ventilatorio (oxígeno suplementario si la saturación cae por debajo de 90-92%).";
      } else if (textoLower.includes("crup") || textoLower.includes("laringotraqueitis")) {
        explicacion = "El Crup (Laringotraqueitis Aguda) es de etiología viral (principalmente virus parainfluenza tipo 1) y se caracteriza por la tríada clásica de estridor inspiratorio, tos perruna y disfonía. La dexametasona oral o intramuscular a dosis única (0.6 mg/kg) es el estándar de oro terapéutico para reducir la inflamación laríngea. En casos graves con estridor en reposo, se utiliza epinefrina nebulizada para lograr una vasoconstricción local rápida.";
      } else {
        explicacion = "El manejo clínico pediátrico de este reactivo exige reconocer la fisiopatología del desarrollo infantil y los esquemas terapéuticos validados internacionalmente. La dosificación basada en el peso del paciente y el soporte hemodinámico y respiratorio precoz constituyen los pilares del éxito terapéutico según lo recomendado por los consensos actuales.";
      }
    } 
    else if (
      textoLower.includes("embarazo") || 
      textoLower.includes("ectópico") || 
      textoLower.includes("preeclampsia") || 
      textoLower.includes("placenta") || 
      textoLower.includes("parto") || 
      textoLower.includes("gestante") || 
      textoLower.includes("útero") || 
      textoLower.includes("uterino") || 
      textoLower.includes("vagina") || 
      textoLower.includes("ginecología") || 
      textoLower.includes("obstetricia")
    ) {
      especialidad = "Gineco-Obstetricia";
      libroCita = "Williams Obstetricia, 26.ª Edición, Cap. 22";
      if (textoLower.includes("ectópico")) {
        explicacion = "El Embarazo Ectópico ocurre cuando el blastocisto se implanta fuera de la cavidad endometrial, siendo la trompa de Falopio (porción ampular) el sitio más común (>95%). La tríada clásica consiste en dolor abdominal bajo, sangrado vaginal anormal y amenorrea. El diagnóstico se confirma mediante la cuantificación sérica de la subunidad beta de hCG combinada con ecografía transvaginal que demuestre útero vacío.";
      } else if (textoLower.includes("preeclampsia")) {
        explicacion = "La preeclampsia con criterios de severidad se define por cifras tensionales ≥160/110 mmHg asociadas a disfunción multiorgánica (plaquetopenia <100,000, elevación de transaminasas al doble del límite superior, insuficiencia renal, síntomas visuales o cerebrales como cefalea persistente o escotomas). El tratamiento de elección para la prevención de eclampsia es el sulfato de magnesio, y el manejo definitivo es la inducción del parto o cesárea una vez estabilizada la paciente.";
      } else if (textoLower.includes("placenta") || textoLower.includes("indoloro")) {
        explicacion = "La placenta previa se presenta clásicamente como sangrado transvaginal indoloro, de sangre roja rutilante y abundante, que ocurre durante el tercer trimestre de la gestación. A diferencia del desprendimiento prematuro de placenta (DPPNI), no se asocia a hipertonía uterina ni sufrimiento fetal agudo inmediato. El diagnóstico es ecográfico y el tacto vaginal está estrictamente contraindicado por el riesgo de hemorragia masiva catastrófica.";
      } else {
        explicacion = "El manejo obstétrico moderno prioriza la monitorización fetal y materna estrecha, valorando factores de riesgo hemodinámicos y la edad gestacional para equilibrar la viabilidad neonatal frente a las complicaciones maternas de alto riesgo descritas en Williams Obstetricia.";
      }
    } 
    else if (
      textoLower.includes("charcot") || 
      textoLower.includes("reynolds") || 
      textoLower.includes("colangitis") || 
      textoLower.includes("colecistitis") || 
      textoLower.includes("apendicitis") || 
      textoLower.includes("vesícula") || 
      textoLower.includes("cirugía") || 
      textoLower.includes("quirúrgico") || 
      textoLower.includes("alvarado") || 
      textoLower.includes("hida")
    ) {
      especialidad = "Cirugía General";
      libroCita = "Schwartz Principios de Cirugía, 11.ª Edición";
      if (textoLower.includes("charcot") || textoLower.includes("reynolds") || textoLower.includes("colangitis")) {
        explicacion = "La Colangitis Aguda es una urgencia médica y quirúrgica causada por la obstrucción e infección de la vía biliar. La Tríada de Charcot (fiebre, ictericia y dolor en hipocondrio derecho) está presente en el 50-70% de los pacientes. La Péntada de Reynolds añade shock (hipotensión) y alteración del estado mental (confusión), lo que refleja sepsis biliar grave y exige descompresión biliar de emergencia mediante CPRE junto a antibioterapia de amplio espectro.";
      } else if (textoLower.includes("colecistitis") || textoLower.includes("hida")) {
        explicacion = "La Colecistitis Aguda es la inflamación de la vesícula biliar secundaria a la obstrucción del conducto cístico por un lito en >90% de los casos. La ecografía abdominal es el estudio inicial preferido por su alta sensibilidad, mostrando engrosamiento de pared >4 mm, líquido pericolecístico y signo de Murphy ecográfico positivo. El estándar de oro diagnóstico es la gammagrafía biliar (HIDA), reservada para casos dudosos.";
      } else if (textoLower.includes("apendicitis") || textoLower.includes("alvarado")) {
        explicacion = "La Apendicitis Aguda es la causa más común de abdomen agudo quirúrgico. La Escala de Alvarado es una herramienta clínica valiosa basada en síntomas (migración del dolor, anorexia, náuseas), signos (dolor en cuadrante inferior derecho, rebote positivo, fiebre) y laboratorio (leucocitosis, desviación a la izquierda). Un puntaje ≥7 sugiere fuertemente apendicitis y justifica la intervención quirúrgica (apendicectomía).";
      } else {
        explicacion = "Las patologías de abdomen agudo quirúrgico requieren un diagnóstico precoz diferencial. La reanimación hídrica agresiva, la restricción de vía oral y el inicio de antibióticos profilácticos o terapéuticos guían la conducta preoperatoria del cirujano general basándose en Schwartz Principios de Cirugía.";
      }
    } 
    else if (
      textoLower.includes("cetoacidosis") || 
      textoLower.includes("diabética") || 
      textoLower.includes("cad") || 
      textoLower.includes("neumonía") || 
      textoLower.includes("meningitis") || 
      textoLower.includes("insulina") || 
      textoLower.includes("meningococo") || 
      textoLower.includes("streptococcus") || 
      textoLower.includes("neumococo")
    ) {
      especialidad = "Medicina Interna";
      libroCita = "Harrison Principios de Medicina Interna, 21.ª Edición";
      if (textoLower.includes("cetoacidosis") || textoLower.includes("cad")) {
        explicacion = "La Cetoacidosis Diabética (CAD) se caracteriza por la tríada de hiperglucemia (>250 mg/dL), acidosis metabólica (pH <7.3, HCO3 <18 mEq/L) y cetonemia/cetonuria. La medida más crucial e inmediata en el manejo inicial es la rehidratación enérgica con Solución Salina Isotónica al 0.9% IV para restaurar el volumen intravascular circulante y mejorar la perfusión renal, antes del inicio de la infusión de insulina rápida.";
      } else if (textoLower.includes("neumonía") || textoLower.includes("neumococo")) {
        explicacion = "La Neumonía Adquirida en la Comunidad (NAC) tiene al Streptococcus pneumoniae como agente causal bacteriano más prevalente a nivel mundial. El diagnóstico definitivo se fundamenta en la demostración de infiltrados nuevos en la radiografía de tórax combinada con síntomas compatibles (tos, fiebre, disnea). La elección del antibiótico empírico depende de la gravedad valorada por escalas como CURB-65.";
      } else if (textoLower.includes("meningitis")) {
        explicacion = "La meningitis bacteriana en adultos inmunocompetentes de 18 a 50 años está provocada principalmente por S. pneumoniae y N. meningitidis. El esquema de primera línea consiste en la administración urgente de Ceftriaxona o Cefotaxima asociada a Vancomicina (para contrarrestar resistencias a penicilinas). Es crucial iniciar dexametasona IV de manera concomitante o justo antes de la primera dosis de antibiótico para reducir la inflamación meníngea y secuelas neurológicas.";
      } else {
        explicacion = "Las directrices internacionales de Medicina Interna hacen énfasis en un abordaje fisiopatológico preciso de las patologías complejas del adulto, regulando cuidadosamente el balance hídrico, metabólico e infeccioso bajo la evidencia científica actual.";
      }
    } 
    else if (
      textoLower.includes("neurotransmisor") || 
      textoLower.includes("par craneal") || 
      textoLower.includes("enzima") || 
      textoLower.includes("glucólisis") || 
      textoLower.includes("facial") || 
      textoLower.includes("pfk-1") || 
      textoLower.includes("glutamato")
    ) {
      especialidad = "Ciencias Básicas";
      libroCita = "Guyton & Hall Tratado de Fisiología Médica, 14.ª Edición";
      if (textoLower.includes("glutamato") || textoLower.includes("neurotransmisor")) {
        explicacion = "El glutamato es el neurotransmisor excitatorio por excelencia del sistema nervioso central en mamíferos. Regula procesos cognitivos, de aprendizaje y memoria mediante su interacción con receptores ionotrópicos (NMDA, AMPA, kainato) y metabotrópicos. Su desregulación y acumulación excesiva en la hendidura sináptica causa excitotoxicidad neuronal implicada en procesos isquémicos agudos.";
      } else if (textoLower.includes("par craneal") || textoLower.includes("facial")) {
        explicacion = "El VII par craneal o nervio facial posee funciones complejas: motora somática (inerva los músculos de la expresión mímica), sensorial (gusto de los dos tercios anteriores de la lengua a través de la cuerda del tímpano), motora visceral parasimpática (glándulas lagrimales y salivales submandibulares/sublinguales) y sensitiva general de una pequeña porción del conducto auditivo externo.";
      } else if (textoLower.includes("glucólisis") || textoLower.includes("pfk-1") || textoLower.includes("enzima")) {
        explicacion = "La Fosfofructocinasa-1 (PFK-1) cataliza la fosforilación de la Fructosa-6-Fosfato a Fructosa-1,6-Bifosfato utilizando ATP. Es considerada la enzima marcapasos o limitante de velocidad clave en la glucólisis anaerobia. Es regulada alostéricamente de manera negativa por el ATP y el citrato, y activada alostéricamente por el AMP y la Fructosa-2,6-Bifosfato (esta última estimulada directamente por la insulina).";
      } else {
        explicacion = "El dominio de las Ciencias Básicas (bioquímica, anatomía, fisiología) sustenta el razonamiento clínico del médico. Comprender la homeóstasis celular y molecular nos capacita para entender y tratar eficazmente los estados patológicos.";
      }
    } 
    else {
      explicacion = `Tras realizar un análisis exhaustivo del caso clínico planteado, se determina la relevancia de guiar el abordaje con estricto apego a las guías internacionales. En la práctica clínica real y el rigor del examen ENURM, el reconocimiento precoz de los signos pivote expuestos en el enunciado permite descartar diagnósticos diferenciales comunes y elegir la terapia más eficaz.`;
    }

    let feedbackIA = "";
    if (seleccionText) {
      feedbackIA = `<div class="ia-question-context">
        <strong>Caso Clínico:</strong> "${preguntaTexto}"<br>
        <span style="color: #ec4899;"><strong>Opción elegida para análisis:</strong> "${seleccionText}"</span>
      </div>`;
    }

    const respuestaFinal = `
      ${feedbackIA}
      <div class="ia-badge-book">📚 Fuente Oficial: ${libroCita}</div>
      <div class="ia-explanation-text">
        <p><strong>Querido Colega, aquí tienes la disección del Tutor IA:</strong></p>
        <p>${explicacion}</p>
        <p><em>Recuerda que el ENURM evalúa la memorización precisa de datos puros basados en la literatura médica clásica. Sigue estudiando con constancia.</em></p>
      </div>
    `;

    res.json({ explicacionIA: respuestaFinal });

  } catch (error) {
    console.error("Error en Tutor IA:", error);
    res.status(500).json({ error: "Error en el servidor al consultar el Tutor IA." });
  }
});

/* ==========================================================================
   🧠 ENDPOINTS DE SPACED REPETITION Y FLASHCARDS PERSONALIZADAS
   ========================================================================== */

app.get("/api/spaced-repetition", autenticarToken, async (req, res) => {
  try {
    const { usuarioId } = req.query;
    if (parseInt(usuarioId) !== req.usuario.id) {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }

    const filas = await db.all(`SELECT * FROM spaced_repetition WHERE usuario_id = ?`, [usuarioId]);
    res.json(filas);
  } catch (error) {
    res.status(500).json({ error: "Error al leer repetición espaciada." });
  }
});

app.post("/api/spaced-repetition", autenticarToken, async (req, res) => {
  try {
    const { usuarioId, preguntaId, flashcardId, stability, difficulty, ease, repetitions, interval, nextReview } = req.body;
    
    if (parseInt(usuarioId) !== req.usuario.id) {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }

    let existente;
    if (flashcardId) {
      existente = await db.get(`SELECT id FROM spaced_repetition WHERE usuario_id = ? AND flashcard_id = ?`, [usuarioId, flashcardId]);
    } else if (preguntaId) {
      existente = await db.get(`SELECT id FROM spaced_repetition WHERE usuario_id = ? AND pregunta_id = ?`, [usuarioId, preguntaId]);
    }

    if (existente) {
      await db.run(
        `UPDATE spaced_repetition SET stability = ?, difficulty = ?, ease = ?, repetitions = ?, interval = ?, next_review = ? WHERE id = ?`,
        [stability, difficulty, ease, repetitions, interval, nextReview, existente.id]
      );
    } else {
      await db.run(
        `INSERT INTO spaced_repetition (usuario_id, pregunta_id, flashcard_id, stability, difficulty, ease, repetitions, interval, next_review) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [usuarioId, preguntaId, flashcardId, stability, difficulty, ease, repetitions, interval, nextReview]
      );
    }

    res.json({ mensaje: "Estado de repetición espaciada sincronizado." });
  } catch (error) {
    res.status(500).json({ error: "Error al guardar repetición espaciada." });
  }
});

app.get("/api/flashcards/personalizadas", autenticarToken, async (req, res) => {
  try {
    const { usuarioId } = req.query;
    if (parseInt(usuarioId) !== req.usuario.id) {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }

    const filas = await db.all(`SELECT * FROM flashcards_personalizadas WHERE usuario_id = ? ORDER BY fecha DESC`, [usuarioId]);
    res.json(filas);
  } catch (error) {
    res.status(500).json({ error: "Error al leer flashcards personalizadas." });
  }
});

app.post("/api/flashcards/personalizadas", autenticarToken, async (req, res) => {
  try {
    const { usuarioId, tema, pregunta, respuesta } = req.body;
    
    if (parseInt(usuarioId) !== req.usuario.id) {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }

    await db.run(
      `INSERT INTO flashcards_personalizadas (usuario_id, tema, pregunta, respuesta) VALUES (?, ?, ?, ?)`,
      [usuarioId, tema, pregunta, respuesta]
    );

    res.status(201).json({ mensaje: "Flashcard personalizada inyectada con éxito." });
  } catch (error) {
    res.status(500).json({ error: "Error al crear flashcard personalizada." });
  }
});

/* ==========================================================================
   🚨 APIS DE REPORTES DE ERROR EN PREGUNTAS (FASE 6)
   ========================================================================== */

// 1. Crear un reporte de error
app.post("/api/reportes-error", autenticarToken, async (req, res) => {
  try {
    const { preguntaId, motivo, comentario } = req.body;
    const usuarioId = req.usuario.id;

    if (!preguntaId || !motivo) {
      return res.status(400).json({ error: "Faltan campos requeridos." });
    }

    await db.run(
      `INSERT INTO reportes_error (usuario_id, pregunta_id, motivo, comentario) VALUES (?, ?, ?, ?)`,
      [usuarioId, preguntaId, motivo, comentario || ""]
    );

    res.status(201).json({ mensaje: "Reporte de error enviado con éxito." });
  } catch (error) {
    console.error("Error al crear reporte de error:", error);
    res.status(500).json({ error: "Error al guardar el reporte en la base de datos." });
  }
});

// 2. Obtener todos los reportes de error (Solo para Administrador)
app.get("/api/admin/reportes-error", autenticarToken, async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const usuarioReal = await db.get(`SELECT rol FROM usuarios WHERE id = ?`, [usuarioId]);

    if (!usuarioReal || usuarioReal.rol !== "admin") {
      return res.status(403).json({ error: "Acceso denegado. No eres administrador." });
    }

    const reportes = await db.all(`
      SELECT 
        r.id, r.pregunta_id, r.motivo, r.comentario, r.leido, r.fecha,
        p.texto AS pregunta_texto, p.tema AS pregunta_tema,
        p.opciones AS pregunta_opciones, p.correcta AS pregunta_correcta,
        p.subtema AS pregunta_subtema, p.explicacion AS pregunta_explicacion,
        p.fuente AS pregunta_fuente,
        u.nombre AS usuario_nombre, u.email AS usuario_email
      FROM reportes_error r
      JOIN preguntas p ON r.pregunta_id = p.id
      JOIN usuarios u ON r.usuario_id = u.id
      ORDER BY r.leido ASC, r.fecha DESC
    `);

    res.json(reportes);
  } catch (error) {
    console.error("Error al obtener reportes de error:", error);
    res.status(500).json({ error: "Error interno del servidor al consultar los reportes." });
  }
});

// 3. Marcar reporte de error como leído/resuelto (Solo para Administrador)
app.put("/api/admin/reportes-error/:id/marcar-leido", autenticarToken, async (req, res) => {
  try {
    const reporteId = req.params.id;
    const usuarioId = req.usuario.id;
    const usuarioReal = await db.get(`SELECT rol FROM usuarios WHERE id = ?`, [usuarioId]);

    if (!usuarioReal || usuarioReal.rol !== "admin") {
      return res.status(403).json({ error: "Acceso denegado. No eres administrador." });
    }

    await db.run(`UPDATE reportes_error SET leido = 1 WHERE id = ?`, [reporteId]);

    res.json({ mensaje: "Reporte marcado como resuelto con éxito." });
  } catch (error) {
    console.error("Error al marcar reporte como resuelto:", error);
    res.status(500).json({ error: "Error interno del servidor al actualizar el estado." });
  }
});

// 4. Modificar una pregunta (Solo para Administrador)
app.put("/api/admin/preguntas/:id", autenticarToken, async (req, res) => {
  try {
    const preguntaId = req.params.id;
    const usuarioId = req.usuario.id;
    const usuarioReal = await db.get(`SELECT rol FROM usuarios WHERE id = ?`, [usuarioId]);

    if (!usuarioReal || usuarioReal.rol !== "admin") {
      return res.status(403).json({ error: "Acceso denegado. No eres administrador." });
    }

    const { texto, opciones, correcta, tema, subtema, explicacion, fuente } = req.body;

    if (!texto || !opciones || correcta === undefined || !tema) {
      return res.status(400).json({ error: "Faltan campos requeridos." });
    }

    const opcionesStr = Array.isArray(opciones) ? JSON.stringify(opciones) : opciones;

    await db.run(
      `UPDATE preguntas 
       SET texto = ?, opciones = ?, correcta = ?, tema = ?, subtema = ?, explicacion = ?, fuente = ?
       WHERE id = ?`,
      [texto, opcionesStr, correcta, tema, subtema || "", explicacion || "", fuente || "", preguntaId]
    );

    res.json({ mensaje: "Pregunta modificada con éxito." });
  } catch (error) {
    console.error("Error al modificar la pregunta:", error);
    res.status(500).json({ error: "Error interno del servidor al guardar los cambios." });
  }
});


app.use((req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

function obtenerDireccionIPLocal() {
  const interfaces = os.networkInterfaces();
  for (const nombre of Object.keys(interfaces)) {
    for (const interfaz of interfaces[nombre]) {
      if (interfaz.family === "IPv4" && !interfaz.internal) {
        return interfaz.address;
      }
    }
  }
  return "localhost";
}

async function arrancar() {
  await iniciarBaseDeDatos();
  app.listen(PORT, () => {
    const ipLocal = obtenerDireccionIPLocal();
    console.log(`\n======================================================`);
    console.log(`🚀 Servidor ResiMed Activo:`);
    console.log(`   - Local (PC):       http://localhost:${PORT}`);
    console.log(`   - Red Local (Móvil): http://${ipLocal}:${PORT}`);
    console.log(`======================================================\n`);
  });
}
arrancar();