const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..', '..');
const leer = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8');

function token(css, nombre) {
  const m = css.match(new RegExp('--color-' + nombre + ':\\s*(#[0-9a-fA-F]{6})\\s*;'));
  assert.ok(m, 'falta el token --color-' + nombre);
  return m[1];
}

function luminancia(hex) {
  const canales = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * canales[0] + 0.7152 * canales[1] + 0.0722 * canales[2];
}

function contraste(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const casos = [
  ['texto', 'fondo', 7],
  ['texto', 'superficie', 7],
  ['texto-sutil', 'fondo', 4.5],
  ['texto-sutil', 'superficie', 4.5],
  ['sobre-acento', 'acento', 4.5],
  ['sobre-acento', 'exito', 4.5],
  ['sobre-acento', 'peligro', 4.5],
  ['acento', 'fondo', 3],
];

for (const [a, b, minimo] of casos) {
  test(`contraste ${a}/${b} >= ${minimo}`, () => {
    const css = leer('css/tokens.css');
    const ca = token(css, a);
    const cb = token(css, b);
    const ratio = contraste(ca, cb);
    assert.ok(ratio >= minimo, `${ca} sobre ${cb} = ${ratio.toFixed(2)}`);
  });
}

test('styles.css define overflow-wrap', () => {
  assert.match(leer('css/styles.css'), /overflow-wrap/);
});
