const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..', '..');
const leer = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8');

// Módulos heredados que esta tarea no toca.
const EXCLUIDOS = new Set(['js/db.js', 'js/speech.js', 'js/pdf.js']);

function archivosJs(dir) {
  const salida = [];
  for (const entrada of fs.readdirSync(path.join(raiz, dir), { withFileTypes: true })) {
    const rel = dir + '/' + entrada.name;
    if (entrada.isDirectory()) salida.push(...archivosJs(rel));
    else if (entrada.name.endsWith('.js') && !EXCLUIDOS.has(rel)) salida.push(rel);
  }
  return salida;
}

const ARCHIVOS_REVISADOS = [...archivosJs('js'), 'index.html'];

// Llamada nativa: el nombre exacto, no precedido por letra/dígito/_/$ ni por un
// punto (salvo window., self. o globalThis.), seguido de "(". Así no cuentan
// confirmar(, Avisos.confirm( ni miPrompt(.
const DIALOGO_NATIVO =
  /(?:^|[^\w$.]|\b(?:window|self|globalThis)\.)(alert|confirm|prompt)\s*\(/m;

function lineaDe(texto, indice) {
  return texto.slice(0, indice).split('\n').length;
}

test('la regla de diálogos distingue llamadas nativas de nombres parecidos', () => {
  for (const malo of ['alert("x")', 'if (confirm("¿?"))', 'window.prompt("n")', 'x = prompt ("n")']) {
    assert.match(malo, DIALOGO_NATIVO, malo);
  }
  for (const bueno of ['Avisos.confirmar({})', 'await confirmar()', 'Avisos.confirm()', 'miPrompt()',
    'alertar()', '$alert()', 'confirmacion(']) {
    assert.doesNotMatch(bueno, DIALOGO_NATIVO, bueno);
  }
});

test('sin alert/confirm/prompt nativos en js/ ni index.html', () => {
  assert.ok(ARCHIVOS_REVISADOS.length > 10, 'no se encontraron archivos');
  for (const rel of ARCHIVOS_REVISADOS) {
    const texto = leer(rel);
    const m = DIALOGO_NATIVO.exec(texto);
    assert.ok(!m, `${rel}:${m && lineaDe(texto, m.index)} usa ${m && m[1]}()`);
  }
});

test('sin atributos style estáticos en js/ ni index.html', () => {
  for (const rel of ARCHIVOS_REVISADOS) {
    const texto = leer(rel);
    const m = /\sstyle\s*=\s*["']/.exec(texto);
    assert.ok(!m, `${rel}:${m && lineaDe(texto, m.index)} tiene style=`);
  }
});

test('los estilos dinámicos solo usan variables CSS', () => {
  for (const rel of ARCHIVOS_REVISADOS) {
    const texto = leer(rel);
    // setProperty/removeProperty con nombre literal deben apuntar a una variable;
    // con nombre en variable (shell.reservarAlto) se acepta: recibe '--alto-*'.
    const m = /\.style\.(?!setProperty\(|removeProperty\()/.exec(texto) ||
      /\.style\.(?:set|remove)Property\(\s*['"](?!--)/.exec(texto) ||
      /\.style\s*=|cssText|setAttribute\(\s*['"]style/.exec(texto);
    assert.ok(!m, `${rel}:${m && lineaDe(texto, m.index)} asigna estilos en línea`);
  }
});

function archivosShell() {
  const sw = leer('sw.js');
  const bloque = sw.match(/const ARCHIVOS_SHELL = \[([\s\S]*?)\];/);
  assert.ok(bloque, 'sw.js sin ARCHIVOS_SHELL');
  return [...bloque[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

const esLocalJsCss = (ruta) => /^(js|css)\/.+\.(js|css)$/.test(ruta);
const sinPrefijo = (ruta) => ruta.replace(/^\.\//, '');

test('index.html y ARCHIVOS_SHELL listan los mismos js/ y css/', () => {
  const html = leer('index.html');
  const enHtml = [
    ...[...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/<link[^>]*\shref="([^"]+)"/g)].map((m) => m[1])
  ].map(sinPrefijo).filter(esLocalJsCss);
  const enShell = archivosShell().map(sinPrefijo).filter(esLocalJsCss);
  assert.ok(enHtml.length > 10, 'index.html sin scripts locales');
  assert.deepStrictEqual([...enHtml].sort(), [...enShell].sort());
});

test('todo archivo local de ARCHIVOS_SHELL existe en disco', () => {
  for (const ruta of archivosShell()) {
    if (/^https?:/.test(ruta) || ruta === './') continue;
    assert.ok(fs.existsSync(path.join(raiz, sinPrefijo(ruta))), 'no existe ' + ruta);
  }
});

test('ARCHIVOS_SHELL incluye el logo, los PNG, el manifest y la portada', () => {
  const shell = archivosShell().map(sinPrefijo);
  for (const rel of ['icons/logo.svg', 'icons/icon-192.png', 'icons/icon-512.png',
    'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'manifest.json', 'index.html']) {
    assert.ok(shell.includes(rel), 'falta en ARCHIVOS_SHELL: ' + rel);
  }
});

test('styles.css no usa el alias viejo --color-primario', () => {
  assert.doesNotMatch(leer('css/styles.css'), /--color-primario/);
});

test('styles.css no tiene colores hex sueltos (solo tokens)', () => {
  const css = leer('css/styles.css');
  const m = /#[0-9a-fA-F]{3,8}\b/.exec(css);
  assert.ok(!m, `css/styles.css:${m && lineaDe(css, m.index)} usa ${m && m[0]}`);
});
