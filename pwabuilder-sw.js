
const CACHE_NAME = "fifa-pro-offline-v3";

const BASE_PATH = "/fifa-simulador/";

const ARCHIVOS = [
  BASE_PATH,
  BASE_PATH + "index.html",
  BASE_PATH + "manifest.json",
  BASE_PATH + "icon-192.png",
  BASE_PATH + "icon-512.png"
];

// Instalar y guardar los archivos principales
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ARCHIVOS))
      .then(() => self.skipWaiting())
  );
});

// Activar y eliminar cachés antiguos
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Responder incluso cuando no hay conexión
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // No interceptar otros sitios, como Firebase o servicios externos
  if (url.origin !== self.location.origin) return;

  // Para abrir la aplicación, usar primero la copia guardada
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copia = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put(BASE_PATH + "index.html", copia);
              cache.put(BASE_PATH, copia);
            });
          }

          return response;
        })
        .catch(async () => {
          return (
            await caches.match(BASE_PATH + "index.html")
          ) || (
            await caches.match(BASE_PATH)
          ) || new Response(
            "FIFA PRO está sin conexión. Abre la aplicación después de cargarla una vez con internet.",
            {
              headers: {
                "Content-Type": "text/plain; charset=utf-8"
              }
            }
          );
        })
    );

    return;
  }

  // Para imágenes y otros archivos del mismo sitio
  event.respondWith(
    caches.match(request).then(async cached => {
      if (cached) return cached;

      try {
        const response = await fetch(request);

        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }

        return response;
      } catch {
        return Response.error();
      }
    })
  );
});
