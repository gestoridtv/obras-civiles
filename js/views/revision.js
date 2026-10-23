window.Views = window.Views || {};

(function () {
  // Pantalla de revisión: cada requerimiento en una tarjeta con su texto
  // (editable con el botón de lápiz), su categoría (chip que abre una hoja
  // inferior) y el botón de borrar (borrado diferido con "Deshacer").
  // Arriba, el resumen "N de M con categoría"; abajo, fijo sobre la barra de
  // pasos, el botón "Generar brief", que solo se habilita con todo clasificado.

  function crear(etiqueta, clase, texto) {
    const el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto !== undefined && texto !== null) el.textContent = String(texto);
    return el;
  }

  // Compara nombres de categoría sin distinguir mayúsculas ni espacios de más:
  // "plomería", " Plomería " y "PLOMERÍA" son la misma categoría.
  function claveCategoria(nombre) {
    return String(nombre).trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
  }

  function render(container, { proyectoId }) {
    const vista = crear('div', 'vista-revision');
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
        console.error('Revisión: no se pudo abrir la obra', err);
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
    if (!Array.isArray(proyecto.categorias)) proyecto.categorias = [];
    const borrado = BorradoDiferido.crear((id) => DB.eliminarRequerimiento(id));

    vista.appendChild(Shell.encabezado({
      titulo: proyecto.nombre,
      subtitulo: proyecto.cliente,
      atras: { etiqueta: 'Mis obras', ruta: 'proyectos' }
    }));

    // ---------------------------------------------------------- Resumen
    const principal = crear('main', 'revision');

    const resumen = crear('section', 'resumen');
    resumen.setAttribute('aria-labelledby', 'revision-titulo');
    const titulo = crear('h2', 'resumen__titulo', 'Clasifica cada requerimiento');
    titulo.id = 'revision-titulo';
    titulo.tabIndex = -1;
    const cifra = crear('p', 'resumen__cifra');
    const barraAvance = crear('div', 'resumen__barra');
    barraAvance.setAttribute('aria-hidden', 'true');
    barraAvance.appendChild(crear('span', 'resumen__relleno'));
    const nota = crear('p', 'resumen__nota');
    resumen.append(titulo, cifra, barraAvance, nota);

    const lista = crear('ul', 'lista-reqs');
    lista.setAttribute('aria-labelledby', 'revision-titulo');

    const vacio = crear('div', 'vacio');
    const vacioIcono = crear('span', 'vacio__icono');
    vacioIcono.innerHTML = Iconos.svg('lista', 32);
    const vacioTitulo = crear('h2', 'vacio__titulo', 'No hay nada que revisar');
    vacioTitulo.tabIndex = -1;
    const vacioTexto = crear('p', 'vacio__texto',
      'Esta obra todavía no tiene requerimientos. Agrégalos en Captura y vuelve aquí para clasificarlos.');
    const irCaptura = crear('button', 'btn btn--primario');
    irCaptura.type = 'button';
    irCaptura.innerHTML = Iconos.svg('mic', 20);
    irCaptura.appendChild(crear('span', null, 'Ir a Captura'));
    irCaptura.addEventListener('click', () => Router.navegar('captura', { proyectoId }));
    vacio.append(vacioIcono, vacioTitulo, vacioTexto, irCaptura);

    resumen.hidden = true;
    vacio.hidden = true;
    principal.append(resumen, lista, vacio);
    vista.appendChild(principal);

    // ------------------------------------------- Acción principal (fija)
    const dock = crear('div', 'dock dock--revision');
    dock.hidden = true; // se muestra junto con la barra de pasos
    const pista = crear('p', 'dock__nota');
    pista.id = 'revision-pista';
    const generar = crear('button', 'btn btn--primario dock__principal');
    generar.type = 'button';
    generar.innerHTML = Iconos.svg('documento', 22);
    generar.appendChild(crear('span', null, 'Generar brief'));
    dock.append(pista, generar);
    vista.appendChild(dock);
    Shell.reservarAlto(dock, '--alto-dock');

    // ----------------------------------------------------- Renderizado
    let barra = null;
    let version = 0;
    let listos = false; // todos los visibles tienen categoría (y hay al menos uno)
    let edicion = null; // { id, input, terminar }
    let repintando = false;

    async function recargar() {
      const mia = ++version;
      let reqs;
      try {
        reqs = await DB.listarRequerimientos(proyectoId);
      } catch (err) {
        console.error('Revisión: no se pudo leer la lista', err);
        if (vista.isConnected && mia === version) Avisos.toast({ mensaje: 'No se pudo cargar la lista.' });
        return null;
      }
      if (mia !== version || !vista.isConnected) return null;

      // Los que esperan borrado diferido no se muestran ni cuentan para los pasos.
      const visibles = reqs.filter((r) => !borrado.estaPendiente(r.id));
      pintarLista(visibles);
      pintarResumen(visibles);

      const nueva = Shell.barraPasos({ proyecto, requerimientos: visibles, pasoActual: 'revision' });
      if (barra) barra.replaceWith(nueva);
      else vista.appendChild(nueva);
      barra = nueva;
      return visibles;
    }

    function pintarResumen(visibles) {
      const total = visibles.length;
      const conCategoria = visibles.filter((r) => !!r.categoria).length;
      const faltan = total - conCategoria;
      listos = total > 0 && faltan === 0;

      resumen.hidden = total === 0;
      vacio.hidden = total > 0;
      dock.hidden = total === 0;

      cifra.textContent = '';
      cifra.appendChild(crear('strong', null, conCategoria));
      cifra.appendChild(document.createTextNode(' de ' + total + ' con categoría'));
      resumen.style.setProperty('--avance', (total ? Math.round((conCategoria / total) * 100) : 0) + '%');
      resumen.classList.toggle('resumen--completo', listos);

      nota.textContent = '';
      if (listos) {
        nota.innerHTML = Iconos.svg('check', 20);
        nota.appendChild(crear('span', null, 'Todo clasificado.'));
      } else {
        nota.textContent = faltan === 1
          ? 'Falta 1 por clasificar.'
          : 'Faltan ' + faltan + ' por clasificar.';
      }

      // aria-disabled (no `disabled`): el botón sigue enfocable y anuncia la pista.
      if (listos) {
        generar.removeAttribute('aria-disabled');
        generar.removeAttribute('aria-describedby');
        pista.hidden = true;
      } else {
        generar.setAttribute('aria-disabled', 'true');
        generar.setAttribute('aria-describedby', pista.id);
        pista.textContent = faltan === 1
          ? 'Asigna categoría al requerimiento que falta para generar el brief.'
          : 'Asigna categoría a los ' + faltan + ' requerimientos que faltan para generar el brief.';
        pista.hidden = false;
      }
    }

    function pintarLista(visibles) {
      // Se recuerda dónde estaba el foco para devolverlo a la tarjeta nueva.
      const activo = document.activeElement;
      let foco = null;
      if (activo && lista.contains(activo) && activo.dataset.accion) {
        const li = activo.closest('.rev');
        if (li) foco = { id: li.dataset.id, accion: activo.dataset.accion };
      }
      // Una edición en curso sobrevive al repintado con lo que ya se escribió.
      let enCurso = null;
      if (edicion) {
        enCurso = { id: edicion.id, valor: edicion.input.value };
        edicion = null;
      }

      repintando = true;
      lista.textContent = '';
      visibles.forEach((req) => lista.appendChild(crearTarjeta(req, enCurso)));
      repintando = false;

      if (foco && !(enCurso && enCurso.id === foco.id)) {
        const destino = buscarEnTarjeta(foco.id, foco.accion);
        if (destino) destino.focus();
      }
    }

    function buscarEnTarjeta(id, accion) {
      const li = Array.from(lista.children).find((el) => el.dataset.id === id);
      return li ? li.querySelector('[data-accion="' + accion + '"]') : null;
    }

    function crearTarjeta(req, enCurso) {
      const li = crear('li', 'rev');
      li.dataset.id = req.id;
      const idTexto = 'rev-texto-' + req.id;

      const fila = crear('div', 'rev__fila');
      const texto = crear('p', 'rev__texto texto-seguro', req.texto);
      texto.id = idTexto;
      const editar = crear('button', 'rev__icono');
      editar.type = 'button';
      editar.dataset.accion = 'editar';
      editar.setAttribute('aria-label', 'Editar texto');
      editar.setAttribute('aria-describedby', idTexto);
      editar.innerHTML = Iconos.svg('editar', 22);
      fila.append(texto, editar);

      const pie = crear('div', 'rev__pie');
      const categoria = crear('button', 'rev__categoria');
      categoria.type = 'button';
      categoria.dataset.accion = 'categoria';
      categoria.setAttribute('aria-describedby', idTexto);
      categoria.innerHTML = Iconos.svg('etiqueta', 18);
      categoria.appendChild(crear('span', 'visualmente-oculto', 'Categoría: '));
      categoria.appendChild(crear('span', 'rev__categoria-texto texto-seguro', req.categoria || 'Sin categoría'));
      if (!req.categoria) categoria.classList.add('rev__categoria--sin');
      li.classList.toggle('rev--sin', !req.categoria);

      const borrar = crear('button', 'rev__icono rev__borrar');
      borrar.type = 'button';
      borrar.dataset.accion = 'borrar';
      borrar.setAttribute('aria-label', 'Borrar');
      borrar.setAttribute('aria-describedby', idTexto);
      borrar.innerHTML = Iconos.svg('basura', 22);
      pie.append(categoria, borrar);

      li.append(fila, pie);

      const refs = { li, texto, editar };
      editar.addEventListener('click', () => iniciarEdicion(req, refs));
      categoria.addEventListener('click', () => elegirCategoria(req));
      borrar.addEventListener('click', () => borrarReq(req));

      if (enCurso && enCurso.id === req.id) {
        // Se reanuda después de insertar la tarjeta (necesita estar en el DOM).
        Promise.resolve().then(() => {
          if (li.isConnected && !edicion) iniciarEdicion(req, refs, enCurso.valor);
        });
      }
      return li;
    }

    // ------------------------------------------------------- Edición
    // El texto se cambia por un campo. Enter o salir del campo guardan;
    // Escape cancela; vacío conserva el texto anterior.
    function iniciarEdicion(req, refs, valorInicial) {
      if (edicion) edicion.terminar(true, false);

      const input = crear('input', 'campo rev__campo');
      input.type = 'text';
      input.autocomplete = 'off';
      input.value = valorInicial !== undefined ? valorInicial : req.texto;
      input.setAttribute('aria-label', 'Texto del requerimiento');
      input.setAttribute('autocapitalize', 'sentences');
      input.setAttribute('enterkeyhint', 'done');

      refs.texto.hidden = true;
      refs.editar.hidden = true;
      refs.texto.before(input);
      refs.li.classList.add('rev--editando');

      let terminado = false;
      function terminar(guardar, devolverFoco) {
        if (terminado) return;
        terminado = true;
        if (edicion && edicion.input === input) edicion = null;

        const nuevo = input.value.trim();
        const conservarFoco = devolverFoco || document.activeElement === input;
        input.remove();
        refs.texto.hidden = false;
        refs.editar.hidden = false;
        refs.li.classList.remove('rev--editando');
        if (conservarFoco && refs.editar.isConnected) refs.editar.focus();

        if (!guardar || !nuevo || nuevo === req.texto) return;
        const anterior = req.texto;
        req.texto = nuevo;
        refs.texto.textContent = nuevo;
        DB.actualizarRequerimiento(req.id, { texto: nuevo }).catch((err) => {
          console.error('Revisión: no se pudo guardar el texto', err);
          if (req.texto === nuevo) req.texto = anterior;
          if (!vista.isConnected) return;
          if (refs.texto.isConnected && refs.texto.textContent === nuevo) refs.texto.textContent = anterior;
          Avisos.toast({
            mensaje: 'No se pudo guardar el cambio.',
            accionEtiqueta: 'Reintentar',
            alAccionar: () => {
              if (!vista.isConnected) return;
              const destino = buscarEnTarjeta(req.id, 'editar');
              if (destino) destino.click();
              if (edicion && edicion.id === req.id) edicion.input.value = nuevo;
            }
          });
        });
      }

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          terminar(true, true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          terminar(false, true);
        }
      });
      input.addEventListener('blur', () => {
        // Al repintar la lista la edición se reanuda en la tarjeta nueva.
        if (repintando) return;
        terminar(true, false);
      });

      edicion = { id: req.id, input, terminar };
      input.focus();
      const fin = input.value.length;
      try { input.setSelectionRange(fin, fin); } catch (err) { /* sin selección */ }
    }

    // ------------------------------------------------------ Categoría
    async function elegirCategoria(req) {
      const actual = req.categoria || null;
      const respuesta = await Avisos.hojaOpciones({
        titulo: 'Categoría',
        opciones: proyecto.categorias,
        seleccionada: actual,
        etiquetaNinguna: 'Sin categoría',
        etiquetaNueva: 'Nueva categoría'
      });
      // Cancelada (o la pantalla cambió): no se toca nada.
      if (!respuesta || !vista.isConnected) return;

      let valor = respuesta.valor === undefined ? null : respuesta.valor;
      try {
        if (respuesta.nueva) {
          const limpio = String(valor).trim().replace(/\s+/g, ' ');
          if (!limpio) return;
          // Si ya existe (sin distinguir mayúsculas), se reutiliza la existente.
          const existente = proyecto.categorias.find((c) => claveCategoria(c) === claveCategoria(limpio));
          if (existente !== undefined) {
            valor = existente;
          } else {
            const categorias = proyecto.categorias.concat([limpio]);
            await DB.actualizarProyecto(proyectoId, { categorias });
            proyecto.categorias = categorias;
            valor = limpio;
          }
        }
        if (valor === actual) return;
        await DB.actualizarRequerimiento(req.id, { categoria: valor });
        req.categoria = valor;
      } catch (err) {
        console.error('Revisión: no se pudo guardar la categoría', err);
        if (vista.isConnected) Avisos.toast({ mensaje: 'No se pudo guardar la categoría.' });
        return;
      }
      if (!vista.isConnected) return;
      recargar();
    }

    // -------------------------------------------------------- Borrar
    function borrarReq(req) {
      if (borrado.estaPendiente(req.id)) return;
      const botones = Array.from(lista.querySelectorAll('[data-accion="borrar"]'));
      const indice = botones.findIndex((b) => b === document.activeElement);
      const li = lista.querySelector('.rev[data-id="' + CSS.escape(req.id) + '"]');
      const teniaFoco = indice !== -1 || (li && li.contains(document.activeElement));
      if (edicion && edicion.id === req.id) edicion.terminar(false, false);

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
            console.error('Revisión: no se pudo borrar', err);
            if (!vista.isConnected) return;
            recargar();
            Avisos.toast({ mensaje: 'No se pudo borrar el requerimiento.' });
          });
        }
      });

      recargar().then((visibles) => {
        if (!visibles || !teniaFoco) return;
        const restantes = lista.querySelectorAll('[data-accion="borrar"]');
        const pos = Math.max(0, indice);
        const destino = restantes[pos] || restantes[pos - 1] || (visibles.length ? titulo : vacioTitulo);
        destino.focus();
      });
    }

    // ------------------------------------------------- Generar brief
    let generando = false;
    generar.addEventListener('click', async () => {
      if (!listos) {
        // Lleva a la primera tarjeta que falta clasificar.
        const pendiente = lista.querySelector('.rev--sin [data-accion="categoria"]');
        if (pendiente) {
          pendiente.scrollIntoView({ block: 'center', behavior: 'smooth' });
          pendiente.focus({ preventScroll: true });
        }
        return;
      }
      if (generando) return;
      generando = true;
      try {
        if (edicion) edicion.terminar(true, false);
        // Un proyecto ya aprobado no vuelve atrás (igual que la barra de pasos).
        if (proyecto.estado !== 'aprobado') {
          await DB.actualizarProyecto(proyectoId, { estado: 'brief_generado' });
          proyecto.estado = 'brief_generado';
        }
        if (!vista.isConnected) return;
        Router.navegar('brief', { proyectoId });
      } catch (err) {
        console.error('Revisión: no se pudo generar el brief', err);
        if (vista.isConnected) Avisos.toast({ mensaje: 'No se pudo generar el brief. Inténtalo de nuevo.' });
      } finally {
        generando = false;
      }
    });

    recargar();
  }

  window.Views.revision = { render };
})();
