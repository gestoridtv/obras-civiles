# Registro de requerimientos de obras civiles — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una PWA local-first para capturar requerimientos de obra por texto o voz, consolidarlos en un brief PDF aprobable por el cliente, y convertirlo en checklist de obra.

**Architecture:** Una sola página (`index.html`) con capa de datos en IndexedDB, un router por hash que intercambia "vistas" (una por pantalla), reconocimiento de voz vía Web Speech API y generación de PDF vía jsPDF. Sin backend, sin build step, sin ES modules — todo vive en namespaces globales (`DB`, `Speech`, `PDF`, `Router`, `Views`) cargados con `<script>` planos, para que la app funcione igual abierta directo desde el filesystem que servida desde GitHub Pages.

**Tech Stack:** HTML + CSS + JS vanilla, IndexedDB, Web Speech API, jsPDF (CDN), Service Worker + Web App Manifest (PWA), GitHub Pages.

**Spec:** [docs/superpowers/specs/2026-10-22-requerimientos-obras-civiles-design.md](../specs/2026-10-22-requerimientos-obras-civiles-design.md)

## Global Constraints

- Sin ES modules: todo se expone en namespaces globales (`window.DB`, `window.Speech`, `window.PDF`, `window.Router`, `window.Views`) cargados con `<script>` clásicos en orden, para que funcione tanto con `file://` como servido por HTTPS.
- Sin build step ni npm: la única dependencia externa es jsPDF vía CDN (`<script>` tag).
- Todos los pasos de verificación manual de este plan sirven la app con `python3 -m http.server 8000` desde la raíz del proyecto (no `file://`), porque el reconocimiento de voz requiere un contexto seguro (HTTPS o `localhost`).
- Todos los datos persisten únicamente en IndexedDB, local al dispositivo. Sin backend, sin cuentas, sin sincronización entre dispositivos.
- Toda la interfaz (textos, mensajes, nombres de función) va en español.
- Siguiendo el Testing del spec: no hay suite automatizada pesada. Cada tarea termina con pasos de verificación manual concretos en el navegador, salvo las dos tareas de lógica pura (`db.js`, `pdf.js`) que incluyen una página de test HTML autocontenida con asserts simples — no requiere npm ni test runner, solo abrir el archivo.
- Distribución final: sitio estático público en GitHub Pages. Los pasos de la Tarea 12 que crean el repo remoto y publican (push, `gh repo create`) requieren confirmación explícita del usuario antes de ejecutarse — no se corren de forma autónoma.

---

### Task 1: Scaffold — shell HTML y hoja de estilos base

**Files:**
- Create: `index.html`
- Create: `css/styles.css`

**Interfaces:**
- Produces: clases CSS reutilizadas por todas las vistas: `.header`, `.card`, `.chip`/`.chip--captura`/`.chip--brief_generado`/`.chip--aprobado`, `.btn`/`.btn--peligro`/`.btn--texto`, `.btn-fab`, `.lista-items`, `.item-captura`/`.item-captura__fondo-borrar`/`.item-captura__contenido`, `.barra-captura`, `.btn-mic`/`.btn-mic--grabando`, `.checklist-item`/`.checklist-item--hecho`, `.progreso`, `.categoria-titulo`. Produces el contenedor `#app` en `index.html` y el marcador `<!-- scripts -->` donde las próximas tareas insertan sus `<script>` tags.

- [ ] **Step 1: Crear `index.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Requerimientos de Obra</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <div id="app">
    <p style="padding:16px;">Cargando…</p>
  </div>
  <!-- scripts -->
</body>
</html>
```

- [ ] **Step 2: Crear `css/styles.css`**

```css
:root {
  --color-fondo: #0f172a;
  --color-superficie: #1e293b;
  --color-texto: #f1f5f9;
  --color-texto-sutil: #94a3b8;
  --color-primario: #2563eb;
  --color-exito: #22c55e;
  --color-peligro: #ef4444;
  --color-borde: #334155;
  --radio: 10px;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--color-fondo);
  color: var(--color-texto);
}

#app {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  padding-bottom: 90px;
  position: relative;
}

.header {
  padding: 16px;
  border-bottom: 1px solid var(--color-borde);
}

.card {
  background: var(--color-superficie);
  border-radius: var(--radio);
  padding: 14px;
  margin: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chip {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.chip--captura { background: #475569; color: #e2e8f0; }
.chip--brief_generado { background: #1d4ed8; color: #dbeafe; }
.chip--aprobado { background: #15803d; color: #dcfce7; }

.btn {
  background: var(--color-primario);
  color: white;
  border: none;
  border-radius: var(--radio);
  padding: 12px 18px;
  font-size: 15px;
  cursor: pointer;
}
.btn--peligro { background: var(--color-peligro); }
.btn--texto { background: transparent; color: var(--color-texto-sutil); }

.btn-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-primario);
  color: white;
  border: none;
  font-size: 28px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

.lista-items {
  list-style: none;
  margin: 0;
  padding: 0 16px;
}

.item-captura {
  background: var(--color-superficie);
  border-radius: var(--radio);
  padding: 12px 14px;
  margin-bottom: 8px;
  position: relative;
  overflow: hidden;
  touch-action: pan-y;
}
.item-captura__fondo-borrar {
  position: absolute;
  inset: 0;
  background: var(--color-peligro);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 16px;
  color: white;
  font-weight: 600;
}
.item-captura__contenido {
  position: relative;
  background: var(--color-superficie);
  transition: transform 0.15s ease;
}

.barra-captura {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  display: flex;
  gap: 8px;
  padding: 10px 16px;
  background: var(--color-superficie);
  border-top: 1px solid var(--color-borde);
}
.barra-captura input[type="text"] {
  flex: 1;
  padding: 12px;
  border-radius: var(--radio);
  border: 1px solid var(--color-borde);
  background: var(--color-fondo);
  color: var(--color-texto);
  font-size: 15px;
}
.btn-mic {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--color-primario);
  color: white;
  font-size: 20px;
  cursor: pointer;
  flex-shrink: 0;
}
.btn-mic--grabando { background: var(--color-peligro); }

.checklist-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: var(--color-superficie);
  border-radius: var(--radio);
  margin: 0 16px 8px;
}
.checklist-item input[type="checkbox"] {
  width: 26px;
  height: 26px;
}
.checklist-item--hecho {
  opacity: 0.6;
  text-decoration: line-through;
}

.progreso {
  padding: 12px 16px;
  font-weight: 600;
  color: var(--color-texto-sutil);
}

.categoria-titulo {
  padding: 16px 16px 8px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-texto-sutil);
}
```

- [ ] **Step 3: Verificación manual**

Correr `python3 -m http.server 8000` desde la raíz del proyecto, abrir `http://localhost:8000/` en Chrome.
Esperado: fondo oscuro, texto "Cargando…" centrado arriba, sin errores en la consola de devtools.

- [ ] **Step 4: Commit**

```bash
git add index.html css/styles.css
git commit -m "feat: scaffold HTML shell y estilos base"
```

---

### Task 2: Capa de datos (IndexedDB)

