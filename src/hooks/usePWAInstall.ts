import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  promptInstall: () => Promise<void>;
  dismissPrompt: () => void;
}

export const usePWAInstall = (): PWAInstallState => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // スタンドアロンモードかどうかを判定
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  useEffect(() => {
    // インストール可能イベントのリスナー
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('PWA: インストール可能イベント受信');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // アプリインストール完了イベントのリスナー
    const handleAppInstalled = () => {
      console.log('PWA: アプリインストール完了');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // イベントリスナーを追加
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 既にインストール済みかチェック
    if (isStandalone) {
      setIsInstalled(true);
    }

    // クリーンアップ
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isStandalone]);

  // インストールプロンプトを表示
  const promptInstall = async (): Promise<void> => {
    if (!deferredPrompt) {
      console.warn('PWA: インストールプロンプトが利用できません');
      return;
    }

    try {
      // インストールプロンプトを表示
      await deferredPrompt.prompt();
      
      // ユーザーの選択を待機
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`PWA: ユーザー選択: ${outcome}`);
      
      if (outcome === 'accepted') {
        console.log('PWA: インストールが受け入れられました');
      } else {
        console.log('PWA: インストールが拒否されました');
      }
      
      // プロンプトをクリア
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('PWA: インストールプロンプトエラー:', error);
    }
  };

  // プロンプトを無視
  const dismissPrompt = (): void => {
    setDeferredPrompt(null);
    setIsInstallable(false);
    
    // 一定期間後に再表示しないようにローカルストレージに記録
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  return {
    isInstallable,
    isInstalled,
    isStandalone,
    promptInstall,
    dismissPrompt
  };
};