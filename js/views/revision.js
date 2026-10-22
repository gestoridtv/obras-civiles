window.Views = window.Views || {};

window.Views.revision = {
  render(container, { proyectoId }) {
    DB.obtenerProyecto(proyectoId).then((proyecto) => {
      if (!proyecto) {
        container.innerHTML = '<p style="padding:16px;">Obra no encontrada.</p>';
        return;
      }

      const header = document.createElement('div');
      header.className = 'header';
      header.innerHTML = `
        <button class="btn btn--texto" id="btn-mis-obras">← Mis obras</button>
        <h1>Revisar: ${proyecto.nombre}</h1>
      `;
      container.appendChild(header);

      document.getElementById('btn-mis-obras').addEventListener('click', () => {
        Router.navegar('proyectos');
      });

      const lista = document.createElement('div');
      container.appendChild(lista);

      const btnGenerar = document.createElement('button');
      btnGenerar.className = 'btn';
      btnGenerar.textContent = 'Generar brief';
      btnGenerar.style.margin = '16px';
      btnGenerar.addEventListener('click', () => {
        if (btnGenerar.disabled) return;
        DB.actualizarProyecto(proyectoId, { estado: 'brief_generado' }).then(() => {
          Router.navegar('brief', { proyectoId });
        });
      });
      container.appendChild(btnGenerar);

      function recargar() {
        DB.listarRequerimientos(proyectoId).then((requerimientos) => {
          lista.innerHTML = '';
          requerimientos.forEach((req) => {
            lista.appendChild(crearFilaRevision(req, proyecto, recargar));
          });
          const todosCategorizados = requerimientos.length > 0 && requerimientos.every((r) => r.categoria);
          btnGenerar.disabled = !todosCategorizados;
          btnGenerar.style.opacity = todosCategorizados ? '1' : '0.5';
        });
      }

      recargar();
    });
  },
};

function crearFilaRevision(req, proyecto, alCambiar) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.flexDirection = 'column';
  card.style.alignItems = 'stretch';

  const textoSpan = document.createElement('div');
  textoSpan.textContent = req.texto;
  textoSpan.style.marginBottom = '8px';
  textoSpan.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = req.texto;
    input.style.width = '100%';
    textoSpan.replaceWith(input);
    input.focus();
    input.addEventListener('blur', () => {
      DB.actualizarRequerimiento(req.id, { texto: input.value.trim() || req.texto }).then(alCambiar);
    });
  });
  card.appendChild(textoSpan);

  const fila = document.createElement('div');
  fila.style.display = 'flex';
  fila.style.gap = '8px';
  fila.style.alignItems = 'center';

  const select = document.createElement('select');
  const optSinCategoria = document.createElement('option');
  optSinCategoria.value = '';
  optSinCategoria.textContent = 'Sin categoría';
  select.appendChild(optSinCategoria);
  proyecto.categorias.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    opt.selected = c === req.categoria;
    select.appendChild(opt);
  });
  const optNueva = document.createElement('option');
  optNueva.value = '__nueva__';
  optNueva.textContent = '+ Nueva categoría…';
  select.appendChild(optNueva);
  select.addEventListener('change', () => {
    if (select.value === '__nueva__') {
      const nueva = prompt('Nombre de la nueva categoría:');
      if (nueva && nueva.trim()) {
        const categorias = proyecto.categorias.concat([nueva.trim()]);
        DB.actualizarProyecto(proyecto.id, { categorias }).then(() => {
          proyecto.categorias = categorias;
          DB.actualizarRequerimiento(req.id, { categoria: nueva.trim() }).then(alCambiar);
        });
      } else {
        select.value = req.categoria || '';
      }
      return;
    }
    DB.actualizarRequerimiento(req.id, { categoria: select.value || null }).then(alCambiar);
  });
  fila.appendChild(select);

  const btnBorrar = document.createElement('button');
  btnBorrar.className = 'btn btn--texto';
  btnBorrar.textContent = '🗑';
  btnBorrar.addEventListener('click', () => {
    if (confirm('¿Borrar este requerimiento?')) {
      DB.eliminarRequerimiento(req.id).then(alCambiar);
    }
  });
  fila.appendChild(btnBorrar);

  card.appendChild(fila);
  return card;
}