**Files:**
- Create: `js/db.js`
- Test: `tests/db-test.html`
- Modify: `index.html` (agregar `<script src="js/db.js"></script>` antes de `<!-- scripts -->`)

**Interfaces:**
- Consumes: ninguno (primer módulo del namespace global).
- Produces: `window.DB` con:
  - `DB.CATEGORIAS_SUGERIDAS: string[]`
  - `DB.init(): Promise<void>`
  - `DB.crearProyecto({nombre, cliente}): Promise<Proyecto>`
  - `DB.listarProyectos(): Promise<Proyecto[]>`
  - `DB.obtenerProyecto(id): Promise<Proyecto|undefined>`
  - `DB.actualizarProyecto(id, cambios): Promise<Proyecto>`
  - `DB.eliminarProyecto(id): Promise<void>` (borra en cascada sus requerimientos)
  - `DB.crearRequerimiento(proyectoId, texto): Promise<Requerimiento>`
  - `DB.listarRequerimientos(proyectoId): Promise<Requerimiento[]>`
  - `DB.actualizarRequerimiento(id, cambios): Promise<Requerimiento>`
  - `DB.eliminarRequerimiento(id): Promise<void>`
  - `Proyecto = {id, nombre, cliente, fechaCreacion, estado: 'captura'|'brief_generado'|'aprobado', categorias: string[]}`
  - `Requerimiento = {id, proyectoId, texto, categoria: string|null, orden, fechaCaptura, checkEstado: 'pendiente'|'hecho'}`

- [ ] **Step 1: Crear `js/db.js`**

```js
(function () {
  const DB_NAME = 'obras-civiles-db';
  const DB_VERSION = 1;
  const CATEGORIAS_SUGERIDAS = ['Estructura', 'Eléctrico', 'Sanitario/Plomería', 'Acabados', 'Carpintería', 'Otros'];

  let dbPromise = null;

  function abrirDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('proyectos')) {
          db.createObjectStore('proyectos', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('requerimientos')) {
          const store = db.createObjectStore('requerimientos', { keyPath: 'id' });
          store.createIndex('proyectoId', 'proyectoId', { unique: false });
        }
      };
      req.onsuccess = (event) => resolve(event.target.result);
      req.onerror = (event) => reject(event.target.error);
    });
    return dbPromise;
  }

  function init() {
    return abrirDB().then(() => undefined);
  }

  function tx(storeName, mode) {
    return abrirDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
  }

  function generarId() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function crearProyecto({ nombre, cliente }) {
    const proyecto = {
      id: generarId(),
      nombre,
      cliente,
      fechaCreacion: new Date().toISOString(),
      estado: 'captura',
      categorias: CATEGORIAS_SUGERIDAS.slice(),
    };
    return tx('proyectos', 'readwrite').then((store) => new Promise((resolve, reject) => {
      const req = store.add(proyecto);
      req.onsuccess = () => resolve(proyecto);
      req.onerror = () => reject(req.error);
    }));
  }

  function listarProyectos() {
    return tx('proyectos', 'readonly').then((store) => new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result.sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion)));
      req.onerror = () => reject(req.error);
    }));
  }

  function obtenerProyecto(id) {
    return tx('proyectos', 'readonly').then((store) => new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  }

  function actualizarProyecto(id, cambios) {
    return tx('proyectos', 'readwrite').then((store) => new Promise((resolve, reject) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const actual = getReq.result;
        if (!actual) { reject(new Error('Proyecto no encontrado: ' + id)); return; }
        const actualizado = Object.assign({}, actual, cambios);
        const putReq = store.put(actualizado);
        putReq.onsuccess = () => resolve(actualizado);
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    }));
  }

  function eliminarProyecto(id) {
    return listarRequerimientos(id)
      .then((reqs) => Promise.all(reqs.map((r) => eliminarRequerimiento(r.id))))
      .then(() => tx('proyectos', 'readwrite'))
      .then((store) => new Promise((resolve, reject) => {
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }));
  }

  function crearRequerimiento(proyectoId, texto) {
    return listarRequerimientos(proyectoId).then((existentes) => {
      const requerimiento = {
        id: generarId(),
        proyectoId,
        texto,
        categoria: null,
        orden: existentes.length,
        fechaCaptura: new Date().toISOString(),
        checkEstado: 'pendiente',
      };
      return tx('requerimientos', 'readwrite').then((store) => new Promise((resolve, reject) => {
        const req = store.add(requerimiento);
        req.onsuccess = () => resolve(requerimiento);
        req.onerror = () => reject(req.error);
      }));
    });
  }

  function listarRequerimientos(proyectoId) {
    return tx('requerimientos', 'readonly').then((store) => new Promise((resolve, reject) => {
      const index = store.index('proyectoId');
      const req = index.getAll(proyectoId);
      req.onsuccess = () => resolve(req.result.sort((a, b) => a.orden - b.orden));
      req.onerror = () => reject(req.error);
    }));
  }

  function actualizarRequerimiento(id, cambios) {
    return tx('requerimientos', 'readwrite').then((store) => new Promise((resolve, reject) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const actual = getReq.result;
        if (!actual) { reject(new Error('Requerimiento no encontrado: ' + id)); return; }
        const actualizado = Object.assign({}, actual, cambios);
        const putReq = store.put(actualizado);
        putReq.onsuccess = () => resolve(actualizado);
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    }));
  }

  function eliminarRequerimiento(id) {
    return tx('requerimientos', 'readwrite').then((store) => new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }));
  }

  window.DB = {
    CATEGORIAS_SUGERIDAS,
    init,
    crearProyecto,
    listarProyectos,
    obtenerProyecto,
    actualizarProyecto,
    eliminarProyecto,
    crearRequerimiento,
    listarRequerimientos,
    actualizarRequerimiento,
    eliminarRequerimiento,
  };
})();
```

