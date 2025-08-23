import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Zap, Wifi, Shield, Star } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { TouchOptimizedButton } from './TouchOptimizedButton';

interface CustomInstallPromptProps {
  className?: string;
  variant?: 'banner' | 'modal' | 'card';
  showFeatures?: boolean;
}

export const CustomInstallPrompt: React.FC<CustomInstallPromptProps> = ({ 
  className = '',
  variant = 'banner',
  showFeatures = true
}) => {
  const { isInstallable, isInstalled, isStandalone, promptInstall, dismissPrompt } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // 既に無視されているかチェック
    const dismissedTime = localStorage.getItem('custom-install-dismissed');
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
    
    if (dismissedTime && parseInt(dismissedTime) > threeDaysAgo) {
      setIsDismissed(true);
      return;
    }

    // インストール可能で、まだインストールされておらず、スタンドアロンモードでない場合に表示
    if (isInstallable && !isInstalled && !isStandalone && !isDismissed) {
      // ユーザーがアプリを少し使ってから表示（UX向上のため）
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 10000); // 10秒後

      return () => {
        clearTimeout(timer);
      };
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
    localStorage.setItem('custom-install-dismissed', Date.now().toString());
  };

  const handleShowDetails = () => {
    setShowDetails(true);
  };

  // 表示条件を満たさない場合は何も表示しない
  if (!isVisible || isInstalled || isStandalone) {
    return null;
  }

  // アプリの特徴リスト
  const features = [
    {
      icon: <Zap className="w-5 h-5 text-yellow-500" />,
      title: '高速アクセス',
      description: 'ホーム画面から瞬時に起動'
    },
    {
      icon: <Wifi className="w-5 h-5 text-blue-500" />,
      title: 'オフライン対応',
      description: 'ネット環境がなくても基本機能を利用'
    },
    {
      icon: <Shield className="w-5 h-5 text-green-500" />,
      title: 'データ保護',
      description: 'ローカルに安全にデータを保存'
    },
    {
      icon: <Star className="w-5 h-5 text-purple-500" />,
      title: 'ネイティブ体験',
      description: 'アプリのような快適な操作感'
    }
  ];

  // バナー形式
  if (variant === 'banner') {
    return (
      <div className={`fixed bottom-0 left-0 right-0 z-50 ${className}`}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-lg">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <div className="flex items-center space-x-3">
              <Smartphone className="w-6 h-6" />
              <div>
                <h3 className="font-medium text-sm">アプリをインストール</h3>
                <p className="text-xs text-blue-100">より快適にご利用いただけます</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <TouchOptimizedButton
                size="sm"
                variant="secondary"
                onClick={handleInstall}
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                <Download className="w-4 h-4 mr-1" />
                インストール
              </TouchOptimizedButton>
              
              <TouchOptimizedButton
                size="sm"
                variant="secondary"
                onClick={handleDismiss}
                className="bg-blue-500 text-white hover:bg-blue-400 px-2"
              >
                <X className="w-4 h-4" />
              </TouchOptimizedButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // モーダル形式
  if (variant === 'modal') {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${className}`}>
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleDismiss} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-blue-600" />
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              競馬予想アプリをインストール
            </h2>
            <p className="text-gray-600 text-sm">
              ホーム画面に追加して、いつでも素早くアクセスできます
            </p>
          </div>

          {showFeatures && (
            <div className="space-y-3 mb-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-900">{feature.title}</h4>
                    <p className="text-xs text-gray-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex space-x-3">
            <TouchOptimizedButton
              size="md"
              variant="primary"
              onClick={handleInstall}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              インストール
            </TouchOptimizedButton>
            
            <TouchOptimizedButton
              size="md"
              variant="secondary"
              onClick={handleDismiss}
              className="px-4"
            >
              後で
            </TouchOptimizedButton>
          </div>
        </div>
      </div>
    );
  }

  // カード形式
  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            アプリをインストール
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            ホーム画面に追加して、より快適にご利用いただけます
          </p>
          
          {!showDetails && showFeatures && (
            <button
              onClick={handleShowDetails}
              className="text-sm text-blue-600 hover:text-blue-700 mb-4"
            >
              詳細を見る →
            </button>
          )}
          
          {showDetails && showFeatures && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  {feature.icon}
                  <span className="text-xs text-gray-700">{feature.title}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex space-x-3">
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
            >
              後で
            </TouchOptimizedButton>
          </div>
        </div>
      </div>
    </div>
  );
};

// インストール手順ガイドコンポーネント
export const InstallGuide: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    {
      title: 'ブラウザメニューを開く',
      description: 'ブラウザの右上にある「⋮」または「...」をタップ',
      image: '/images/install-step1.png'
    },
    {
      title: 'ホーム画面に追加を選択',
      description: '「ホーム画面に追加」または「アプリをインストール」を選択',
      image: '/images/install-step2.png'
    },
    {
      title: 'インストール完了',
      description: 'ホーム画面にアプリアイコンが追加されます',
      image: '/images/install-step3.png'
    }
  ];

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-lg font-bold text-center mb-6">インストール手順</h2>
      
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border-2 transition-colors ${
              index === currentStep
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                index === currentStep
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {index + 1}
              </div>
              
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-between mt-6">
        <TouchOptimizedButton
          size="sm"
          variant="secondary"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          前へ
        </TouchOptimizedButton>
        
        <TouchOptimizedButton
          size="sm"
          variant="primary"
          onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
          disabled={currentStep === steps.length - 1}
        >
          次へ
        </TouchOptimizedButton>
      </div>
    </div>
  );
};