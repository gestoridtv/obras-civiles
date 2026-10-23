(function () {
  const raiz = typeof window !== 'undefined' ? window : globalThis;

  const ENTIDADES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  function escapar(valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor).replace(/[&<>"']/g, (c) => ENTIDADES[c]);
  }

  const Texto = { escapar };

  raiz.Texto = Texto;
  if (typeof module !== 'undefined' && module.exports) module.exports = Texto;
})();
