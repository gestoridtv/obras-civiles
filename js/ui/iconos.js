(function () {
  const raiz = typeof window !== 'undefined' ? window : globalThis;

  // Íconos de trazo sobre una grilla de 24×24 (trazo 2, puntas y uniones
  // redondeadas). Cada entrada es la lista de atributos `d` de sus <path>.
  const TRAZOS = {
    mic: [
      'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z',
      'M19 10v1a7 7 0 0 1-14 0v-1',
      'M12 18v4',
      'M8 22h8'
    ],
    enviar: [
      'M22 2 11 13',
      'M22 2 15 22l-4-9-9-4 20-7z'
    ],
    basura: [
      'M3 6h18',
      'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
      'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
      'M10 11v6',
      'M14 11v6'
    ],
    atras: [
      'M19 12H5',
      'M12 19l-7-7 7-7'
    ],
    check: [
      'M20 6 9 17l-5-5'
    ],
    mas: [
      'M12 5v14',
      'M5 12h14'
    ],
    editar: [
      'M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z',
      'M15 5l4 4'
    ],
    compartir: [
      'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8',
      'M16 6l-4-4-4 4',
      'M12 2v13'
    ],
    lista: [
      'M8 6h13',
      'M8 12h13',
      'M8 18h13',
      'M3 6h.01',
      'M3 12h.01',
      'M3 18h.01'
    ],
    etiqueta: [
      'M12 2H2v10l9.29 9.29a1 1 0 0 0 1.42 0l8.58-8.58a1 1 0 0 0 0-1.42z',
      'M7 7h.01'
    ],
    documento: [
      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
      'M14 2v6h6',
      'M16 13H8',
      'M16 17H8',
      'M10 9H8'
    ],
    obra: [
      'M3 15h18a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1z',
      'M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5',
      'M4 15v-3a6 6 0 0 1 6-6',
      'M14 6a6 6 0 0 1 6 6v3'
    ]
  };

  const NOMBRES = Object.freeze(Object.keys(TRAZOS));

  // Devuelve el SVG como texto para insertarlo con innerHTML (solo contiene
  // valores propios de este módulo, nunca texto del usuario). Es decorativo:
  // aria-hidden y focusable="false"; el nombre accesible lo pone el botón.
  // Un nombre desconocido es un error de programación: se lanza una excepción
  // en vez de devolver '' para que el fallo se vea al desarrollar.
  function svg(nombre, tamano) {
    const trazos = Object.prototype.hasOwnProperty.call(TRAZOS, nombre) ? TRAZOS[nombre] : null;
    if (!trazos) throw new Error('Iconos.svg: ícono desconocido "' + nombre + '"');
    const lado = Number.isFinite(tamano) && tamano > 0 ? tamano : 24;
    const paths = trazos.map((d) => '<path d="' + d + '"/>').join('');
    return '<svg class="icono" xmlns="http://www.w3.org/2000/svg" width="' + lado + '" height="' + lado +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"' +
      ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      paths + '</svg>';
  }

  const Iconos = { svg, nombres: NOMBRES };

  raiz.Iconos = Iconos;
  if (typeof module !== 'undefined' && module.exports) module.exports = Iconos;
})();
