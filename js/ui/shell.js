(function () {
  const raiz = typeof window !== 'undefined' ? window : globalThis;

  // Piezas compartidas por las pantallas de una obra:
  // - encabezado: botón para volver, título y subtítulo.
  // - barraPasos: barra inferior fija con los 4 pasos de la obra.
  // - reservarAlto: publica el alto de un elemento fijo en una variable CSS de
  //   :root (--alto-barra-inferior, --alto-dock) para que el aviso (toast), el
  //   dock y el relleno inferior de #app no queden tapados. El router vuelve
  //   esas variables a 0 al cambiar de pantalla.

  const ICONO_PASO = {
    captura: 'mic',
    revision: 'etiqueta',
    brief: 'documento',
    checklist: 'obra'
  };

  function crear(etiqueta, clase, texto) {
    const el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto !== undefined && texto !== null) el.textContent = String(texto);
    return el;
  }

  // Mide `elemento` cada vez que cambia de tamaño y escribe su alto en
  // `variable` sobre :root. Si el elemento ya salió del documento (la pantalla
  // cambió), deja de observar y no toca la variable: la nueva pantalla manda.
  function reservarAlto(elemento, variable) {
    const html = document.documentElement;
    function publicar() {
      if (!elemento.isConnected) return false;
      html.style.setProperty(variable, elemento.offsetHeight + 'px');
      return true;
    }
    if (typeof ResizeObserver === 'function') {
      const observador = new ResizeObserver(() => {
        if (!publicar()) observador.disconnect();
      });
      observador.observe(elemento);
    } else {
      requestAnimationFrame(publicar);
    }
  }

  function encabezado(opciones) {
    const o = opciones || {};
    const header = crear('header', 'encabezado');

    if (o.atras) {
      const atras = crear('button', 'encabezado__atras');
      atras.type = 'button';
      if (raiz.Iconos) atras.innerHTML = raiz.Iconos.svg('atras', 22);
      atras.appendChild(crear('span', null, o.atras.etiqueta));
      atras.addEventListener('click', () => raiz.Router.navegar(o.atras.ruta));
      header.appendChild(atras);
    }

    const textos = crear('div', 'encabezado__textos');
    textos.appendChild(crear('h1', 'encabezado__titulo texto-seguro', o.titulo));
    if (o.subtitulo) textos.appendChild(crear('p', 'encabezado__subtitulo texto-seguro', o.subtitulo));
    header.appendChild(textos);

    return header;
  }

  function barraPasos(opciones) {
    const o = opciones || {};
    const proyecto = o.proyecto;
    const pasos = raiz.Pasos.calcular(proyecto, o.requerimientos || []);

    const nav = crear('nav', 'barra-pasos');
    nav.setAttribute('aria-label', 'Pasos de la obra');
    const lista = crear('ol', 'barra-pasos__lista');
    let ocupado = false;

    async function ir(paso) {
      if (ocupado) return;
      ocupado = true;
      try {
        if (paso.id === 'brief' && proyecto.estado === 'captura') {
          await raiz.DB.actualizarProyecto(proyecto.id, { estado: 'brief_generado' });
          // Si mientras tanto se cambió de pantalla, no se navega.
          if (!nav.isConnected) return;
        }
        raiz.Router.navegar(paso.id, { proyectoId: proyecto.id });
      } catch (err) {
        console.error('Shell: no se pudo cambiar de paso', err);
        if (nav.isConnected && raiz.Avisos) raiz.Avisos.toast({ mensaje: 'No se pudo abrir ese paso. Inténtalo de nuevo.' });
      } finally {
        ocupado = false;
      }
    }

    pasos.forEach((paso) => {
      const li = document.createElement('li');
      const boton = crear('button', 'paso');
      boton.type = 'button';
      boton.dataset.paso = paso.id;
      const actual = paso.id === o.pasoActual;

      const icono = crear('span', 'paso__icono');
      if (raiz.Iconos) icono.innerHTML = raiz.Iconos.svg(ICONO_PASO[paso.id], 24);
      if (paso.completado && !actual) {
        const marca = crear('span', 'paso__marca');
        if (raiz.Iconos) marca.innerHTML = raiz.Iconos.svg('check', 12);
        icono.appendChild(marca);
      }
      boton.appendChild(icono);
      boton.appendChild(crear('span', 'paso__etiqueta', paso.etiqueta));
      if (paso.completado) boton.appendChild(crear('span', 'visualmente-oculto', ', completado'));

      if (actual) boton.setAttribute('aria-current', 'step');
      // aria-disabled (no `disabled`) para que el paso siga siendo legible y
      // anunciable por lectores de pantalla; el clic se ignora.
      if (!paso.habilitado) boton.setAttribute('aria-disabled', 'true');

      boton.addEventListener('click', () => {
        if (!paso.habilitado || actual) return;
        ir(paso);
      });

      li.appendChild(boton);
      lista.appendChild(li);
    });

    nav.appendChild(lista);
    // Se mide la lista (sin el relleno del área segura, que el CSS suma aparte).
    reservarAlto(lista, '--alto-barra-inferior');
    return nav;
  }

  const Shell = { encabezado, barraPasos, reservarAlto };

  raiz.Shell = Shell;
})();
