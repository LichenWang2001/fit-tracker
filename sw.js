/* 健身记录 App · Service Worker：缓存运行时代码，支持离线使用与 PWA 安装 */
const CACHE = "fit-tracker-v2";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  /* 页面导航：网络优先，失败才回退缓存 —— 保证每次改代码都能及时更新 */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() =>
        caches.open(CACHE).then((cache) =>
          cache.match(req).then((hit) => hit || cache.match("./index.html"))
        )
      )
    );
    return;
  }
  /* 静态资源：缓存优先，离线可用 */
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            cache.put(req, copy);
          }
          return res;
        }).catch(() => cache.match("./index.html"));
      })
    )
  );
});
