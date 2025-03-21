importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// 워크박스 모듈 사용
const { routing, strategies, expiration, precaching, cacheableResponse } = workbox;

// 캐시 이름 설정
const CACHE_NAME_PREFIX = 'offline-post-app';
const POST_LIST_CACHE = `${CACHE_NAME_PREFIX}-post-list`;
const POST_DETAIL_CACHE = `${CACHE_NAME_PREFIX}-post-detail`;
const STATIC_CACHE = `${CACHE_NAME_PREFIX}-static`;

// 정적 자산 캐싱
precaching.precacheAndRoute([
  { url: '/', revision: '1' },
  { url: '/index.html', revision: '1' },
  { url: '/manifest.json', revision: '1' },
  // 필요한 다른 정적 자산 추가
]);

// 게시물 목록 API 요청 캐싱 (네트워크 우선, 실패 시 캐시)
routing.registerRoute(
  ({ url }) => url.pathname.includes('/api/posts') || 
               url.href.includes('firestore.googleapis.com') && 
               url.href.includes('posts'),
  new strategies.NetworkFirst({
    cacheName: POST_LIST_CACHE,
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 50, // 최대 50개 항목 저장
        maxAgeSeconds: 24 * 60 * 60, // 24시간 캐시
        purgeOnQuotaError: true
      }),
      new cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200] // 성공 응답과 CORS 오류(0) 캐싱
      })
    ]
  })
);

// 게시물 상세 API 요청 캐싱 (스테일-와일-리밸리데이트)
routing.registerRoute(
  ({ url }) => url.pathname.includes('/api/post/') || 
               url.href.includes('firestore.googleapis.com') && 
               url.href.includes('post'),
  new strategies.StaleWhileRevalidate({
    cacheName: POST_DETAIL_CACHE,
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 100, // 최대 100개 항목 저장
        maxAgeSeconds: 24 * 60 * 60, // 24시간 캐시
        purgeOnQuotaError: true
      }),
      new cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200] // 성공 응답과 CORS 오류(0) 캐싱
      })
    ]
  })
);

// 이미지 및 기타 정적 자산 캐싱 (캐시 우선, 실패 시 네트워크)
routing.registerRoute(
  ({ request }) => 
    request.destination === 'image' || 
    request.destination === 'style' || 
    request.destination === 'script' || 
    request.destination === 'font',
  new strategies.CacheFirst({
    cacheName: STATIC_CACHE,
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30일 캐시
        purgeOnQuotaError: true
      })
    ]
  })
);

// 서비스 워커 활성화 시 이전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName.startsWith(CACHE_NAME_PREFIX))
          .filter(cacheName => {
            return cacheName !== POST_LIST_CACHE && 
                   cacheName !== POST_DETAIL_CACHE && 
                   cacheName !== STATIC_CACHE;
          })
          .map(cacheName => caches.delete(cacheName))
      );
    })
  );
});

// 메시지 처리 (캐시 무효화 등)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName.startsWith(CACHE_NAME_PREFIX))
            .map(cacheName => caches.delete(cacheName))
        );
      })
    );
  }
  
  if (event.data && event.data.type === 'INVALIDATE_BOARD_CACHE') {
    const boardId = event.data.boardId;
    if (!boardId) return;
    
    event.waitUntil(
      caches.open(POST_LIST_CACHE).then((cache) => {
        return cache.keys().then((requests) => {
          const boardRequests = requests.filter(request => 
            request.url.includes(boardId)
          );
          return Promise.all(
            boardRequests.map(request => cache.delete(request))
          );
        });
      })
    );
  }
}); 