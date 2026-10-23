const test = require('node:test');
const assert = require('node:assert');
const Iconos = require('../../js/ui/iconos.js');

const NOMBRES = ['mic', 'enviar', 'basura', 'atras', 'check', 'mas', 'editar', 'compartir',
  'lista', 'etiqueta', 'documento', 'obra'];

test('expone todos los íconos acordados', () => {
  assert.deepStrictEqual([...Iconos.nombres].sort(), [...NOMBRES].sort());
});

test('cada ícono es un SVG decorativo de trazo con currentColor', () => {
  for (const nombre of NOMBRES) {
    const s = Iconos.svg(nombre);
    assert.match(s, /^<svg [^>]*>.*<\/svg>$/, nombre);
    assert.match(s, /aria-hidden="true"/, nombre);
    assert.match(s, /stroke="currentColor"/, nombre);
    assert.match(s, /fill="none"/, nombre);
    assert.match(s, /width="24" height="24"/, nombre);
    assert.match(s, /<path d="[^"]+"\/>/, nombre);
    assert.doesNotMatch(s, /style=/, nombre);
  }
});

test('respeta el tamaño pedido y usa 24 si no es válido', () => {
  assert.match(Iconos.svg('mic', 32), /width="32" height="32"/);
  assert.match(Iconos.svg('mic', -1), /width="24" height="24"/);
  assert.match(Iconos.svg('mic', 'x'), /width="24" height="24"/);
});

test('un nombre desconocido lanza un error', () => {
  assert.throws(() => Iconos.svg('nada'), /desconocido/);
  assert.throws(() => Iconos.svg('toString'), /desconocido/);
});
