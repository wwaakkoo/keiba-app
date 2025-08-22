import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import { syncService, SyncResult } from '@/services/syncService';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface SyncStatusProps {
  className?: string;
  showDetails?: boolean;
  autoRefresh?: boolean;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({
  className = '',
  showDetails = false,
  autoRefresh = true
}) => {
  const { isOnline } = useOnlineStatus();
  const [syncStatus, setSyncStatus] = useState({
    lastSync: null as Date | null,
    pendingChanges: 0,
    conflictCount: 0,
    syncInProgress: false
  });
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // 同期状態の更新
  const updateSyncStatus = async () => {
    try {
      const status = await syncService.getStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('同期状態取得エラー:', error);
    }
  };

  // 手動同期の実行
  const handleManualSync = async () => {
    if (isManualSyncing || !isOnline) return;

    try {
      setIsManualSyncing(true);
      const result = await syncService.performFullSync();
      setLastSyncResult(result);
      await updateSyncStatus();
    } catch (error) {
      console.error('手動同期エラー:', error);
      setLastSyncResult({
        success: false,
        syncedItems: 0,
        conflicts: [],
        errors: [error instanceof Error ? error.message : '同期に失敗しました'],
        timestamp: new Date()
      });
    } finally {
      setIsManualSyncing(false);
    }
  };

  // 初期化と定期更新
  useEffect(() => {
    updateSyncStatus();

    if (autoRefresh) {
      const interval = setInterval(updateSyncStatus, 30000); // 30秒ごと
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // 同期状態のアイコンと色を決定
  const getSyncStatusIcon = () => {
    if (isManualSyncing || syncStatus.syncInProgress) {
      return <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />;
    }

    if (!isOnline) {
      return <WifiOff className="h-4 w-4 text-red-600" />;
    }

    if (syncStatus.conflictCount > 0) {
      return <AlertCircle className="h-4 w-4 text-amber-600" />;
    }

    if (syncStatus.pendingChanges > 0) {
      return <Clock className="h-4 w-4 text-amber-600" />;
    }

    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  const getSyncStatusText = () => {
    if (isManualSyncing || syncStatus.syncInProgress) {
      return '同期中...';
    }

    if (!isOnline) {
      return 'オフライン';
    }

    if (syncStatus.conflictCount > 0) {
      return `${syncStatus.conflictCount}件の競合`;
    }

    if (syncStatus.pendingChanges > 0) {
      return `${syncStatus.pendingChanges}件の変更待ち`;
    }

    return '同期済み';
  };

  const getSyncStatusColor = () => {
    if (isManualSyncing || syncStatus.syncInProgress) {
      return 'text-blue-700';
    }

    if (!isOnline) {
      return 'text-red-700';
    }

    if (syncStatus.conflictCount > 0 || syncStatus.pendingChanges > 0) {
      return 'text-amber-700';
    }

    return 'text-green-700';
  };

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
      {/* メイン表示 */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-2">
          {getSyncStatusIcon()}
          
          <div className="flex flex-col">
            <span className={`text-sm font-medium ${getSyncStatusColor()}`}>
              {getSyncStatusText()}
            </span>
            
            {syncStatus.lastSync && (
              <span className="text-xs text-gray-500">
                最終同期: {syncStatus.lastSync.toLocaleString('ja-JP', {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            )}
          </div>
        </div>

        {/* 同期ボタン */}
        {isOnline && !syncStatus.syncInProgress && (
          <button
            onClick={handleManualSync}
            disabled={isManualSyncing}
            className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isManualSyncing ? 'animate-spin' : ''}`} />
            <span>同期</span>
          </button>
        )}
      </div>

      {/* 詳細情報 */}
      {showDetails && (
        <div className="border-t px-3 py-2 bg-gray-50">
          <div className="space-y-2">
            {/* 接続状態 */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">接続状態:</span>
              <div className="flex items-center space-x-1">
                {isOnline ? (
                  <Wifi className="h-3 w-3 text-green-600" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-600" />
                )}
                <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                  {isOnline ? 'オンライン' : 'オフライン'}
                </span>
              </div>
            </div>

            {/* 保留中の変更 */}
            {syncStatus.pendingChanges > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">保留中の変更:</span>
                <span className="text-amber-600">{syncStatus.pendingChanges}件</span>
              </div>
            )}

            {/* 競合 */}
            {syncStatus.conflictCount > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">データ競合:</span>
                <span className="text-red-600">{syncStatus.conflictCount}件</span>
              </div>
            )}

            {/* 最後の同期結果 */}
            {lastSyncResult && (
              <div className="mt-2 pt-2 border-t">
                <div className="text-xs text-gray-600 mb-1">最後の同期結果:</div>
                <div className={`text-xs ${lastSyncResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {lastSyncResult.success ? (
                    `成功: ${lastSyncResult.syncedItems}件を同期`
                  ) : (
                    `失敗: ${lastSyncResult.errors.join(', ')}`
                  )}
                </div>
                {lastSyncResult.conflicts.length > 0 && (
                  <div className="text-xs text-amber-600">
                    {lastSyncResult.conflicts.length}件の競合が検出されました
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// コンパクト版（ヘッダー用）
export const CompactSyncStatus: React.FC<{ className?: string }> = ({
  className = ''
}) => {
  const { isOnline } = useOnlineStatus();
  const [syncStatus, setSyncStatus] = useState({
    pendingChanges: 0,
    conflictCount: 0,
    syncInProgress: false
  });

  useEffect(() => {
    const updateStatus = async () => {
      try {
        const status = await syncService.getStatus();
        setSyncStatus(status);
      } catch (error) {
        console.error('同期状態取得エラー:', error);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const hasIssues = !isOnline || syncStatus.pendingChanges > 0 || syncStatus.conflictCount > 0;

  if (!hasIssues && !syncStatus.syncInProgress) {
    return null; // 問題がない場合は表示しない
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {syncStatus.syncInProgress ? (
        <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
      ) : !isOnline ? (
        <WifiOff className="h-4 w-4 text-red-600" />
      ) : syncStatus.conflictCount > 0 ? (
        <AlertCircle className="h-4 w-4 text-amber-600" />
      ) : (
        <Clock className="h-4 w-4 text-amber-600" />
      )}
      
      {(syncStatus.pendingChanges > 0 || syncStatus.conflictCount > 0) && (
        <span className="bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5 rounded-full">
          {syncStatus.pendingChanges + syncStatus.conflictCount}
        </span>
      )}
    </div>
  );
};