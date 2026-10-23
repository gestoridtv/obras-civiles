# Rediseño del look & feel y logo — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el tema oscuro azul por un tema claro de alto contraste con acento naranja, nueva navegación por pasos, componentes propios (avisos, hojas, confirmaciones), borrado con deshacer y un logo nuevo para launcher, splash y app.

**Architecture:** Se mantiene HTML + CSS + JS vanilla sin build. Se agregan tokens CSS y un puñado de módulos pequeños en `js/ui/` (lógica pura testeable en Node + componentes DOM) y se reescriben las 5 vistas para usarlos. `db.js`, `speech.js`, `pdf.js` y el modelo de datos no cambian.

**Tech Stack:** HTML, CSS (variables), JS vanilla, IndexedDB (existente), jsPDF por CDN (existente), Node 22 (`node --test`) para pruebas de lógica pura, Python 3 + PIL para generar los PNG del logo.

**Spec:** `docs/superpowers/specs/2026-10-22-rediseno-lookandfeel-design.md`

## Global Constraints

- Texto principal con contraste ≥ 7:1 y secundario ≥ 4.5:1; blanco sobre acento/éxito/peligro ≥ 4.5:1.
- Cuerpo de texto ≥ 16 px; todo lo tocable ≥ 48 px de alto; el micrófono ≥ 72 px.
- Un solo acento: naranja `#C2410C`. Verde = hecho/aprobado, rojo = peligro. Sin emojis como íconos (SVG inline).
- Cero `alert()`, `confirm()`, `prompt()` y cero atributos `style="..."` estáticos en `js/` e `index.html`. Valores dinámicos solo con `element.style.setProperty('--variable', valor)`.
- Todo texto de usuario entra al DOM con `textContent` o `Texto.escapar`; nunca interpolado crudo en `innerHTML`.
- Texto de interfaz en español neutro (sin voseo).
- No modificar `js/db.js`, `js/speech.js`, `js/pdf.js` ni el modelo de datos. No agregar dependencias de runtime. Fuente: pila del sistema.
- Ancho máximo 480 px centrado; respetar `env(safe-area-inset-bottom)`; respetar `prefers-reduced-motion`.
- Deshacer dura 5000 ms; un aviso nuevo reemplaza al anterior. Borrado diferido: el ítem se oculta y se borra de verdad al cerrarse el aviso; si la app se cierra antes, el ítem permanece.
- Acceso a pasos: Captura siempre; Revisión con ≥1 requerimiento; Brief con todos los requerimientos categorizados (y ≥1); Obra solo con proyecto `aprobado`; volver atrás siempre permitido.
- Todo archivo nuevo entra a `ARCHIVOS_SHELL` de `sw.js` y se sube `CACHE_NAME`.
- 21st: máximo 2 copias por día y solo tras decidir cuál; su código es React/Tailwind y se usa solo como referencia visual o reescrito a vanilla. Su búsqueda de componentes falló el 2026-10-22; no es requisito usarlo.
- Commits: solo con autorización del usuario (preguntar una vez al iniciar la ejecución). Hacer `git add` solo de los archivos de cada tarea (el árbol tiene `.gitignore` modificado y `.mcp.json` sin seguimiento que no son de este trabajo).

## Review Focus

1. Texto de usuario con `<`, `&`, comillas o `<script>` en nombre de obra, cliente, categoría o requerimiento: se ve literal, no se interpreta (Task 2).
2. Obra sin requerimientos: pasos deshabilitados salvo Captura, avance 0, checklist y progreso sin `NaN` ni división por cero (Task 2 y 9).
3. Dictado vacío, solo espacios, permiso de micrófono denegado, navegador sin voz: no se agrega nada vacío, el campo de texto sigue funcionando y se informa con un aviso (Task 6).
4. Borrar y luego navegar, reemplazar el aviso por otro borrado, o cerrar la app durante los 5 s: nunca se pierde un ítem por error ni queda uno "fantasma" oculto para siempre (Task 3).
5. Textos largos sin espacios (una palabra de 80 caracteres) en tarjetas, filas y categorías: no desbordan horizontalmente (Task 1, regla `overflow-wrap`).

---

### Task 1: Tokens, base CSS y prueba de contraste

**Files:**
- Create: `css/tokens.css`, `tests/node/tokens.test.js`
- Modify: `css/styles.css` (reescritura base; se conservan por ahora las clases viejas con alias), `index.html`, `sw.js` (lista + `CACHE_NAME` a `v2`)

