const CACHE_NAME = 'obras-civiles-shell-v5';
const ARCHIVOS_SHELL = [
  './',
  './index.html',
  './css/tokens.css',
  './css/styles.css',
  './manifest.json',
  './js/db.js',
  './js/speech.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  './js/pdf.js',
  './js/ui/texto.js',
  './js/ui/pasos.js',
  './js/ui/borrado-diferido.js',
  './js/ui/iconos.js',
  './js/ui/avisos.js',
  './js/ui/shell.js',
  './js/router.js',
  './js/views/proyectos.js',
  './js/views/captura.js',
  './js/views/revision.js',
  './js/views/brief.js',
  './js/views/checklist.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/logo.svg',
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
