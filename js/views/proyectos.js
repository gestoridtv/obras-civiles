window.Views = window.Views || {};

const ETIQUETA_ESTADO = {
  captura: 'Captura',
  brief_generado: 'Brief generado',
  aprobado: 'Aprobado',
};

const RUTA_SEGUN_ESTADO = {
  captura: 'captura',
  brief_generado: 'brief',
  aprobado: 'checklist',
};

window.Views.proyectos = {
  render(container) {
    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = '<h1>Mis obras</h1>';
    container.appendChild(header);

    const lista = document.createElement('div');
    container.appendChild(lista);

    const fab = document.createElement('button');
    fab.className = 'btn-fab';
    fab.textContent = '+';
    fab.addEventListener('click', () => mostrarFormularioNuevoProyecto(container));
    container.appendChild(fab);

    DB.listarProyectos().then((proyectos) => {
      lista.innerHTML = '';
      if (proyectos.length === 0) {
        lista.innerHTML = '<p style="padding:16px;color:var(--color-texto-sutil);">Todavía no creaste ninguna obra. Toca + para empezar.</p>';
        return;
      }
      proyectos.forEach((proyecto) => lista.appendChild(crearTarjetaProyecto(proyecto)));
    });
  },
};

function crearTarjetaProyecto(proyecto) {
  const card = document.createElement('div');
  card.className = 'card';

  const info = document.createElement('div');
  info.style.cursor = 'pointer';
  info.innerHTML = `
    <strong>${proyecto.cliente}</strong><br>
    <span style="color:var(--color-texto-sutil);font-size:13px;">${proyecto.nombre}</span><br>
    <span class="chip chip--${proyecto.estado}">${ETIQUETA_ESTADO[proyecto.estado]}</span>
  `;
  info.addEventListener('click', () => {
    Router.navegar(RUTA_SEGUN_ESTADO[proyecto.estado], { proyectoId: proyecto.id });
  });
  card.appendChild(info);

  const btnBorrar = document.createElement('button');
  btnBorrar.className = 'btn btn--texto';
  btnBorrar.textContent = '🗑';
  btnBorrar.addEventListener('click', (evento) => {
    evento.stopPropagation();
    if (confirm(`¿Borrar la obra "${proyecto.nombre}"? Esta acción no se puede deshacer.`)) {
      DB.eliminarProyecto(proyecto.id).then(() => Router.renderActual());
    }
  });
  card.appendChild(btnBorrar);

  return card;
}

function mostrarFormularioNuevoProyecto(container) {
  if (document.getElementById('form-nuevo-proyecto')) return;

  const form = document.createElement('div');
  form.id = 'form-nuevo-proyecto';
  form.className = 'card';
  form.style.flexDirection = 'column';
  form.style.alignItems = 'stretch';
  form.innerHTML = `
    <input type="text" id="input-nombre" placeholder="Nombre de la obra (ej: Casa Pérez)" style="margin-bottom:8px;padding:10px;border-radius:8px;border:1px solid var(--color-borde);background:var(--color-fondo);color:var(--color-texto);">
    <input type="text" id="input-cliente" placeholder="Cliente" style="margin-bottom:8px;padding:10px;border-radius:8px;border:1px solid var(--color-borde);background:var(--color-fondo);color:var(--color-texto);">
    <button id="btn-crear-proyecto" class="btn">Crear obra</button>
  `;
  container.insertBefore(form, container.children[1]);

  document.getElementById('btn-crear-proyecto').addEventListener('click', () => {
    const nombre = document.getElementById('input-nombre').value.trim();
    const cliente = document.getElementById('input-cliente').value.trim();
    if (!nombre || !cliente) return;
    DB.crearProyecto({ nombre, cliente }).then((proyecto) => {
      Router.navegar('captura', { proyectoId: proyecto.id });
    });
  });
}
