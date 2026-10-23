const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..', '..');
const leer = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8');

function atributosD(texto) {
  return [...texto.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);
}

// Lee ancho y alto del bloque IHDR de un PNG (bytes 16-23, big-endian).
function medidasPng(rel) {
  const datos = fs.readFileSync(path.join(raiz, rel));
  assert.strictEqual(datos.toString('latin1', 1, 4), 'PNG', rel + ' no es un PNG');
  assert.strictEqual(datos.toString('latin1', 12, 16), 'IHDR', rel + ' sin IHDR');
  return [datos.readUInt32BE(16), datos.readUInt32BE(20)];
}

test('logo.svg tiene tres trazos solo con comandos M y L', () => {
  const ds = atributosD(leer('icons/logo.svg'));
  assert.strictEqual(ds.length, 3);
  for (const d of ds) assert.match(d, /^M[\d\s.]+(L[\d\s.]+)+$/, d);
});

test('Iconos.logo usa los mismos trazos que logo.svg', () => {
  const Iconos = require('../../js/ui/iconos.js');
  const fuente = leer('js/ui/iconos.js');
  const inline = Iconos.logo();
  const ds = atributosD(leer('icons/logo.svg'));
  assert.deepStrictEqual(atributosD(inline), ds);
  for (const d of ds) assert.ok(fuente.includes(d), 'falta en iconos.js: ' + d);
  assert.match(inline, /^<svg [^>]*>.*<\/svg>$/);
  assert.match(inline, /width="40" height="40"/);
  assert.match(Iconos.logo(64), /width="64" height="64"/);
  assert.doesNotMatch(inline, /style=/);
});

test('manifest con ícono maskable y colores del tema claro', () => {
  const manifest = JSON.parse(leer('manifest.json'));
  assert.strictEqual(manifest.theme_color, '#FAF7F2');
  assert.strictEqual(manifest.background_color, '#FAF7F2');
  const maskable = manifest.icons.filter((i) => i.purpose === 'maskable');
  assert.strictEqual(maskable.length, 1);
  assert.strictEqual(maskable[0].src, 'icons/icon-maskable-512.png');
  assert.strictEqual(maskable[0].sizes, '512x512');
});

test('los PNG del logo existen con el tamaño correcto', () => {
  const esperados = {
    'icons/icon-192.png': 192,
    'icons/icon-512.png': 512,
    'icons/icon-maskable-512.png': 512,
    'icons/apple-touch-icon.png': 180
  };
  for (const [rel, lado] of Object.entries(esperados)) {
    assert.ok(fs.existsSync(path.join(raiz, rel)), 'falta ' + rel);
    assert.deepStrictEqual(medidasPng(rel), [lado, lado], rel);
  }
});
