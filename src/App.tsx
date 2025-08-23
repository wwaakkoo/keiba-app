import { useState, useEffect } from 'react';
import { HomeScreen } from '@/components/screens';
import { RaceCreation } from '@/components/race';
import { StatisticsView } from '@/components/statistics';
import { InvestmentScreen } from '@/components/screens/InvestmentScreen';
import { HistoryScreen } from '@/components/screens/HistoryScreen';
import { SettingsScreen } from '@/components/screens/SettingsScreen';
import { PWAInstallPrompt } from '@/components/common/PWAInstallPrompt';
import { PWAUpdateNotification } from '@/components/common/PWAUpdateNotification';
import { OnboardingScreen } from '@/components/common/OnboardingScreen';
import { useDataManager } from '@/hooks/useDataManager';
import { db } from '@/services/repositories';
import { raceRepository } from '@/services/repositories/RaceRepository';
import { predictionRepository } from '@/services/repositories/PredictionRepository';
import { investmentRepository } from '@/services/repositories/InvestmentRepository';
import { Race, Horse } from '@/types/race';
import { HorseAnalysis } from '@/types/prediction';

type ViewType = 'home' | 'createRace' | 'statistics' | 'investment' | 'history' | 'settings';

interface RaceFormData {
  date: string;
  venue: string;
  raceNumber: number;
  distance: number;
  surface: 'turf' | 'dirt';
  condition: 'good' | 'slightly_heavy' | 'heavy' | 'bad';
  horses: Horse[];
}

interface PredictionData {
  raceId: string;
  raceInfo?: {
    date: string;
    venue: string;
    raceNumber: number;
    distance: number;
    surface: 'turf' | 'dirt';
  };
  predictions: HorseAnalysis[];
}

interface InvestmentData {
  predictionId: string;
  raceId: string;
  betType: 'win' | 'place' | 'exacta' | 'quinella' | 'trifecta' | 'trio' | 'tierce';
  selections: number[];
  amount: number;
  odds: number;
  payout: number;
  profit: number;
  timestamp: Date;
}

// サンプルデータ
const VENUES = [
  '札幌', '函館', '福島', '新潟', '東京', '中山', '中京', '京都', '阪神', '小倉'
];

const SURFACES = [
  { value: 'turf', label: '芝' },
  { value: 'dirt', label: 'ダート' }
];

