// Mineradio Service Worker - v1
const CACHE_NAME = 'mineradio-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 安装：预缓存关键资源
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS).catch(function() {
        // 静态资源可能不可用，跳过预缓存
        console.log('[SW] 静态资源预缓存跳过');
      });
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
           .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// 请求拦截：网络优先，缓存回退
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // 跳过非GET请求和跨域API请求
  if (event.request.method !== 'GET') return;
  if (url.origin !== location.origin && !url.hostname.includes('localhost')) return;

  // API请求：网络优先，失败时返回缓存的旧数据或错误页面
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          // 缓存成功的API响应（5分钟）- 使用 try-catch 避免 clone 失败
          if (response.ok && response.status !== 204) {
            try {
              var clone = response.clone();
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put(event.request, clone).catch(function(){});
              }).catch(function(){});
            } catch (e) {
              console.warn('[SW] Failed to cache API response:', e.message);
            }
          }
          return response;
        })
        .catch(function() {
          // 网络失败时尝试返回缓存
          return caches.match(event.request).then(function(cached) {
            return cached || new Response(JSON.stringify({ error: '离线模式，无法连接服务器' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // 静态资源：缓存优先 + 网络更新
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      var fetchPromise = fetch(event.request).then(function(response) {
        if (response.ok && response.status !== 204) {
          try {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone).catch(function(){});
            }).catch(function(){});
          } catch (e) {
            console.warn('[SW] Failed to cache static asset:', e.message);
          }
        }
        return response;
      }).catch(function() {
        // 如果是导航请求且没有缓存，返回离线页面
        if (event.request.mode === 'navigate' && !cached) {
          return caches.match('/index.html');
        }
      });

      return cached || fetchPromise;
    })
  );
});