**Interfaces:**
- Produces: variables CSS `--color-fondo #FAF7F2`, `--color-superficie #FFFFFF`, `--color-texto #1A1714`, `--color-texto-sutil #5C554D`, `--color-acento #C2410C`, `--color-acento-fuerte #9A3412`, `--color-sobre-acento #FFFFFF`, `--color-exito #15803D`, `--color-peligro #B91C1C`, `--color-borde #D9D2C5`, `--radio 12px`, `--alto-tactil 48px`, `--fuente` (pila del sistema), `--sombra`. Alias temporales `--color-primario: var(--color-acento)` para no romper vistas aún no reescritas (se eliminan en Task 10).
- Produces: clases base `.btn`, `.btn--primario`, `.btn--secundario`, `.btn--peligro`, `.btn--texto`, `.tarjeta`, `.campo`, `.texto-seguro` (`overflow-wrap:anywhere`), `.visualmente-oculto`.

- [ ] **Step 1: Write the failing test** `tests/node/tokens.test.js` (usa `node:test`; parsea `css/tokens.css` con regex `--nombre: #hex;`; función `contraste(a,b)` WCAG). Casos: `texto/fondo ≥ 7`, `texto/superficie ≥ 7`, `texto-sutil/fondo ≥ 4.5`, `texto-sutil/superficie ≥ 4.5`, `sobre-acento/acento ≥ 4.5`, `sobre-acento/exito ≥ 4.5`, `sobre-acento/peligro ≥ 4.5`, `acento/fondo ≥ 3`. Otro caso: `css/styles.css` contiene `overflow-wrap`.
- [ ] **Step 2: Run** `node --test tests/node/` — Expected: FAIL (no existe `css/tokens.css`).
- [ ] **Step 3: Create `css/tokens.css`** con los valores de Interfaces; reescribir `css/styles.css` con reset, `body` (fondo, texto, `--fuente`, 16 px), `#app` (480 px, `padding-bottom` para la barra inferior), botones ≥ 48 px con estado `:focus-visible` visible y `:active`, `.tarjeta`, `.campo` (inputs ≥ 48 px), `prefers-reduced-motion`. Enlazar `tokens.css` antes de `styles.css` en `index.html`; añadir ambos a `sw.js`.
- [ ] **Step 4: Run** `node --test tests/node/` — Expected: PASS. Abrir la app (`python3 -m http.server 8080` en la raíz) y confirmar que carga sin errores de consola, con fondo claro.
- [ ] **Step 5: Commit** — `git add css/tokens.css css/styles.css index.html sw.js tests/node/tokens.test.js docs/superpowers`; mensaje `feat: tokens de diseño claro y prueba de contraste`.

### Task 2: Lógica pura — `Texto` y `Pasos`

**Files:**
- Create: `js/ui/texto.js`, `js/ui/pasos.js`, `tests/node/pasos.test.js`, `tests/node/texto.test.js`

**Interfaces:**
- Produces: `Texto.escapar(valor: string): string` (escapa `& < > " '`; `null`/`undefined` → `''`).
- Produces: `Pasos.calcular(proyecto, requerimientos): Array<{id: 'captura'|'revision'|'brief'|'checklist', etiqueta: 'Captura'|'Revisión'|'Brief'|'Obra', habilitado: boolean, completado: boolean}>` en ese orden. `id` coincide con el nombre de ruta del router.
- Produces: `Pasos.avance(proyecto, requerimientos): number` = cantidad de pasos con `completado` (0–4).
- Reglas `completado`: captura = ≥1 requerimiento; revision = ≥1 y todos con `categoria`; brief = `estado` en `brief_generado|aprobado`; checklist = `estado==='aprobado'`, ≥1 requerimiento y todos `checkEstado==='hecho'`. Reglas `habilitado`: las de Global Constraints.
- Ambos módulos asignan `window.X` y, si existe `module`, `module.exports = X` (excepción justificada al patrón de globals para poder probarlos en Node).

