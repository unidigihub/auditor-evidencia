// sw.js — Service Worker del Auditor de Evidencia
// Guarda una copia de la app en el dispositivo para que pueda
// abrirse sin conexión a internet.

const CACHE_NAME = "auditor-evidencia-v1";

// Lo mínimo que la app necesita para poder abrirse sin internet.
const ARCHIVOS_A_GUARDAR = [
  "./",
  "./index.html",
  "./manifest.json"
];

// Se ejecuta una sola vez, cuando el navegador instala el Service Worker.
// Aquí guardamos la primera copia de la app en el caché.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_A_GUARDAR))
  );
  self.skipWaiting();
});

// Se ejecuta cuando el Service Worker toma control de la página.
// Aquí borramos cachés viejos de versiones anteriores (ver "CACHE_NAME"
// más abajo, en las notas de actualización).
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres
          .filter((nombre) => nombre !== CACHE_NAME)
          .map((nombre) => caches.delete(nombre))
      )
    )
  );
  self.clients.claim();
});

// Se ejecuta cada vez que la página pide algo (el HTML, el manifest, etc).
// Estrategia: primero intenta traerlo de internet y, si no hay señal,
// lo sirve desde el caché guardado. Así, cuando SÍ hay internet, el
// estudiante siempre ve la versión más reciente; cuando NO hay internet,
// la app igual abre con la última copia guardada.
self.addEventListener("fetch", (event) => {
  // No tocamos el envío de resultados a Google Sheets (esa petición es
  // POST, no GET) — que siga su camino normal, con o sin red.
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((respuestaRed) => {
        const copia = respuestaRed.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return respuestaRed;
      })
      .catch(() => caches.match(event.request))
  );
});
