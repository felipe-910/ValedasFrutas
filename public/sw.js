// Service worker do Vale das Frutas (versão React/Vite).
// Os arquivos do app ganham nomes com código (hash) a cada build, então não dá para listar tudo de antemão:
// guardamos o que for sendo aberto. Páginas (navegação) tentam a rede primeiro e, sem internet, usam o
// /index.html guardado (o app é de página única: o React cuida de mostrar a tela certa).
const CACHE_NAME = 'vale-das-frutas-react-v5';
const BASICOS = ['/', '/index.html', '/manifest.json', '/logo.png', '/alimentos.json', '/sprite/avatar1.jpg', '/sprite/avatar2.jpg', '/assets/tela-historias.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(BASICOS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase, fontes e ícones online passam direto

  // páginas dos minigames (abertas em iframe): rede primeiro e guardadas pelo próprio endereço
  if (url.pathname.startsWith('/jogos/') && url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
          return resp;
        })
        .catch(() => caches.match(req).then((c) => c || Response.error()))
    );
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copia));
          return resp;
        })
        .catch(() => caches.match('/index.html').then((c) => c || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((guardado) => {
      const rede = fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const copia = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
          }
          return resp;
        })
        .catch(() => guardado);
      return guardado || rede;
    })
  );
});
