window.Views = window.Views || {};

(function () {
  // Pantalla de obra (checklist): los requerimientos agrupados por categoría,
  // cada uno en una fila completa tocable con una marca grande propia. Arriba,
  // la barra de progreso con "N/M completados" y el porcentaje; con todo hecho
  // pasa a "Todo listo". Cada cambio se guarda al instante; si falla, la fila
  // vuelve a su estado anterior y se avisa.
  //
  // Si la obra no está aprobada (se llegó por URL; en la barra de pasos el
  // paso Obra está deshabilitado), no se muestra la lista: se explica por qué
  // y se ofrece ir al paso más avanzado disponible (Brief, Revisión o Captura).

  function crear(etiqueta, clase, texto) {
    const el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto !== undefined && texto !== null) el.textContent = String(texto);
    return el;
  }

  function boton(clase, icono, etiqueta) {
    const b = crear('button', 'btn ' + clase);
    b.type = 'button';
    b.innerHTML = Iconos.svg(icono, 20);
    b.appendChild(crear('span', null, etiqueta));
    return b;
  }

  const ICONO_PASO = { captura: 'mic', revision: 'etiqueta', brief: 'documento' };

  function render(container, { proyectoId }) {
    const vista = crear('div', 'vista-checklist');
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
        console.error('Checklist: no se pudo abrir la obra', err);
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
    const categoriasProyecto = Array.isArray(proyecto.categorias) ? proyecto.categorias : [];
    const aprobado = proyecto.estado === 'aprobado';

    vista.appendChild(Shell.encabezado({
      titulo: proyecto.nombre,
      subtitulo: proyecto.cliente,
      atras: { etiqueta: 'Mis obras', ruta: 'proyectos' }
    }));

    const principal = crear('main', 'checklist');
    vista.appendChild(principal);

    // ------------------------------------------------------- Progreso
    const progreso = crear('section', 'progreso-obra');
    progreso.setAttribute('aria-labelledby', 'checklist-titulo');
    const cabecera = crear('div', 'progreso-obra__cabecera');
    const titulo = crear('h2', 'progreso-obra__titulo', 'Avance de la obra');
    titulo.id = 'checklist-titulo';
    const porcentaje = crear('p', 'progreso-obra__porcentaje');
    porcentaje.setAttribute('aria-hidden', 'true');
    cabecera.append(titulo, porcentaje);
    const cifra = crear('p', 'progreso-obra__cifra');
    const barraProgreso = crear('div', 'progreso-obra__barra');
    barraProgreso.setAttribute('role', 'progressbar');
    barraProgreso.setAttribute('aria-labelledby', 'checklist-titulo');
    barraProgreso.setAttribute('aria-valuemin', '0');
    barraProgreso.setAttribute('aria-valuemax', '100');
    barraProgreso.appendChild(crear('span', 'progreso-obra__relleno'));
    // Solo anuncia el cambio a "Todo listo" (las filas ya anuncian su estado).
    const nota = crear('p', 'progreso-obra__nota');
    nota.setAttribute('role', 'status');
    progreso.append(cabecera, cifra, barraProgreso, nota);

    const grupos = crear('div', 'checklist__grupos');

    const vacio = crear('div', 'vacio');
    vacio.hidden = true;

    principal.append(progreso, grupos, vacio);

    // ------------------------------------------------------- Datos
    let barra = null;
    let version = 0;
    let requerimientos = [];

    function pintarBarraPasos() {
      const nueva = Shell.barraPasos({ proyecto, requerimientos, pasoActual: 'checklist' });
      if (barra) barra.replaceWith(nueva);
      else vista.appendChild(nueva);
      barra = nueva;
    }

    async function recargar() {
      const mia = ++version;
      let reqs;
      try {
        reqs = await DB.listarRequerimientos(proyectoId);
      } catch (err) {
        console.error('Checklist: no se pudo leer la lista', err);
        if (vista.isConnected && mia === version) Avisos.toast({ mensaje: 'No se pudo cargar el checklist.' });
        return;
      }
      if (mia !== version || !vista.isConnected) return;
      requerimientos = reqs;

      if (aprobado) {
        pintarLista(reqs);
        pintarProgreso();
      } else {
        pintarNoAprobada(reqs);
      }
      pintarBarraPasos();
    }

    // ------------------------------------------------ Progreso
    let completoAntes = null;

    function pintarProgreso() {
      const total = requerimientos.length;
      const hechos = requerimientos.filter((r) => r.checkEstado === 'hecho').length;
      const pct = total > 0 ? Math.round((hechos / total) * 100) : 0;
      const completo = total > 0 && hechos === total;

      cifra.textContent = '';
      cifra.appendChild(crear('strong', null, hechos + '/' + total));
      cifra.appendChild(document.createTextNode(' completados'));
      porcentaje.textContent = pct + ' %';

      barraProgreso.setAttribute('aria-valuenow', String(pct));
      barraProgreso.setAttribute('aria-valuetext',
        hechos + ' de ' + total + ' completados (' + pct + ' %)');
      progreso.style.setProperty('--progreso', pct + '%');

      progreso.classList.toggle('progreso-obra--completo', completo);
      nota.textContent = '';
      if (completo) {
        nota.innerHTML = Iconos.svg('check', 20);
        nota.appendChild(crear('span', null, 'Todo listo: la obra está completa'));
        // La animación de celebración solo al pasar de incompleto a completo.
        if (completoAntes === false) {
          progreso.classList.remove('progreso-obra--celebrar');
          void progreso.offsetWidth;
          progreso.classList.add('progreso-obra--celebrar');
        }
      } else {
        progreso.classList.remove('progreso-obra--celebrar');
      }
      completoAntes = completo;
    }

    // ------------------------------------------------ Lista
    function pintarLista(reqs) {
      grupos.textContent = '';
      vacio.hidden = reqs.length > 0;
      if (reqs.length === 0) {
        armarVacio('lista', 'Aún no hay requerimientos',
          'Esta obra no tiene requerimientos para controlar. Agrégalos en Captura.',
          'captura', 'Ir a Captura');
        return;
      }

      const porCategoria = {};
      reqs.forEach((r) => {
        const cat = (r.categoria && categoriasProyecto.includes(r.categoria)) ? r.categoria : 'Sin categoría';
        (porCategoria[cat] = porCategoria[cat] || []).push(r);
      });

      let usadas = 0;
      categoriasProyecto.concat(['Sin categoría']).forEach((categoria) => {
        const items = porCategoria[categoria];
        if (!items || items.length === 0) return;
        usadas += 1;
        const seccion = crear('section', 'checklist__grupo');
        const idTitulo = 'checklist-cat-' + usadas;
        const tituloCat = crear('h2', 'categoria-titulo texto-seguro', categoria);
        tituloCat.id = idTitulo;
        seccion.setAttribute('aria-labelledby', idTitulo);
        const lista = crear('ul', 'checklist__lista');
        items.forEach((item) => lista.appendChild(crearFila(item)));
        seccion.append(tituloCat, lista);
        grupos.appendChild(seccion);
      });
    }

    function crearFila(item) {
      const li = document.createElement('li');
      const fila = crear('label', 'check');
      const checkbox = crear('input', 'visualmente-oculto');
      checkbox.type = 'checkbox';
      const marca = crear('span', 'check__marca');
      marca.innerHTML = Iconos.svg('check', 22);
      const texto = crear('span', 'check__texto texto-seguro', item.texto);
      fila.append(checkbox, marca, texto);
      li.appendChild(fila);

      function aplicar(hecho) {
        checkbox.checked = hecho;
        fila.classList.toggle('check--hecho', hecho);
      }
      aplicar(item.checkEstado === 'hecho');

      // Cada cambio lleva un número: si una escritura vieja falla después de
      // que se hizo otro cambio en la misma fila, no se revierte el nuevo.
      let ultimoCambio = 0;

      checkbox.addEventListener('change', async () => {
        const anterior = item.checkEstado === 'hecho' ? 'hecho' : 'pendiente';
        const nuevo = checkbox.checked ? 'hecho' : 'pendiente';
        const mio = ++ultimoCambio;
        item.checkEstado = nuevo;
        aplicar(nuevo === 'hecho');
        pintarProgreso();
        try {
          await DB.actualizarRequerimiento(item.id, { checkEstado: nuevo });
          if (!vista.isConnected) return;
          if (mio === ultimoCambio) pintarBarraPasos();
        } catch (err) {
          console.error('Checklist: no se pudo guardar el cambio', err);
          if (!vista.isConnected) return;
          if (mio === ultimoCambio) {
            item.checkEstado = anterior;
            aplicar(anterior === 'hecho');
            pintarProgreso();
          }
          Avisos.toast({ mensaje: 'No se pudo guardar el cambio. Inténtalo de nuevo.' });
        }
      });

      return li;
    }

    function armarVacio(icono, tituloTexto, textoTexto, ruta, etiquetaBoton) {
      vacio.textContent = '';
      const vacioIcono = crear('span', 'vacio__icono');
      vacioIcono.innerHTML = Iconos.svg(icono, 32);
      const vacioTitulo = crear('h2', 'vacio__titulo', tituloTexto);
      const vacioTexto = crear('p', 'vacio__texto', textoTexto);
      const ir = boton('btn--primario', ICONO_PASO[ruta] || 'atras', etiquetaBoton);
      ir.addEventListener('click', () => Router.navegar(ruta, { proyectoId }));
      vacio.append(vacioIcono, vacioTitulo, vacioTexto, ir);
    }

    // ------------------------------------------- Obra sin aprobar
    function pintarNoAprobada(reqs) {
      progreso.hidden = true;
      grupos.textContent = '';
      vacio.hidden = false;
      // El paso más avanzado al que se puede ir (sin contar Obra).
      const disponibles = Pasos.calcular(proyecto, reqs)
        .filter((p) => p.id !== 'checklist' && p.habilitado);
      const destino = disponibles[disponibles.length - 1];
      armarVacio('obra', 'El checklist todavía no está disponible',
        'Se habilita cuando el cliente aprueba el brief de la obra.',
        destino.id, 'Ir a ' + destino.etiqueta);
    }

    recargar();
  }

  window.Views.checklist = { render };
})();