- [ ] **Step 2: Crear `tests/db-test.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Test: db.js</title>
</head>
<body>
  <h1>Resultados</h1>
  <ul id="resultados"></ul>
  <script src="../js/db.js"></script>
  <script>
    const ul = document.getElementById('resultados');
    let pasados = 0;
    let fallados = 0;

    function assert(condicion, mensaje) {
      const li = document.createElement('li');
      if (condicion) {
        li.textContent = '✅ ' + mensaje;
        pasados++;
      } else {
        li.textContent = '❌ ' + mensaje;
        li.style.color = 'red';
        fallados++;
      }
      ul.appendChild(li);
    }

    async function correr() {
      await new Promise((resolve) => {
        const req = indexedDB.deleteDatabase('obras-civiles-db');
        req.onsuccess = resolve;
        req.onerror = resolve;
        req.onblocked = resolve;
      });

      await DB.init();

      const proyecto = await DB.crearProyecto({ nombre: 'Casa Pérez', cliente: 'Juan Pérez' });
      assert(!!proyecto.id, 'crearProyecto genera un id');
      assert(proyecto.estado === 'captura', 'proyecto nuevo arranca en estado captura');
      assert(proyecto.categorias.length === 6, 'proyecto nuevo trae 6 categorías sugeridas');

      const listados = await DB.listarProyectos();
      assert(listados.length === 1, 'listarProyectos devuelve el proyecto creado');

      const actualizado = await DB.actualizarProyecto(proyecto.id, { estado: 'brief_generado' });
      assert(actualizado.estado === 'brief_generado', 'actualizarProyecto cambia el estado');

      const req1 = await DB.crearRequerimiento(proyecto.id, 'Pileta de 6x3');
      const req2 = await DB.crearRequerimiento(proyecto.id, 'Dos baños en planta alta');
      assert(req1.categoria === null, 'requerimiento nuevo no tiene categoría');
      assert(req1.orden === 0 && req2.orden === 1, 'requerimientos se ordenan por orden de creación');

      const reqs = await DB.listarRequerimientos(proyecto.id);
      assert(reqs.length === 2, 'listarRequerimientos devuelve los dos requerimientos creados');

      const reqActualizado = await DB.actualizarRequerimiento(req1.id, { categoria: 'Estructura' });
      assert(reqActualizado.categoria === 'Estructura', 'actualizarRequerimiento asigna categoría');

      await DB.eliminarRequerimiento(req2.id);
      const reqsTrasBorrar = await DB.listarRequerimientos(proyecto.id);
      assert(reqsTrasBorrar.length === 1, 'eliminarRequerimiento borra el requerimiento');

      await DB.eliminarProyecto(proyecto.id);
      const proyectosTrasBorrar = await DB.listarProyectos();
      assert(proyectosTrasBorrar.length === 0, 'eliminarProyecto borra el proyecto');
      const reqsHuerfanos = await DB.listarRequerimientos(proyecto.id);
      assert(reqsHuerfanos.length === 0, 'eliminarProyecto borra en cascada sus requerimientos');

      const resumen = document.createElement('h2');
      resumen.textContent = `${pasados} pasaron, ${fallados} fallaron`;
      resumen.style.color = fallados === 0 ? 'green' : 'red';
      document.body.appendChild(resumen);
    }

    correr().catch((err) => {
      const li = document.createElement('li');
      li.textContent = '❌ Error inesperado: ' + err.message;
      li.style.color = 'red';
      ul.appendChild(li);
    });
  </script>
</body>
</html>
```

- [ ] **Step 3: Agregar el script a `index.html`**

```html
  <script src="js/db.js"></script>
  <!-- scripts -->
```

(reemplaza la línea `  <!-- scripts -->` por las dos líneas de arriba)

- [ ] **Step 4: Verificación manual**

Correr `python3 -m http.server 8000`, abrir `http://localhost:8000/tests/db-test.html`.
Esperado: todos los ítems en verde con ✅, resumen final "9 pasaron, 0 fallaron".

- [ ] **Step 5: Commit**

```bash
git add js/db.js tests/db-test.html index.html
git commit -m "feat: capa de datos IndexedDB (proyectos y requerimientos)"
```

---

### Task 3: Reconocimiento de voz

**Files:**
- Create: `js/speech.js`
- Test: `tests/speech-test.html`
- Modify: `index.html` (agregar `<script src="js/speech.js"></script>` antes de `<!-- scripts -->`)

**Interfaces:**
- Consumes: ninguno.
- Produces: `window.Speech` con:
  - `Speech.disponible(): boolean`
  - `Speech.iniciar({onResultado: (texto: string) => void, onError: (err: Error) => void, idioma?: string}): void`
  - `Speech.detener(): void`

- [ ] **Step 1: Crear `js/speech.js`**

```js
(function () {
  const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;

  function disponible() {
    return !!SpeechRecognitionImpl;
  }

  let reconocimientoActivo = null;

  function iniciar({ onResultado, onError, idioma }) {
    if (!disponible()) {
      onError(new Error('SpeechRecognition no soportado en este navegador'));
      return;
    }
    const recognition = new SpeechRecognitionImpl();
    recognition.lang = idioma || 'es-AR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const texto = event.results[0][0].transcript;
      onResultado(texto);
    };
    recognition.onerror = (event) => {
      onError(new Error('Error de reconocimiento de voz: ' + event.error));
    };
    recognition.onend = () => {
      reconocimientoActivo = null;
    };

    reconocimientoActivo = recognition;
    recognition.start();
  }

  function detener() {
    if (reconocimientoActivo) {
      reconocimientoActivo.stop();
      reconocimientoActivo = null;
    }
  }

  window.Speech = { disponible, iniciar, detener };
})();
```

- [ ] **Step 2: Crear `tests/speech-test.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Test: speech.js</title></head>
<body>
  <p>Disponible: <span id="disponible"></span></p>
  <button id="btnMic">🎤 Hablar</button>
  <p>Resultado: <span id="resultado"></span></p>
  <script src="../js/speech.js"></script>
  <script>
    document.getElementById('disponible').textContent = Speech.disponible();
    document.getElementById('btnMic').addEventListener('click', () => {
      Speech.iniciar({
        onResultado: (texto) => { document.getElementById('resultado').textContent = texto; },
        onError: (err) => { document.getElementById('resultado').textContent = 'ERROR: ' + err.message; },
      });
    });
  </script>
</body>
</html>
```

- [ ] **Step 3: Agregar el script a `index.html`**

```html
  <script src="js/speech.js"></script>
  <!-- scripts -->
```

- [ ] **Step 4: Verificación manual**

Correr `python3 -m http.server 8000`, abrir `http://localhost:8000/tests/speech-test.html` en Chrome.
Esperado: "Disponible: true". Click en "🎤 Hablar", aceptar el permiso de micrófono, decir una frase corta.
Esperado: la frase dicha aparece como texto en "Resultado".

- [ ] **Step 5: Commit**

```bash
git add js/speech.js tests/speech-test.html index.html
git commit -m "feat: reconocimiento de voz con Web Speech API"
```

---

### Task 4: Generación de PDF del brief

**Files:**
- Create: `js/pdf.js`
- Test: `tests/pdf-test.html`
- Modify: `index.html` (agregar CDN de jsPDF y `<script src="js/pdf.js"></script>` antes de `<!-- scripts -->`)

**Interfaces:**
- Consumes: `window.jspdf.jsPDF` (global expuesto por la librería CDN).
- Produces: `window.PDF` con:
  - `PDF.generarBrief(proyecto: Proyecto, requerimientos: Requerimiento[]): Blob`
  - `PDF.nombreArchivo(proyecto: Proyecto): string`

- [ ] **Step 1: Crear `js/pdf.js`**

```js
(function () {
  function nombreArchivo(proyecto) {
    const fecha = new Date().toISOString().slice(0, 10);
    const base = `Brief - ${proyecto.cliente} - ${fecha}`;
    return base.replace(/[\\/:*?"<>|]/g, '-') + '.pdf';
  }

  function generarBrief(proyecto, requerimientos) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const margenIzq = 15;
    let y = 20;

    doc.setFontSize(16);
    doc.text(`Brief de requerimientos — ${proyecto.nombre}`, margenIzq, y);
    y += 8;
    doc.setFontSize(11);
    doc.text(`Cliente: ${proyecto.cliente}`, margenIzq, y);
    y += 6;
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, margenIzq, y);
    y += 10;

    const porCategoria = {};
    requerimientos.forEach((r) => {
      const cat = r.categoria || 'Sin categoría';
      if (!porCategoria[cat]) porCategoria[cat] = [];
      porCategoria[cat].push(r);
    });

    proyecto.categorias.concat(['Sin categoría']).forEach((categoria) => {
      const items = porCategoria[categoria];
      if (!items || items.length === 0) return;

      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(13);
      doc.text(categoria, margenIzq, y);
      y += 7;
      doc.setFontSize(11);
      items.forEach((item) => {
        if (y > 280) { doc.addPage(); y = 20; }
        const lineas = doc.splitTextToSize(`• ${item.texto}`, 180);
        doc.text(lineas, margenIzq + 3, y);
        y += 6 * lineas.length;
      });
      y += 4;
    });

    return doc.output('blob');
  }

  window.PDF = { generarBrief, nombreArchivo };
})();
```