- [ ] **Step 1: Write the failing tests.** `texto.test.js`: `escapar('<script>"a"&\'b\'</script>')` no contiene `<`/`>`; `escapar(null) === ''`. `pasos.test.js`: obra sin requerimientos → solo `captura` habilitada, `avance === 0`; con 2 requerimientos y 1 sin categoría → `brief.habilitado === false`; todos categorizados → `brief.habilitado === true`; `estado:'aprobado'` → `checklist.habilitado === true`; checklist completado solo si todos `hecho`; `avance` con estado aprobado y todo hecho → 4.
- [ ] **Step 2: Run** `node --test tests/node/` — Expected: FAIL (módulos inexistentes).
- [ ] **Step 3: Implement** ambos módulos con las firmas de Interfaces.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: lógica de pasos y escape de texto`.

### Task 3: Borrado diferido

**Files:**
- Create: `js/ui/borrado-diferido.js`, `tests/node/borrado-diferido.test.js`

**Interfaces:**
- Produces: `BorradoDiferido.crear(eliminar: (id: string) => Promise<void>): { marcar(id): void, deshacer(id): boolean, confirmar(id): Promise<void>, estaPendiente(id): boolean }`. `marcar` agrega el id a pendientes sin llamar a `eliminar`; `deshacer` lo saca y devuelve si estaba; `confirmar` llama a `eliminar(id)` una sola vez si estaba pendiente (si no, no hace nada) y lo saca de pendientes.

- [ ] **Step 1: Write the failing test** (`eliminar` espía): `marcar('a')` → `estaPendiente('a')` true y `eliminar` sin llamadas; `deshacer('a')` → true, pendiente false, luego `confirmar('a')` no llama a `eliminar`; `marcar('b'); confirmar('b')` → `eliminar` llamado una vez con `'b'`; `confirmar('b')` otra vez → sin llamada extra; `deshacer('zzz')` → false.
- [ ] **Step 2: Run** — Expected: FAIL. **Step 3: Implement** (Set interno; mismo patrón de export que Task 2). **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: módulo de borrado diferido`.

### Task 4: Íconos, avisos (toast, confirmar, hojas) y estilos

**Files:**
- Create: `js/ui/iconos.js`, `js/ui/avisos.js`
- Modify: `css/styles.css` (secciones toast, hoja inferior, diálogo), `js/router.js` (llamar `Avisos.cerrarToast()` al inicio de `renderActual`), `index.html`, `sw.js`

**Interfaces:**
- Produces: `Iconos.svg(nombre: 'mic'|'enviar'|'basura'|'atras'|'check'|'mas'|'editar'|'compartir'|'lista'|'etiqueta'|'documento'|'obra', tamano = 24): string` (SVG inline con `stroke="currentColor"`, `aria-hidden="true"`). `Iconos.logo(tamano = 40): string` se define en Task 5.
- Produces: `Avisos.toast({ mensaje: string, accionEtiqueta?: string, alAccionar?: () => void, alCerrar?: () => void, duracionMs = 5000 }): void` — un solo toast; uno nuevo cierra el anterior; `alCerrar` se llama cuando cierra por tiempo, reemplazo o `cerrarToast()`, **no** cuando se pulsó la acción. Rol `status`, `aria-live="polite"`, posicionado por encima de la barra inferior y del dock de captura.
- Produces: `Avisos.cerrarToast(): void`.
- Produces: `Avisos.confirmar({ titulo, mensaje, etiquetaConfirmar, peligro = true }): Promise<boolean>`.
- Produces: `Avisos.hojaOpciones({ titulo, opciones: string[], seleccionada: string|null, etiquetaNinguna?: string, etiquetaNueva?: string }): Promise<undefined | { valor: string|null, nueva: boolean }>` — `undefined` si se cierra sin elegir; `nueva:true` con el texto escrito (recortado, no vacío) si eligió crear.
- Produces: `Avisos.formulario({ titulo, campos: Array<{ id, etiqueta, placeholder }>, etiquetaEnviar }): Promise<undefined | Record<string,string>>` — no resuelve con valores vacíos (marca el campo).
- Hojas y diálogos: cierran con Escape y tocando el fondo, devuelven foco al elemento previo, atrapan el foco, botones ≥ 48 px.

- [ ] **Step 1: Implement** `iconos.js` y `avisos.js` con las firmas de arriba y los estilos; registrar scripts en `index.html` (orden: `texto`, `pasos`, `borrado-diferido`, `iconos`, `avisos` antes de las vistas) y en `sw.js`; cablear `Avisos.cerrarToast()` en `router.js`.
- [ ] **Step 2: Verify manually** desde la consola del navegador en `http://localhost:8080`: `Avisos.toast({mensaje:'Prueba',accionEtiqueta:'Deshacer',alCerrar:()=>console.log('cerrado')})` — aparece, a los 5 s se cierra y loguea `cerrado`; llamar dos toast seguidos cierra el primero; `await Avisos.confirmar({titulo:'¿Borrar?',mensaje:'x',etiquetaConfirmar:'Borrar'})` resuelve `true`/`false` según el botón y `false` con Escape; `Avisos.hojaOpciones({titulo:'Cat',opciones:['A','B'],seleccionada:'A',etiquetaNueva:'Nueva categoría'})` resuelve lo elegido. Expected: todo según lo descrito, sin errores de consola.
- [ ] **Step 3: Commit** — `feat: íconos y componentes de avisos`.

