import { useState, useEffect } from 'react';
import { backgroundSyncService, type SyncResult } from '@/services/backgroundSync';
import { pushNotificationService, keibaNotificationHelper } from '@/services/pushNotification';

interface PWAFeaturesState {
  // バックグラウンド同期
  syncStatus: {
    pending: number;
    failed: number;
    isProcessing: boolean;
    lastSync: Date | null;
  };
  
  // プッシュ通知
  notificationStatus: {
    permission: NotificationPermission;
    isSubscribed: boolean;
    isSupported: boolean;
  };
  
  // オフライン状態
  isOnline: boolean;
}

interface PWAFeaturesActions {
  // バックグラウンド同期
  addToSyncQueue: (type: string, action: string, data: any) => string;
  processSyncQueue: () => Promise<SyncResult>;
  clearSyncQueue: () => void;
  retryFailedSync: () => void;
  
  // プッシュ通知
  requestNotificationPermission: () => Promise<NotificationPermission>;
  subscribeToNotifications: () => Promise<boolean>;
  unsubscribeFromNotifications: () => Promise<boolean>;
  showNotification: (title: string, body: string, options?: any) => Promise<void>;
  
  // 競馬固有の通知
  scheduleRaceNotification: (raceInfo: any) => Promise<void>;
  notifyPredictionResult: (result: any) => Promise<void>;
  notifyInvestmentWarning: (amount: number, limit: number) => Promise<void>;
}

export const usePWAFeatures = (): PWAFeaturesState & PWAFeaturesActions => {
  const [syncStatus, setSyncStatus] = useState({
    pending: 0,
    failed: 0,
    isProcessing: false,
    lastSync: null as Date | null
  });

  const [notificationStatus, setNotificationStatus] = useState({
    permission: 'default' as NotificationPermission,
    isSubscribed: false,
    isSupported: 'Notification' in window && 'serviceWorker' in navigator
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // オンライン/オフライン状態の監視
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 同期完了イベントの監視
    const handleSyncCompleted = (event: CustomEvent) => {
      const result = event.detail as SyncResult;
      setSyncStatus(prev => ({
        ...prev,
        isProcessing: false,
        lastSync: new Date()
      }));
      
      console.log('PWAFeatures: 同期完了:', result);
    };

    window.addEventListener('sync-completed', handleSyncCompleted as EventListener);

    // 初期状態の設定
    updateSyncStatus();
    updateNotificationStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-completed', handleSyncCompleted as EventListener);
    };
  }, []);

  // 同期状態の更新
  const updateSyncStatus = () => {
    const queueStatus = backgroundSyncService.getQueueStatus();
    setSyncStatus(prev => ({
      ...prev,
      pending: queueStatus.pending,
      failed: queueStatus.failed
    }));
  };

  // 通知状態の更新
  const updateNotificationStatus = async () => {
    if (!notificationStatus.isSupported) return;

    const permission = pushNotificationService.getPermissionStatus();
    const isSubscribed = await pushNotificationService.isSubscribed();

    setNotificationStatus(prev => ({
      ...prev,
      permission,
      isSubscribed
    }));
  };

  // バックグラウンド同期アクション
  const addToSyncQueue = (type: string, action: string, data: any): string => {
    const taskId = backgroundSyncService.addToQueue(type as any, action as any, data);
    updateSyncStatus();
    return taskId;
  };

  const processSyncQueue = async (): Promise<SyncResult> => {
    setSyncStatus(prev => ({ ...prev, isProcessing: true }));
    
    try {
      const result = await backgroundSyncService.processSyncQueue();
      updateSyncStatus();
      return result;
    } catch (error) {
      setSyncStatus(prev => ({ ...prev, isProcessing: false }));
      throw error;
    }
  };

  const clearSyncQueue = (): void => {
    backgroundSyncService.clearQueue();
    updateSyncStatus();
  };

  const retryFailedSync = (): void => {
    backgroundSyncService.retryFailedTasks();
    updateSyncStatus();
  };

  // プッシュ通知アクション
  const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    const permission = await pushNotificationService.requestPermission();
    await updateNotificationStatus();
    return permission;
  };

  const subscribeToNotifications = async (): Promise<boolean> => {
    try {
      const subscription = await pushNotificationService.subscribe();
      await updateNotificationStatus();
      return !!subscription;
    } catch (error) {
      console.error('PWAFeatures: 通知購読エラー:', error);
      return false;
    }
  };

  const unsubscribeFromNotifications = async (): Promise<boolean> => {
    try {
      const success = await pushNotificationService.unsubscribe();
      await updateNotificationStatus();
      return success;
    } catch (error) {
      console.error('PWAFeatures: 通知購読解除エラー:', error);
      return false;
    }
  };

  const showNotification = async (
    title: string, 
    body: string, 
    options?: any
  ): Promise<void> => {
    await pushNotificationService.showNotification({
      title,
      body,
      ...options
    });
  };

  // 競馬固有の通知アクション
  const scheduleRaceNotification = async (raceInfo: any): Promise<void> => {
    await keibaNotificationHelper.notifyRaceStart(raceInfo);
  };

  const notifyPredictionResult = async (result: any): Promise<void> => {
    await keibaNotificationHelper.notifyPredictionResult(result);
  };

  const notifyInvestmentWarning = async (amount: number, limit: number): Promise<void> => {
    await keibaNotificationHelper.notifyInvestmentLimit(amount, limit);
  };

  return {
    // 状態
    syncStatus,
    notificationStatus,
    isOnline,
    
    // バックグラウンド同期アクション
    addToSyncQueue,
    processSyncQueue,
    clearSyncQueue,
    retryFailedSync,
    
    // プッシュ通知アクション
    requestNotificationPermission,
    subscribeToNotifications,
    unsubscribeFromNotifications,
    showNotification,
    
    // 競馬固有の通知アクション
    scheduleRaceNotification,
    notifyPredictionResult,
    notifyInvestmentWarning
  };
};