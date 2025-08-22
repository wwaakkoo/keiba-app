// Service Worker登録とライフサイクル管理

// const isLocalhost = Boolean(
//   window.location.hostname === 'localhost' ||
//   window.location.hostname === '[::1]' ||
//   window.location.hostname.match(
//     /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
//   )
// );

export interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
}

export async function registerServiceWorker(config?: ServiceWorkerConfig): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      console.log('Service Worker登録成功:', registration);

      // 更新チェック
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // 新しいコンテンツが利用可能
              console.log('新しいコンテンツが利用可能です');
              config?.onUpdate?.(registration);
            } else {
              // オフライン使用の準備完了
              console.log('オフライン使用の準備が完了しました');
              config?.onOfflineReady?.();
            }
          }
        });
      });

      // アクティブなService Workerがある場合
      if (registration.active) {
        config?.onSuccess?.(registration);
      }

      // 定期的な更新チェック
      setInterval(() => {
        registration.update();
      }, 60000); // 1分ごと

    } catch (error) {
      console.error('Service Worker登録エラー:', error);
    }
  } else {
    console.log('Service Workerはサポートされていません');
  }
}

export async function unregisterServiceWorker(): Promise<boolean> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const result = await registration.unregister();
      console.log('Service Worker登録解除:', result);
      return result;
    } catch (error) {
      console.error('Service Worker登録解除エラー:', error);
      return false;
    }
  }
  return false;
}

// Service Workerにメッセージを送信
export function sendMessageToServiceWorker(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!navigator.serviceWorker.controller) {
      reject(new Error('Service Workerが利用できません'));
      return;
    }

    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };

    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
  });
}

// Service Workerの更新を促す
export async function skipWaiting(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }
}

// バックグラウンド同期を登録
export async function registerBackgroundSync(tag: string): Promise<void> {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
      console.log('バックグラウンド同期登録:', tag);
    } catch (error) {
      console.error('バックグラウンド同期登録エラー:', error);
    }
  }
}

// プッシュ通知の購読
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // 既存の購読を確認
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // 新しい購読を作成
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            // VAPID公開キー（実際の実装では環境変数から取得）
            'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9f8HnKJuOmqmkFWJ6swkuHVVjyNjeSUYrhzEITHHhrUNBNjNqSBw'
          )
        });
      }
      
      console.log('プッシュ通知購読:', subscription);
      return subscription;
    } catch (error) {
      console.error('プッシュ通知購読エラー:', error);
      return null;
    }
  }
  return null;
}

// VAPID キーの変換ユーティリティ
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Service Workerの状態を監視
export function watchServiceWorkerState(callback: (state: string) => void): () => void {
  if ('serviceWorker' in navigator) {
    const handleStateChange = () => {
      if (navigator.serviceWorker.controller) {
        callback(navigator.serviceWorker.controller.state);
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleStateChange);
    
    // 初期状態をチェック
    handleStateChange();

    // クリーンアップ関数を返す
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleStateChange);
    };
  }

  return () => {}; // 何もしないクリーンアップ関数
}