(function () {
  const raiz = typeof window !== 'undefined' ? window : globalThis;

  // Avisos propios en lugar de alert/confirm/prompt:
  // - toast: un único aviso a la vez, con acción opcional (p. ej. "Deshacer").
  // - confirmar, hojaOpciones, formulario: hojas inferiores modales.
  // Todo texto que pueda venir del usuario entra con textContent.

  const DURACION_TOAST_MS = 5000;

  function crear(etiqueta, clase, texto) {
    const el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto !== undefined && texto !== null) el.textContent = String(texto);
    return el;
  }

  function llamarSeguro(fn) {
    if (typeof fn !== 'function') return;
    try {
      fn();
    } catch (err) {
      console.error('Avisos: error en el callback', err);
    }
  }

  // ---------------------------------------------------------------- Toast

  let region = null;
  let toastActual = null; // { el, timer, alCerrar, duracionMs }

  // La región viva existe desde antes del primer mensaje para que los lectores
  // de pantalla anuncien de forma fiable lo que se inserta en ella.
  function obtenerRegion() {
    if (region && region.isConnected) return region;
    region = crear('div', 'toast-region');
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    document.body.appendChild(region);
    return region;
  }

  function quitarToast(llamarAlCerrar) {
    const actual = toastActual;
    if (!actual) return;
    toastActual = null;
    clearTimeout(actual.timer);
    actual.el.remove();
    if (llamarAlCerrar) llamarSeguro(actual.alCerrar);
  }

  function programarCierre(actual) {
    clearTimeout(actual.timer);
    actual.timer = setTimeout(() => {
      if (toastActual === actual) quitarToast(true);
    }, actual.duracionMs);
  }

  function toast(opciones) {
    const o = opciones || {};
    // Reemplazo: el anterior se cierra como si hubiera vencido (llama alCerrar).
    quitarToast(true);

    const el = crear('div', 'toast');
    el.appendChild(crear('p', 'toast__mensaje texto-seguro', o.mensaje));

    const duracion = Number.isFinite(o.duracionMs) && o.duracionMs > 0 ? o.duracionMs : DURACION_TOAST_MS;
    const actual = { el, timer: null, alCerrar: o.alCerrar, duracionMs: duracion };

    if (o.accionEtiqueta) {
      const boton = crear('button', 'toast__accion', o.accionEtiqueta);
      boton.type = 'button';
      boton.addEventListener('click', () => {
        if (toastActual !== actual) return;
        quitarToast(false); // la acción reemplaza a alCerrar
        llamarSeguro(o.alAccionar);
      });
      el.appendChild(boton);
      // Mientras el foco esté en el aviso no vence (da tiempo a quien navega
      // con teclado o lector de pantalla); al salir vuelve a contar entero.
      el.addEventListener('focusin', () => clearTimeout(actual.timer));
      el.addEventListener('focusout', (e) => {
        if (toastActual === actual && !el.contains(e.relatedTarget)) programarCierre(actual);
      });
    }

    toastActual = actual;
    obtenerRegion().appendChild(el);
    programarCierre(actual);
  }

  function cerrarToast() {
    quitarToast(true);
  }

  // ---------------------------------------------------- Hojas (modales)

  const SELECTOR_ENFOCABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  let capaActual = null; // { cerrar(valor) }
  let contadorIds = 0;

  function nuevoId(prefijo) {
    contadorIds += 1;
    return 'aviso-' + prefijo + '-' + contadorIds;
  }

  function enfocables(contenedor) {
    return Array.from(contenedor.querySelectorAll(SELECTOR_ENFOCABLE))
      .filter((el) => !el.hidden && el.getClientRects().length > 0);
  }

  // Abre una hoja inferior modal. `construir(panel, cerrar)` arma el contenido
  // y devuelve el elemento que recibe el foco inicial. Escape, tocar el fondo
  // o abrir otra hoja la cierran con `valorCancelar`.
  function abrirHoja({ titulo, rol = 'dialog', valorCancelar, construir }) {
    if (capaActual) capaActual.cerrar(capaActual.valorCancelar);

    return new Promise((resolver) => {
      const focoPrevio = document.activeElement;
      const app = document.getElementById('app');

      const capa = crear('div', 'capa');
      const panel = crear('div', 'hoja');
      const idTitulo = nuevoId('titulo');
      panel.setAttribute('role', rol);
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-labelledby', idTitulo);
      panel.tabIndex = -1;

      const tirador = crear('div', 'hoja__tirador');
      tirador.setAttribute('aria-hidden', 'true');
      panel.appendChild(tirador);

      const h = crear('h2', 'hoja__titulo texto-seguro', titulo);
      h.id = idTitulo;
      panel.appendChild(h);

      let cerrada = false;
      const estado = { valorCancelar, cerrar };

      function alTeclear(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          cerrar(valorCancelar);
          return;
        }
        if (e.key !== 'Tab') return;
        const lista = enfocables(panel);
        if (lista.length === 0) {
          e.preventDefault();
          panel.focus();
          return;
        }
        const primero = lista[0];
        const ultimo = lista[lista.length - 1];
        const activo = document.activeElement;
        if (e.shiftKey && (activo === primero || !panel.contains(activo) || activo === panel)) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && (activo === ultimo || !panel.contains(activo))) {
          e.preventDefault();
          primero.focus();
        }
      }

      // Si el foco escapa del panel (p. ej. clic en un área no enfocable),
      // se devuelve adentro.
      function alEnfocar(e) {
        if (!panel.contains(e.target)) panel.focus();
      }

      function cerrar(valor) {
        if (cerrada) return;
        cerrada = true;
        document.removeEventListener('keydown', alTeclear, true);
        document.removeEventListener('focusin', alEnfocar, true);
        capa.remove();
        if (app) app.inert = false;
        document.documentElement.classList.remove('con-hoja');
        if (capaActual === estado) capaActual = null;
        if (focoPrevio && focoPrevio.isConnected && typeof focoPrevio.focus === 'function') {
          focoPrevio.focus();
        }
        resolver(valor);
      }

      capa.addEventListener('click', (e) => {
        if (e.target === capa) cerrar(valorCancelar);
      });

      const focoInicial = construir(panel, cerrar);

      capa.appendChild(panel);
      document.body.appendChild(capa);
      if (app) app.inert = true;
      document.documentElement.classList.add('con-hoja');
      document.addEventListener('keydown', alTeclear, true);
      document.addEventListener('focusin', alEnfocar, true);
      capaActual = estado;

      (focoInicial || enfocables(panel)[0] || panel).focus();
    });
  }

  function crearBoton(texto, clase) {
    const b = crear('button', 'btn ' + clase, texto);
    b.type = 'button';
    return b;
  }

  function confirmar(opciones) {
    const o = opciones || {};
    const peligro = o.peligro !== false;
    return abrirHoja({
      titulo: o.titulo,
      rol: 'alertdialog',
      valorCancelar: false,
      construir(panel, cerrar) {
        if (o.mensaje) {
          const p = crear('p', 'hoja__mensaje texto-seguro', o.mensaje);
          p.id = nuevoId('mensaje');
          panel.setAttribute('aria-describedby', p.id);
          panel.appendChild(p);
        }
        const acciones = crear('div', 'hoja__acciones');
        const si = crearBoton(o.etiquetaConfirmar || 'Aceptar', peligro ? 'btn--peligro' : 'btn--primario');
        const no = crearBoton('Cancelar', 'btn--secundario');
        si.addEventListener('click', () => cerrar(true));
        no.addEventListener('click', () => cerrar(false));
        acciones.append(si, no);
        panel.appendChild(acciones);
        // Foco inicial en "Cancelar": un Enter accidental no ejecuta la acción.
        return no;
      }
    });
  }

  function hojaOpciones(opciones) {
    const o = opciones || {};
    const lista = Array.isArray(o.opciones) ? o.opciones : [];
    const seleccionada = o.seleccionada === undefined ? null : o.seleccionada;

    return abrirHoja({
      titulo: o.titulo,
      valorCancelar: undefined,
      construir(panel, cerrar) {
        const ul = crear('ul', 'hoja__opciones');
        let focoInicial = null;

        function agregarOpcion(etiqueta, valor) {
          const li = document.createElement('li');
          const b = crear('button', 'hoja__opcion');
          b.type = 'button';
          const marcada = valor === seleccionada;
          b.setAttribute('aria-pressed', marcada ? 'true' : 'false');
          b.appendChild(crear('span', 'hoja__opcion-texto texto-seguro', etiqueta));
          const marca = crear('span', 'hoja__opcion-marca');
          if (marcada && raiz.Iconos) marca.innerHTML = raiz.Iconos.svg('check', 24);
          b.appendChild(marca);
          b.addEventListener('click', () => cerrar({ valor, nueva: false }));
          li.appendChild(b);
          ul.appendChild(li);
          if (marcada) focoInicial = b;
        }

        if (o.etiquetaNinguna) agregarOpcion(o.etiquetaNinguna, null);
        lista.forEach((op) => agregarOpcion(op, op));
        if (ul.children.length > 0) panel.appendChild(ul);

        if (o.etiquetaNueva) {
          const abrirNueva = crearBoton(o.etiquetaNueva, 'btn--secundario hoja__nueva');
          if (raiz.Iconos) abrirNueva.insertAdjacentHTML('afterbegin', raiz.Iconos.svg('mas', 20));

          const form = crear('form', 'hoja__form');
          form.noValidate = true;
          form.hidden = true;
          const idCampo = nuevoId('nueva');
          const idError = nuevoId('error');
          const label = crear('label', 'hoja__etiqueta', o.etiquetaNueva);
          label.htmlFor = idCampo;
          const input = crear('input', 'campo');
          input.id = idCampo;
          input.type = 'text';
          input.autocomplete = 'off';
          input.setAttribute('autocapitalize', 'sentences');
          const error = crear('p', 'hoja__error');
          error.id = idError;
          error.hidden = true;
          const agregar = crear('button', 'btn btn--primario', 'Agregar');
          agregar.type = 'submit';
          const fila = crear('div', 'hoja__fila');
          fila.append(input, agregar);
          form.append(label, fila, error);

          input.addEventListener('input', () => {
            input.removeAttribute('aria-invalid');
            input.removeAttribute('aria-describedby');
            error.hidden = true;
          });
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            const texto = input.value.trim();
            if (!texto) {
              error.textContent = 'Escribe un nombre.';
              error.hidden = false;
              input.setAttribute('aria-invalid', 'true');
              input.setAttribute('aria-describedby', idError);
              input.focus();
              return;
            }
            cerrar({ valor: texto, nueva: true });
          });
          abrirNueva.addEventListener('click', () => {
            abrirNueva.hidden = true;
            form.hidden = false;
            input.focus();
          });

          panel.append(abrirNueva, form);
        }

        const cancelar = crearBoton('Cancelar', 'btn--texto hoja__cancelar');
        cancelar.addEventListener('click', () => cerrar(undefined));
        panel.appendChild(cancelar);

        return focoInicial;
      }
    });
  }

  function formulario(opciones) {
    const o = opciones || {};
    const campos = Array.isArray(o.campos) ? o.campos : [];

    return abrirHoja({
      titulo: o.titulo,
      valorCancelar: undefined,
      construir(panel, cerrar) {
        const form = crear('form', 'hoja__form');
        form.noValidate = true;
        const entradas = campos.map((c) => {
          const id = nuevoId('campo');
          const idError = nuevoId('error');
          const grupo = crear('div', 'hoja__grupo');
          const label = crear('label', 'hoja__etiqueta', c.etiqueta);
          label.htmlFor = id;
          const input = crear('input', 'campo');
          input.id = id;
          input.type = 'text';
          input.autocomplete = 'off';
          input.setAttribute('autocapitalize', 'sentences');
          if (c.placeholder) input.placeholder = c.placeholder;
          const error = crear('p', 'hoja__error');
          error.id = idError;
          error.hidden = true;
          input.addEventListener('input', () => {
            input.removeAttribute('aria-invalid');
            input.removeAttribute('aria-describedby');
            error.hidden = true;
          });
          grupo.append(label, input, error);
          form.appendChild(grupo);
          return { clave: c.id, input, error, idError };
        });

        const acciones = crear('div', 'hoja__acciones');
        const enviar = crear('button', 'btn btn--primario', o.etiquetaEnviar || 'Guardar');
        enviar.type = 'submit';
        const cancelar = crearBoton('Cancelar', 'btn--secundario');
        cancelar.addEventListener('click', () => cerrar(undefined));
        acciones.append(enviar, cancelar);
        form.appendChild(acciones);

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const valores = {};
          let primeroInvalido = null;
          entradas.forEach((en) => {
            const v = en.input.value.trim();
            if (!v) {
              en.error.textContent = 'Completa este campo.';
              en.error.hidden = false;
              en.input.setAttribute('aria-invalid', 'true');
              en.input.setAttribute('aria-describedby', en.idError);
              if (!primeroInvalido) primeroInvalido = en.input;
            }
            valores[en.clave] = v;
          });
          if (primeroInvalido) {
            primeroInvalido.focus();
            return;
          }
          cerrar(valores);
        });

        panel.appendChild(form);
        return entradas.length ? entradas[0].input : null;
      }
    });
  }

  // Cierra la hoja abierta (si hay) resolviéndola con su valor de cancelación.
  // El router la llama al cambiar de pantalla (p. ej. con el botón Atrás),
  // para que la promesa no siga actuando sobre una vista que ya no está.
  function cerrarHoja() {
    if (capaActual) capaActual.cerrar(capaActual.valorCancelar);
  }

  const Avisos = { toast, cerrarToast, confirmar, hojaOpciones, formulario, cerrarHoja };

  raiz.Avisos = Avisos;
})();
