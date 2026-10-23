window.Views = window.Views || {};

(function () {
  // Pantalla de captura: lista de requerimientos (el más reciente arriba) y un
  // dock fijo sobre la barra de pasos con el micrófono (acción principal) y el
  // campo de texto. Un dictado = un requerimiento, sin tocar Enter.

  const UMBRAL_SWIPE_PX = 80;
  const UMBRAL_GESTO_PX = 10;
  // Red de seguridad: speech.js no avisa cuando el reconocimiento termina sin
  // resultado ni error. Pasado este tiempo se detiene (stop entrega lo oído).
  const LIMITE_ESCUCHA_MS = 30000;

  const MENSAJES_ERROR_VOZ = {
    'not-allowed': 'Para dictar, permite el uso del micrófono en la configuración del navegador.',
    'service-not-allowed': 'Para dictar, permite el uso del micrófono en la configuración del navegador.',
    'no-speech': 'No se escuchó nada. Toca el micrófono e inténtalo de nuevo.',
    'audio-capture': 'No se encontró un micrófono. Escribe el requerimiento.',
    'network': 'El dictado necesita conexión a internet. Escribe el requerimiento.'
  };
  const MENSAJE_ERROR_VOZ = 'No se pudo usar el dictado. Inténtalo de nuevo.';

  function crear(etiqueta, clase, texto) {
    const el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto !== undefined && texto !== null) el.textContent = String(texto);
    return el;
  }

  function movimientoReducido() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function render(container, { proyectoId }) {
    const vista = crear('div', 'vista-captura');
    container.appendChild(vista);

    DB.obtenerProyecto(proyectoId)
      .then((proyecto) => {
        if (!vista.isConnected) return;
        if (!proyecto) {
          mostrarNoEncontrada(vista);
          return;
        }
        montar(vista, proyecto);
      })
      .catch((err) => {
        console.error('Captura: no se pudo abrir la obra', err);
        if (vista.isConnected) mostrarNoEncontrada(vista, 'No se pudo abrir la obra. Inténtalo de nuevo.');
      });
  }

  function mostrarNoEncontrada(vista, mensaje) {
    vista.appendChild(Shell.encabezado({
      titulo: 'Obra no encontrada',
      atras: { etiqueta: 'Mis obras', ruta: 'proyectos' }
    }));
    vista.appendChild(crear('p', 'mensaje-vista', mensaje || 'Esta obra ya no existe. Vuelve a Mis obras.'));
  }

  function montar(vista, proyecto) {
    const proyectoId = proyecto.id;
    const borrado = BorradoDiferido.crear((id) => DB.eliminarRequerimiento(id));
    const hayVoz = Speech.disponible();

    vista.appendChild(Shell.encabezado({
      titulo: proyecto.nombre,
      subtitulo: proyecto.cliente,
      atras: { etiqueta: 'Mis obras', ruta: 'proyectos' }
    }));

    // ------------------------------------------------------------ Lista
    const principal = crear('main', 'captura');
    const cabecera = crear('div', 'captura__cabecera');
    const titulo = crear('h2', 'captura__titulo', 'Requerimientos');
    titulo.id = 'captura-titulo';
    titulo.tabIndex = -1;
    const contador = crear('span', 'captura__contador');
    cabecera.append(titulo, contador);

    const lista = crear('ul', 'lista-reqs');
    lista.setAttribute('aria-labelledby', 'captura-titulo');

    const vacio = crear('div', 'vacio');
    const vacioIcono = crear('span', 'vacio__icono');
    vacioIcono.innerHTML = Iconos.svg(hayVoz ? 'mic' : 'lista', 32);
    const vacioTitulo = crear('h2', 'vacio__titulo', 'Todavía no hay requerimientos');
    vacioTitulo.tabIndex = -1;
    const vacioTexto = crear('p', 'vacio__texto', hayVoz
      ? 'Toca el micrófono y di el primero. Cada dictado se guarda como un requerimiento.'
      : 'Escribe el primero en el campo de abajo.');
    vacio.append(vacioIcono, vacioTitulo, vacioTexto);

    cabecera.hidden = true;
    vacio.hidden = true;
    principal.append(cabecera, lista, vacio);
    vista.appendChild(principal);

    // ------------------------------------------------------------- Dock
    const dock = crear('div', 'dock');
    dock.hidden = true; // se muestra junto con la barra de pasos

    const form = crear('form', 'dock__form');
    form.noValidate = true;
    const etiquetaCampo = crear('label', 'visualmente-oculto', 'Nuevo requerimiento');
    etiquetaCampo.htmlFor = 'captura-campo';
    const campo = crear('input', 'campo dock__campo');
    campo.id = 'captura-campo';
    campo.type = 'text';
    campo.autocomplete = 'off';
    campo.placeholder = 'Escribe un requerimiento';
    campo.setAttribute('autocapitalize', 'sentences');
    campo.setAttribute('enterkeyhint', 'send');
    const enviar = crear('button', 'dock__enviar');
    enviar.type = 'submit';
    enviar.setAttribute('aria-label', 'Agregar requerimiento');
    enviar.innerHTML = Iconos.svg('enviar', 22);
    // Tocar "enviar" no le quita el foco al campo: el teclado sigue abierto
    // para escribir el siguiente.
    enviar.addEventListener('mousedown', (e) => e.preventDefault());
    form.append(etiquetaCampo, campo, enviar);
    dock.appendChild(form);

    let mic = null;
    let estadoVoz = null;
    if (hayVoz) {
      const zonaVoz = crear('div', 'dock__voz');
      mic = crear('button', 'mic');
      mic.type = 'button';
      mic.setAttribute('aria-label', 'Dictar');
      mic.innerHTML = Iconos.svg('mic', 34);
      estadoVoz = crear('p', 'dock__estado', 'Toca para dictar');
      estadoVoz.setAttribute('aria-hidden', 'true');
      zonaVoz.append(mic, estadoVoz);
      dock.appendChild(zonaVoz);
    }

    vista.appendChild(dock);
    Shell.reservarAlto(dock, '--alto-dock');

    // ----------------------------------------------------- Renderizado
    let barra = null;
    let version = 0;

    async function recargar(opciones) {
      const o = opciones || {};
      const mia = ++version;
      let reqs;
      try {
        reqs = await DB.listarRequerimientos(proyectoId);
      } catch (err) {
        console.error('Captura: no se pudo leer la lista', err);
        if (vista.isConnected && mia === version) Avisos.toast({ mensaje: 'No se pudo cargar la lista.' });
        return null;
      }
      if (mia !== version || !vista.isConnected) return null;

      // Los que esperan borrado diferido no se muestran ni cuentan para los pasos.
      const visibles = reqs.filter((r) => !borrado.estaPendiente(r.id));
      pintarLista(visibles, o.nuevoId);

      const nueva = Shell.barraPasos({ proyecto, requerimientos: visibles, pasoActual: 'captura' });
      if (barra) barra.replaceWith(nueva);
      else vista.appendChild(nueva);
      barra = nueva;
      dock.hidden = false;
      return visibles;
    }

    function pintarLista(visibles, nuevoId) {
      lista.textContent = '';
      visibles.slice().reverse().forEach((req) => {
        const tarjeta = crearTarjeta(req);
        if (req.id === nuevoId && !movimientoReducido()) tarjeta.classList.add('req--nueva');
        lista.appendChild(tarjeta);
      });
      contador.textContent = String(visibles.length);
      cabecera.hidden = visibles.length === 0;
      vacio.hidden = visibles.length > 0;
    }

    function crearTarjeta(req) {
      const li = crear('li', 'req');
      const idTexto = 'req-texto-' + req.id;

      const fondo = crear('div', 'req__fondo');
      fondo.setAttribute('aria-hidden', 'true');
      fondo.innerHTML = Iconos.svg('basura', 22);
      fondo.appendChild(crear('span', null, 'Borrar'));

      const cuerpo = crear('div', 'req__cuerpo');
      const texto = crear('p', 'req__texto texto-seguro', req.texto);
      texto.id = idTexto;
      const botonBorrar = crear('button', 'req__borrar');
      botonBorrar.type = 'button';
      botonBorrar.setAttribute('aria-label', 'Borrar');
      botonBorrar.setAttribute('aria-describedby', idTexto);
      botonBorrar.innerHTML = Iconos.svg('basura', 22);
      botonBorrar.addEventListener('click', () => borrar(req, li));
      cuerpo.append(texto, botonBorrar);
      li.append(fondo, cuerpo);

      activarSwipe(li, cuerpo, () => borrar(req, li));
      return li;
    }

    // Swipe a la izquierda para borrar. El desplazamiento se publica en
    // --desplazamiento; touch-action: pan-y deja el scroll vertical al navegador.
    function activarSwipe(li, cuerpo, alBorrar) {
      let inicio = null; // { x, y, id }
      let arrastrando = false;
      let dx = 0;
      let huboSwipe = false;

      function mover(valor) {
        li.style.setProperty('--desplazamiento', valor);
      }

      cuerpo.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        inicio = { x: e.clientX, y: e.clientY, id: e.pointerId };
        arrastrando = false;
        huboSwipe = false;
        dx = 0;
      });

      cuerpo.addEventListener('pointermove', (e) => {
        if (!inicio || e.pointerId !== inicio.id) return;
        const mx = e.clientX - inicio.x;
        const my = e.clientY - inicio.y;
        if (!arrastrando) {
          if (Math.abs(my) > UMBRAL_GESTO_PX && Math.abs(my) >= Math.abs(mx)) {
            inicio = null; // es un scroll vertical
            return;
          }
          if (mx > -UMBRAL_GESTO_PX || Math.abs(mx) <= Math.abs(my)) return;
          arrastrando = true;
          li.classList.add('req--arrastrando');
          try { cuerpo.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
        }
        dx = Math.min(0, mx);
        mover(dx + 'px');
        li.classList.toggle('req--listo', dx <= -UMBRAL_SWIPE_PX);
      });

      function terminar(e, cancelado) {
        if (!inicio || e.pointerId !== inicio.id) return;
        inicio = null;
        if (!arrastrando) return;
        arrastrando = false;
        huboSwipe = true;
        li.classList.remove('req--arrastrando');
        if (!cancelado && dx <= -UMBRAL_SWIPE_PX) {
          li.classList.add('req--saliendo');
          mover('-100%');
          setTimeout(alBorrar, movimientoReducido() ? 0 : 180);
        } else {
          li.classList.remove('req--listo');
          mover('0px');
        }
      }

      cuerpo.addEventListener('pointerup', (e) => terminar(e, false));
      cuerpo.addEventListener('pointercancel', (e) => terminar(e, true));
      // Un arrastre no debe terminar en clic sobre el botón de borrar.
      li.addEventListener('click', (e) => {
        if (!huboSwipe) return;
        huboSwipe = false;
        e.stopPropagation();
        e.preventDefault();
      }, true);
    }

    // ------------------------------------------------------- Acciones
    function borrar(req, li) {
      if (borrado.estaPendiente(req.id)) return;
      const botones = Array.from(lista.querySelectorAll('.req__borrar'));
      const activo = document.activeElement;
      const indice = botones.indexOf(activo);
      const teniaFoco = indice !== -1 || (li && li.contains(activo));

      borrado.marcar(req.id);
      // El toast va primero: reemplaza al anterior y confirma su borrado
      // pendiente antes de volver a leer la lista.
      Avisos.toast({
        mensaje: 'Requerimiento borrado',
        accionEtiqueta: 'Deshacer',
        alAccionar: () => {
          borrado.deshacer(req.id);
          if (vista.isConnected) recargar();
        },
        alCerrar: () => {
          borrado.confirmar(req.id).catch((err) => {
            console.error('Captura: no se pudo borrar', err);
            if (!vista.isConnected) return;
            recargar();
            Avisos.toast({ mensaje: 'No se pudo borrar el requerimiento.' });
          });
        }
      });

      recargar().then((visibles) => {
        if (!visibles || !teniaFoco) return;
        // Se devuelve el foco a un lugar cercano (quien usa teclado no lo pierde).
        const restantes = lista.querySelectorAll('.req__borrar');
        const pos = Math.max(0, indice);
        const destino = restantes[pos] || restantes[pos - 1] || (visibles.length ? titulo : vacioTitulo);
        destino.focus();
      });
    }

    async function agregar(textoCrudo, origen) {
      const limpio = String(textoCrudo || '').trim();
      if (!limpio) {
        if (origen === 'voz' && vista.isConnected) Avisos.toast({ mensaje: 'No se entendió, inténtalo de nuevo.' });
        return false;
      }
      let req;
      try {
        req = await DB.crearRequerimiento(proyectoId, limpio);
      } catch (err) {
        console.error('Captura: no se pudo guardar', err);
        if (vista.isConnected) Avisos.toast({ mensaje: 'No se pudo guardar el requerimiento.' });
        return false;
      }
      // Si se cambió de pantalla, queda guardado pero no se toca el DOM.
      if (!vista.isConnected) return true;

      Avisos.toast({
        mensaje: 'Requerimiento agregado',
        accionEtiqueta: 'Deshacer',
        alAccionar: () => {
          DB.eliminarRequerimiento(req.id)
            .then(() => { if (vista.isConnected) recargar(); })
            .catch((err) => {
              console.error('Captura: no se pudo deshacer', err);
              if (vista.isConnected) Avisos.toast({ mensaje: 'No se pudo deshacer.' });
            });
        }
      });
      await recargar({ nuevoId: req.id });
      return true;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const valor = campo.value;
      if (!valor.trim()) {
        campo.value = '';
        return;
      }
      campo.value = '';
      const ok = await agregar(valor, 'texto');
      // Si falló, se devuelve el texto para no perderlo.
      if (!ok && vista.isConnected && !campo.value) campo.value = valor;
    });

    // ---------------------------------------------------------- Dictado
    let escuchando = false;
    let sesion = 0;
    let limite = null;

    function ponerEscucha(activo) {
      escuchando = activo;
      clearTimeout(limite);
      if (!mic) return;
      mic.classList.toggle('mic--escuchando', activo);
      mic.setAttribute('aria-label', activo ? 'Detener' : 'Dictar');
      dock.classList.toggle('dock--escuchando', activo);
      estadoVoz.textContent = activo ? 'Escuchando… toca para terminar' : 'Toca para dictar';
      if (activo) {
        limite = setTimeout(() => {
          if (!escuchando) return;
          Speech.detener();
          ponerEscucha(false);
        }, LIMITE_ESCUCHA_MS);
      }
    }

    function avisarErrorVoz(err) {
      const codigo = err && err.code;
      if (codigo === 'aborted') return;
      Avisos.toast({ mensaje: MENSAJES_ERROR_VOZ[codigo] || MENSAJE_ERROR_VOZ });
    }

    if (mic) {
      mic.addEventListener('click', () => {
        if (escuchando) {
          // stop() entrega lo que ya se oyó como resultado.
          Speech.detener();
          ponerEscucha(false);
          return;
        }
        const mia = ++sesion;
        ponerEscucha(true);
        const esActual = () => mia === sesion && escuchando;
        try {
          Speech.iniciar({
            onResultado: (texto) => {
              if (esActual()) ponerEscucha(false);
              // Aunque la pantalla haya cambiado, lo dictado se guarda.
              agregar(texto, 'voz');
            },
            onError: (err) => {
              const actual = esActual();
              if (actual) ponerEscucha(false);
              if (!vista.isConnected) return;
              const permiso = err && (err.code === 'not-allowed' || err.code === 'service-not-allowed');
              // Tras tocar "Detener" no se avisa (salvo un problema de permiso).
              if (actual || permiso) avisarErrorVoz(err);
            }
          });
        } catch (err) {
          console.error('Captura: no se pudo iniciar el dictado', err);
          ponerEscucha(false);
          Avisos.toast({ mensaje: MENSAJE_ERROR_VOZ });
        }
      });

      // Al salir de la pantalla se detiene el dictado en curso.
      window.addEventListener('hashchange', () => {
        clearTimeout(limite);
        if (escuchando) {
          escuchando = false;
          Speech.detener();
        }
      }, { once: true });
    }

    recargar();
  }

  window.Views.captura = { render };
})();