### Task 5: Logo (SVG, PNG, manifest, splash, logo en app)

**Files:**
- Create: `icons/logo.svg`, `scripts/generar-iconos.py`, `tests/node/logo.test.js`; genera `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-maskable-512.png`, `icons/apple-touch-icon.png` (180)
- Modify: `js/ui/iconos.js` (agregar `Iconos.logo`), `manifest.json`, `index.html` (`theme-color #FAF7F2`, `<link rel="apple-touch-icon">`), `sw.js` (nuevos PNG)

**Interfaces:**
- Produces: `Iconos.logo(tamano = 40): string` — SVG inline con la misma geometría que `icons/logo.svg`.
- Fuente única: `icons/logo.svg` (viewBox `0 0 512 512`, `<rect>` naranja `#C2410C` `rx=112` + tres `<path>` solo con comandos `M` y `L`, trazo blanco 40, `stroke-linecap/linejoin: round`): tejado `M96 264 L256 120 L416 264`, muros `M144 232 L144 392 L368 392 L368 232`, marca de verificación `M200 300 L244 344 L320 252`. El builder puede ajustar la geometría para que se vea bien a 48 px, siempre que `logo.svg` e `Iconos.logo` coincidan y el símbolo quede dentro del círculo de radio 205 px (zona segura maskable).
- Manifest: `background_color` y `theme_color` `#FAF7F2`; íconos 192 y 512 con `purpose: "any"`, y `icon-maskable-512.png` con `purpose: "maskable"`.

- [ ] **Step 1: Write the failing test** `logo.test.js`: extrae los atributos `d` de `icons/logo.svg` y comprueba que cada uno aparece idéntico en `js/ui/iconos.js`; comprueba que `manifest.json` lista un ícono `maskable` y que `theme_color === background_color === '#FAF7F2'`; que existen los 4 PNG (`fs.existsSync`).
- [ ] **Step 2: Run** `node --test tests/node/` — Expected: FAIL.
- [ ] **Step 3: Implement** `logo.svg`, `Iconos.logo`, y `scripts/generar-iconos.py` (PIL: lee los `d` de `logo.svg`, dibuja a 4× y reduce con LANCZOS; trazos con puntas redondas dibujando círculos en cada vértice; el maskable usa fondo a sangre sin esquinas redondeadas). Ejecutar `python3 scripts/generar-iconos.py`. Actualizar manifest, `index.html` y `sw.js`.
- [ ] **Step 4: Run** `node --test tests/node/` — Expected: PASS. Abrir los PNG con la herramienta Read y confirmar que el logo se reconoce en 192 y 512, y que el maskable no queda recortado.
- [ ] **Step 5: Commit** — `feat: logo nuevo para launcher, splash y app`.

### Task 6: Shell compartido + vista Captura

**Files:**
- Create: `js/ui/shell.js`
- Modify: `js/views/captura.js` (reescritura), `css/styles.css`, `index.html`, `sw.js`

**Interfaces:**
- Produces: `Shell.encabezado({ titulo: string, subtitulo?: string, atras?: { etiqueta: string, ruta: string } }): HTMLElement` (botón "← Mis obras" navega a `proyectos`; el título nunca desborda).
- Produces: `Shell.barraPasos({ proyecto, requerimientos, pasoActual: 'captura'|'revision'|'brief'|'checklist' }): HTMLElement` — `<nav aria-label="Pasos de la obra">` fija abajo, 4 botones con ícono y etiqueta, `aria-current="step"` en el actual, deshabilitados según `Pasos.calcular`, ≥ 48 px, respeta `safe-area-inset-bottom`. Al tocar *Brief* con `proyecto.estado === 'captura'` primero hace `DB.actualizarProyecto(id,{estado:'brief_generado'})` y luego navega.
- Consumes: `Pasos.calcular`, `Iconos.svg`, `Router.navegar`, `DB`.

