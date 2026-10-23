(function () {
  const raiz = typeof window !== 'undefined' ? window : globalThis;

  // Borrado diferido: la vista oculta el elemento al instante (estaPendiente),
  // y el cierre del aviso llama a confirmar(id); "Deshacer" llama a deshacer(id).
  // Sin temporizadores: el momento de confirmar lo decide quien llama.
  function crear(eliminar) {
    const pendientes = new Set();

    function marcar(id) {
      pendientes.add(id);
    }

    function deshacer(id) {
      return pendientes.delete(id);
    }

    function estaPendiente(id) {
      return pendientes.has(id);
    }

    // Se saca de pendientes antes de eliminar, así una confirmación repetida o
    // concurrente no elimina dos veces. Si eliminar rechaza, el id queda fuera
    // de pendientes (el elemento vuelve a mostrarse) y el error se propaga.
    async function confirmar(id) {
      if (!pendientes.delete(id)) return;
      await eliminar(id);
    }

    return { marcar, deshacer, confirmar, estaPendiente };
  }

  const BorradoDiferido = { crear };

  raiz.BorradoDiferido = BorradoDiferido;
  if (typeof module !== 'undefined' && module.exports) module.exports = BorradoDiferido;
})();
