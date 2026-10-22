(function () {
  function registrarServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('No se pudo registrar el service worker:', err);
    });
  }

  function registrarVistas() {
    Router.registrar('proyectos', Views.proyectos.render);
    Router.registrar('captura', Views.captura.render);
    Router.registrar('revision', Views.revision.render);
    Router.registrar('brief', Views.brief.render);
    Router.registrar('checklist', Views.checklist.render);
  }

  document.addEventListener('DOMContentLoaded', () => {
    DB.init()
      .then(() => {
        registrarVistas();
        registrarServiceWorker();
        Router.renderActual();
      })
      .catch((err) => {
        document.getElementById('app').textContent = 'Error inicializando la base de datos: ' + err.message;
      });
  });
})();