Comportamiento de Captura: lista de requerimientos (más reciente arriba, texto con `textContent`), dock fijo sobre la barra de pasos con micrófono de 72 px centrado y campo de texto + botón enviar a su lado; el toast nunca tapa el micrófono. Al terminar el dictado, `Speech.iniciar({ onResultado })` agrega solo el requerimiento (`DB.crearRequerimiento`) y muestra `Avisos.toast` con "Deshacer", que al accionarse llama `DB.eliminarRequerimiento` del recién creado. Texto vacío o solo espacios no agrega nada. Sin `Speech.disponible()` el micrófono no se renderiza. Errores de permiso → `Avisos.toast` con mensaje (no `alert`). Mientras graba, el micrófono cambia de estado visual y `aria-label` ("Detener" / "Dictar"). Swipe para borrar usa `BorradoDiferido` + toast con "Deshacer" (`alCerrar` → `confirmar`); el desplazamiento usa `style.setProperty('--desplazamiento', ...)`.

- [ ] **Step 1: Implement** `shell.js` y la nueva `captura.js` según lo anterior (eliminar todo `style=` y `alert` del archivo).
- [ ] **Step 2: Verify manually** en `http://localhost:8080` con una obra nueva: agregar por texto (Enter y botón enviar); texto `<b>x</b>` se ve literal; dictar con micrófono agrega el ítem sin tocar Enter y el aviso "Deshacer" lo quita; swipe borra con aviso, "Deshacer" lo restaura, dejar pasar 5 s lo elimina de verdad (recargar y confirmar); borrar y navegar a otra pantalla antes de 5 s lo elimina; denegar permiso del micrófono muestra aviso. La barra inferior muestra *Revisión* deshabilitada con 0 requerimientos y habilitada con ≥1. Expected: todo según lo descrito.
- [ ] **Step 3: Commit** — `feat: shell, barra de pasos y vista de captura rediseñada`.

### Task 7: Vista Revisión

**Files:**
- Modify: `js/views/revision.js` (reescritura), `css/styles.css`

**Interfaces:** Consumes `Shell.encabezado`, `Shell.barraPasos`, `Avisos.hojaOpciones`, `Avisos.toast`, `BorradoDiferido`, `Texto`, `DB`.

Comportamiento: cada requerimiento en tarjeta con texto (`textContent`, `.texto-seguro`), botón de editar visible (ícono `editar`) que convierte el texto en `<input>` y guarda al `blur` o Enter (vacío = conserva el texto anterior), botón de categoría (chip con ícono `etiqueta`; "Sin categoría" en estado de atención) que abre `Avisos.hojaOpciones({ opciones: proyecto.categorias, seleccionada: req.categoria, etiquetaNinguna: 'Sin categoría', etiquetaNueva: 'Nueva categoría' })`; al crear una nueva se normaliza (recorte) y se evita duplicado exacto (reutiliza la existente) antes de `DB.actualizarProyecto`. Borrar usa `BorradoDiferido` + toast "Deshacer". Resumen arriba "N de M con categoría". Botón primario "Generar brief" fijo sobre la barra, deshabilitado hasta que todos estén categorizados; al pulsar → `estado: 'brief_generado'` y navega a `brief`.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify manually:** crear categoría con nombre repetido no duplica; texto largo de 80 caracteres sin espacios no desborda; borrar con deshacer; "Generar brief" se habilita solo con todo categorizado; lista vacía muestra mensaje y enlace a Captura. Expected: según lo descrito.
- [ ] **Step 3: Commit** — `feat: vista de revisión rediseñada`.

### Task 8: Vista Brief

**Files:**
- Modify: `js/views/brief.js` (reescritura), `css/styles.css`

Comportamiento: encabezado con obra y cliente, requerimientos agrupados por categoría (como hoy, con `textContent`), acciones fijas sobre la barra de pasos. Acción primaria (naranja) según estado: `brief_generado` → "Marcar como aprobado por el cliente" (con `Avisos.confirmar`), y "Descargar / compartir PDF" como secundaria; `aprobado` → "Descargar / compartir PDF" primaria y enlace "Ir a la obra". Los `alert` de `compartirOBajarPdf` pasan a `Avisos.toast`; la lógica de compartir/descargar y `PDF.*` no cambia.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify manually:** generar PDF (descarga en escritorio), aprobación pide confirmación y lleva a Obra, sin conexión el aviso de error del PDF aparece como toast. Expected: según lo descrito.
- [ ] **Step 3: Commit** — `feat: vista de brief rediseñada`.

### Task 9: Vistas Checklist y Mis obras

**Files:**
- Modify: `js/views/checklist.js`, `js/views/proyectos.js` (reescrituras), `css/styles.css`

