// Service Worker for Keiba Mobile App
const CACHE_NAME = 'keiba-app-v1';
const STATIC_CACHE_NAME = 'keiba-static-v1';
const DYNAMIC_CACHE_NAME = 'keiba-dynamic-v1';

// キャッシュするファイルリスト
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

// インストール時の処理
self.addEventListener('install', (event) => {
  console.log('Service Worker: インストール中...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: 静的ファイルをキャッシュ中...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: インストール完了');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: インストールエラー:', error);
      })
  );
});

// アクティベート時の処理
self.addEventListener('activate', (event) => {
  console.log('Service Worker: アクティベート中...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 古いキャッシュを削除
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== CACHE_NAME) {
              console.log('Service Worker: 古いキャッシュを削除:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: アクティベート完了');
        return self.clients.claim();
      })
  );
});

// フェッチ時の処理（キャッシュ戦略）
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // HTMLリクエストの処理
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(handleHTMLRequest(request));
    return;
  }

  // 静的アセット（JS、CSS、画像など）の処理
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAssetRequest(request));
    return;
  }

  // APIリクエストの処理
  if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // その他のリクエストはネットワーク優先
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// HTMLリクエストの処理（ネットワーク優先、フォールバック）
async function handleHTMLRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    // ネットワークレスポンスをキャッシュ
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    cache.put(request, networkResponse.clone());
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: ネットワークエラー、キャッシュから取得:', request.url);
    
    // キャッシュから取得を試行
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // オフラインページを返す
    return caches.match('/offline.html');
  }
}

// 静的アセットの処理（キャッシュ優先）
async function handleStaticAssetRequest(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // 成功したレスポンスをキャッシュ
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: 静的アセット取得エラー:', error);
    throw error;
  }
}

// APIリクエストの処理（ネットワーク優先、キャッシュフォールバック）
async function handleAPIRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    // GETリクエストの成功レスポンスをキャッシュ
    if (request.method === 'GET' && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: APIリクエストエラー、キャッシュから取得:', request.url);
    
    // GETリクエストの場合のみキャッシュから取得
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // オフライン時のAPIエラーレスポンス
    return new Response(
      JSON.stringify({ 
        error: 'オフライン中です', 
        offline: true,
        timestamp: new Date().toISOString()
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// 静的アセットかどうかの判定
function isStaticAsset(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  return pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

// APIリクエストかどうかの判定
function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
}

// バックグラウンド同期の処理
self.addEventListener('sync', (event) => {
  console.log('Service Worker: バックグラウンド同期:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

// バックグラウンド同期の実装
async function handleBackgroundSync() {
  try {
    console.log('Service Worker: バックグラウンド同期を実行中...');
    
    // メインスレッドに同期処理を依頼
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      clients[0].postMessage({
        type: 'BACKGROUND_SYNC',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('Service Worker: バックグラウンド同期完了');
  } catch (error) {
    console.error('Service Worker: バックグラウンド同期エラー:', error);
    throw error;
  }
}

// 定期的なバックグラウンド同期（実験的機能）
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'periodic-background-sync') {
    console.log('Service Worker: 定期バックグラウンド同期');
    event.waitUntil(handleBackgroundSync());
  }
});

// プッシュ通知の処理
self.addEventListener('push', (event) => {
  console.log('Service Worker: プッシュ通知受信:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'プッシュ通知',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '開く',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: '閉じる',
        icon: '/icons/xmark.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('競馬予想アプリ', options)
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: 通知クリック:', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// メッセージ処理（メインスレッドとの通信）
self.addEventListener('message', (event) => {
  console.log('Service Worker: メッセージ受信:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('Service Worker: 登録完了');