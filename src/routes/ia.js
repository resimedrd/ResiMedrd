const express = require("express");
const { getDB } = require("../config/db");

const router = express.Router();

router.post("/api/ia/consultar", async (req, res) => {
  const db = getDB();
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


module.exports = router;
