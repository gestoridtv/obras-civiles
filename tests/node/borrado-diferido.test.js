const test = require('node:test');
const assert = require('node:assert');
const BorradoDiferido = require('../../js/ui/borrado-diferido.js');

function espia(impl) {
  const llamadas = [];
  const fn = async (id) => {
    llamadas.push(id);
    if (impl) return impl(id);
  };
  fn.llamadas = llamadas;
  return fn;
}

test('marcar deja el id pendiente sin llamar a eliminar', () => {
  const eliminar = espia();
  const b = BorradoDiferido.crear(eliminar);
  b.marcar('a');
  assert.strictEqual(b.estaPendiente('a'), true);
  assert.strictEqual(eliminar.llamadas.length, 0);
});

test('deshacer saca el id y confirmar posterior no elimina', async () => {
  const eliminar = espia();
  const b = BorradoDiferido.crear(eliminar);
  b.marcar('a');
  assert.strictEqual(b.deshacer('a'), true);
  assert.strictEqual(b.estaPendiente('a'), false);
  await b.confirmar('a');
  assert.strictEqual(eliminar.llamadas.length, 0);
});

test('confirmar elimina una sola vez', async () => {
  const eliminar = espia();
  const b = BorradoDiferido.crear(eliminar);
  b.marcar('b');
  await b.confirmar('b');
  assert.deepStrictEqual(eliminar.llamadas, ['b']);
  assert.strictEqual(b.estaPendiente('b'), false);
  await b.confirmar('b');
  assert.deepStrictEqual(eliminar.llamadas, ['b']);
});

test('deshacer de un id desconocido devuelve false', () => {
  const b = BorradoDiferido.crear(espia());
  assert.strictEqual(b.deshacer('zzz'), false);
});

test('marcar dos veces el mismo id y confirmar llama a eliminar una vez', async () => {
  const eliminar = espia();
  const b = BorradoDiferido.crear(eliminar);
  b.marcar('a');
  b.marcar('a');
  await b.confirmar('a');
  assert.deepStrictEqual(eliminar.llamadas, ['a']);
  assert.strictEqual(b.estaPendiente('a'), false);
});

test('si eliminar rechaza, el id deja de estar pendiente y el error se propaga', async () => {
  const error = new Error('fallo');
  const eliminar = espia(() => { throw error; });
  const b = BorradoDiferido.crear(eliminar);
  b.marcar('a');
  await assert.rejects(b.confirmar('a'), (e) => e === error);
  assert.strictEqual(b.estaPendiente('a'), false);
  assert.strictEqual(eliminar.llamadas.length, 1);
});

test('confirmar concurrente del mismo id no duplica la eliminación', async () => {
  const eliminar = espia();
  const b = BorradoDiferido.crear(eliminar);
  b.marcar('a');
  await Promise.all([b.confirmar('a'), b.confirmar('a')]);
  assert.deepStrictEqual(eliminar.llamadas, ['a']);
});
