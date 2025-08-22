import { useState, useEffect } from 'react';

export interface OnlineStatus {
  isOnline: boolean;
  isOffline: boolean;
  lastOnlineTime: Date | null;
  connectionType: string | null;
}

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(
    navigator.onLine ? new Date() : null
  );
  const [connectionType, setConnectionType] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineTime(new Date());
      console.log('オンラインになりました');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('オフラインになりました');
    };

    // 接続タイプの取得（対応ブラウザのみ）
    const updateConnectionType = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setConnectionType(connection?.effectiveType || connection?.type || null);
      }
    };

    // イベントリスナーの設定
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 接続情報の監視（対応ブラウザのみ）
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.addEventListener('change', updateConnectionType);
      updateConnectionType(); // 初期値設定
    }

    // クリーンアップ
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection?.removeEventListener('change', updateConnectionType);
      }
    };
  }, []);

  // 実際のネットワーク接続をテスト
  const testConnection = async (): Promise<boolean> => {
    try {
      const response = await fetch('/', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5秒でタイムアウト
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const status: OnlineStatus = {
    isOnline,
    isOffline: !isOnline,
    lastOnlineTime,
    connectionType
  };

  return {
    ...status,
    testConnection
  };
};