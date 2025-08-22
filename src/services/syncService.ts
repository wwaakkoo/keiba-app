import { db } from './database';
import { raceRepository } from './repositories/RaceRepository';
import { predictionRepository } from './repositories/PredictionRepository';
import { investmentRepository } from './repositories/InvestmentRepository';

// 同期結果の型定義
export interface SyncResult {
  success: boolean;
  syncedItems: number;
  conflicts: DataConflict[];
  errors: string[];
  timestamp: Date;
}

// データ競合の型定義
export interface DataConflict {
  id: string;
  type: 'race' | 'prediction' | 'investment';
  localData: any;
  remoteData: any;
  conflictType: 'update' | 'delete' | 'create';
  timestamp: Date;
}

// 同期設定の型定義
export interface SyncSettings {
  autoSync: boolean;
  syncInterval: number; // 分単位
  conflictResolution: 'local' | 'remote' | 'manual';
  maxRetries: number;
  batchSize: number;
}

export class SyncService {
  private syncInProgress = false;
  private lastSyncTime: Date | null = null;
  private syncSettings: SyncSettings = {
    autoSync: true,
    syncInterval: 15, // 15分
    conflictResolution: 'local',
    maxRetries: 3,
    batchSize: 50
  };

  // クラウドへの同期（アップロード）
  async syncToCloud(): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('同期が既に進行中です');
    }

    try {
      this.syncInProgress = true;
      const result: SyncResult = {
        success: true,
        syncedItems: 0,
        conflicts: [],
        errors: [],
        timestamp: new Date()
      };

      console.log('クラウドへの同期を開始...');

      // 1. レースデータの同期
      const racesSynced = await this.syncRacesToCloud();
      result.syncedItems += racesSynced;

      // 2. 予想データの同期
      const predictionsSynced = await this.syncPredictionsToCloud();
      result.syncedItems += predictionsSynced;

      // 3. 投資データの同期
      const investmentsSynced = await this.syncInvestmentsToCloud();
      result.syncedItems += investmentsSynced;

      // 4. 同期状態の更新
      await this.updateSyncStatus(result.timestamp, 0);

      this.lastSyncTime = result.timestamp;
      console.log(`クラウド同期完了: ${result.syncedItems}件`);

      return result;
    } catch (error) {
      console.error('クラウド同期エラー:', error);
      return {
        success: false,
        syncedItems: 0,
        conflicts: [],
        errors: [error instanceof Error ? error.message : '不明なエラー'],
        timestamp: new Date()
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  // クラウドからの同期（ダウンロード）
  async syncFromCloud(): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('同期が既に進行中です');
    }

    try {
      this.syncInProgress = true;
      const result: SyncResult = {
        success: true,
        syncedItems: 0,
        conflicts: [],
        errors: [],
        timestamp: new Date()
      };

      console.log('クラウドからの同期を開始...');

      // 1. リモートデータの取得と競合検出
      const remoteData = await this.fetchRemoteData();
      
      // 2. 競合の検出と解決
      const conflicts = await this.detectConflicts(remoteData);
      result.conflicts = conflicts;

      // 3. 競合のない データの適用
      const resolvedData = await this.resolveConflicts(conflicts);
      result.syncedItems = await this.applyRemoteData(resolvedData);

      // 4. 同期状態の更新
      await this.updateSyncStatus(result.timestamp, conflicts.length);

      this.lastSyncTime = result.timestamp;
      console.log(`クラウド同期完了: ${result.syncedItems}件, 競合: ${conflicts.length}件`);

      return result;
    } catch (error) {
      console.error('クラウド同期エラー:', error);
      return {
        success: false,
        syncedItems: 0,
        conflicts: [],
        errors: [error instanceof Error ? error.message : '不明なエラー'],
        timestamp: new Date()
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  // 双方向同期
  async performFullSync(): Promise<SyncResult> {
    try {
      console.log('双方向同期を開始...');

      // 1. クラウドからの同期
      const downloadResult = await this.syncFromCloud();
      
      // 2. クラウドへの同期
      const uploadResult = await this.syncToCloud();

      // 結果をマージ
      const combinedResult: SyncResult = {
        success: downloadResult.success && uploadResult.success,
        syncedItems: downloadResult.syncedItems + uploadResult.syncedItems,
        conflicts: [...downloadResult.conflicts, ...uploadResult.conflicts],
        errors: [...downloadResult.errors, ...uploadResult.errors],
        timestamp: new Date()
      };

      console.log('双方向同期完了:', combinedResult);
      return combinedResult;
    } catch (error) {
      console.error('双方向同期エラー:', error);
      throw error;
    }
  }

  // 競合解決
  async resolveConflicts(conflicts: DataConflict[]): Promise<any[]> {
    const resolvedData: any[] = [];

    for (const conflict of conflicts) {
      let resolvedItem: any;

      switch (this.syncSettings.conflictResolution) {
        case 'local':
          resolvedItem = conflict.localData;
          break;
        case 'remote':
          resolvedItem = conflict.remoteData;
          break;
        case 'manual':
          // 手動解決の場合は、UIで解決を待つ
          // ここでは一時的にローカルデータを優先
          resolvedItem = conflict.localData;
          break;
        default:
          resolvedItem = conflict.localData;
      }

      if (resolvedItem) {
        resolvedData.push({
          ...resolvedItem,
          type: conflict.type,
          resolvedAt: new Date()
        });
      }
    }

    return resolvedData;
  }

  // 同期状態の取得
  async getStatus(): Promise<{
    lastSync: Date | null;
    isOnline: boolean;
    pendingChanges: number;
    conflictCount: number;
    syncInProgress: boolean;
  }> {
    try {
      const syncStatus = await db.syncStatus.orderBy('id').last();
      
      return {
        lastSync: this.lastSyncTime || syncStatus?.lastSync || null,
        isOnline: navigator.onLine,
        pendingChanges: syncStatus?.pendingChanges || 0,
        conflictCount: 0, // 実装時に競合数を取得
        syncInProgress: this.syncInProgress
      };
    } catch (error) {
      console.error('同期状態取得エラー:', error);
      return {
        lastSync: null,
        isOnline: navigator.onLine,
        pendingChanges: 0,
        conflictCount: 0,
        syncInProgress: false
      };
    }
  }

  // 自動同期の設定
  setAutoSync(enabled: boolean, intervalMinutes?: number): void {
    this.syncSettings.autoSync = enabled;
    if (intervalMinutes) {
      this.syncSettings.syncInterval = intervalMinutes;
    }

    if (enabled) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  // 自動同期の開始
  private autoSyncTimer: NodeJS.Timeout | null = null;

  private startAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
    }

    this.autoSyncTimer = setInterval(async () => {
      if (navigator.onLine && !this.syncInProgress) {
        try {
          await this.performFullSync();
        } catch (error) {
          console.error('自動同期エラー:', error);
        }
      }
    }, this.syncSettings.syncInterval * 60 * 1000);

    console.log(`自動同期を開始: ${this.syncSettings.syncInterval}分間隔`);
  }

  private stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
    console.log('自動同期を停止');
  }

  // プライベートメソッド群

  private async syncRacesToCloud(): Promise<number> {
    try {
      // 実際の実装では、APIエンドポイントにデータを送信
      const races = await raceRepository.getAll();
      console.log(`${races.length}件のレースデータを同期`);
      
      // モック実装: 実際にはHTTPリクエストを送信
      await this.mockApiCall('races', races);
      
      return races.length;
    } catch (error) {
      console.error('レース同期エラー:', error);
      return 0;
    }
  }

  private async syncPredictionsToCloud(): Promise<number> {
    try {
      const predictions = await predictionRepository.getHistory(100);
      console.log(`${predictions.length}件の予想データを同期`);
      
      await this.mockApiCall('predictions', predictions);
      
      return predictions.length;
    } catch (error) {
      console.error('予想同期エラー:', error);
      return 0;
    }
  }

  private async syncInvestmentsToCloud(): Promise<number> {
    try {
      const investments = await investmentRepository.getRecentInvestments(100);
      console.log(`${investments.length}件の投資データを同期`);
      
      await this.mockApiCall('investments', investments);
      
      return investments.length;
    } catch (error) {
      console.error('投資同期エラー:', error);
      return 0;
    }
  }

  private async fetchRemoteData(): Promise<any> {
    // 実際の実装では、APIからデータを取得
    console.log('リモートデータを取得中...');
    
    // モック実装
    return {
      races: [],
      predictions: [],
      investments: []
    };
  }

  private async detectConflicts(remoteData: any): Promise<DataConflict[]> {
    const conflicts: DataConflict[] = [];
    
    // 実際の実装では、ローカルデータとリモートデータを比較して競合を検出
    console.log('データ競合を検出中...');
    
    return conflicts;
  }

  private async applyRemoteData(resolvedData: any[]): Promise<number> {
    let appliedCount = 0;
    
    for (const item of resolvedData) {
      try {
        switch (item.type) {
          case 'race':
            await raceRepository.update(item.id, item);
            break;
          case 'prediction':
            await predictionRepository.updateResult(item.id, item);
            break;
          case 'investment':
            await investmentRepository.update(item.id, item);
            break;
        }
        appliedCount++;
      } catch (error) {
        console.error('データ適用エラー:', error);
      }
    }
    
    return appliedCount;
  }

  private async updateSyncStatus(lastSync: Date, pendingChanges: number): Promise<void> {
    try {
      const existingStatus = await db.syncStatus.orderBy('id').last();
      
      if (existingStatus) {
        await db.syncStatus.update(existingStatus.id!, {
          lastSync,
          pendingChanges,
          syncInProgress: false
        });
      } else {
        await db.syncStatus.add({
          lastSync,
          pendingChanges,
          conflictResolution: this.syncSettings.conflictResolution,
          isOnline: navigator.onLine,
          syncInProgress: false
        });
      }
    } catch (error) {
      console.error('同期状態更新エラー:', error);
    }
  }

  // モックAPI呼び出し（実際の実装では実際のAPIを呼び出す）
  private async mockApiCall(endpoint: string, data: any): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`モックAPI呼び出し: ${endpoint}, データ数: ${data.length}`);
        resolve();
      }, 100);
    });
  }
}

// シングルトンインスタンス
export const syncService = new SyncService();