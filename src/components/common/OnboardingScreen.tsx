import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Smartphone, 
  TrendingUp, 
  PieChart, 
  Wifi,
  Bell,
  Shield,
  Zap
} from 'lucide-react';
import { TouchOptimizedButton } from './TouchOptimizedButton';
import { usePWAFeatures } from '@/hooks/usePWAFeatures';

interface OnboardingScreenProps {
  onComplete: () => void;
  className?: string;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  action?: {
    label: string;
    handler: () => Promise<void>;
  };
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ 
  onComplete, 
  className = '' 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  
  const { 
    requestNotificationPermission, 
    subscribeToNotifications,
    notificationStatus 
  } = usePWAFeatures();

  // オンボーディングステップの定義
  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'ようこそ！',
      description: '競馬予想アプリへようこそ。アプリの主な機能をご紹介します。',
      icon: <Smartphone className="w-8 h-8 text-blue-600" />,
      content: (
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <Smartphone className="w-12 h-12 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              競馬予想＋投資管理アプリ
            </h3>
            <p className="text-gray-600">
              データに基づいた予想と投資管理で、より戦略的な競馬を楽しめます
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'prediction',
      title: '予想機能',
      description: 'スピード指数や過去成績を分析して、精度の高い予想を生成します。',
      icon: <TrendingUp className="w-8 h-8 text-green-600" />,
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <TrendingUp className="w-6 h-6 text-green-600" />
              <h4 className="font-medium text-gray-900">高精度な予想アルゴリズム</h4>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>スピード指数による分析</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>直近成績の重み付け評価</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>オッズ変動の考慮</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'investment',
      title: '投資管理',
      description: '馬券購入履歴と収支を詳細に管理し、投資パフォーマンスを向上させます。',
      icon: <PieChart className="w-8 h-8 text-purple-600" />,
      content: (
        <div className="space-y-4">
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <PieChart className="w-6 h-6 text-purple-600" />
              <h4 className="font-medium text-gray-900">包括的な投資分析</h4>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-purple-500" />
                <span>詳細な収支レポート</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-purple-500" />
                <span>ROI（投資収益率）の計算</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-purple-500" />
                <span>投資上限の設定と警告</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'offline',
      title: 'オフライン対応',
      description: 'ネット環境がない競馬場でも、基本機能をご利用いただけます。',
      icon: <Wifi className="w-8 h-8 text-orange-600" />,
      content: (
        <div className="space-y-4">
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Wifi className="w-6 h-6 text-orange-600" />
              <h4 className="font-medium text-gray-900">どこでも使える安心設計</h4>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-orange-500" />
                <span>オフラインでの予想作成</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-orange-500" />
                <span>データの自動同期</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-orange-500" />
                <span>高速な起動とレスポンス</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'notifications',
      title: '通知設定',
      description: 'レース開始や重要な情報を通知でお知らせします。',
      icon: <Bell className="w-8 h-8 text-red-600" />,
      content: (
        <div className="space-y-4">
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Bell className="w-6 h-6 text-red-600" />
              <h4 className="font-medium text-gray-900">タイムリーな情報をお届け</h4>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-red-500" />
                <span>レース開始前の通知</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-red-500" />
                <span>予想結果の通知</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-red-500" />
                <span>投資上限の警告</span>
              </li>
            </ul>
          </div>
          
          {notificationStatus.isSupported && notificationStatus.permission !== 'granted' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800 mb-2">
                通知を受け取るには許可が必要です
              </p>
            </div>
          )}
        </div>
      ),
      action: notificationStatus.isSupported && notificationStatus.permission !== 'granted' ? {
        label: '通知を許可',
        handler: async () => {
          await requestNotificationPermission();
          if (notificationStatus.permission === 'granted') {
            await subscribeToNotifications();
          }
        }
      } : undefined
    },
    {
      id: 'complete',
      title: '設定完了',
      description: 'すべての設定が完了しました。競馬予想を始めましょう！',
      icon: <Zap className="w-8 h-8 text-yellow-600" />,
      content: (
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <Zap className="w-12 h-12 text-yellow-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              準備完了！
            </h3>
            <p className="text-gray-600">
              これで競馬予想アプリをフル活用できます。素晴らしい予想ライフをお楽しみください！
            </p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 text-green-700">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">データは安全にローカルに保存されます</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // オンボーディング完了状態をチェック
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('onboarding-completed');
    if (hasCompletedOnboarding) {
      onComplete();
    }
  }, [onComplete]);

  const handleNext = async () => {
    // アクションがある場合は実行
    if (currentStepData.action && !completedSteps.has(currentStepData.id)) {
      setIsActionInProgress(true);
      try {
        await currentStepData.action.handler();
        setCompletedSteps(prev => new Set([...prev, currentStepData.id]));
      } catch (error) {
        console.error('オンボーディングアクションエラー:', error);
      } finally {
        setIsActionInProgress(false);
      }
    }

    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding-completed', 'true');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding-completed', 'true');
    onComplete();
  };

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${className}`}>
      {/* ヘッダー */}
      <div className="bg-white shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {currentStepData.icon}
            <h1 className="text-lg font-bold text-gray-900">
              {currentStepData.title}
            </h1>
          </div>
          
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            スキップ
          </button>
        </div>
        
        {/* プログレスバー */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>ステップ {currentStep + 1} / {steps.length}</span>
            <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="mb-6">
            <p className="text-gray-600 text-center">
              {currentStepData.description}
            </p>
          </div>
          
          <div className="mb-8">
            {currentStepData.content}
          </div>
        </div>
      </div>

      {/* フッター */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <TouchOptimizedButton
            size="md"
            variant="secondary"
            onClick={handlePrevious}
            disabled={isFirstStep}
            className="flex items-center"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            戻る
          </TouchOptimizedButton>
          
          <div className="flex space-x-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep
                    ? 'bg-blue-600'
                    : index < currentStep
                    ? 'bg-blue-300'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          <TouchOptimizedButton
            size="md"
            variant="primary"
            onClick={handleNext}
            disabled={isActionInProgress}
            className="flex items-center"
          >
            {isActionInProgress ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                処理中...
              </>
            ) : isLastStep ? (
              '完了'
            ) : currentStepData.action && !completedSteps.has(currentStepData.id) ? (
              currentStepData.action.label
            ) : (
              <>
                次へ
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </TouchOptimizedButton>
        </div>
      </div>
    </div>
  );
};