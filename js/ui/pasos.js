(function () {
  const raiz = typeof window !== 'undefined' ? window : globalThis;

  function tieneCategoria(req) {
    return !!req.categoria;
  }

  function calcular(proyecto, requerimientos) {
    const reqs = requerimientos || [];
    const estado = proyecto && proyecto.estado;
    const hayReqs = reqs.length > 0;
    const todosCategorizados = hayReqs && reqs.every(tieneCategoria);
    const aprobado = estado === 'aprobado';

    return [
      {
        id: 'captura',
        etiqueta: 'Captura',
        habilitado: true,
        completado: hayReqs
      },
      {
        id: 'revision',
        etiqueta: 'Revisión',
        habilitado: hayReqs,
        completado: todosCategorizados
      },
      {
        id: 'brief',
        etiqueta: 'Brief',
        habilitado: todosCategorizados,
        completado: estado === 'brief_generado' || aprobado
      },
      {
        id: 'checklist',
        etiqueta: 'Obra',
        habilitado: aprobado,
        completado: aprobado && hayReqs && reqs.every((r) => r.checkEstado === 'hecho')
      }
    ];
  }

  function avance(proyecto, requerimientos) {
    return calcular(proyecto, requerimientos).filter((p) => p.completado).length;
  }

  const Pasos = { calcular, avance };

  raiz.Pasos = Pasos;
  if (typeof module !== 'undefined' && module.exports) module.exports = Pasos;
})();