- [ ] **Step 2: Crear `tests/pdf-test.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Test: pdf.js</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
</head>
<body>
  <a id="link" target="_blank">Abrir PDF generado</a>
  <script src="../js/pdf.js"></script>
  <script>
    const proyecto = {
      nombre: 'Casa Pérez',
      cliente: 'Juan Pérez',
      categorias: ['Estructura', 'Eléctrico', 'Acabados'],
    };
    const requerimientos = [
      { texto: 'Pileta de 6x3 metros', categoria: 'Estructura' },
      { texto: 'Dos baños en planta alta', categoria: 'Estructura' },
      { texto: 'Tablero eléctrico trifásico', categoria: 'Eléctrico' },
      { texto: 'Piso porcelanato en living', categoria: 'Acabados' },
    ];
    const blob = PDF.generarBrief(proyecto, requerimientos);
    const url = URL.createObjectURL(blob);
    const link = document.getElementById('link');
    link.href = url;
    link.textContent = PDF.nombreArchivo(proyecto);
  </script>
</body>
</html>
```

- [ ] **Step 3: Agregar los scripts a `index.html`**

```html
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="js/pdf.js"></script>
  <!-- scripts -->
```

- [ ] **Step 4: Verificación manual**

Correr `python3 -m http.server 8000`, abrir `http://localhost:8000/tests/pdf-test.html`, click en el link.
Esperado: se abre un PDF nuevo con título "Brief de requerimientos — Casa Pérez", secciones "Estructura" (2 ítems), "Eléctrico" (1 ítem), "Acabados" (1 ítem), sin sección "Sin categoría".

- [ ] **Step 5: Commit**

```bash
git add js/pdf.js tests/pdf-test.html index.html
git commit -m "feat: generación de PDF del brief con jsPDF"
```

---

### Task 5: Router y shell de navegación

**Files:**
- Create: `js/router.js`
- Create: `js/app.js`
- Create: `js/views/proyectos.js` (stub)
- Create: `js/views/captura.js` (stub)
- Create: `js/views/revision.js` (stub)
- Create: `js/views/brief.js` (stub)
- Create: `js/views/checklist.js` (stub)
- Modify: `index.html` (agregar los 7 `<script>` tags antes de `<!-- scripts -->`, en este orden: router.js, los 5 views, app.js)

**Interfaces:**
- Consumes: `DB.init()` (Task 2).
- Produces: `window.Router` con:
  - `Router.registrar(ruta: string, renderFn: (container: HTMLElement, params: {proyectoId: string|null}) => void): void`
  - `Router.navegar(ruta: string, params?: {proyectoId: string}): void`
  - `Router.renderActual(): void`
  - Produces `window.Views.{proyectos,captura,revision,brief,checklist}.render(container, params)` — stubs en esta tarea, implementados en las Tareas 6-10.

- [ ] **Step 1: Crear `js/router.js`**

```js
(function () {
  const vistas = {};

  function registrar(ruta, renderFn) {
    vistas[ruta] = renderFn;
  }

  function parsearHash() {
    const hash = location.hash.replace(/^#/, '');
    const [ruta, proyectoId] = hash.split('/');
    return { ruta: ruta || 'proyectos', proyectoId: proyectoId || null };
  }

  function renderActual() {
    const { ruta, proyectoId } = parsearHash();
    const render = vistas[ruta] || vistas['proyectos'];
    const contenedor = document.getElementById('app');
    contenedor.innerHTML = '';
    render(contenedor, { proyectoId });
  }

  function navegar(ruta, params) {
    const proyectoId = params && params.proyectoId;
    location.hash = proyectoId ? `${ruta}/${proyectoId}` : ruta;
  }

  window.addEventListener('hashchange', renderActual);

  window.Router = { registrar, navegar, renderActual };
})();
```

- [ ] **Step 2: Crear los 5 stubs de vistas**

`js/views/proyectos.js`:
```js
window.Views = window.Views || {};
window.Views.proyectos = {
  render(container) {
    container.innerHTML = '<p style="padding:16px;">Vista de proyectos (pendiente)</p>';
  },
};
```

`js/views/captura.js`:
```js
window.Views = window.Views || {};
window.Views.captura = {
  render(container) {
    container.innerHTML = '<p style="padding:16px;">Vista de captura (pendiente)</p>';
  },
};
```

`js/views/revision.js`:
```js
window.Views = window.Views || {};
window.Views.revision = {
  render(container) {
    container.innerHTML = '<p style="padding:16px;">Vista de revisión (pendiente)</p>';
  },
};
```

`js/views/brief.js`:
```js
window.Views = window.Views || {};
window.Views.brief = {
  render(container) {
    container.innerHTML = '<p style="padding:16px;">Vista de brief (pendiente)</p>';
  },
};
```

`js/views/checklist.js`:
```js
window.Views = window.Views || {};
window.Views.checklist = {
  render(container) {
    container.innerHTML = '<p style="padding:16px;">Vista de checklist (pendiente)</p>';
  },
};
```

- [ ] **Step 3: Crear `js/app.js`**

```js
(function () {
  function registrarVistas() {
    Router.registrar('proyectos', Views.proyectos.render);
    Router.registrar('captura', Views.captura.render);
    Router.registrar('revision', Views.revision.render);
    Router.registrar('brief', Views.brief.render);
    Router.registrar('checklist', Views.checklist.render);
  }

  document.addEventListener('DOMContentLoaded', () => {
    DB.init()
      .then(() => {
        registrarVistas();
        Router.renderActual();
      })
      .catch((err) => {
        document.getElementById('app').textContent = 'Error inicializando la base de datos: ' + err.message;
      });
  });
})();
```

- [ ] **Step 4: Agregar los scripts a `index.html`**

```html
  <script src="js/router.js"></script>
  <script src="js/views/proyectos.js"></script>
  <script src="js/views/captura.js"></script>
  <script src="js/views/revision.js"></script>
  <script src="js/views/brief.js"></script>
  <script src="js/views/checklist.js"></script>
  <script src="js/app.js"></script>
  <!-- scripts -->
```

- [ ] **Step 5: Verificación manual**

Correr `python3 -m http.server 8000`, abrir `http://localhost:8000/#proyectos`.
Esperado: "Vista de proyectos (pendiente)".
Cambiar la URL a `http://localhost:8000/#captura/abc123`.
Esperado: "Vista de captura (pendiente)", sin errores de consola.
Abrir devtools → Application → IndexedDB: confirmar que existe la base `obras-civiles-db` con los object stores `proyectos` y `requerimientos`.

