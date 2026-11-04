/* 멍캠프 오프라인 캐시. 파일을 바꾸면 CACHE 이름의 숫자를 올린다
   사이트 파일은 언제나 새로 받아 보고(바뀐 게 없으면 서버가 304로 짧게 답한다),
   인터넷이 없거나 2.5초 안에 답이 없을 때만 캐시에 둔 것을 쓴다. 그래서 고친 것이 다음에 열 때 바로 보인다 */
const CACHE = 'mungcamp-v30';
const WAIT = 2500;
const ASSETS = [
  './',
  'index.html',
  'css/style.css',
  'js/util.js',
  'js/audio.js',
  'js/fire-gl.js',
  'js/pup.js',
  'js/net.js',
  'js/crowd.js',
  'js/scene-fire.js',
  'js/scene-water.js',
  'js/scene-forest.js',
  'js/scene-tent.js',
  'js/scene-lodge.js',
  'js/camp-map.js',
  'js/camp-sea.js',
  'js/residents.js',
  'js/breath.js',
  'js/app.js',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 인증한 건의 목록은 오프라인 캐시에 남기지 않는다.
  if (url.origin === self.location.origin && (url.pathname.startsWith('/api/') || url.pathname === '/suggestions' || url.pathname === '/health')) return;
  const font = /^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== self.location.origin && !font) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = () => cache.match(req, { ignoreSearch: !font });
      const network = fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
        return res;
      });
      network.catch(() => {}); // 캐시로 답한 뒤에 끊겨도 조용히
      // 글꼴은 바뀌지 않으니 캐시부터
      if (font) return (await cached()) || network;
      // 사이트 파일은 새것부터, 늦거나 끊기면 캐시
      const late = new Promise((res) => setTimeout(res, WAIT)).then(cached);
      try {
        const first = await Promise.race([network, late]);
        if (first) return first;
        return await network;
      } catch (err) {
        return (await cached()) || Response.error();
      }
    })
  );
});
