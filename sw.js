// GeekOrbit service worker: the whole app is cached so it opens and works without internet.
// Your data is never here: it lives in your .sqlite file (or in memory in sample mode).
// Raise VERSION together with VERSION in js/model.js on every release, and list new files in ASSETS.
const VERSION = 'v2.2.2';
const CACHE = `geekorbit-${VERSION}`;
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/icons/geekorbit-apple-touch-180.png",
  "./assets/icons/geekorbit-avatar.svg",
  "./assets/icons/geekorbit-icon-16.svg",
  "./assets/icons/geekorbit-icon-192.png",
  "./assets/icons/geekorbit-icon-32.png",
  "./assets/icons/geekorbit-icon-32.svg",
  "./assets/icons/geekorbit-icon-48.svg",
  "./assets/icons/geekorbit-icon-512.png",
  "./assets/icons/geekorbit-icon.svg",
  "./assets/icons/geekorbit-maskable-512.png",
  "./assets/logo/geekorbit-wordmark-dark.svg",
  "./assets/logo/geekorbit-wordmark-light.svg",
  "./css/geek.css",
  "./css/geekorbit.css",
  "./fonts/jetbrains-mono/JetBrainsMono-Medium.woff2",
  "./fonts/jetbrains-mono/JetBrainsMono-Regular.woff2",
  "./fonts/vazirmatn/Vazirmatn-Black.woff2",
  "./fonts/vazirmatn/Vazirmatn-Bold.woff2",
  "./fonts/vazirmatn/Vazirmatn-ExtraBold.woff2",
  "./fonts/vazirmatn/Vazirmatn-Medium.woff2",
  "./fonts/vazirmatn/Vazirmatn-Regular.woff2",
  "./fonts/vazirmatn/Vazirmatn-SemiBold.woff2",
  "./js/backup.js",
  "./js/data.js",
  "./js/datefield.js",
  "./js/db.js",
  "./js/demo.js",
  "./js/dialogs.js",
  "./js/handoff.js",
  "./js/icons.js",
  "./js/jalali.js",
  "./js/main.js",
  "./js/model.js",
  "./js/pwa.js",
  "./js/router.js",
  "./js/schema.js",
  "./js/shortcuts.js",
  "./js/ui.js",
  "./js/util.js",
  "./js/views/accounts.js",
  "./js/views/changelog.js",
  "./js/views/chats.js",
  "./js/views/common.js",
  "./js/views/dashboard.js",
  "./js/views/projects.js",
  "./js/views/tags.js",
  "./vendor/sql-wasm.js",
  "./vendor/sql-wasm.wasm"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('geekorbit-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// the page asks the waiting worker to take over when the person chooses "reload"
self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

// cache first for the app's own files; anything else goes to the network
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).catch(() =>
    (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
