const test = require('node:test');
const assert = require('node:assert');
const Texto = require('../../js/ui/texto.js');

test('escapar neutraliza etiquetas y comillas', () => {
  const r = Texto.escapar('<script>"a"&\'b\'</script>');
  assert.ok(!r.includes('<') && !r.includes('>'));
  assert.strictEqual(r, '&lt;script&gt;&quot;a&quot;&amp;&#39;b&#39;&lt;/script&gt;');
});

test('escapar devuelve cadena vacía para null y undefined', () => {
  assert.strictEqual(Texto.escapar(null), '');
  assert.strictEqual(Texto.escapar(undefined), '');
});

test('escapar convierte números a texto', () => {
  assert.strictEqual(Texto.escapar(42), '42');
  assert.strictEqual(Texto.escapar(0), '0');
});
