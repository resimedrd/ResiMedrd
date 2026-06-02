// ====== PROCESADOR DE ANALÍTICAS EDUCATIVAS (analytics.js) ======

const analytics = {
  // Analizar todo el historial para extraer métricas SaaS
  procesarMetricas(historial) {
    const resumen = {
      tiempoPromedioPregunta: 0,   // en segundos
      precisionPorMateria: {},     // { "Pediatría": { correctas, totales, porcentaje } }
      precisionPorSubtema: {},     // { "Neonatología": { correctas, totales, historialRespuestas } }
      debilidadesDetectadas: [],    // subtemas específicos que necesitan reforzarse y NO están dominados/superados
      totalPreguntasRespondidas: 0,
      sesionesCompletadas: historial.length
    };

    let totalSegundosTranscurridos = 0;
    let totalPreguntasConDetalle = 0;

    // Hacer una copia invertida del historial para procesar en orden cronológico (de más antiguo a más reciente)
    const historialCronologico = [...historial].reverse();

    historialCronologico.forEach(sesion => {
      resumen.totalPreguntasRespondidas += sesion.cantidad_preguntas;
      
      // Intentar procesar detalles del examen para subtemas y tiempos
      if (sesion.detalle) {
        try {
          const preguntas = JSON.parse(sesion.detalle);
          if (Array.isArray(preguntas)) {
            preguntas.forEach(p => {
              totalPreguntasConDetalle++;
              
              // Tiempos por pregunta (si se registraron, fallback a estimación promedio de 45s si no hay campo)
              const tiempoP = p.tiempoTranscurrido || 45;
              totalSegundosTranscurridos += tiempoP;

              // Agrupación por Materia (Especialidad)
              const materia = (p.tema || sesion.tema || "General").trim();
              if (!resumen.precisionPorMateria[materia]) {
                resumen.precisionPorMateria[materia] = { correctas: 0, totales: 0 };
              }
              resumen.precisionPorMateria[materia].totales += 1;
              
              const esCorrecta = p.seleccionada === p.correcta;
              if (esCorrecta) {
                resumen.precisionPorMateria[materia].correctas += 1;
              }

              // Agrupación por Subtema (Temas específicos)
              let subtema = (p.subtema || "").trim();
              if (!subtema || subtema.toLowerCase() === "varios" || subtema.toLowerCase() === "general" || subtema.toLowerCase() === "generalidades") {
                subtema = materia; // Fallback al tema si el subtema es muy genérico o está vacío
              }

              if (!resumen.precisionPorSubtema[subtema]) {
                resumen.precisionPorSubtema[subtema] = { correctas: 0, totales: 0, historialRespuestas: [] };
              }
              resumen.precisionPorSubtema[subtema].totales += 1;
              if (esCorrecta) {
                resumen.precisionPorSubtema[subtema].correctas += 1;
              }
              // Almacenar secuencia cronológica de aciertos/desaciertos
              resumen.precisionPorSubtema[subtema].historialRespuestas.push(esCorrecta);
            });
          }
        } catch (e) {
          console.warn("Falla al parsear detalles en analytics:", e);
        }
      }
    });

    // Calcular promedios
    resumen.tiempoPromedioPregunta = totalPreguntasConDetalle > 0 
      ? Math.round(totalSegundosTranscurridos / totalPreguntasConDetalle) 
      : 45;

    // Calcular porcentajes por materia (para estadísticas generales de progreso)
    Object.keys(resumen.precisionPorMateria).forEach(materia => {
      const data = resumen.precisionPorMateria[materia];
      data.porcentaje = data.totales > 0 ? Math.round((data.correctas / data.totales) * 100) : 0;
    });

    // --- DETECTOR INTELIGENTE Y ADAPTATIVO DE DEBILIDADES CLÍNICAS ---
    // Procesa temas específicos (subtemas) y "aprende" del usuario en tiempo real
    Object.keys(resumen.precisionPorSubtema).forEach(subtemaName => {
      const data = resumen.precisionPorSubtema[subtemaName];
      const totales = data.totales;
      const correctas = data.correctas;
      const porcentajeAcumulado = totales > 0 ? Math.round((correctas / totales) * 100) : 0;

      // Un subtema es candidato a ser debilidad si su precisión acumulada es menor al 70%
      // y posee al menos una pregunta fallada.
      if (porcentajeAcumulado < 70 && correctas < totales) {
        
        // --- MOTOR DE DES-DEBILITACIÓN (AUTO-ELIMINACIÓN POR MEJORA) ---
        const historialRespuestas = data.historialRespuestas || [];
        const ultimas = historialRespuestas.slice(-5); // Evaluar los últimos 5 intentos del subtema
        const correctasRecientes = ultimas.filter(r => r === true).length;
        const totalesRecientes = ultimas.length;
        const porcentajeReciente = totalesRecientes > 0 ? Math.round((correctasRecientes / totalesRecientes) * 100) : 0;

        // Se considera que el usuario "ya responde bien al tema" y se ELIMINA de debilidades si:
        // Criterio A: Las últimas 3 respuestas consecutivas para este subtema específico fueron CORRECTAS.
        const superadoPorRacha = ultimas.length >= 3 && ultimas.slice(-3).every(r => r === true);
        
        // Criterio B: Tiene al menos 3 respuestas en su historial reciente y su precisión reciente es >= 75%.
        const superadoPorPrecision = totalesRecientes >= 3 && porcentajeReciente >= 75;

        if (superadoPorRacha || superadoPorPrecision) {
          // El usuario ha dominado/superado el tema recientemente. Se omite de las debilidades.
          return;
        }

        // Si no cumple los criterios de superación, sigue requiriendo refuerzo
        resumen.debilidadesDetectadas.push({
          tema: subtemaName, // Nombre del subtema específico
          porcentaje: porcentajeAcumulado,
          totales: totales
        });
      }
    });

    // Ordenar debilidades de forma que la más urgente (menor porcentaje) vaya al inicio
    resumen.debilidadesDetectadas.sort((a, b) => a.porcentaje - b.porcentaje);

    return resumen;
  }
};

window.analytics = analytics;
