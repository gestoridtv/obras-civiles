window.Views = window.Views || {};

(function () {
  // Pantalla de inicio "Mis obras": una tarjeta por obra (toda la tarjeta es
  // un enlace que abre la obra en el paso que corresponde a su estado) con el
  // cliente, el nombre, la cantidad de requerimientos y el avance de 4 pasos.
  // Cada tarjeta tiene aparte un botón para borrar la obra (con confirmación).
  // Nueva obra: botón flotante naranja, o el botón del estado vacío.

  const ETIQUETA_ESTADO = {
    captura: 'En captura',
    brief_generado: 'Brief generado',
    aprobado: 'Aprobado',
  };

  const RUTA_SEGUN_ESTADO = {
    captura: 'captura',
    brief_generado: 'brief',
    aprobado: 'checklist',
  };

  const TOTAL_PASOS = 4;

  function crear(etiqueta, clase, texto) {
    const el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto !== undefined && texto !== null) el.textContent = String(texto);
    return el;
  }

  function plural(n, uno, varios) {
    return n + ' ' + (n === 1 ? uno : varios);
  }

  function render(container) {
    const vista = crear('div', 'vista-obras');
    container.appendChild(vista);

    // ------------------------------------------------------ Encabezado
    const header = crear('header', 'encabezado encabezado--inicio');
    const marca = crear('span', 'encabezado__logo');
    marca.innerHTML = Iconos.logo(40);
    const textos = crear('div', 'encabezado__textos');
    const titulo = crear('h1', 'encabezado__titulo', 'Mis obras');
    titulo.tabIndex = -1;
    const subtitulo = crear('p', 'encabezado__subtitulo');
    subtitulo.hidden = true;
    textos.append(titulo, subtitulo);
    header.append(marca, textos);
    vista.appendChild(header);

    const principal = crear('main', 'obras');
    const lista = crear('ul', 'obras__lista');
    lista.setAttribute('aria-label', 'Obras');
    const vacio = crear('div', 'vacio vacio--inicio');
    vacio.hidden = true;
    const mensaje = crear('p', 'mensaje-vista');
    mensaje.hidden = true;
    principal.append(lista, vacio, mensaje);
    vista.appendChild(principal);

    // Estado vacío: logo grande, texto breve y botón principal.
    const vacioLogo = crear('span', 'vacio__logo');
    vacioLogo.innerHTML = Iconos.logo(88);
    const vacioTitulo = crear('h2', 'vacio__titulo', 'Aún no tienes obras');
    const vacioTexto = crear('p', 'vacio__texto',
      'Crea tu primera obra para registrar los requerimientos del cliente, armar el brief y controlar la obra.');
    const crearPrimera = crear('button', 'btn btn--primario');
    crearPrimera.type = 'button';
    crearPrimera.innerHTML = Iconos.svg('mas', 22);
    crearPrimera.appendChild(crear('span', null, 'Crear mi primera obra'));
    vacio.append(vacioLogo, vacioTitulo, vacioTexto, crearPrimera);

    // Botón flotante. Su zona fija publica el alto en --alto-dock para que el
    // aviso (toast) aparezca por encima y nunca lo tape.
    const zonaFab = crear('div', 'zona-fab');
    zonaFab.hidden = true;
    const fab = crear('button', 'fab');
    fab.type = 'button';
    fab.setAttribute('aria-label', 'Nueva obra');
    fab.innerHTML = Iconos.svg('mas', 30);
    zonaFab.appendChild(fab);
    vista.appendChild(zonaFab);
    Shell.reservarAlto(zonaFab, '--alto-dock');

    // ------------------------------------------------------ Datos
    let version = 0;
    let ocupado = false; // una sola hoja / operación a la vez

    function marcarOcupado(boton, si) {
      ocupado = si;
      // aria-busy (no `disabled`): el botón conserva el foco mientras espera.
      if (si) boton.setAttribute('aria-busy', 'true');
      else boton.removeAttribute('aria-busy');
    }

    async function recargar() {
      const mia = ++version;
      let proyectos;
      try {
        proyectos = await DB.listarProyectos();
      } catch (err) {
        console.error('Mis obras: no se pudo leer la lista', err);
        if (!vista.isConnected || mia !== version) return null;
        lista.textContent = '';
        mensaje.textContent = 'No se pudieron cargar las obras. Recarga la página para intentarlo de nuevo.';
        mensaje.hidden = false;
        return null;
      }
      if (mia !== version || !vista.isConnected) return null;

      // Una obra cuya lista no se puede leer no deja en blanco a las demás.
      const reqsPorObra = await Promise.all(proyectos.map((p) =>
        DB.listarRequerimientos(p.id).catch((err) => {
          console.error('Mis obras: no se pudieron leer los requerimientos de', p.id, err);
          return null;
        })));
      if (mia !== version || !vista.isConnected) return null;

      mensaje.hidden = true;
      lista.textContent = '';
      proyectos.forEach((p, i) => lista.appendChild(crearTarjeta(p, reqsPorObra[i])));

      const hay = proyectos.length > 0;
      lista.hidden = !hay;
      vacio.hidden = hay;
      zonaFab.hidden = !hay;
      subtitulo.hidden = !hay;
      subtitulo.textContent = plural(proyectos.length, 'obra', 'obras');
      return proyectos.length;
    }

    function crearTarjeta(proyecto, reqs) {
      const li = crear('li', 'obra');
      const nombre = proyecto.nombre || 'Obra sin nombre';
      const ruta = RUTA_SEGUN_ESTADO[proyecto.estado] || 'captura';

      const enlace = crear('a', 'obra__enlace');
      enlace.href = '#' + ruta + '/' + proyecto.id;
      enlace.addEventListener('click', (e) => {
        e.preventDefault();
        Router.navegar(ruta, { proyectoId: proyecto.id });
      });

      enlace.appendChild(crear('span', 'obra__cliente texto-seguro', proyecto.cliente || 'Sin cliente'));
      enlace.appendChild(crear('span', 'obra__nombre texto-seguro', nombre));

      const meta = crear('span', 'obra__meta');
      const estado = crear('span', 'obra__estado' + (proyecto.estado === 'aprobado' ? ' obra__estado--aprobado' : ''));
      if (proyecto.estado === 'aprobado') estado.innerHTML = Iconos.svg('check', 16);
      estado.appendChild(crear('span', null, ETIQUETA_ESTADO[proyecto.estado] || 'En captura'));
      const cantidad = crear('span', 'obra__cantidad',
        reqs ? plural(reqs.length, 'requerimiento', 'requerimientos') : 'Requerimientos no disponibles');
      meta.append(estado, cantidad);
      enlace.appendChild(meta);

      if (reqs) {
        const hechos = Pasos.avance(proyecto, reqs);
        const avance = crear('span', 'obra__avance');
        const segmentos = crear('span', 'obra__pasos');
        segmentos.setAttribute('role', 'img');
        segmentos.setAttribute('aria-label', 'Avance: ' + hechos + ' de ' + TOTAL_PASOS + ' pasos');
        for (let i = 0; i < TOTAL_PASOS; i += 1) {
          segmentos.appendChild(crear('span', 'obra__paso' + (i < hechos ? ' obra__paso--hecho' : '')));
        }
        const texto = crear('span', 'obra__avance-texto', hechos + ' de ' + TOTAL_PASOS + ' pasos');
        texto.setAttribute('aria-hidden', 'true');
        avance.append(segmentos, texto);
        enlace.appendChild(avance);
      }

      const borrar = crear('button', 'obra__borrar');
      borrar.type = 'button';
      borrar.setAttribute('aria-label', 'Borrar obra ' + nombre);
      borrar.innerHTML = Iconos.svg('basura', 22);
      borrar.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        borrarObra(proyecto, reqs, borrar);
      });

      li.append(enlace, borrar);
      return li;
    }

    // ------------------------------------------------------ Borrar
    async function borrarObra(proyecto, reqs, boton) {
      if (ocupado) return;
      const indice = Array.from(lista.children).indexOf(boton.closest('li'));
      marcarOcupado(boton, true);
      try {
        let detalle = '';
        if (reqs && reqs.length === 1) detalle = ' y su requerimiento';
        else if (reqs && reqs.length > 1) detalle = ' y sus ' + reqs.length + ' requerimientos';
        const acepto = await Avisos.confirmar({
          titulo: '¿Borrar esta obra?',
          mensaje: 'Se borrará «' + (proyecto.nombre || 'Obra sin nombre') + '»' + detalle +
            '. Esta acción no se puede deshacer.',
          etiquetaConfirmar: 'Borrar',
          peligro: true
        });
        // Cancelado, o la pantalla cambió mientras la hoja estaba abierta.
        if (!acepto || !vista.isConnected) return;
        await DB.eliminarProyecto(proyecto.id);
        if (!vista.isConnected) return;
        const quedan = await recargar();
        if (!vista.isConnected || quedan === null) return;
        Avisos.toast({ mensaje: 'Obra borrada.' });
        enfocarTrasBorrar(indice, quedan);
      } catch (err) {
        console.error('Mis obras: no se pudo borrar la obra', err);
        if (vista.isConnected) Avisos.toast({ mensaje: 'No se pudo borrar la obra. Inténtalo de nuevo.' });
      } finally {
        if (vista.isConnected) marcarOcupado(boton, false);
        ocupado = false;
      }
    }

    // El botón borrado ya no existe: el foco pasa a la tarjeta que ocupó su
    // lugar (o a la última), o al botón del estado vacío.
    function enfocarTrasBorrar(indice, quedan) {
      if (quedan === 0) {
        crearPrimera.focus();
        return;
      }
      const enlaces = lista.querySelectorAll('.obra__enlace');
      const destino = enlaces[Math.min(Math.max(indice, 0), enlaces.length - 1)];
      if (destino) destino.focus();
    }

    // ------------------------------------------------------ Crear
    async function nuevaObra(boton) {
      if (ocupado) return;
      marcarOcupado(boton, true);
      try {
        const valores = await Avisos.formulario({
          titulo: 'Nueva obra',
          campos: [
            { id: 'nombre', etiqueta: 'Nombre de la obra', placeholder: 'Ej.: Casa Pérez' },
            { id: 'cliente', etiqueta: 'Cliente', placeholder: 'Nombre del cliente' }
          ],
          etiquetaEnviar: 'Crear obra'
        });
        if (!valores || !vista.isConnected) return;
        const proyecto = await DB.crearProyecto({ nombre: valores.nombre, cliente: valores.cliente });
        if (!vista.isConnected) return;
        Router.navegar('captura', { proyectoId: proyecto.id });
      } catch (err) {
        console.error('Mis obras: no se pudo crear la obra', err);
        if (vista.isConnected) Avisos.toast({ mensaje: 'No se pudo crear la obra. Inténtalo de nuevo.' });
      } finally {
        if (vista.isConnected) marcarOcupado(boton, false);
        ocupado = false;
      }
    }

    fab.addEventListener('click', () => nuevaObra(fab));
    crearPrimera.addEventListener('click', () => nuevaObra(crearPrimera));

    recargar();
  }

  window.Views.proyectos = { render };
})();
