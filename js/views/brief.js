window.Views = window.Views || {};

window.Views.brief = {
  render(container, { proyectoId }) {
    Promise.all([DB.obtenerProyecto(proyectoId), DB.listarRequerimientos(proyectoId)]).then(([proyecto, requerimientos]) => {
      const header = document.createElement('div');
      header.className = 'header';
      header.innerHTML = `<h1>Brief: ${proyecto.nombre}</h1><p style="color:var(--color-texto-sutil);">Cliente: ${proyecto.cliente}</p>`;
      container.appendChild(header);

      const porCategoria = {};
      requerimientos.forEach((r) => {
        const cat = r.categoria || 'Sin categoría';
        (porCategoria[cat] = porCategoria[cat] || []).push(r);
      });

      proyecto.categorias.forEach((categoria) => {
        const items = porCategoria[categoria];
        if (!items || items.length === 0) return;
        const titulo = document.createElement('div');
        titulo.className = 'categoria-titulo';
        titulo.textContent = categoria;
        container.appendChild(titulo);
        items.forEach((item) => {
          const card = document.createElement('div');
          card.className = 'card';
          card.innerHTML = `<span>${item.texto}</span>`;
          container.appendChild(card);
        });
      });

      const acciones = document.createElement('div');
      acciones.style.padding = '16px';
      acciones.style.display = 'flex';
      acciones.style.flexDirection = 'column';
      acciones.style.gap = '10px';

      const btnPdf = document.createElement('button');
      btnPdf.className = 'btn';
      btnPdf.textContent = 'Descargar / compartir PDF';
      btnPdf.addEventListener('click', () => compartirOBajarPdf(proyecto, requerimientos));
      acciones.appendChild(btnPdf);

      const btnAprobar = document.createElement('button');
      btnAprobar.className = 'btn';
      btnAprobar.style.background = 'var(--color-exito)';
      btnAprobar.textContent = 'Marcar como aprobado por el cliente';
      btnAprobar.addEventListener('click', () => {
        DB.actualizarProyecto(proyectoId, { estado: 'aprobado' }).then(() => {
          Router.navegar('checklist', { proyectoId });
        });
      });
      acciones.appendChild(btnAprobar);

      container.appendChild(acciones);
    });
  },
};

function compartirOBajarPdf(proyecto, requerimientos) {
  const blob = PDF.generarBrief(proyecto, requerimientos);
  const nombreArchivo = PDF.nombreArchivo(proyecto);
  const archivo = new File([blob], nombreArchivo, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    navigator.share({ files: [archivo], title: nombreArchivo }).catch(() => {});
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
