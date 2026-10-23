# Rediseño del look & feel y la experiencia de uso — Diseño

Fecha: 2026-10-22

## Intención y por qué

La app (registro de requerimientos de obras civiles, ver
`2026-10-22-requerimientos-obras-civiles-design.md`) funciona, pero al dueño
no le gustan ni los colores ni la experiencia de uso. Hoy es un tema oscuro
azul pizarra genérico, con navegación por botones de texto arriba, widgets
nativos (`select`, `prompt`, `confirm`, `alert`) y un flujo de dictado que
exige varios pasos. El dueño la usa en obra y delante del cliente, muchas
veces al sol.

Objetivo: que se vea **clara, limpia y profesional**, que **se lea bien al sol**
y que capturar, revisar y tildar sea rápido con una mano.

## Metas

- Tema claro de alto contraste, legible a pleno sol.
- Una identidad visual propia de obra (no la paleta de plantilla azul/gris).
- Navegación por pasos visible en todo momento.
- Captura de un requerimiento con el mínimo de toques, sobre todo por voz.
- Reemplazar todos los diálogos nativos por componentes propios.
- Todo el estilo en CSS (cero estilos en línea en el JS).

## No-metas

- No cambiar el modelo de datos, `db.js`, `speech.js`, ni la lógica del PDF.
- No cambiar el flujo de pantallas ni los estados del proyecto
  (`captura` → `brief_generado` → `aprobado`).
- No agregar build step, framework ni dependencias nuevas de runtime. Sigue
  siendo HTML + CSS + JS vanilla.
- No rediseñar el PDF generado (queda fuera de este alcance).
- Sin modo oscuro (ver decisiones).

## Anti-metas (sería un fracaso aunque "funcione")

- Que se vea otra vez como plantilla genérica de SaaS.
- Que el contraste del texto principal sea bajo o dependa de grises claros.
- Que se pierdan datos o se rompa la instalación PWA / el modo offline.
- Que dictar un requerimiento tome más toques que hoy.

## Decisiones tomadas por el dueño

- Dirección: "claro, limpio y profesional, que se lea bien al sol".
- Se aprobó la propuesta de dirección visual y de experiencia descrita abajo.
- Inspiración: usar los skills de diseño y el MCP de 21st. **Solo se pueden
  copiar 2 diseños por día desde 21st**, y solo se copian una vez decidido cuál.
  El dueño rechazó ver maquetas en el navegador; las decisiones se toman en texto.

## Dirección visual (propuesta aprobada)

- **Fondo y superficies:** fondo blanco cálido (no blanco puro, para no
  deslumbrar); tarjetas blancas con borde fino y sombra mínima.
- **Texto:** casi negro; contraste mínimo 7:1 para el texto principal y 4.5:1
  para el secundario. Nada de grises claros para información importante.
- **Acento único:** un naranja de seguridad de obra, usado solo en la acción
  principal de cada pantalla. Verde = hecho/aprobado; rojo = peligro/borrar.
  Tokens como variables CSS en `:root`.
- **Estado de la obra:** se muestra como avance de 4 pasos (captura,
  revisión, brief, obra) en lugar de un chip de color suelto.
- **Tipografía:** cuerpo de 16 px o más, títulos con peso marcado. Sin emojis
  como íconos: íconos SVG consistentes inline.
- **Objetivos táctiles:** mínimo 48 px de alto en todo lo tocable.

## Experiencia (propuesta aprobada)

- **Barra inferior fija** con los pasos de la obra (Captura, Revisión, Brief,
  Obra) cuando se está dentro de un proyecto. Los pasos aún no alcanzables se
  ven deshabilitados. La lista "Mis obras" sigue siendo la pantalla de inicio,
  con un acceso claro para volver.
- **Acceso a los pasos (confirmado por el dueño):** Captura, siempre.
  Revisión, con al menos un requerimiento. Brief, cuando todos los
  requerimientos tienen categoría. Obra (checklist), solo con el proyecto
  `aprobado`. Siempre se puede volver a un paso anterior, incluso con el brief
  aprobado. El avance de 4 pasos en la tarjeta de obra se deriva de esas
  mismas reglas.
- **Captura:** el micrófono es el botón grande y central. Al terminar el
  dictado, el texto se agrega solo a la lista (sin tocar Enter), con un aviso
  breve que permite deshacer. El campo de texto sigue disponible, con botón
  de enviar. Si el navegador no soporta voz, el micrófono no aparece.
- **Revisión:** la categoría se elige con botones en una hoja inferior (bottom
  sheet), con opción de crear una categoría nueva ahí mismo. Editar el texto
  debe ser evidente (ícono o estilo de campo), no un toque oculto.
- **Checklist:** filas completas tocables, marca grande propia (no el
  checkbox nativo), barra de progreso arriba con el conteo.
- **Lista de obras:** cada tarjeta muestra cliente, obra, avance de pasos y
  cantidad de requerimientos.
- **Borrar:** se usa un aviso con "Deshacer" para requerimientos (incluido el
  swipe); para borrar una obra completa, una hoja de confirmación propia.
- **Avisos y errores:** toasts propios en lugar de `alert()`; hojas propias en
  lugar de `confirm()` y `prompt()`.

## Logo (requisito agregado por el dueño)

Hay que **diseñar un logo nuevo** para la app y usarlo en tres lugares: el
ícono del launcher, la pantalla de arranque (splash) y dentro de la
aplicación.

- **Fuente única:** un SVG (`icons/logo.svg`) del que se derivan todos los
  demás archivos.
