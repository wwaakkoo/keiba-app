import React, { useState, useEffect } from 'react';
import { RefreshCw, X, Download, AlertCircle } from 'lucide-react';
import { TouchOptimizedButton } from './TouchOptimizedButton';

interface PWAUpdateNotificationProps {
  className?: string;
}

export const PWAUpdateNotification: React.FC<PWAUpdateNotificationProps> = ({ 
  className = '' 
}) => {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateInfo, setUpdateInfo] = useState<{
    version?: string;
    features?: string[];
    isRequired?: boolean;
  }>({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Service Workerの更新を監視
    const handleServiceWorkerUpdate = (registration: ServiceWorkerRegistration) => {
      console.log('PWA: 新しいバージョンが利用可能です');
      setRegistration(registration);
      setShowUpdatePrompt(true);
    };

    // Service Worker登録の確認
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // 更新チェック
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                handleServiceWorkerUpdate(registration);
              }
            });
          }
        });

        // 既に新しいService Workerが待機中の場合
        if (registration.waiting) {
          handleServiceWorkerUpdate(registration);
        }
      });

      // Service Workerからのメッセージを監視
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
          setShowUpdatePrompt(true);
        }
      });
    }

    // Workboxの更新イベントを監視（vite-plugin-pwaを使用している場合）
    const handleWorkboxUpdate = () => {
      setShowUpdatePrompt(true);
    };

    window.addEventListener('sw-update-available', handleWorkboxUpdate);

    return () => {
      window.removeEventListener('sw-update-available', handleWorkboxUpdate);
    };
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    try {
      if (registration && registration.waiting) {
        // 新しいService Workerをアクティブ化
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // 少し待ってからリロード
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        // フォールバック: 単純にページをリロード
        window.location.reload();
      }
    } catch (error) {
      console.error('更新エラー:', error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
    
    // 一定時間後に再表示
    setTimeout(() => {
      setShowUpdatePrompt(true);
    }, 30 * 60 * 1000); // 30分後
  };

  if (!showUpdatePrompt) {
    return null;
  }

  const isRequired = updateInfo.isRequired || false;
  const hasFeatures = updateInfo.features && updateInfo.features.length > 0;

  return (
    <div className={`fixed top-4 left-4 right-4 z-50 ${className}`}>
      <div className={`rounded-lg shadow-lg p-4 mx-auto max-w-sm ${
        isRequired 
          ? 'bg-red-600 text-white' 
          : 'bg-blue-600 text-white'
      }`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {isRequired ? (
              <AlertCircle className="w-5 h-5 text-red-200 mt-0.5" />
            ) : (
              <Download className="w-5 h-5 text-blue-200 mt-0.5" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium mb-1">
              {isRequired ? '重要なアップデート' : 'アップデート利用可能'}
            </h3>
            
            <p className={`text-xs mb-3 ${
              isRequired ? 'text-red-100' : 'text-blue-100'
            }`}>
              {isRequired 
                ? 'セキュリティ修正を含む重要な更新です'
                : '新しい機能と改善が含まれています'
              }
            </p>
            
            {updateInfo.version && (
              <p className={`text-xs mb-2 ${
                isRequired ? 'text-red-200' : 'text-blue-200'
              }`}>
                バージョン: {updateInfo.version}
              </p>
            )}
            
            {hasFeatures && (
              <div className="mb-3">
                <p className={`text-xs font-medium mb-1 ${
                  isRequired ? 'text-red-200' : 'text-blue-200'
                }`}>
                  新機能:
                </p>
                <ul className={`text-xs space-y-1 ${
                  isRequired ? 'text-red-100' : 'text-blue-100'
                }`}>
                  {updateInfo.features!.slice(0, 3).map((feature, index) => (
                    <li key={index} className="flex items-center space-x-1">
                      <span>•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex space-x-2">
              <TouchOptimizedButton
                size="sm"
                variant="secondary"
                onClick={handleUpdate}
                disabled={isUpdating}
                className={`flex-1 ${
                  isRequired
                    ? 'bg-white text-red-600 hover:bg-red-50'
                    : 'bg-white text-blue-600 hover:bg-blue-50'
                }`}
              >
                {isUpdating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                    更新中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    {isRequired ? '今すぐ更新' : '更新'}
                  </>
                )}
              </TouchOptimizedButton>
              
              {!isRequired && (
                <TouchOptimizedButton
                  size="sm"
                  variant="secondary"
                  onClick={handleDismiss}
                  disabled={isUpdating}
                  className="px-3 bg-blue-500 text-white hover:bg-blue-400"
                >
                  <X className="w-4 h-4" />
                </TouchOptimizedButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// PWAの状態を表示するステータスコンポーネント
export const PWAStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isUpdating] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const statusColor = isOnline ? 'bg-green-500' : 'bg-red-500';
  const statusText = isOnline ? 'オンライン' : 'オフライン';

  return (
    <div className="flex items-center space-x-2 text-xs text-gray-600">
      <div className={`w-2 h-2 rounded-full ${statusColor}`} />
      <span>{statusText}</span>
      {isUpdating && (
        <>
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>更新中...</span>
        </>
      )}
    </div>
  );
};