- [ ] **Step 6: Commit**

```bash
git add js/router.js js/app.js js/views index.html
git commit -m "feat: router por hash y shell de navegación con vistas stub"
```

---

### Task 6: Vista de proyectos (home)

**Files:**
- Modify: `js/views/proyectos.js` (reemplazar el stub completo)

**Interfaces:**
- Consumes: `DB.listarProyectos()`, `DB.crearProyecto()`, `DB.eliminarProyecto()`, `Router.navegar()`, `Router.renderActual()`.
- Produces: sin cambios en la interfaz pública (`Views.proyectos.render(container)`), solo cambia su implementación interna.

- [ ] **Step 1: Reemplazar `js/views/proyectos.js`**

```js
window.Views = window.Views || {};

const ETIQUETA_ESTADO = {
  captura: 'Captura',
  brief_generado: 'Brief generado',
  aprobado: 'Aprobado',
};

const RUTA_SEGUN_ESTADO = {
  captura: 'captura',
  brief_generado: 'brief',
  aprobado: 'checklist',
};

window.Views.proyectos = {
  render(container) {
    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = '<h1>Mis obras</h1>';
    container.appendChild(header);

    const lista = document.createElement('div');
    container.appendChild(lista);

    const fab = document.createElement('button');
    fab.className = 'btn-fab';
    fab.textContent = '+';
    fab.addEventListener('click', () => mostrarFormularioNuevoProyecto(container));
    container.appendChild(fab);

    DB.listarProyectos().then((proyectos) => {
      lista.innerHTML = '';
      if (proyectos.length === 0) {
        lista.innerHTML = '<p style="padding:16px;color:var(--color-texto-sutil);">Todavía no creaste ninguna obra. Tocá + para empezar.</p>';
        return;
      }
      proyectos.forEach((proyecto) => lista.appendChild(crearTarjetaProyecto(proyecto)));
    });
  },
};

function crearTarjetaProyecto(proyecto) {
  const card = document.createElement('div');
  card.className = 'card';

  const info = document.createElement('div');
  info.style.cursor = 'pointer';
  info.innerHTML = `
    <strong>${proyecto.cliente}</strong><br>
    <span style="color:var(--color-texto-sutil);font-size:13px;">${proyecto.nombre}</span><br>
    <span class="chip chip--${proyecto.estado}">${ETIQUETA_ESTADO[proyecto.estado]}</span>
  `;
  info.addEventListener('click', () => {
    Router.navegar(RUTA_SEGUN_ESTADO[proyecto.estado], { proyectoId: proyecto.id });
  });
  card.appendChild(info);

  const btnBorrar = document.createElement('button');
  btnBorrar.className = 'btn btn--texto';
  btnBorrar.textContent = '🗑';
  btnBorrar.addEventListener('click', (evento) => {
    evento.stopPropagation();
    if (confirm(`¿Borrar la obra "${proyecto.nombre}"? Esta acción no se puede deshacer.`)) {
      DB.eliminarProyecto(proyecto.id).then(() => Router.renderActual());
    }
  });
  card.appendChild(btnBorrar);

  return card;
}

function mostrarFormularioNuevoProyecto(container) {
  if (document.getElementById('form-nuevo-proyecto')) return;

  const form = document.createElement('div');
  form.id = 'form-nuevo-proyecto';
  form.className = 'card';
  form.style.flexDirection = 'column';
  form.style.alignItems = 'stretch';
  form.innerHTML = `
    <input type="text" id="input-nombre" placeholder="Nombre de la obra (ej: Casa Pérez)" style="margin-bottom:8px;padding:10px;border-radius:8px;border:1px solid var(--color-borde);background:var(--color-fondo);color:var(--color-texto);">
    <input type="text" id="input-cliente" placeholder="Cliente" style="margin-bottom:8px;padding:10px;border-radius:8px;border:1px solid var(--color-borde);background:var(--color-fondo);color:var(--color-texto);">
    <button id="btn-crear-proyecto" class="btn">Crear obra</button>
  `;
  container.insertBefore(form, container.children[1]);

  document.getElementById('btn-crear-proyecto').addEventListener('click', () => {
    const nombre = document.getElementById('input-nombre').value.trim();
    const cliente = document.getElementById('input-cliente').value.trim();
    if (!nombre || !cliente) return;
    DB.crearProyecto({ nombre, cliente }).then((proyecto) => {
      Router.navegar('captura', { proyectoId: proyecto.id });
    });
  });
}
```

- [ ] **Step 2: Verificación manual**

Correr `python3 -m http.server 8000`, abrir `http://localhost:8000/#proyectos`.
Esperado: "Todavía no creaste ninguna obra...". Click en "+", completar nombre y cliente, click "Crear obra".
Esperado: redirige a `#captura/<id>` (muestra el stub de captura). Volver a `#proyectos` manualmente.
Esperado: aparece una tarjeta con el cliente, nombre y chip gris "Captura". Click en 🗑, confirmar.
Esperado: la tarjeta desaparece; en devtools → Application → IndexedDB, el store `proyectos` ya no tiene ese registro.

- [ ] **Step 3: Commit**

```bash
git add js/views/proyectos.js
git commit -m "feat: vista de lista de proyectos"
```

---

### Task 7: Vista de captura (texto y voz)

**Files:**
- Modify: `js/views/captura.js` (reemplazar el stub completo)

**Interfaces:**
- Consumes: `DB.obtenerProyecto()`, `DB.listarRequerimientos()`, `DB.crearRequerimiento()`, `DB.eliminarRequerimiento()`, `Speech.disponible()`, `Speech.iniciar()`, `Router.navegar()`.
- Produces: sin cambios en la interfaz pública (`Views.captura.render(container, {proyectoId})`).

- [ ] **Step 1: Reemplazar `js/views/captura.js`**