- **Launcher:** `icon-192.png`, `icon-512.png` y una versión `maskable`
  (el símbolo dentro de la zona segura central, ~80 %, con fondo a sangre) en
  el `manifest.json`, además de un `apple-touch-icon`. Reemplaza los íconos
  actuales.
- **Splash:** en Android la PWA lo arma con el ícono, `name` y
  `background_color` del manifest; por eso `background_color` debe coincidir
  con el fondo del logo/tema y el ícono debe verse bien centrado sobre él.
- **Dentro de la app:** el logo aparece en el encabezado de "Mis obras" y como
  marca discreta en el estado vacío; versión inline SVG (no imagen externa).
- **Concepto (propuesta del autor, no del dueño):** símbolo simple y legible
  a tamaño pequeño que combine obra civil con checklist (por ejemplo una
  viga/casco o silueta de estructura con una marca de verificación), en el
  naranja de seguridad sobre fondo oscuro o claro según contraste. Sin
  degradados ni detalles finos. Debe reconocerse a 48 px.
- Todos los archivos nuevos van a la lista de `sw.js` y se sube la versión de
  caché.

## Restricciones

- Mantener la PWA instalable y offline: el service worker (`sw.js`) cachea el
  shell; hay que actualizar su lista de archivos y subir la versión de caché
  si se agregan archivos nuevos (por ejemplo `css/*.css`, `js/ui.js`).
- Actualizar `theme-color` en `index.html` y `theme_color` /
  `background_color` en `manifest.json` a la nueva paleta. Los íconos de
  `icons/` pueden necesitar regenerarse si usan los colores viejos.
- Todo el texto de la interfaz en español neutro (ya acordado en el commit
  anterior; sin voseo argentino).
- Ancho máximo actual 480 px centrado; debe seguir viéndose bien en escritorio.
- Hoy el texto del usuario entra por `innerHTML` sin escapar. Al reescribir
  las vistas, usar `textContent` o escapar (arreglo de seguridad incluido).
- Sin framework de pruebas; validación manual y las páginas en `tests/` que
  ya existen para db, pdf y speech (no deben romperse).
- Uso de 21st: sus componentes son React/shadcn/Tailwind; no se pueden pegar
  tal cual. Sirven como referencia visual o se reescriben a vanilla. Al
  momento de escribir esto, la búsqueda de componentes de 21st fallaba
  ("catalog search failed"); los temas devolvían resultados sin vista previa.

## Llamadas tomadas por el autor del diseño (revisables)

Estas decisiones no las dijo el dueño; salieron de la revisión del documento.

- **Dictado:** un dictado = un requerimiento. Un toque por requerimiento (no
  hay dictado continuo; `speech.js` usa `continuous=false` e
  `interimResults=false` y no se modifica).
- **Deshacer:** el aviso dura 5 segundos; un aviso nuevo reemplaza al anterior.
  El aviso y la barra inferior no deben tapar el micrófono.
- **Borrar con deshacer:** `db.js` no permite reinsertar un requerimiento con
  el mismo `id` y `orden` (`crearRequerimiento` genera ambos). Por eso el
  borrado es **diferido**: el ítem se oculta de inmediato y el borrado real
  ocurre al vencer el aviso. Si la app se cierra durante esos 5 segundos, el
  ítem sigue existiendo (se prefiere no perder datos a borrar de más). Vale
  igual para el swipe.
- **Estilos en línea:** se permiten solo valores dinámicos vía variables CSS
  (`style.setProperty`), como el ancho de la barra de progreso o el
  desplazamiento del swipe. Se eliminan los atributos `style=""` estáticos del
  JS y de `index.html`.
- **Fuente:** pila de fuentes del sistema, para funcionar offline sin tocar la
  caché del service worker.
- **Íconos PWA:** se regeneran `icons/icon-192.png` y `icon-512.png` con la
  nueva paleta (sencillos, derivados de un SVG), como parte de este trabajo.
- **Barra inferior:** oculta en "Mis obras" (ahí el encabezado lleva el título
  y el botón de nueva obra). Dentro de una obra, el encabezado lleva un botón
  "← Mis obras". La barra respeta el área segura de Android
  (`safe-area-inset-bottom`) y queda dentro de la misma columna de 480 px.
- **Acción principal por pantalla:** la define el constructor (por ejemplo, en
  Brief cambia según el estado: generar, compartir PDF, aprobar).

## Qué queda a criterio del constructor

- Valores exactos de la paleta (el tono del naranja, los grises cálidos),
  siempre cumpliendo los contrastes pedidos.
- Fuente: preferir la del sistema o una sola fuente web con fallback, que
  funcione offline.
- Estructura de archivos CSS/JS nuevos (por ejemplo un módulo de componentes
  compartidos: toast, hoja inferior, barra inferior, íconos).
- Detalle de animaciones y transiciones (sobrias; respetar
  `prefers-reduced-motion`).
- Si conviene usar 21st para alguna pieza concreta y cuál (máximo 2 copias al
  día), y qué skills de diseño aplicar en cada paso.
- Orden de implementación de las pantallas.

## Verificación esperada

Validación manual en Chrome (Android instalado como PWA y escritorio):
crear obra → capturar por texto y por voz → deshacer → categorizar → generar
y compartir PDF → aprobar → tildar checklist → cerrar y reabrir (persistencia)
→ modo offline. Revisar contraste con una herramienta, y que no queden
`alert`/`confirm`/`prompt` ni estilos en línea en el JS.
