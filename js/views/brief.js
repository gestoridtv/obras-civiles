window.Views = window.Views || {};

(function () {
  // Pantalla del brief: los requerimientos agrupados por categoría tal como
  // saldrán en el PDF. Abajo, fijo sobre la barra de pasos, las acciones según
  // el estado de la obra:
  //   brief_generado -> "Marcar como aprobado por el cliente" (primaria, con
  //                     confirmación) y "Descargar / compartir PDF".
  //   aprobado       -> "Descargar / compartir PDF" (primaria) e "Ir a la obra".

  const MENSAJE_PDF = 'No se pudo generar el PDF. Si estás sin conexión, inténtalo de nuevo cuando tengas internet.';

  function crear(etiqueta, clase, texto) {
    const el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto !== undefined && texto !== null) el.textContent = String(texto);
    return el;
  }

  function boton(clase, icono, etiqueta) {
    const b = crear('button', 'btn ' + clase);
    b.type = 'button';
    b.innerHTML = Iconos.svg(icono, 22);
    b.appendChild(crear('span', null, etiqueta));
    return b;
  }

  function render(container, { proyectoId }) {
    const vista = crear('div', 'vista-brief');
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
        console.error('Brief: no se pudo abrir la obra', err);
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

    const principal = crear('main', 'brief');

    if (aprobado) {
      const sello = crear('p', 'brief__aprobado');
      sello.innerHTML = Iconos.svg('check', 20);
      sello.appendChild(crear('span', null, 'Aprobado'));
      const detalle = crear('span', 'visualmente-oculto', ' por el cliente');
      sello.appendChild(detalle);
      principal.appendChild(sello);
    }

    const resumen = crear('p', 'brief__resumen');
    resumen.hidden = true;
    const grupos = crear('div', 'brief__grupos');

    const vacio = crear('div', 'vacio');
    vacio.hidden = true;
    const vacioIcono = crear('span', 'vacio__icono');
    vacioIcono.innerHTML = Iconos.svg('documento', 32);
    const vacioTitulo = crear('h2', 'vacio__titulo', 'El brief está vacío');
    const vacioTexto = crear('p', 'vacio__texto',
      'Esta obra todavía no tiene requerimientos. Agrégalos en Captura para armar el brief.');
    const irCaptura = boton('btn--primario', 'mic', 'Ir a Captura');
    irCaptura.addEventListener('click', () => Router.navegar('captura', { proyectoId }));
    vacio.append(vacioIcono, vacioTitulo, vacioTexto, irCaptura);

    principal.append(resumen, grupos, vacio);
    vista.appendChild(principal);

    // ------------------------------------------- Acciones (fijas)
    const dock = crear('div', 'dock dock--brief');
    dock.hidden = true;
    let btnAprobar = null;
    let btnIrObra = null;
    const btnPdf = boton(aprobado ? 'btn--primario dock__principal' : 'btn--secundario dock__principal',
      'compartir', 'Descargar / compartir PDF');

    if (aprobado) {
      btnIrObra = boton('btn--secundario dock__principal', 'obra', 'Ir a la obra');
      dock.append(btnPdf, btnIrObra);
    } else {
      btnAprobar = boton('btn--primario dock__principal', 'check', 'Marcar como aprobado por el cliente');
      dock.append(btnAprobar, btnPdf);
    }
    vista.appendChild(dock);
    Shell.reservarAlto(dock, '--alto-dock');

    // ------------------------------------------------ Datos
    let requerimientos = [];
    let barra = null;
    let version = 0;
    let ocupado = false;

    function bloquear(si) {
      ocupado = si;
      [btnAprobar, btnPdf, btnIrObra].forEach((b) => {
        if (!b) return;
        b.disabled = si;
        if (si) b.setAttribute('aria-busy', 'true');
        else b.removeAttribute('aria-busy');
      });
    }

    async function recargar() {
      const mia = ++version;
      let reqs;
      try {
        reqs = await DB.listarRequerimientos(proyectoId);
      } catch (err) {
        console.error('Brief: no se pudo leer la lista', err);
        if (vista.isConnected && mia === version) Avisos.toast({ mensaje: 'No se pudo cargar el brief.' });
        return;
      }
      if (mia !== version || !vista.isConnected) return;
      requerimientos = reqs;
      pintar(reqs);

      const nueva = Shell.barraPasos({ proyecto, requerimientos: reqs, pasoActual: 'brief' });
      if (barra) barra.replaceWith(nueva);
      else vista.appendChild(nueva);
      barra = nueva;
    }

    function pintar(reqs) {
      grupos.textContent = '';
      const total = reqs.length;
      vacio.hidden = total > 0;
      resumen.hidden = total === 0;
      dock.hidden = total === 0;

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
        const seccion = crear('section', 'brief__grupo');
        const idTitulo = 'brief-cat-' + usadas;
        const titulo = crear('h2', 'categoria-titulo texto-seguro', categoria);
        titulo.id = idTitulo;
        seccion.setAttribute('aria-labelledby', idTitulo);
        const lista = crear('ul', 'brief__lista');
        items.forEach((item) => {
          const li = crear('li', 'brief__req texto-seguro', item.texto);
          lista.appendChild(li);
        });
        seccion.append(titulo, lista);
        grupos.appendChild(seccion);
      });

      resumen.textContent = '';
      resumen.appendChild(crear('strong', null, total));
      resumen.appendChild(document.createTextNode(
        (total === 1 ? ' requerimiento' : ' requerimientos') +
        ' en ' + usadas + (usadas === 1 ? ' categoría' : ' categorías')));
    }

    // ------------------------------------------------ Aprobar
    if (btnAprobar) {
      btnAprobar.addEventListener('click', async () => {
        if (ocupado) return;
        bloquear(true);
        try {
          const acepto = await Avisos.confirmar({
            titulo: '¿Aprobar el brief?',
            mensaje: 'Al marcarlo como aprobado por el cliente se desbloquea el checklist de la obra.',
            etiquetaConfirmar: 'Sí, aprobar',
            peligro: false
          });
          // Cancelado, o la pantalla cambió mientras la hoja estaba abierta.
          if (!acepto || !vista.isConnected) return;
          await DB.actualizarProyecto(proyectoId, { estado: 'aprobado' });
          proyecto.estado = 'aprobado';
          if (!vista.isConnected) return;
          Router.navegar('checklist', { proyectoId });
        } catch (err) {
          console.error('Brief: no se pudo aprobar', err);
          if (vista.isConnected) Avisos.toast({ mensaje: 'No se pudo aprobar el brief. Inténtalo de nuevo.' });
        } finally {
          if (vista.isConnected) bloquear(false);
        }
      });
    }

    if (btnIrObra) {
      btnIrObra.addEventListener('click', () => Router.navegar('checklist', { proyectoId }));
    }

    // ------------------------------------------------ PDF
    btnPdf.addEventListener('click', async () => {
      if (ocupado) return;
      bloquear(true);
      try {
        await compartirOBajarPdf(proyecto, requerimientos);
      } catch (err) {
        console.error('Brief: no se pudo generar el PDF', err);
        if (vista.isConnected) Avisos.toast({ mensaje: MENSAJE_PDF });
      } finally {
        if (vista.isConnected) bloquear(false);
      }
    });

    recargar();
  }

  async function compartirOBajarPdf(proyecto, requerimientos) {
    if (!window.jspdf) {
      Avisos.toast({ mensaje: MENSAJE_PDF });
      return;
    }
    const blob = PDF.generarBrief(proyecto, requerimientos);
    const nombreArchivo = PDF.nombreArchivo(proyecto);
    const archivo = new File([blob], nombreArchivo, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: nombreArchivo });
      } catch (err) {
        // Cerrar la hoja de compartir sin elegir nada no es un error.
        if (err && err.name === 'AbortError') return;
        throw err;
      }
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

  window.Views.brief = { render };
})();
