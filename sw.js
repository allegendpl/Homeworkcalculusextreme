/* Bump VERSION after changing shell assets. Caches only this project's own
 * shell and catalog, never third-party advertising or publisher resources. */
const VERSION = 'v4';
const ROOT = new URL('./', self.location.href);
const PREFIX = `extremecalculus-${ROOT.pathname}-`;
const CACHE = `${PREFIX}${VERSION}`;
const SHELL = ['index.html', 'game.html', 'stats.html', 'about.html', 'privacy.html', 'dmca.html', 'contact.html', '404.html', 'css/style.css', 'js/app.js', 'js/game.js', 'js/ads.js', 'manifest.json', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'data/games.json', 'thumbnails/2048.svg', 'thumbnails/neon-snake.svg', 'thumbnails/prism-breaker.svg', 'thumbnails/memory-mosaic.svg', 'thumbnails/lights-out.svg'].map(path => new URL(path, ROOT).href);
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== ROOT.origin) return;
  // Query IDs share one app shell. Unknown routes are NOT cached as the home page.
  const normalized = new URL(url.href); normalized.search = ''; normalized.hash = '';
  if (normalized.href === ROOT.href) normalized.href = new URL('index.html', ROOT).href;
  if (!SHELL.includes(normalized.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request);
      if (response.ok && response.type !== 'opaque') await cache.put(normalized.href, response.clone());
      return response;
    } catch {
      const cached = await cache.match(normalized.href);
      return cached || new Response('Offline: this page is not cached yet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
