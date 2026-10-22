# Registro de requerimientos de obras civiles — Diseño

Fecha: 2026-10-22

## Propósito

Permitir registrar, a medida que se habla con el cliente, los requerimientos de
una obra civil (por texto o por voz), consolidarlos en un brief exportable
para que el cliente lo apruebe, y luego usar ese mismo listado aprobado como
checklist de ejecución en obra.

Usuario único (sin cuentas ni roles). Cada dispositivo (celular Android,
computadora) guarda sus datos de forma independiente — no hay sincronización
entre dispositivos. El brief se arma y se comparte directamente desde el
celular en el momento.

## Alcance

Incluye: múltiples proyectos (obras) en paralelo, captura de requerimientos
por texto o dictado por voz, paso de revisión/categorización, generación de
un PDF consolidado del brief, marcado manual de aprobación del cliente, y
checklist de obra con marcado hecho/pendiente.

Explícitamente fuera de alcance: cuentas de usuario, sincronización entre
dispositivos, fotos/notas de verificación en la checklist, reconocimiento de
voz offline, backend o base de datos remota.

## Flujo general

```
Proyectos (lista de obras)
  → Captura (texto o voz, sin categorizar)
  → Revisión (categorizar, editar, borrar)
  → Brief (PDF agrupado por categoría)
  → Aprobado (estado marcado manualmente)
  → Checklist de obra (mismos ítems, check hecho/pendiente)
```

Un mismo requerimiento viaja por todo el ciclo de vida — no se duplica entre
"requerimiento del brief" e "ítem de checklist"; su checkbox simplemente
cambia de significado cuando el proyecto pasa a estado `aprobado`.

## Modelo de datos (IndexedDB, local al dispositivo)

**Proyecto**
- `id`, `nombre`, `cliente`, `fechaCreacion`
- `estado`: `captura` | `brief_generado` | `aprobado`
- `categorias`: lista editable de strings, arranca con una sugerida
  (Estructura, Eléctrico, Sanitario/Plomería, Acabados, Carpintería, Otros)

**Requerimiento** (pertenece a un proyecto)
- `id`, `proyectoId`, `texto`, `categoria` (null hasta revisión), `orden`
- `fechaCaptura`
- `checkEstado`: `pendiente` | `hecho` (solo tiene efecto visual una vez que
  el proyecto está `aprobado`)

## Pantallas

1. **Lista de proyectos (home)** — tarjetas por obra (cliente, fecha, chip de
   estado con color). Botón flotante `+` para crear proyecto.
2. **Captura** — lista de ítems capturados (más reciente arriba) + barra fija
   inferior con campo de texto y botón de micrófono grande para dictado.
   Swipe para borrar un ítem. Sin categorización en este paso.
3. **Revisión/categorización** — mismos ítems con chip de categoría editable
   (asignar/crear categoría), edición de texto, borrado. Botón "Generar
   brief" habilitado cuando todos los ítems tienen categoría.
4. **Brief (PDF)** — vista previa agrupada por categoría, botón
   "Descargar/Compartir PDF" (share sheet nativo en Android) y botón "Marcar
   como aprobado por el cliente".
5. **Checklist de obra** — ítems agrupados por categoría como checkboxes
   grandes, contador de progreso ("8/14 completados"), tocar alterna
   hecho/pendiente.

Inspiración de patrones de UI: quick-add con micrófono tipo apps de notas de
voz, chips de categoría tipo Linear, listas y swipe-to-complete tipo
Todoist/Things, pantallas simples orientadas a oficios/servicio de campo tipo
GlossGenius/Square.

## Arquitectura técnica

- **Stack**: HTML + CSS + JS vanilla, sin build step. Librerías vía CDN:
  `idb` (o capa propia chica) para IndexedDB, `jsPDF` para generar el PDF.
- **Voz a texto**: Web Speech API (`SpeechRecognition` /
  `webkitSpeechRecognition`) en español. Si el navegador no la soporta, el
  botón de micrófono no aparece y se usa el campo de texto normalmente.
- **Storage**: IndexedDB, todo local al dispositivo. Sin backend, sin
  cuentas, sin sincronización.
- **PDF**: generado client-side con `jsPDF`, agrupado por categoría;
  compartido con el share sheet nativo en Android o descargado en PC.
- **Distribución**: alojada como sitio estático gratuito en GitHub Pages
  (HTTPS, sin costo, sin backend). Esto permite instalarla como PWA completa
  en Android (ícono propio, pantalla completa, cacheo offline del shell de la
  app — el dictado de voz sigue requiriendo conexión). En la computadora se
  abre igual en cualquier navegador, sin necesidad de instalar nada.

## Manejo de errores y casos borde

- Dictado sin reconocer nada: no agrega texto vacío, el flujo sigue normal.
- Permiso de micrófono denegado: mensaje simple, el campo de texto sigue
  disponible.
- Cierre de la app a mitad de captura/categorización: no se pierde nada, todo
  se guarda en IndexedDB en cada acción (no hay "guardar" manual).
- Edición de un requerimiento después de aprobado el brief: se permite editar
  desde la checklist, pero el PDF no se regenera automáticamente — hay que
  volver a "Generar brief" si hace falta un PDF actualizado.
- Borrado de un proyecto: requiere confirmación explícita (no hay papelera ni
  backend para recuperarlo).

## Testing

Sin backend ni lógica de servidor, no amerita una suite automatizada pesada.
Validación manual en Chrome (Android instalado como PWA + desktop) cubriendo
el flujo completo: crear proyecto → capturar por texto y voz → categorizar →
generar y compartir PDF → marcar aprobado → tildar checklist → cerrar y
reabrir para confirmar persistencia. Si el modelo de datos crece a futuro,
vale la pena agregar tests unitarios sobre la capa de storage.