const CONDITIONS = [
  { value: 'good', label: '良' },
  { value: 'slightly_heavy', label: '稍重' },
  { value: 'heavy', label: '重' },
  { value: 'bad', label: '不良' }
];

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentRace, setCurrentRace] = useState<Race | null>(null);
  const [currentPrediction, setCurrentPrediction] = useState<{
    id: string;
    raceId: string;
    venue?: string;
    raceNumber?: number;
    raceDate?: string;
  } | null>(null);
  
  // データベース初期化とオンボーディングチェック
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        await db.initialize();
        setIsDbInitialized(true);
        console.log('データベースが初期化されました');
        
        // オンボーディング完了チェック
        const hasCompletedOnboarding = localStorage.getItem('onboarding-completed');
        if (!hasCompletedOnboarding) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('データベース初期化エラー:', error);
      }
    };

    initializeDatabase();
  }, []);
  
  // データ管理フックを使用
  const { 
    predictionHistory, 
    loadData,
    calculateAccuracyLegacy,
    calculateTrendData,
    calculatePeriodStats,
    calculateConditionStats,
    calculateDetailedStats,
    isLoading,
    error
  } = useDataManager();

  const handleCreateRace = () => {
    handleNewRace();
  };

  const handleViewStatistics = () => {
    setCurrentView('statistics');
  };

  const handleViewInvestment = (predictionId?: string, raceData?: any) => {
    if (predictionId && raceData) {
      setCurrentPrediction({ id: predictionId, ...raceData });
    }
    setCurrentView('investment');
  };

  const handleViewHistory = () => {
    setCurrentView('history');
  };

  const handleViewSettings = () => {
    setCurrentView('settings');
  };

  const handleBackToHome = async () => {
    setCurrentView('home');
    setCurrentRace(null); // 予想結果状態をクリア
    setCurrentPrediction(null); // 予想状態もクリア
    
    // データを最新状態にリフレッシュ
    try {
      await loadData();
      console.log('ホーム画面に戻る際にデータをリフレッシュしました');
    } catch (error) {
      console.error('データリフレッシュエラー:', error);
    }
  };

  const handleSaveRace = async (raceData: RaceFormData) => {
    console.log('レース保存:', raceData);
    
    try {
      // データベースにレースを保存
      const savedRace = await raceRepository.create({
        ...raceData,
        horses: raceData.horses || []
      });
      
      console.log('レース保存完了（DB）:', savedRace);
      
      // 現在のレースとして設定
      setCurrentRace(savedRace);
      
      // ホーム画面に戻る
      setCurrentView('home');
      
      console.log('レースが作成されました。予想エンジンが利用可能です。');
    } catch (error) {
      console.error('レース保存エラー:', error);
      alert('レースの保存に失敗しました。');
    }
  };

  const handlePredictionSave = async (prediction: PredictionData) => {
    console.log('予想保存:', prediction);
    
    try {
      // 現在のレース情報を取得（currentRaceから）
      const raceInfo = currentRace || {
        venue: prediction.raceInfo?.venue || '東京',
        raceNumber: prediction.raceInfo?.raceNumber || 1,
        distance: prediction.raceInfo?.distance || 1600,
        surface: prediction.raceInfo?.surface || 'turf',
        date: prediction.raceInfo?.date || new Date().toISOString().split('T')[0]
      };
      
      console.log('🔍 予想保存時のレース情報:', raceInfo);
      
      // PredictionResult型に合わせたデータ構造で保存
      const predictionData = {
        raceId: prediction.raceId,
        timestamp: new Date(),
        date: raceInfo.date || new Date().toISOString().split('T')[0],
        race: {
          venue: raceInfo.venue || '東京',
          raceNumber: raceInfo.raceNumber || 1,
          distance: raceInfo.distance || 1600,
          surface: raceInfo.surface || 'turf',
          raceDate: raceInfo.date || new Date().toISOString().split('T')[0]
        },
        predictions: prediction.predictions || [],
        horseCount: prediction.predictions?.length || 0,
        confidenceLevel: null,
        actualResults: null,
        payoutData: null,
        isResultEntered: false
      };

      const predictionId = await predictionRepository.save(predictionData);
      
      // 予想保存後、投資記録画面への遷移を促す
      setCurrentPrediction({
        id: predictionId,
        raceId: prediction.raceId,
        venue: prediction.raceInfo?.venue,
        raceNumber: prediction.raceInfo?.raceNumber,
        raceDate: prediction.raceInfo?.date
      });
      
      console.log('予想保存完了（DB）:', predictionId);
      console.log('予想が保存されました。');
      
      // predictionIdを返す
      return predictionId;
    } catch (error) {
      console.error('予想保存エラー:', error);
      alert('予想の保存に失敗しました。');
      throw error;
    }
  };

  const handleInvestmentSave = async (investment: InvestmentData) => {
    console.log('投資記録保存:', investment);
    
    try {
      const investmentData = {
        ...investment,
        timestamp: new Date()
      };
      const investmentId = await investmentRepository.record(investmentData);
      console.log('投資記録保存完了（DB）:', investmentId);
      console.log('投資記録が保存されました。');
    } catch (error) {
      console.error('投資記録保存エラー:', error);
      alert('投資記録の保存に失敗しました。');
    }
  };

  const handleNewRace = () => {
    // 新しいレースを作成する際は現在のレースをクリア
    setCurrentRace(null);
    setCurrentView('createRace');
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  // 統計データの計算（レガシー版を使用）
  const accuracyStats = calculateAccuracyLegacy();
  const trendData = calculateTrendData(10);
  const periodStats = calculatePeriodStats('all');
  const conditionStats = calculateConditionStats();
  const detailedStats = calculateDetailedStats();

  // データベース初期化中の表示
  if (!isDbInitialized || isLoading) {
    return (
      <div className="min-h-screen-safe bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">データベースを初期化中...</p>
        </div>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="min-h-screen-safe bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return (
          <HomeScreen
            onCreateRace={handleCreateRace}
            onViewStatistics={handleViewStatistics}
            onViewInvestment={handleViewInvestment}
            onViewHistory={handleViewHistory}
            onViewSettings={handleViewSettings}
            predictionHistory={predictionHistory}
            accuracyStats={accuracyStats}
            currentRace={currentRace}
            onPredictionSave={handlePredictionSave}
            onInvestmentSave={handleInvestmentSave}
            onRefreshData={loadData}
          />
        );
      
      case 'createRace':
        return (
          <RaceCreation
            onBack={handleBackToHome}
            onSaveRace={handleSaveRace}
            venues={VENUES}
            surfaces={SURFACES}
            conditions={CONDITIONS}
          />
        );
      
      case 'statistics':
        return (
          <StatisticsView
            onBack={handleBackToHome}
            onNavigateToHome={handleBackToHome}
            predictionHistory={predictionHistory}
            accuracyStats={accuracyStats}
            trendData={trendData}
            periodStats={periodStats}
            conditionStats={conditionStats}
            detailedStats={detailedStats}
          />
        );
      
      case 'investment':
        return (
          <InvestmentScreen
            onBack={handleBackToHome}
            onNavigateToHome={handleBackToHome}
            raceId={currentPrediction?.raceId}
            predictionId={currentPrediction?.id}
            venue={currentPrediction?.venue}
            raceNumber={currentPrediction?.raceNumber}
            raceDate={currentPrediction?.raceDate}
          />
        );
      
      case 'history':
        return (
          <HistoryScreen
            onBack={handleBackToHome}
            onNavigateToHome={handleBackToHome}
          />
        );
      
      case 'settings':
        return (
          <SettingsScreen
            onBack={handleBackToHome}
          />
        );
      
      default:
        return null;
    }
  };

  // オンボーディング表示
  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen-safe bg-gray-50">
      {/* PWA更新通知 */}
      <PWAUpdateNotification />
      
      {/* メインコンテンツ */}
      {renderCurrentView()}
      
      {/* PWAインストールプロンプト */}
      <PWAInstallPrompt />
    </div>
  );
}

export default App;