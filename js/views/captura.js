window.Views = window.Views || {};

window.Views.captura = {
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
        <h1>${proyecto.nombre}</h1>
        <button class="btn btn--texto" id="btn-ir-revision">Revisar y categorizar →</button>
      `;
      container.appendChild(header);

      document.getElementById('btn-mis-obras').addEventListener('click', () => {
        Router.navegar('proyectos');
      });

      const lista = document.createElement('ul');
      lista.className = 'lista-items';
      container.appendChild(lista);

      const barra = document.createElement('div');
      barra.className = 'barra-captura';
      barra.innerHTML = `
        <input type="text" id="input-captura" placeholder="Escribí o dictá un requerimiento…">
        <button class="btn-mic" id="btn-mic">🎤</button>
      `;
      container.appendChild(barra);

      function recargarLista() {
        DB.listarRequerimientos(proyectoId).then((requerimientos) => {
          lista.innerHTML = '';
          requerimientos.slice().reverse().forEach((req) => {
            lista.appendChild(crearItemCaptura(req, recargarLista));
          });
        });
      }

      function agregarTexto(texto) {
        const limpio = texto.trim();
        if (!limpio) return;
        DB.crearRequerimiento(proyectoId, limpio).then(() => {
          input.value = '';
          recargarLista();
        });
      }

      const input = document.getElementById('input-captura');
      input.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') agregarTexto(input.value);
      });

      const btnMic = document.getElementById('btn-mic');
      btnMic.addEventListener('click', () => {
        if (!Speech.disponible()) {
          alert('El dictado por voz no está disponible en este navegador. Usá el campo de texto.');
          return;
        }
        btnMic.classList.add('btn-mic--grabando');
        Speech.iniciar({
          onResultado: (texto) => {
            btnMic.classList.remove('btn-mic--grabando');
            input.value = texto;
            input.focus();
          },
          onError: (err) => {
            btnMic.classList.remove('btn-mic--grabando');
            if (err.code === 'not-allowed' || err.code === 'service-not-allowed') {
              alert('No se pudo acceder al micrófono. Revisá los permisos del navegador.');
            } else {
              console.warn(err.message);
            }
          },
        });
      });

      document.getElementById('btn-ir-revision').addEventListener('click', () => {
        Router.navegar('revision', { proyectoId });
      });

      recargarLista();
    });
  },
};

function crearItemCaptura(req, alBorrar) {
  const li = document.createElement('li');
  li.className = 'item-captura';
  li.innerHTML = `
    <div class="item-captura__fondo-borrar">Borrar</div>
    <div class="item-captura__contenido">${req.texto}</div>
  `;

  const contenido = li.querySelector('.item-captura__contenido');
  let inicioX = null;

  contenido.addEventListener('pointerdown', (evento) => { inicioX = evento.clientX; });
  contenido.addEventListener('pointermove', (evento) => {
    if (inicioX === null) return;
    const delta = evento.clientX - inicioX;
    if (delta < 0) contenido.style.transform = `translateX(${delta}px)`;
  });
  contenido.addEventListener('pointerup', (evento) => {
    if (inicioX === null) return;
    const delta = evento.clientX - inicioX;
    if (delta < -80) {
      DB.eliminarRequerimiento(req.id).then(alBorrar);
    } else {
      contenido.style.transform = 'translateX(0)';
    }
    inicioX = null;
  });

  return li;
}