Checklist: barra de progreso arriba (`--progreso` en porcentaje vía `setProperty`, `role="progressbar"` con `aria-valuenow`), texto "8/14 completados"; con 0 ítems muestra "0/0" y 0 % sin `NaN`. Filas completas tocables (`<label>`) con marca propia grande (checkbox real oculto visualmente + marca SVG), estado hecho tachado/atenuado, agrupadas por categoría.

Mis obras: encabezado con `Iconos.logo(40)` y título; tarjeta por obra con cliente, nombre, cantidad de requerimientos y un indicador de avance de 4 pasos (`Pasos.avance`, con `aria-label` "Avance 2 de 4"); toda la tarjeta navega a la ruta según estado (`RUTA_SEGUN_ESTADO` se conserva); botón de borrar con `Avisos.confirmar`. Nueva obra: botón flotante naranja con ícono `mas` que abre `Avisos.formulario` (nombre, cliente). Estado vacío con logo y mensaje.

- [ ] **Step 1: Implement ambas vistas** (todo texto con `textContent`/`Texto.escapar`).
- [ ] **Step 2: Verify manually:** crear obra con nombre `<img src=x onerror=alert(1)>` se ve literal; obra vacía muestra 0 de 4 y checklist 0/0; marcar ítems actualiza barra y conteo y persiste al recargar; borrar obra pide confirmación. Expected: según lo descrito.
- [ ] **Step 3: Commit** — `feat: vistas de checklist y mis obras rediseñadas`.

### Task 10: Limpieza, reglas automáticas y revisión de diseño

**Files:**
- Create: `tests/node/reglas-diseno.test.js`
- Modify: `css/styles.css` (quitar clases y alias viejos como `--color-primario`, `.chip--*`, `.btn-fab` si quedaron sin uso), `sw.js` (lista final y `CACHE_NAME` definitivo)

- [ ] **Step 1: Write the failing test** `reglas-diseno.test.js`: recorre `js/**/*.js` (excluye `db.js`, `speech.js`, `pdf.js`) e `index.html` y falla si encuentra `alert(`, `confirm(`, `prompt(` o `style="`; comprueba que todo archivo `js/` y `css/` referenciado en `index.html` figura en `ARCHIVOS_SHELL` de `sw.js` y viceversa (salvo CDN); comprueba que `css/styles.css` no contiene `--color-primario`.
- [ ] **Step 2: Run** `node --test tests/node/` — Expected: FAIL si queda algún resto; corregir hasta PASS.
- [ ] **Step 3: Revisión de diseño:** invocar el skill `impeccable:audit` y luego `impeccable:polish` sobre la app corriendo; corregir hallazgos P0/P1 (contraste, foco, objetivos táctiles, desbordes). Decidir si alguna pieza justifica usar 21st (máx. 2 copias hoy, tras elegir); si no, dejarlo.
- [ ] **Step 4: Verificación final (skill `superpowers:verification-before-completion`):** recorrer el flujo completo de la sección "Verificación esperada" del spec en Chrome escritorio (ancho 480 y a pantalla completa) e instalado como PWA (reinstalar para ver ícono y splash nuevos), incluido modo offline y recarga con el service worker nuevo; correr `node --test tests/node/` y abrir `tests/db-test.html`, `tests/pdf-test.html` y `tests/speech-test.html` para confirmar que no se rompieron. Expected: todo en verde y sin errores de consola.
- [ ] **Step 5: Commit** — `chore: limpieza final y reglas automáticas de diseño`.

---

## Autorrevisión

- **Cobertura del spec:** tema claro/contraste (T1), acento y estados (T1, T9), tipografía/íconos (T1, T4), pasos y accesos (T2, T6), captura por voz y deshacer (T6), revisión con hoja de categorías (T4, T7), checklist con progreso (T9), lista de obras con avance (T9), borrado con deshacer (T3, T6, T7), avisos propios (T4), logo en launcher/splash/app (T5, T9), PWA/service worker/manifest (T1, T4, T5, T10), escape de HTML (T2 + todas las vistas), verificación manual (T10).
- **Consistencia de nombres:** `Texto.escapar`, `Pasos.calcular/avance`, `BorradoDiferido.crear`, `Iconos.svg/logo`, `Avisos.toast/cerrarToast/confirmar/hojaOpciones/formulario`, `Shell.encabezado/barraPasos` se usan con las mismas firmas en todas las tareas.
- **Limitación conocida:** no hay pruebas automatizadas de DOM; la lógica pura y las reglas de estilo/contraste sí se prueban en Node, y las vistas se verifican manualmente por tarea.