```js
window.Views = window.Views || {};

window.Views.captura = {
  render(container, { proyectoId }) {
    DB.obtenerProyecto(proyectoId).then((proyecto) => {
      if (!proyecto) {
        container.innerHTML = '<p style="padding:16px;">Obra no encontrada.</p>';
        return;
      }

      const header = document.createElement('div');
      header.className = 'header';
      header.innerHTML = `
        <h1>${proyecto.nombre}</h1>
        <button class="btn btn--texto" id="btn-ir-revision">Revisar y categorizar →</button>
      `;
      container.appendChild(header);

      const lista = document.createElement('ul');
      lista.className = 'lista-items';
      container.appendChild(lista);

      const barra = document.createElement('div');
      barra.className = 'barra-captura';
      barra.innerHTML = `
        <input type="text" id="input-captura" placeholder="Escribí o dictá un requerimiento…">
        <button class="btn-mic" id="btn-mic">🎤</button>
      `;
      container.appendChild(barra);

      function recargarLista() {
        DB.listarRequerimientos(proyectoId).then((requerimientos) => {
          lista.innerHTML = '';
          requerimientos.slice().reverse().forEach((req) => {
            lista.appendChild(crearItemCaptura(req, recargarLista));
          });
        });
      }

      function agregarTexto(texto) {
        const limpio = texto.trim();
        if (!limpio) return;
        DB.crearRequerimiento(proyectoId, limpio).then(() => {
          input.value = '';
          recargarLista();
        });
      }

      const input = document.getElementById('input-captura');
      input.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') agregarTexto(input.value);
      });

      const btnMic = document.getElementById('btn-mic');
      btnMic.addEventListener('click', () => {
        if (!Speech.disponible()) {
          alert('El dictado por voz no está disponible en este navegador. Usá el campo de texto.');
          return;
        }
        btnMic.classList.add('btn-mic--grabando');
        Speech.iniciar({
          onResultado: (texto) => {
            btnMic.classList.remove('btn-mic--grabando');
            input.value = texto;
            input.focus();
          },
          onError: (err) => {
            btnMic.classList.remove('btn-mic--grabando');
            console.warn(err.message);
          },
        });
      });

      document.getElementById('btn-ir-revision').addEventListener('click', () => {
        Router.navegar('revision', { proyectoId });
      });

      recargarLista();
    });
  },
};

function crearItemCaptura(req, alBorrar) {
  const li = document.createElement('li');
  li.className = 'item-captura';
  li.innerHTML = `
    <div class="item-captura__fondo-borrar">Borrar</div>
    <div class="item-captura__contenido">${req.texto}</div>
  `;

  const contenido = li.querySelector('.item-captura__contenido');
  let inicioX = null;

  contenido.addEventListener('pointerdown', (evento) => { inicioX = evento.clientX; });
  contenido.addEventListener('pointermove', (evento) => {
    if (inicioX === null) return;
    const delta = evento.clientX - inicioX;
    if (delta < 0) contenido.style.transform = `translateX(${delta}px)`;
  });
  contenido.addEventListener('pointerup', (evento) => {
    if (inicioX === null) return;
    const delta = evento.clientX - inicioX;
    if (delta < -80) {
      DB.eliminarRequerimiento(req.id).then(alBorrar);
    } else {
      contenido.style.transform = 'translateX(0)';
    }
    inicioX = null;
  });

  return li;
}
```

- [ ] **Step 2: Verificación manual**

Correr `python3 -m http.server 8000`, crear un proyecto desde `#proyectos` (Task 6), que redirige a `#captura/<id>`.
Escribir "Pileta de 6x3" y presionar Enter.
Esperado: aparece en la lista, arriba de la barra inferior.
Click en 🎤, permitir micrófono, decir "Dos baños en planta alta".
Esperado: el texto dictado aparece editable en el input (sin agregarse todavía); presionar Enter lo agrega a la lista.
Con el mouse, hacer click-arrastrar un ítem hacia la izquierda más de ~80px y soltar.
Esperado: el ítem se borra de la lista y del IndexedDB (verificar en devtools).

- [ ] **Step 3: Commit**

```bash
git add js/views/captura.js
git commit -m "feat: vista de captura con texto y dictado por voz"
```

---

### Task 8: Vista de revisión y categorización

**Files:**
- Modify: `js/views/revision.js` (reemplazar el stub completo)

**Interfaces:**
- Consumes: `DB.obtenerProyecto()`, `DB.listarRequerimientos()`, `DB.actualizarRequerimiento()`, `DB.actualizarProyecto()`, `DB.eliminarRequerimiento()`, `Router.navegar()`.
- Produces: sin cambios en la interfaz pública (`Views.revision.render(container, {proyectoId})`).

- [ ] **Step 1: Reemplazar `js/views/revision.js`**

```js
window.Views = window.Views || {};

window.Views.revision = {
  render(container, { proyectoId }) {
    DB.obtenerProyecto(proyectoId).then((proyecto) => {
      const header = document.createElement('div');
      header.className = 'header';
      header.innerHTML = `<h1>Revisar: ${proyecto.nombre}</h1>`;
      container.appendChild(header);

      const lista = document.createElement('div');
      container.appendChild(lista);

      const btnGenerar = document.createElement('button');
      btnGenerar.className = 'btn';
      btnGenerar.textContent = 'Generar brief';
      btnGenerar.style.margin = '16px';
      btnGenerar.addEventListener('click', () => {
        if (btnGenerar.disabled) return;
        DB.actualizarProyecto(proyectoId, { estado: 'brief_generado' }).then(() => {
          Router.navegar('brief', { proyectoId });
        });
      });
      container.appendChild(btnGenerar);

      function recargar() {
        DB.listarRequerimientos(proyectoId).then((requerimientos) => {
          lista.innerHTML = '';
          requerimientos.forEach((req) => {
            lista.appendChild(crearFilaRevision(req, proyecto, recargar));
          });
          const todosCategorizados = requerimientos.length > 0 && requerimientos.every((r) => r.categoria);
          btnGenerar.disabled = !todosCategorizados;
          btnGenerar.style.opacity = todosCategorizados ? '1' : '0.5';
        });
      }

      recargar();
    });
  },
};

function crearFilaRevision(req, proyecto, alCambiar) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.flexDirection = 'column';
  card.style.alignItems = 'stretch';

  const textoSpan = document.createElement('div');
  textoSpan.textContent = req.texto;
  textoSpan.style.marginBottom = '8px';
  textoSpan.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = req.texto;
    input.style.width = '100%';
    textoSpan.replaceWith(input);
    input.focus();
    input.addEventListener('blur', () => {
      DB.actualizarRequerimiento(req.id, { texto: input.value.trim() || req.texto }).then(alCambiar);
    });
  });
  card.appendChild(textoSpan);

  const fila = document.createElement('div');
  fila.style.display = 'flex';
  fila.style.gap = '8px';
  fila.style.alignItems = 'center';

  const select = document.createElement('select');
  select.innerHTML = '<option value="">Sin categoría</option>' +
    proyecto.categorias.map((c) => `<option value="${c}" ${c === req.categoria ? 'selected' : ''}>${c}</option>`).join('') +
    '<option value="__nueva__">+ Nueva categoría…</option>';
  select.addEventListener('change', () => {
    if (select.value === '__nueva__') {
      const nueva = prompt('Nombre de la nueva categoría:');
      if (nueva && nueva.trim()) {
        const categorias = proyecto.categorias.concat([nueva.trim()]);
        DB.actualizarProyecto(proyecto.id, { categorias }).then(() => {
          proyecto.categorias = categorias;
          DB.actualizarRequerimiento(req.id, { categoria: nueva.trim() }).then(alCambiar);
        });
      } else {
        select.value = req.categoria || '';
      }
      return;
    }
    DB.actualizarRequerimiento(req.id, { categoria: select.value || null }).then(alCambiar);
  });
  fila.appendChild(select);

  const btnBorrar = document.createElement('button');
  btnBorrar.className = 'btn btn--texto';
  btnBorrar.textContent = '🗑';
  btnBorrar.addEventListener('click', () => {
    if (confirm('¿Borrar este requerimiento?')) {
      DB.eliminarRequerimiento(req.id).then(alCambiar);
    }
  });
  fila.appendChild(btnBorrar);

  card.appendChild(fila);
  return card;
}
```

- [ ] **Step 2: Verificación manual**

