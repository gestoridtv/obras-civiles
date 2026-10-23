(function () {
  const vistas = {};

  function registrar(ruta, renderFn) {
    vistas[ruta] = renderFn;
  }

  function parsearHash() {
    const hash = location.hash.replace(/^#/, '');
    const [ruta, proyectoId] = hash.split('/');
    return { ruta: ruta || 'proyectos', proyectoId: proyectoId || null };
  }

  function renderActual() {
    // Al cambiar de pantalla el aviso pendiente se cierra (y su alCerrar se ejecuta).
    if (window.Avisos) window.Avisos.cerrarToast();
    const { ruta, proyectoId } = parsearHash();
    const render = vistas[ruta] || vistas['proyectos'];
    const contenedor = document.getElementById('app');
    contenedor.innerHTML = '';
    render(contenedor, { proyectoId });
  }

  function navegar(ruta, params) {
    const proyectoId = params && params.proyectoId;
    location.hash = proyectoId ? `${ruta}/${proyectoId}` : ruta;
  }

  window.addEventListener('hashchange', renderActual);

  window.Router = { registrar, navegar, renderActual };
})();
