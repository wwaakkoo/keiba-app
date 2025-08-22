/**
 * バックグラウンド同期サービス
 * オフライン時のデータ操作をキューイングし、オンライン復帰時に同期
 */

interface SyncTask {
  id: string;
  type: 'prediction' | 'investment' | 'race' | 'settings';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

interface SyncResult {
  success: boolean;
  error?: string;
  syncedTasks: number;
  failedTasks: number;
}

class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private syncQueue: SyncTask[] = [];
  private isOnline: boolean = navigator.onLine;
  private maxRetries: number = 3;

  private constructor() {
    this.initializeEventListeners();
    this.loadQueueFromStorage();
  }

  public static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  /**
   * イベントリスナーの初期化
   */
  private initializeEventListeners(): void {
    // オンライン/オフライン状態の監視
    window.addEventListener('online', () => {
      console.log('BackgroundSync: オンラインになりました');
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      console.log('BackgroundSync: オフラインになりました');
      this.isOnline = false;
    });

    // Service Workerからのメッセージを監視
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'BACKGROUND_SYNC') {
          this.processSyncQueue();
        }
      });
    }
  }

  /**
   * ローカルストレージからキューを読み込み
   */
  private loadQueueFromStorage(): void {
    try {
      const storedQueue = localStorage.getItem('sync-queue');
      if (storedQueue) {
        this.syncQueue = JSON.parse(storedQueue).map((task: any) => ({
          ...task,
          timestamp: new Date(task.timestamp)
        }));
        console.log(`BackgroundSync: ${this.syncQueue.length}件のタスクを読み込みました`);
      }
    } catch (error) {
      console.error('BackgroundSync: キュー読み込みエラー:', error);
      this.syncQueue = [];
    }
  }

  /**
   * キューをローカルストレージに保存
   */
  private saveQueueToStorage(): void {
    try {
      localStorage.setItem('sync-queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('BackgroundSync: キュー保存エラー:', error);
    }
  }

  /**
   * 同期タスクをキューに追加
   */
  public addToQueue(
    type: SyncTask['type'],
    action: SyncTask['action'],
    data: any,
    maxRetries: number = this.maxRetries
  ): string {
    const task: SyncTask = {
      id: `${type}-${action}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      action,
      data,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries
    };

    this.syncQueue.push(task);
    this.saveQueueToStorage();

    console.log(`BackgroundSync: タスクをキューに追加: ${task.id}`);

    // オンラインの場合は即座に処理を試行
    if (this.isOnline) {
      setTimeout(() => this.processSyncQueue(), 100);
    } else {
      // オフラインの場合はService Workerにバックグラウンド同期を登録
      this.registerBackgroundSync();
    }

    return task.id;
  }

  /**
   * Service Workerにバックグラウンド同期を登録
   */
  private async registerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('background-sync');
        console.log('BackgroundSync: バックグラウンド同期を登録しました');
      } catch (error) {
        console.error('BackgroundSync: バックグラウンド同期登録エラー:', error);
      }
    }
  }

  /**
   * 同期キューの処理
   */
  public async processSyncQueue(): Promise<SyncResult> {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return {
        success: true,
        syncedTasks: 0,
        failedTasks: 0
      };
    }

    console.log(`BackgroundSync: ${this.syncQueue.length}件のタスクを処理開始`);

    let syncedTasks = 0;
    let failedTasks = 0;
    const tasksToRemove: string[] = [];

    for (const task of this.syncQueue) {
      try {
        const success = await this.processTask(task);
        
        if (success) {
          syncedTasks++;
          tasksToRemove.push(task.id);
          console.log(`BackgroundSync: タスク処理成功: ${task.id}`);
        } else {
          task.retryCount++;
          
          if (task.retryCount >= task.maxRetries) {
            failedTasks++;
            tasksToRemove.push(task.id);
            console.error(`BackgroundSync: タスク処理失敗（最大リトライ回数到達）: ${task.id}`);
          } else {
            console.warn(`BackgroundSync: タスク処理失敗（リトライ ${task.retryCount}/${task.maxRetries}）: ${task.id}`);
          }
        }
      } catch (error) {
        console.error(`BackgroundSync: タスク処理エラー: ${task.id}`, error);
        task.retryCount++;
        
        if (task.retryCount >= task.maxRetries) {
          failedTasks++;
          tasksToRemove.push(task.id);
        }
      }
    }

    // 完了したタスクをキューから削除
    this.syncQueue = this.syncQueue.filter(task => !tasksToRemove.includes(task.id));
    this.saveQueueToStorage();

    const result: SyncResult = {
      success: failedTasks === 0,
      syncedTasks,
      failedTasks
    };

    console.log(`BackgroundSync: 処理完了 - 成功: ${syncedTasks}, 失敗: ${failedTasks}`);
    
    // 同期完了イベントを発火
    window.dispatchEvent(new CustomEvent('sync-completed', { detail: result }));

    return result;
  }

  /**
   * 個別タスクの処理
   */
  private async processTask(task: SyncTask): Promise<boolean> {
    try {
      // 実際のAPI呼び出しやデータベース操作をここで実行
      // この実装では、ローカルデータベースへの操作のみを行う
      
      switch (task.type) {
        case 'prediction':
          return await this.processPredictionTask(task);
        case 'investment':
          return await this.processInvestmentTask(task);
        case 'race':
          return await this.processRaceTask(task);
        case 'settings':
          return await this.processSettingsTask(task);
        default:
          console.warn(`BackgroundSync: 未知のタスクタイプ: ${task.type}`);
          return false;
      }
    } catch (error) {
      console.error(`BackgroundSync: タスク処理エラー: ${task.id}`, error);
      return false;
    }
  }

  /**
   * 予想データの同期処理
   */
  private async processPredictionTask(task: SyncTask): Promise<boolean> {
    // 実際の実装では、サーバーAPIとの同期を行う
    // 現在はローカル処理のみ
    console.log(`BackgroundSync: 予想データ同期: ${task.action}`, task.data);
    return true;
  }

  /**
   * 投資データの同期処理
   */
  private async processInvestmentTask(task: SyncTask): Promise<boolean> {
    console.log(`BackgroundSync: 投資データ同期: ${task.action}`, task.data);
    return true;
  }

  /**
   * レースデータの同期処理
   */
  private async processRaceTask(task: SyncTask): Promise<boolean> {
    console.log(`BackgroundSync: レースデータ同期: ${task.action}`, task.data);
    return true;
  }

  /**
   * 設定データの同期処理
   */
  private async processSettingsTask(task: SyncTask): Promise<boolean> {
    console.log(`BackgroundSync: 設定データ同期: ${task.action}`, task.data);
    return true;
  }

  /**
   * キューの状態を取得
   */
  public getQueueStatus(): { pending: number; failed: number } {
    const pending = this.syncQueue.filter(task => task.retryCount < task.maxRetries).length;
    const failed = this.syncQueue.filter(task => task.retryCount >= task.maxRetries).length;
    
    return { pending, failed };
  }

  /**
   * キューをクリア
   */
  public clearQueue(): void {
    this.syncQueue = [];
    this.saveQueueToStorage();
    console.log('BackgroundSync: キューをクリアしました');
  }

  /**
   * 失敗したタスクを再試行
   */
  public retryFailedTasks(): void {
    this.syncQueue.forEach(task => {
      if (task.retryCount >= task.maxRetries) {
        task.retryCount = 0;
      }
    });
    
    this.saveQueueToStorage();
    
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }
}

// シングルトンインスタンスをエクスポート
export const backgroundSyncService = BackgroundSyncService.getInstance();

// 型定義をエクスポート
export type { SyncTask, SyncResult };