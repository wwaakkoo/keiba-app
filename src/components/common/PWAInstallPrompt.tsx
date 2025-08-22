import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { TouchOptimizedButton } from './TouchOptimizedButton';

interface PWAInstallPromptProps {
  className?: string;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isStandalone, promptInstall, dismissPrompt } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 既に無視されているかチェック
    const dismissedTime = localStorage.getItem('pwa-install-dismissed');
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    if (dismissedTime && parseInt(dismissedTime) > oneDayAgo) {
      setIsDismissed(true);
      return;
    }

    // インストール可能で、まだインストールされておらず、スタンドアロンモードでない場合に表示
    if (isInstallable && !isInstalled && !isStandalone && !isDismissed) {
      // 少し遅延してから表示（ユーザー体験向上のため）
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, isStandalone, isDismissed]);

  const handleInstall = async () => {
    try {
      await promptInstall();
      setIsVisible(false);
    } catch (error) {
      console.error('インストールエラー:', error);
    }
  };

  const handleDismiss = () => {
    dismissPrompt();
    setIsVisible(false);
    setIsDismissed(true);
  };

  // 表示条件を満たさない場合は何も表示しない
  if (!isVisible || isInstalled || isStandalone) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 mx-auto max-w-sm">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              アプリをインストール
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              ホーム画面に追加して、より快適にご利用いただけます
            </p>
            
            <div className="flex space-x-2">
              <TouchOptimizedButton
                size="sm"
                variant="primary"
                onClick={handleInstall}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-1" />
                インストール
              </TouchOptimizedButton>
              
              <TouchOptimizedButton
                size="sm"
                variant="secondary"
                onClick={handleDismiss}
                className="px-3"
              >
                <X className="w-4 h-4" />
              </TouchOptimizedButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// インストール状態を表示するバッジコンポーネント
export const PWAInstallBadge: React.FC = () => {
  const { isInstalled, isStandalone } = usePWAInstall();

  if (!isInstalled && !isStandalone) {
    return null;
  }

  return (
    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
      <Smartphone className="w-3 h-3 mr-1" />
      アプリ版
    </div>
  );
};

// ヘッダー用のインストールボタン
export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isStandalone, promptInstall } = usePWAInstall();

  // インストール可能でない場合は表示しない
  if (!isInstallable || isInstalled || isStandalone) {
    return null;
  }

  return (
    <TouchOptimizedButton
      size="sm"
      variant="secondary"
      onClick={promptInstall}
      className="flex items-center"
    >
      <Download className="w-4 h-4 mr-1" />
      <span className="hidden sm:inline">インストール</span>
    </TouchOptimizedButton>
  );
};