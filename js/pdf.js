(function () {
  function nombreArchivo(proyecto) {
    const fecha = new Date().toISOString().slice(0, 10);
    const base = `Brief - ${proyecto.cliente} - ${fecha}`;
    return base.replace(/[\\/:*?"<>|]/g, '-') + '.pdf';
  }

  function generarBrief(proyecto, requerimientos) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const margenIzq = 15;
    let y = 20;

    doc.setFontSize(16);
    doc.text(`Brief de requerimientos — ${proyecto.nombre}`, margenIzq, y);
    y += 8;
    doc.setFontSize(11);
    doc.text(`Cliente: ${proyecto.cliente}`, margenIzq, y);
    y += 6;
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, margenIzq, y);
    y += 10;

    const porCategoria = {};
    requerimientos.forEach((r) => {
      const cat = (r.categoria && proyecto.categorias.includes(r.categoria)) ? r.categoria : 'Sin categoría';
      if (!porCategoria[cat]) porCategoria[cat] = [];
      porCategoria[cat].push(r);
    });

    proyecto.categorias.concat(['Sin categoría']).forEach((categoria) => {
      const items = porCategoria[categoria];
      if (!items || items.length === 0) return;

      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(13);
      doc.text(categoria, margenIzq, y);
      y += 7;
      doc.setFontSize(11);
      items.forEach((item) => {
        if (y > 280) { doc.addPage(); y = 20; }
        const lineas = doc.splitTextToSize(`• ${item.texto}`, 180);
        doc.text(lineas, margenIzq + 3, y);
        y += 6 * lineas.length;
      });
      y += 4;
    });

    return doc.output('blob');
  }

  window.PDF = { generarBrief, nombreArchivo };
})();
