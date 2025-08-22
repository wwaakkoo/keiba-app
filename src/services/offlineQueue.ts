import { db } from './database';

// オフライン操作の型定義
export interface OfflineOperation {
  id: string;
  type: 'CREATE_RACE' | 'CREATE_PREDICTION' | 'CREATE_INVESTMENT' | 'UPDATE_PREDICTION' | 'DELETE_RACE';
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

// オフラインキューのテーブル定義を追加
declare module './database' {
  interface KeibaDatabase {
    offlineQueue: import('dexie').Table<OfflineOperation>;
  }
}

// データベースにオフラインキューテーブルを追加
db.version(2).stores({
  races: '&id, date, venue, raceNumber, surface, grade, createdAt, updatedAt',
  predictions: '&id, raceId, timestamp, accuracy, confidence',
  investments: '&id, raceId, predictionId, betType, timestamp, profit, venue, raceDate',
  settings: '++id, theme, updatedAt',
  syncStatus: '++id, lastSync, isOnline',
  offlineQueue: '&id, type, timestamp, status, retryCount'
});

export class OfflineQueueService {
  // 操作をキューに追加
  async addOperation(
    type: OfflineOperation['type'],
    data: any,
    maxRetries: number = 3
  ): Promise<string> {
    const operation: OfflineOperation = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries,
      status: 'pending'
    };

    try {
      await db.offlineQueue.add(operation);
      console.log('オフライン操作をキューに追加:', operation);
      return operation.id;
    } catch (error) {
      console.error('オフライン操作の追加エラー:', error);
      throw error;
    }
  }

  // 保留中の操作を取得
  async getPendingOperations(): Promise<OfflineOperation[]> {
    try {
      return await db.offlineQueue
        .where('status')
        .equals('pending')
        .sortBy('timestamp');
    } catch (error) {
      console.error('保留中操作の取得エラー:', error);
      return [];
    }
  }

  // 操作の実行
  async executeOperation(operation: OfflineOperation): Promise<boolean> {
    try {
      // 処理中ステータスに更新
      await this.updateOperationStatus(operation.id, 'processing');

      let success = false;

      switch (operation.type) {
        case 'CREATE_RACE':
          success = await this.executeCreateRace(operation.data);
          break;
        case 'CREATE_PREDICTION':
          success = await this.executeCreatePrediction(operation.data);
          break;
        case 'CREATE_INVESTMENT':
          success = await this.executeCreateInvestment(operation.data);
          break;
        case 'UPDATE_PREDICTION':
          success = await this.executeUpdatePrediction(operation.data);
          break;
        case 'DELETE_RACE':
          success = await this.executeDeleteRace(operation.data);
          break;
        default:
          console.warn('未知の操作タイプ:', operation.type);
          success = false;
      }

      if (success) {
        await this.updateOperationStatus(operation.id, 'completed');
        console.log('オフライン操作が正常に実行されました:', operation.id);
      } else {
        await this.handleOperationFailure(operation);
      }

      return success;
    } catch (error) {
      console.error('操作実行エラー:', error);
      await this.handleOperationFailure(operation, error as Error);
      return false;
    }
  }

  // 操作ステータスの更新
  private async updateOperationStatus(
    id: string, 
    status: OfflineOperation['status'],
    error?: string
  ): Promise<void> {
    try {
      const updates: Partial<OfflineOperation> = { status };
      if (error) {
        updates.error = error;
      }
      await db.offlineQueue.update(id, updates);
    } catch (err) {
      console.error('操作ステータス更新エラー:', err);
    }
  }

  // 操作失敗時の処理
  private async handleOperationFailure(operation: OfflineOperation, error?: Error): Promise<void> {
    const newRetryCount = operation.retryCount + 1;
    
    if (newRetryCount >= operation.maxRetries) {
      // 最大リトライ回数に達した場合は失敗とする
      await this.updateOperationStatus(
        operation.id, 
        'failed', 
        error?.message || '最大リトライ回数に達しました'
      );
    } else {
      // リトライ回数を増やして保留状態に戻す
      await db.offlineQueue.update(operation.id, {
        retryCount: newRetryCount,
        status: 'pending',
        error: error?.message
      });
    }
  }

  // レース作成の実行
  private async executeCreateRace(data: any): Promise<boolean> {
    try {
      // 実際のAPI呼び出しまたはサーバー同期処理
      // ここでは成功として扱う（実際の実装では外部APIを呼び出す）
      console.log('レース作成を実行:', data);
      return true;
    } catch (error) {
      console.error('レース作成実行エラー:', error);
      return false;
    }
  }

  // 予想作成の実行
  private async executeCreatePrediction(data: any): Promise<boolean> {
    try {
      console.log('予想作成を実行:', data);
      return true;
    } catch (error) {
      console.error('予想作成実行エラー:', error);
      return false;
    }
  }

  // 投資記録作成の実行
  private async executeCreateInvestment(data: any): Promise<boolean> {
    try {
      console.log('投資記録作成を実行:', data);
      return true;
    } catch (error) {
      console.error('投資記録作成実行エラー:', error);
      return false;
    }
  }

  // 予想更新の実行
  private async executeUpdatePrediction(data: any): Promise<boolean> {
    try {
      console.log('予想更新を実行:', data);
      return true;
    } catch (error) {
      console.error('予想更新実行エラー:', error);
      return false;
    }
  }

  // レース削除の実行
  private async executeDeleteRace(data: any): Promise<boolean> {
    try {
      console.log('レース削除を実行:', data);
      return true;
    } catch (error) {
      console.error('レース削除実行エラー:', error);
      return false;
    }
  }

  // 全ての保留中操作を処理
  async processAllPendingOperations(): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    const pendingOperations = await this.getPendingOperations();
    let successful = 0;
    let failed = 0;

    console.log(`${pendingOperations.length}件の保留中操作を処理中...`);

    for (const operation of pendingOperations) {
      const success = await this.executeOperation(operation);
      if (success) {
        successful++;
      } else {
        failed++;
      }
    }

    console.log(`処理完了: 成功 ${successful}件, 失敗 ${failed}件`);

    return {
      processed: pendingOperations.length,
      successful,
      failed
    };
  }

  // 完了した操作をクリーンアップ
  async cleanupCompletedOperations(olderThanDays: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const completedOperations = await db.offlineQueue
        .where('status')
        .equals('completed')
        .and(op => op.timestamp < cutoffDate)
        .toArray();

      const ids = completedOperations.map(op => op.id);
      await db.offlineQueue.bulkDelete(ids);

      console.log(`${ids.length}件の完了済み操作をクリーンアップしました`);
      return ids.length;
    } catch (error) {
      console.error('クリーンアップエラー:', error);
      return 0;
    }
  }

  // キューの統計情報を取得
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    try {
      const [pending, processing, completed, failed, total] = await Promise.all([
        db.offlineQueue.where('status').equals('pending').count(),
        db.offlineQueue.where('status').equals('processing').count(),
        db.offlineQueue.where('status').equals('completed').count(),
        db.offlineQueue.where('status').equals('failed').count(),
        db.offlineQueue.count()
      ]);

      return { pending, processing, completed, failed, total };
    } catch (error) {
      console.error('キュー統計取得エラー:', error);
      return { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 };
    }
  }
}

// シングルトンインスタンス
export const offlineQueue = new OfflineQueueService();