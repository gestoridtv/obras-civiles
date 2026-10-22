(function () {
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
        Router.renderActual();
      })
      .catch((err) => {
        document.getElementById('app').textContent = 'Error inicializando la base de datos: ' + err.message;
      });
  });
})();
