const test = require('node:test');
const assert = require('node:assert');
const Pasos = require('../../js/ui/pasos.js');

const req = (extra) => Object.assign({ texto: 'x', categoria: 'Muros', checkEstado: 'pendiente' }, extra);
const paso = (lista, id) => lista.find((p) => p.id === id);

test('orden, ids y etiquetas', () => {
  const r = Pasos.calcular({ estado: 'captura' }, []);
  assert.deepStrictEqual(r.map((p) => p.id), ['captura', 'revision', 'brief', 'checklist']);
  assert.deepStrictEqual(r.map((p) => p.etiqueta), ['Captura', 'Revisión', 'Brief', 'Obra']);
});

test('sin requerimientos solo captura habilitada y avance 0', () => {
  const r = Pasos.calcular({ estado: 'captura' }, []);
  assert.deepStrictEqual(r.map((p) => p.habilitado), [true, false, false, false]);
  assert.ok(r.every((p) => p.completado === false));
  assert.strictEqual(Pasos.avance({ estado: 'captura' }, []), 0);
});

test('un requerimiento sin categoría bloquea el brief', () => {
  const r = Pasos.calcular({ estado: 'captura' }, [req(), req({ categoria: null })]);
  assert.strictEqual(paso(r, 'revision').habilitado, true);
  assert.strictEqual(paso(r, 'brief').habilitado, false);
  assert.strictEqual(paso(r, 'revision').completado, false);
  assert.strictEqual(paso(r, 'captura').completado, true);
});

test('categoria vacía cuenta como sin categoría', () => {
  const r = Pasos.calcular({ estado: 'captura' }, [req({ categoria: '' })]);
  assert.strictEqual(paso(r, 'brief').habilitado, false);
});

test('todos categorizados habilita el brief', () => {
  const r = Pasos.calcular({ estado: 'captura' }, [req(), req()]);
  assert.strictEqual(paso(r, 'brief').habilitado, true);
  assert.strictEqual(paso(r, 'revision').completado, true);
  assert.strictEqual(paso(r, 'brief').completado, false);
});

test('brief completado con brief_generado y aprobado', () => {
  assert.strictEqual(paso(Pasos.calcular({ estado: 'brief_generado' }, [req()]), 'brief').completado, true);
  assert.strictEqual(paso(Pasos.calcular({ estado: 'aprobado' }, [req()]), 'brief').completado, true);
});

test('aprobado habilita checklist; completado solo si todos hecho', () => {
  const p = { estado: 'aprobado' };
  assert.strictEqual(paso(Pasos.calcular({ estado: 'brief_generado' }, [req()]), 'checklist').habilitado, false);
  let r = Pasos.calcular(p, [req({ checkEstado: 'hecho' }), req()]);
  assert.strictEqual(paso(r, 'checklist').habilitado, true);
  assert.strictEqual(paso(r, 'checklist').completado, false);
  r = Pasos.calcular(p, [req({ checkEstado: 'hecho' }), req({ checkEstado: 'hecho' })]);
  assert.strictEqual(paso(r, 'checklist').completado, true);
});

test('avance 4 con aprobado y todo hecho', () => {
  assert.strictEqual(Pasos.avance({ estado: 'aprobado' }, [req({ checkEstado: 'hecho' })]), 4);
});

test('aprobado sin requerimientos no completa checklist', () => {
  const r = Pasos.calcular({ estado: 'aprobado' }, []);
  assert.strictEqual(paso(r, 'checklist').completado, false);
});