Navegar a `http://localhost:8000/#revision/<id>` de un proyecto con requerimientos sin categorizar (de Task 7).
Esperado: botón "Generar brief" atenuado (opacity 0.5) mientras falte categorizar algún ítem.
Asignar una categoría a cada requerimiento desde el `<select>`.
Esperado: al categorizar el último, el botón "Generar brief" se habilita (opacity 1).
Probar "+ Nueva categoría…", escribir un nombre nuevo.
Esperado: la nueva categoría queda asignada al ítem y aparece en el `<select>`; recargar la página y confirmar que persiste (devtools → IndexedDB → `proyectos` → `categorias`).
Click en "Generar brief".
Esperado: redirige a `#brief/<id>`; en devtools, el proyecto tiene `estado: "brief_generado"`.

- [ ] **Step 3: Commit**

```bash
git add js/views/revision.js
git commit -m "feat: vista de revisión y categorización de requerimientos"
```

---

### Task 9: Vista de brief (PDF, compartir, aprobar)

**Files:**
- Modify: `js/views/brief.js` (reemplazar el stub completo)

**Interfaces:**
- Consumes: `DB.obtenerProyecto()`, `DB.listarRequerimientos()`, `DB.actualizarProyecto()`, `PDF.generarBrief()`, `PDF.nombreArchivo()`, `Router.navegar()`.
- Produces: sin cambios en la interfaz pública (`Views.brief.render(container, {proyectoId})`).

- [ ] **Step 1: Reemplazar `js/views/brief.js`**

```js
window.Views = window.Views || {};

window.Views.brief = {
  render(container, { proyectoId }) {
    Promise.all([DB.obtenerProyecto(proyectoId), DB.listarRequerimientos(proyectoId)]).then(([proyecto, requerimientos]) => {
      const header = document.createElement('div');
      header.className = 'header';
      header.innerHTML = `<h1>Brief: ${proyecto.nombre}</h1><p style="color:var(--color-texto-sutil);">Cliente: ${proyecto.cliente}</p>`;
      container.appendChild(header);

      const porCategoria = {};
      requerimientos.forEach((r) => {
        const cat = r.categoria || 'Sin categoría';
        (porCategoria[cat] = porCategoria[cat] || []).push(r);
      });

      proyecto.categorias.forEach((categoria) => {
        const items = porCategoria[categoria];
        if (!items || items.length === 0) return;
        const titulo = document.createElement('div');
        titulo.className = 'categoria-titulo';
        titulo.textContent = categoria;
        container.appendChild(titulo);
        items.forEach((item) => {
          const card = document.createElement('div');
          card.className = 'card';
          card.innerHTML = `<span>${item.texto}</span>`;
          container.appendChild(card);
        });
      });

      const acciones = document.createElement('div');
      acciones.style.padding = '16px';
      acciones.style.display = 'flex';
      acciones.style.flexDirection = 'column';
      acciones.style.gap = '10px';

      const btnPdf = document.createElement('button');
      btnPdf.className = 'btn';
      btnPdf.textContent = 'Descargar / compartir PDF';
      btnPdf.addEventListener('click', () => compartirOBajarPdf(proyecto, requerimientos));
      acciones.appendChild(btnPdf);

      const btnAprobar = document.createElement('button');
      btnAprobar.className = 'btn';
      btnAprobar.style.background = 'var(--color-exito)';
      btnAprobar.textContent = 'Marcar como aprobado por el cliente';
      btnAprobar.addEventListener('click', () => {
        DB.actualizarProyecto(proyectoId, { estado: 'aprobado' }).then(() => {
          Router.navegar('checklist', { proyectoId });
        });
      });
      acciones.appendChild(btnAprobar);

      container.appendChild(acciones);
    });
  },
};

function compartirOBajarPdf(proyecto, requerimientos) {
  const blob = PDF.generarBrief(proyecto, requerimientos);
  const nombreArchivo = PDF.nombreArchivo(proyecto);
  const archivo = new File([blob], nombreArchivo, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    navigator.share({ files: [archivo], title: nombreArchivo }).catch(() => {});
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
```

- [ ] **Step 2: Verificación manual**

Navegar a `http://localhost:8000/#brief/<id>` de un proyecto ya categorizado (de Task 8).
Esperado: preview agrupada por categoría, en el mismo orden que `proyecto.categorias`.
Click en "Descargar / compartir PDF" (en desktop Chrome).
Esperado: se descarga un PDF con el mismo contenido agrupado (igual que en la verificación de Task 4).
Click en "Marcar como aprobado por el cliente".
Esperado: redirige a `#checklist/<id>`; en devtools, el proyecto tiene `estado: "aprobado"`.

- [ ] **Step 3: Commit**

```bash
git add js/views/brief.js
git commit -m "feat: vista de brief con generación/compartido de PDF y aprobación"
```

---

### Task 10: Vista de checklist de obra

**Files:**
- Modify: `js/views/checklist.js` (reemplazar el stub completo)

**Interfaces:**
- Consumes: `DB.obtenerProyecto()`, `DB.listarRequerimientos()`, `DB.actualizarRequerimiento()`.
- Produces: sin cambios en la interfaz pública (`Views.checklist.render(container, {proyectoId})`).

- [ ] **Step 1: Reemplazar `js/views/checklist.js`**

```js
window.Views = window.Views || {};

window.Views.checklist = {
  render(container, { proyectoId }) {
    Promise.all([DB.obtenerProyecto(proyectoId), DB.listarRequerimientos(proyectoId)]).then(([proyecto, requerimientos]) => {
      const header = document.createElement('div');
      header.className = 'header';
      header.innerHTML = `<h1>Checklist: ${proyecto.nombre}</h1>`;
      container.appendChild(header);

      const progreso = document.createElement('div');
      progreso.className = 'progreso';
      container.appendChild(progreso);

      function actualizarProgreso(lista) {
        const hechos = lista.filter((r) => r.checkEstado === 'hecho').length;
        progreso.textContent = `${hechos}/${lista.length} completados`;
      }

      const porCategoria = {};
      requerimientos.forEach((r) => {
        const cat = r.categoria || 'Sin categoría';
        (porCategoria[cat] = porCategoria[cat] || []).push(r);
      });

      proyecto.categorias.forEach((categoria) => {
        const items = porCategoria[categoria];
        if (!items || items.length === 0) return;
        const titulo = document.createElement('div');
        titulo.className = 'categoria-titulo';
        titulo.textContent = categoria;
        container.appendChild(titulo);
        items.forEach((item) => {
          container.appendChild(crearFilaChecklist(item, requerimientos, actualizarProgreso));
        });
      });

      actualizarProgreso(requerimientos);
    });
  },
};

function crearFilaChecklist(item, requerimientos, actualizarProgreso) {
  const fila = document.createElement('label');
  fila.className = 'checklist-item' + (item.checkEstado === 'hecho' ? ' checklist-item--hecho' : '');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = item.checkEstado === 'hecho';
  checkbox.addEventListener('change', () => {
    const nuevoEstado = checkbox.checked ? 'hecho' : 'pendiente';
    DB.actualizarRequerimiento(item.id, { checkEstado: nuevoEstado }).then(() => {
      item.checkEstado = nuevoEstado;
      fila.classList.toggle('checklist-item--hecho', nuevoEstado === 'hecho');
      actualizarProgreso(requerimientos);
    });
  });

  const texto = document.createElement('span');
  texto.textContent = item.texto;

  fila.appendChild(checkbox);
  fila.appendChild(texto);
  return fila;
}
```

