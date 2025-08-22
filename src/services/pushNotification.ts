/**
 * プッシュ通知サービス
 * PWAでのプッシュ通知機能を管理
 */

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
}

interface PushSubscriptionInfo {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class PushNotificationService {
  private static instance: PushNotificationService;
  private vapidPublicKey: string = 'YOUR_VAPID_PUBLIC_KEY'; // 実際のVAPIDキーに置き換え
  private subscription: PushSubscription | null = null;

  private constructor() {
    this.initializeNotifications();
  }

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * 通知機能の初期化
   */
  private async initializeNotifications(): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('PushNotification: このブラウザは通知をサポートしていません');
      return;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('PushNotification: このブラウザはService Workerをサポートしていません');
      return;
    }

    // 既存の購読情報を確認
    try {
      const registration = await navigator.serviceWorker.ready;
      this.subscription = await registration.pushManager.getSubscription();
      
      if (this.subscription) {
        console.log('PushNotification: 既存の購読情報を確認しました');
      }
    } catch (error) {
      console.error('PushNotification: 初期化エラー:', error);
    }
  }

  /**
   * 通知許可の要求
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('このブラウザは通知をサポートしていません');
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    console.log(`PushNotification: 通知許可状態: ${permission}`);
    return permission;
  }

  /**
   * プッシュ通知の購読
   */
  public async subscribe(): Promise<PushSubscriptionInfo | null> {
    try {
      const permission = await this.requestPermission();
      
      if (permission !== 'granted') {
        console.warn('PushNotification: 通知が許可されていません');
        return null;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // 既存の購読を確認
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // 新しい購読を作成
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
        });
      }

      this.subscription = subscription;

      // 購読情報を整形
      const subscriptionInfo: PushSubscriptionInfo = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
        }
      };

      console.log('PushNotification: プッシュ通知を購読しました');
      
      // サーバーに購読情報を送信（実装時に追加）
      await this.sendSubscriptionToServer(subscriptionInfo);

      return subscriptionInfo;
    } catch (error) {
      console.error('PushNotification: 購読エラー:', error);
      return null;
    }
  }

  /**
   * プッシュ通知の購読解除
   */
  public async unsubscribe(): Promise<boolean> {
    try {
      if (!this.subscription) {
        console.log('PushNotification: 購読情報がありません');
        return true;
      }

      const success = await this.subscription.unsubscribe();
      
      if (success) {
        this.subscription = null;
        console.log('PushNotification: プッシュ通知の購読を解除しました');
        
        // サーバーに購読解除を通知（実装時に追加）
        await this.removeSubscriptionFromServer();
      }

      return success;
    } catch (error) {
      console.error('PushNotification: 購読解除エラー:', error);
      return false;
    }
  }

  /**
   * ローカル通知の表示
   */
  public async showNotification(options: NotificationOptions): Promise<void> {
    try {
      const permission = await this.requestPermission();
      
      if (permission !== 'granted') {
        console.warn('PushNotification: 通知が許可されていません');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const notificationOptions: NotificationOptions = {
        body: options.body,
        icon: options.icon || '/icons/icon-192.png',
        badge: options.badge || '/icons/badge-72.png',
        tag: options.tag || 'keiba-app',
        data: options.data || {},
        actions: options.actions || [],
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false
      };

      await registration.showNotification(options.title, notificationOptions);
      console.log('PushNotification: 通知を表示しました:', options.title);
    } catch (error) {
      console.error('PushNotification: 通知表示エラー:', error);
    }
  }

  /**
   * 予定された通知（レース開始前など）
   */
  public scheduleNotification(
    delay: number,
    options: NotificationOptions
  ): number {
    const timeoutId = window.setTimeout(() => {
      this.showNotification(options);
    }, delay);

    console.log(`PushNotification: ${delay}ms後に通知を予定しました`);
    return timeoutId;
  }

  /**
   * 予定された通知のキャンセル
   */
  public cancelScheduledNotification(timeoutId: number): void {
    clearTimeout(timeoutId);
    console.log('PushNotification: 予定された通知をキャンセルしました');
  }

  /**
   * 購読状態の確認
   */
  public async isSubscribed(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch (error) {
      console.error('PushNotification: 購読状態確認エラー:', error);
      return false;
    }
  }

  /**
   * 通知許可状態の確認
   */
  public getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  /**
   * VAPID公開キーの設定
   */
  public setVapidPublicKey(key: string): void {
    this.vapidPublicKey = key;
  }

  /**
   * Base64文字列をUint8Arrayに変換
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
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

  /**
   * ArrayBufferをBase64文字列に変換
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * サーバーに購読情報を送信（実装時に追加）
   */
  private async sendSubscriptionToServer(subscription: PushSubscriptionInfo): Promise<void> {
    // 実際の実装では、サーバーAPIに購読情報を送信
    console.log('PushNotification: 購読情報をサーバーに送信（未実装）', subscription);
  }

  /**
   * サーバーから購読情報を削除（実装時に追加）
   */
  private async removeSubscriptionFromServer(): Promise<void> {
    // 実際の実装では、サーバーAPIから購読情報を削除
    console.log('PushNotification: サーバーから購読情報を削除（未実装）');
  }
}

// 競馬アプリ固有の通知ヘルパー
export class KeibaNotificationHelper {
  private pushService: PushNotificationService;

  constructor() {
    this.pushService = PushNotificationService.getInstance();
  }

  /**
   * レース開始前の通知
   */
  public async notifyRaceStart(raceInfo: {
    venue: string;
    raceNumber: number;
    startTime: Date;
  }): Promise<void> {
    const now = new Date();
    const timeUntilRace = raceInfo.startTime.getTime() - now.getTime();
    
    // 5分前に通知
    const notificationDelay = Math.max(0, timeUntilRace - 5 * 60 * 1000);
    
    if (notificationDelay > 0) {
      this.pushService.scheduleNotification(notificationDelay, {
        title: 'レース開始間近',
        body: `${raceInfo.venue} ${raceInfo.raceNumber}R が5分後に開始されます`,
        tag: `race-${raceInfo.venue}-${raceInfo.raceNumber}`,
        data: { type: 'race-start', raceInfo },
        actions: [
          {
            action: 'view-prediction',
            title: '予想を確認'
          },
          {
            action: 'dismiss',
            title: '閉じる'
          }
        ]
      });
    }
  }

  /**
   * 予想結果の通知
   */
  public async notifyPredictionResult(result: {
    isCorrect: boolean;
    venue: string;
    raceNumber: number;
    accuracy: number;
  }): Promise<void> {
    const title = result.isCorrect ? '予想的中！' : '予想外れ';
    const body = `${result.venue} ${result.raceNumber}R - 的中率: ${result.accuracy}%`;

    await this.pushService.showNotification({
      title,
      body,
      tag: `result-${result.venue}-${result.raceNumber}`,
      data: { type: 'prediction-result', result },
      actions: [
        {
          action: 'view-statistics',
          title: '統計を確認'
        }
      ]
    });
  }

  /**
   * 投資上限警告の通知
   */
  public async notifyInvestmentLimit(amount: number, limit: number): Promise<void> {
    await this.pushService.showNotification({
      title: '投資上限に注意',
      body: `本日の投資額が上限の${Math.round((amount / limit) * 100)}%に達しています`,
      tag: 'investment-warning',
      data: { type: 'investment-limit', amount, limit },
      requireInteraction: true
    });
  }
}

// シングルトンインスタンスをエクスポート
export const pushNotificationService = PushNotificationService.getInstance();
export const keibaNotificationHelper = new KeibaNotificationHelper();