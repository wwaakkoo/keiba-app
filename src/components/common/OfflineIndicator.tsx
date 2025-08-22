import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className = '',
  showDetails = false
}) => {
  const { isOnline } = useOnlineStatus();
  const { status, performSync, clearSyncError } = useOfflineSync();

  if (isOnline && status.pendingOperations === 0 && !status.syncError) {
    return null; // オンラインで問題がない場合は表示しない
  }

  const handleSyncClick = () => {
    if (status.syncError) {
      clearSyncError();
    }
    if (isOnline && !status.isSyncing) {
      performSync();
    }
  };

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
      {/* メインインジケーター */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-600" />
          )}
          
          <div className="flex flex-col">
            <span className={`text-sm font-medium ${
              isOnline ? 'text-green-700' : 'text-red-700'
            }`}>
              {isOnline ? 'オンライン' : 'オフライン'}
            </span>
            
            {status.pendingOperations > 0 && (
              <span className="text-xs text-gray-500">
                {status.pendingOperations}件の操作が保留中
              </span>
            )}
          </div>
        </div>

        {/* 同期ボタン */}
        {(isOnline && (status.pendingOperations > 0 || status.syncError)) && (
          <button
            onClick={handleSyncClick}
            disabled={status.isSyncing}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              status.syncError
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            } disabled:opacity-50`}
          >
            {status.isSyncing ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : status.syncError ? (
              <AlertCircle className="h-3 w-3" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            <span>
              {status.isSyncing ? '同期中...' : status.syncError ? '再試行' : '同期'}
            </span>
          </button>
        )}
      </div>

      {/* 詳細情報 */}
      {showDetails && (
        <div className="border-t px-3 py-2 bg-gray-50">
          <div className="space-y-1 text-xs text-gray-600">
            {status.lastSyncTime && (
              <div>
                最終同期: {status.lastSyncTime.toLocaleString('ja-JP')}
              </div>
            )}
            
            {status.syncError && (
              <div className="text-red-600 flex items-center space-x-1">
                <AlertCircle className="h-3 w-3" />
                <span>{status.syncError}</span>
              </div>
            )}
            
            {!isOnline && (
              <div className="text-amber-600">
                オンラインになると自動的に同期されます
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// コンパクト版（ヘッダー用）
export const CompactOfflineIndicator: React.FC<{ className?: string }> = ({
  className = ''
}) => {
  const { isOnline } = useOnlineStatus();
  const { status } = useOfflineSync();

  if (isOnline && status.pendingOperations === 0) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {isOnline ? (
        <Wifi className="h-4 w-4 text-green-600" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-600" />
      )}
      
      {status.pendingOperations > 0 && (
        <span className="bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5 rounded-full">
          {status.pendingOperations}
        </span>
      )}
      
      {status.isSyncing && (
        <RefreshCw className="h-3 w-3 text-blue-600 animate-spin" />
      )}
    </div>
  );
};