- [ ] **Step 2: Verificación manual**

Navegar a `http://localhost:8000/#checklist/<id>` de un proyecto aprobado (de Task 9).
Esperado: ítems agrupados por categoría como checkboxes grandes, contador "0/N completados".
Tildar un par de ítems.
Esperado: el contador se actualiza al instante y el texto tildado queda tachado y atenuado.
Recargar la página (F5).
Esperado: los ítems tildados siguen tildados (persistencia en IndexedDB).

- [ ] **Step 3: Commit**

```bash
git add js/views/checklist.js
git commit -m "feat: vista de checklist de obra con progreso"
```

---

### Task 11: PWA instalable (manifest, íconos, service worker)

**Files:**
- Create: `icons/icon-192.png`
- Create: `icons/icon-512.png`
- Create: `manifest.json`
- Create: `sw.js`
- Modify: `index.html` (agregar `<link rel="manifest">` y meta `theme-color` en el `<head>`)
- Modify: `js/app.js` (agregar registro del service worker)

**Interfaces:**
- Consumes: ninguno nuevo.
- Produces: ninguna interfaz JS nueva — habilita instalación como PWA.

- [ ] **Step 1: Generar los íconos con un script Python de un solo uso (sin dependencias)**

Correr desde la raíz del proyecto:

```bash
mkdir -p icons && python3 -c "
import struct, zlib

def write_png(path, width, height, color=(37, 99, 235)):
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data))
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    row = bytes(color) * width
    raw = (b'\x00' + row) * height
    idat = zlib.compress(raw, 9)
    png = sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)

write_png('icons/icon-192.png', 192, 192)
write_png('icons/icon-512.png', 512, 512)
print('listo')
"
```

Esperado: imprime "listo" y crea `icons/icon-192.png` (cuadrado azul sólido) e `icons/icon-512.png`.

- [ ] **Step 2: Crear `manifest.json`**

```json
{
  "name": "Requerimientos de Obra",
  "short_name": "Requerimientos",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#2563eb",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 3: Crear `sw.js`**

```js
const CACHE_NAME = 'obras-civiles-shell-v1';
const ARCHIVOS_SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './manifest.json',
  './js/db.js',
  './js/speech.js',
  './js/pdf.js',
  './js/router.js',
  './js/views/proyectos.js',
  './js/views/captura.js',
  './js/views/revision.js',
  './js/views/brief.js',
  './js/views/checklist.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((respuestaCache) => respuestaCache || fetch(event.request))
  );
});
```

- [ ] **Step 4: Modificar el `<head>` de `index.html`**

Agregar estas dos líneas después de `<link rel="stylesheet" href="css/styles.css">`:

```html
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#2563eb">
```

- [ ] **Step 5: Modificar `js/app.js` para registrar el service worker**

Reemplazar:

```js
(function () {
  function registrarVistas() {
```

por:

```js
(function () {
  function registrarServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('No se pudo registrar el service worker:', err);
    });
  }

  function registrarVistas() {
```

Y reemplazar:

```js
      .then(() => {
        registrarVistas();
        Router.renderActual();
      })
```

por:

```js
      .then(() => {
        registrarVistas();
        registrarServiceWorker();
        Router.renderActual();
      })
```

- [ ] **Step 6: Verificación manual**

Correr `python3 -m http.server 8000`, abrir `http://localhost:8000/` (localhost cuenta como contexto seguro).
Abrir devtools → Application → Manifest: confirmar nombre "Requerimientos de Obra" e íconos cargados sin errores.
Application → Service Workers: confirmar que `sw.js` está registrado y activado.
Application → Cache Storage: confirmar que `obras-civiles-shell-v1` contiene los archivos del shell.
Abrir `icons/icon-192.png` directo en el navegador: confirmar que se ve un cuadrado azul sólido de 192×192.

- [ ] **Step 7: Commit**

```bash
git add icons manifest.json sw.js index.html js/app.js
git commit -m "feat: PWA instalable (manifest, iconos, service worker)"
```

---

### Task 12: Publicar en GitHub Pages

**Files:**
- No crea archivos nuevos del proyecto; opera sobre el repositorio git y GitHub.

**Interfaces:** N/A (tarea de despliegue, no de código).

> **Importante:** esta tarea crea un repositorio remoto (público, requisito de GitHub Pages en cuentas gratuitas) y publica el código. Antes de ejecutar los comandos de push, confirmar explícitamente con el usuario el nombre del repositorio y que está de acuerdo con que quede público — no ejecutar estos pasos de forma autónoma.

- [ ] **Step 1: Confirmar con el usuario nombre de repo y visibilidad**

Preguntar: "¿Qué nombre le pongo al repositorio en GitHub (ej. `requerimientos-obras-civiles`)? Va a quedar público porque GitHub Pages gratis lo requiere en cuentas personales — ¿confirmás?"

- [ ] **Step 2: Crear el repo remoto y pushear (solo tras confirmación)**

```bash
gh repo create <nombre-confirmado> --public --source=. --remote=origin --push
```

- [ ] **Step 3: Habilitar GitHub Pages**

```bash
gh api repos/:owner/<nombre-confirmado>/pages -X POST -f "source[branch]=main" -f "source[path]=/"
```

Si el comando falla porque ya existe la configuración, habilitarlo manualmente desde Settings → Pages → Source: branch `main`, carpeta `/ (root)`.

- [ ] **Step 4: Verificación manual**

Esperar ~1 minuto, abrir la URL que indica `gh api repos/:owner/<nombre-confirmado>/pages` (campo `html_url`) o `https://<usuario>.github.io/<nombre-confirmado>/`.
Esperado: la app carga igual que en local, con HTTPS.
En el celular Android, abrir esa URL en Chrome, menú → "Agregar a pantalla de inicio".
Esperado: queda instalada con ícono propio y abre en pantalla completa sin barra de navegador.

---

## Self-Review

**Cobertura del spec:** flujo general (Tasks 5-10), modelo de datos (Task 2), las 5 pantallas (Tasks 6-10), voz (Task 3), PDF (Task 4), distribución GitHub Pages + PWA (Tasks 11-12), casos borde del spec (mic denegado → Task 7; cierre a mitad de captura → persistencia automática por diseño de Task 2; edición post-aprobación → Task 10 permite editar `checkEstado` pero no re-genera PDF automáticamente, igual que el spec; borrado de proyecto con confirmación → Task 6). Testing (manual + páginas de test en Tasks 2 y 4) sigue la decisión explícita del spec.

**Placeholders:** ninguno — todos los pasos tienen código completo y verificaciones concretas con resultados esperados explícitos.

**Consistencia de tipos/firmas:** `DB.*`, `Speech.*`, `PDF.*`, `Router.*`, `Views.*` se usan con el mismo nombre y firma en todas las tareas que los consumen (verificado cruzando Tasks 2-10).
