// ====== PROCESADOR DE ANALÍTICAS EDUCATIVAS (analytics.js) ======

const analytics = {
  // Analizar todo el historial para extraer métricas SaaS
  procesarMetricas(historial) {
    const resumen = {
      tiempoPromedioPregunta: 0,   // en segundos
      precisionPorMateria: {},     // { "Pediatría": { correctas, totales, porcentaje } }
      precisionPorSubtema: {},     // { "Cardiología Pediátrica": { correctas, totales } }
      debilidadesDetectadas: [],    // materias con tasa <60%
      totalPreguntasRespondidas: 0,
      sesionesCompletadas: historial.length
    };

    let totalSegundosTranscurridos = 0;
    let totalPreguntasConDetalle = 0;

    historial.forEach(sesion => {
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
              if (p.seleccionada === p.correcta) {
                resumen.precisionPorMateria[materia].correctas += 1;
              }

              // Agrupación por Subtema
              const subtema = (p.subtema || "Generalidades").trim();
              if (!resumen.precisionPorSubtema[subtema]) {
                resumen.precisionPorSubtema[subtema] = { correctas: 0, totales: 0 };
              }
              resumen.precisionPorSubtema[subtema].totales += 1;
              if (p.seleccionada === p.correcta) {
                resumen.precisionPorSubtema[subtema].correctas += 1;
              }
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

    // Calcular porcentajes por materia y extraer debilidades
    Object.keys(resumen.precisionPorMateria).forEach(materia => {
      const data = resumen.precisionPorMateria[materia];
      data.porcentaje = data.totales > 0 ? Math.round((data.correctas / data.totales) * 100) : 0;
      
      if (data.porcentaje < 60) {
        resumen.debilidadesDetectadas.push({
          tema: materia,
          porcentaje: data.porcentaje,
          totales: data.totales
        });
      }
    });

    // Ordenar debilidades de forma que la más baja vaya al inicio
    resumen.debilidadesDetectadas.sort((a, b) => a.porcentaje - b.porcentaje);

    return resumen;
  }
};

window.analytics = analytics;
