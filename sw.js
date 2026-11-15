/* Offline-first service worker: precache the app shell, cache-first with background refresh. */
const VERSION = 'fb-v1.0.0';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/i18n.js', 'js/core.js', 'js/ui.js', 'js/today.js', 'js/plan.js', 'js/food.js', 'js/progress.js', 'js/more.js', 'js/main.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
  'img/ex/snatch.png', 'img/ex/power_snatch.png', 'img/ex/sn_pull.png', 'img/ex/sn_transition.png', 'img/ex/ohs.png',
  'img/ex/cj.png', 'img/ex/cl_pull.png', 'img/ex/hpc_pj.png', 'img/ex/dip_pp.png', 'img/ex/split_jerk.png',
  'img/ex/back_squat.png', 'img/ex/front_squat.png', 'img/ex/rdl.png', 'img/ex/sl_rdl.png', 'img/ex/bss.png', 'img/ex/sl_box.png',
  'img/ex/box_jump.png', 'img/ex/cmj.png', 'img/ex/depth.png', 'img/ex/broad.png', 'img/ex/hop.png', 'img/ex/mb_scoop.png',
  'img/ex/mb_oh.png', 'img/ex/sprint.png', 'img/ex/pallof.png', 'img/ex/side_core.png', 'img/ex/deadbug.png',
  'img/ex/sl_stance.png', 'img/ex/ankle.png', 'img/ex/goblet.png', 'img/ex/hip_mob.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async (cache) => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
  }));
});
