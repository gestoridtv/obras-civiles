window.Views = window.Views || {};

window.Views.checklist = {
  render(container, { proyectoId }) {
    Promise.all([DB.obtenerProyecto(proyectoId), DB.listarRequerimientos(proyectoId)]).then(([proyecto, requerimientos]) => {
      if (!proyecto) {
        container.innerHTML = '<p style="padding:16px;">Obra no encontrada.</p>';
        return;
      }

      const header = document.createElement('div');
      header.className = 'header';
      header.innerHTML = `
        <button class="btn btn--texto" id="btn-mis-obras">← Mis obras</button>
        <h1>Checklist: ${proyecto.nombre}</h1>
        <button class="btn btn--texto" id="btn-volver-revision">Volver a revisión</button>
      `;
      container.appendChild(header);

      document.getElementById('btn-mis-obras').addEventListener('click', () => {
        Router.navegar('proyectos');
      });
      document.getElementById('btn-volver-revision').addEventListener('click', () => {
        Router.navegar('revision', { proyectoId });
      });

      const progreso = document.createElement('div');
      progreso.className = 'progreso';
      container.appendChild(progreso);

      function actualizarProgreso(lista) {
        const hechos = lista.filter((r) => r.checkEstado === 'hecho').length;
        progreso.textContent = `${hechos}/${lista.length} completados`;
      }

      const porCategoria = {};
      requerimientos.forEach((r) => {
        const cat = (r.categoria && proyecto.categorias.includes(r.categoria)) ? r.categoria : 'Sin categoría';
        (porCategoria[cat] = porCategoria[cat] || []).push(r);
      });

      proyecto.categorias.concat(['Sin categoría']).forEach((categoria) => {
        const items = porCategoria[categoria];
        if (!items || items.length === 0) return;
        const titulo = document.createElement('div');
        titulo.className = 'categoria-titulo';
        titulo.textContent = categoria;
        container.appendChild(titulo);
        items.forEach((item) => {
          container.appendChild(crearFilaChecklist(item, requerimientos, actualizarProgreso));
        });
      });

      actualizarProgreso(requerimientos);
    });
  },
};

function crearFilaChecklist(item, requerimientos, actualizarProgreso) {
  const fila = document.createElement('label');
  fila.className = 'checklist-item' + (item.checkEstado === 'hecho' ? ' checklist-item--hecho' : '');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = item.checkEstado === 'hecho';
  checkbox.addEventListener('change', () => {
    const nuevoEstado = checkbox.checked ? 'hecho' : 'pendiente';
    DB.actualizarRequerimiento(item.id, { checkEstado: nuevoEstado }).then(() => {
      item.checkEstado = nuevoEstado;
      fila.classList.toggle('checklist-item--hecho', nuevoEstado === 'hecho');
      actualizarProgreso(requerimientos);
    });
  });

  const texto = document.createElement('span');
  texto.textContent = item.texto;

  fila.appendChild(checkbox);
  fila.appendChild(texto);
  return fila;
}
