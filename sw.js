// 井冈山红色文化展示平台 - Service Worker
// 实现离线访问功能

const CACHE_NAME = 'jinggangshan-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

// 安装时预缓存关键资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 请求拦截：网络优先，失败回退缓存，再失败回退首页
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  // 忽略跨域请求
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // 忽略 Vite HMR 相关请求
  if (url.pathname.startsWith('/@') || url.pathname.includes('hot')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 成功获取，缓存一份
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // 网络失败，从缓存中查找
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // 导航请求回退到首页
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('', { status: 504, statusText: 'Offline' });
        });
      })
  );
});
