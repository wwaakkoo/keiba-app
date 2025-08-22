import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { offlineQueue } from '@/services/offlineQueue';
import { registerBackgroundSync } from '@/utils/serviceWorker';

export interface OfflineSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingOperations: number;
  lastSyncTime: Date | null;
  syncError: string | null;
}

export const useOfflineSync = () => {
  const { isOnline } = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // 保留中操作数の更新
  const updatePendingCount = useCallback(async () => {
    try {
      const stats = await offlineQueue.getQueueStats();
      setPendingOperations(stats.pending);
    } catch (error) {
      console.error('保留中操作数の取得エラー:', error);
    }
  }, []);

  // 同期処理の実行
  const performSync = useCallback(async () => {
    if (isSyncing || !isOnline) {
      return;
    }

    try {
      setIsSyncing(true);
      setSyncError(null);

      console.log('オフライン同期を開始...');
      
      const result = await offlineQueue.processAllPendingOperations();
      
      if (result.failed > 0) {
        setSyncError(`${result.failed}件の操作が失敗しました`);
      }

      setLastSyncTime(new Date());
      await updatePendingCount();

      console.log('オフライン同期完了:', result);
    } catch (error) {
      console.error('同期エラー:', error);
      setSyncError(error instanceof Error ? error.message : '同期に失敗しました');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline, updatePendingCount]);

  // オフライン操作をキューに追加
  const queueOperation = useCallback(async (
    type: 'CREATE_RACE' | 'CREATE_PREDICTION' | 'CREATE_INVESTMENT' | 'UPDATE_PREDICTION' | 'DELETE_RACE',
    data: any
  ) => {
    try {
      const operationId = await offlineQueue.addOperation(type, data);
      await updatePendingCount();
      
      // オンラインの場合は即座に同期を試行
      if (isOnline) {
        performSync();
      } else {
        // オフラインの場合はバックグラウンド同期を登録
        await registerBackgroundSync('background-sync');
      }
      
      return operationId;
    } catch (error) {
      console.error('操作のキューイングエラー:', error);
      throw error;
    }
  }, [isOnline, performSync, updatePendingCount]);

  // オンライン状態変化時の処理
  useEffect(() => {
    if (isOnline && pendingOperations > 0) {
      // オンラインになったら自動同期
      const timer = setTimeout(() => {
        performSync();
      }, 1000); // 1秒後に実行

      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingOperations, performSync]);

  // 初期化時の保留中操作数取得
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  // 定期的なクリーンアップ
  useEffect(() => {
    const cleanupInterval = setInterval(async () => {
      try {
        await offlineQueue.cleanupCompletedOperations(7); // 7日以上古い完了済み操作を削除
      } catch (error) {
        console.error('クリーンアップエラー:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24時間ごと

    return () => clearInterval(cleanupInterval);
  }, []);

  const status: OfflineSyncStatus = {
    isOnline,
    isSyncing,
    pendingOperations,
    lastSyncTime,
    syncError
  };

  return {
    status,
    performSync,
    queueOperation,
    updatePendingCount,
    clearSyncError: () => setSyncError(null)
  };
};