import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { ResponsiveContainer, ResponsiveCard, ResponsiveGrid } from '@/components/common/ResponsiveContainer';
import { HomeHeader } from '@/components/common/MobileHeader';
import { PredictionEngine } from '@/components/prediction/PredictionEngine';
import { EnhancedPredictionEngine } from '@/components/prediction/EnhancedPredictionEngine';

interface HomeScreenProps {
  onCreateRace: () => void;
  onViewStatistics: () => void;
  onViewInvestment?: (predictionId?: string, raceData?: any) => void;
  onViewHistory?: () => void;
  onViewSettings?: () => void;
  predictionHistory: any[];
  accuracyStats: any;
  currentRace?: any;
  onPredictionSave?: (predictionData: any) => Promise<string>;
  onInvestmentSave?: (investment: any) => void;
  onRefreshData?: () => Promise<void>;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onCreateRace,
  onViewStatistics,
  onViewInvestment,
  onViewHistory,
  onViewSettings,
  predictionHistory,
  accuracyStats,
  currentRace,
  onPredictionSave,
  onInvestmentSave,
  onRefreshData
}) => {
  const handleRefresh = async () => {
    if (onRefreshData) {
      try {
        await onRefreshData();
        console.log('データをリフレッシュしました');
      } catch (error) {
        console.error('データリフレッシュエラー:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <HomeHeader 
        rightContent={
          onRefreshData ? (
            <TouchOptimizedButton
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              haptic
            >
              <span className="sr-only">データ更新</span>
            </TouchOptimizedButton>
          ) : undefined
        }
      />
      
      <ResponsiveContainer maxWidth="mobile" padding="md">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-responsive-2xl font-bold text-gray-800 mb-2">
            🏇 競馬予想アプリ
          </h1>
          <p className="text-gray-600">MVP版 - シンプル予想システム</p>
        </div>

        {/* 現在のレース予想エンジン */}
        {currentRace && currentRace.horses && currentRace.horses.length > 0 ? (
          <div className="mb-6">
            <EnhancedPredictionEngine
              race={currentRace}
              onViewInvestment={onViewInvestment}
              onPredictionSave={onPredictionSave}
              onInvestmentSave={onInvestmentSave}
            />
            
            {/* 新しいレース作成ボタン */}
            <div className="mt-4">
              <TouchOptimizedButton
                onClick={onCreateRace}
                variant="secondary"
                size="md"
                fullWidth
                icon={Plus}
              >
                新しいレースを作成
              </TouchOptimizedButton>
            </div>
          </div>
        ) : (
          /* 新規レース作成ボタン */
          <div className="mb-6">
            <TouchOptimizedButton
              onClick={onCreateRace}
              variant="primary"
              size="lg"
              fullWidth
              icon={Plus}
              haptic
            >
              新規レース作成
            </TouchOptimizedButton>
          </div>
        )}

        {/* 統計情報 */}
        {predictionHistory.length > 0 && (
          <ResponsiveCard className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              📊 予想統計
            </h3>
            
            <ResponsiveGrid 
              columns={{ mobile: 2, tablet: 3, desktop: 6 }} 
              gap="sm"
              className="text-center mb-4"
            >
              <div>
                <div className="text-responsive-lg font-bold text-blue-600">
                  {predictionHistory.length}
                </div>
                <div className="text-responsive-xs text-gray-600">総予想回数</div>
              </div>
              
              <div>
                <div className="text-responsive-lg font-bold text-green-600">
                  {accuracyStats?.firstPlaceAccuracy || 0}%
                </div>
                <div className="text-responsive-xs text-gray-600">1着的中率</div>
              </div>
              
              <div>
                <div className="text-responsive-lg font-bold text-purple-600">
                  {accuracyStats?.top3Accuracy || 0}%
                </div>
                <div className="text-responsive-xs text-gray-600">3着以内的中率</div>
              </div>
              
              <div>
                <div className="text-responsive-lg font-bold text-orange-600">
                  {accuracyStats?.completedPredictions || 0}
                </div>
                <div className="text-responsive-xs text-gray-600">結果入力済み</div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                <div className="text-responsive-lg font-bold text-yellow-600">
                  {accuracyStats?.returnRate || 0}%
                </div>
                <div className="text-responsive-xs text-gray-600">💰 回収率</div>
              </div>
              
              <div className={`border rounded-lg p-2 ${
                (accuracyStats?.totalProfit || 0) >= 0 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className={`text-responsive-lg font-bold ${
                  (accuracyStats?.totalProfit || 0) >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {(accuracyStats?.totalProfit || 0) >= 0 ? '+' : ''}{accuracyStats?.totalProfit || 0}円
                </div>
                <div className="text-responsive-xs text-gray-600">📈 収支</div>
              </div>
            </ResponsiveGrid>
            
            {/* 収支詳細 */}
            {accuracyStats?.totalInvestment > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <ResponsiveGrid columns={{ mobile: 1, tablet: 3 }} gap="sm" className="text-center">
                  <div>
                    <span className="font-medium text-responsive-sm">投資額:</span>
                    <span className="ml-1 text-blue-600 text-responsive-sm">
                      {accuracyStats.totalInvestment.toLocaleString()}円
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-responsive-sm">払戻額:</span>
                    <span className="ml-1 text-green-600 text-responsive-sm">
                      {accuracyStats.totalPayout.toLocaleString()}円
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-responsive-sm">回収率:</span>
                    <span className={`ml-1 font-bold text-responsive-sm ${
                      accuracyStats.returnRate >= 100 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {accuracyStats.returnRate}%
                    </span>
                  </div>
                </ResponsiveGrid>
              </div>
            )}
            
            {/* 統計詳細ボタン */}
            <div className="mt-4">
              <TouchOptimizedButton
                onClick={onViewStatistics}
                variant="secondary"
                size="sm"
                fullWidth
              >
                詳細統計を見る
              </TouchOptimizedButton>
            </div>
          </ResponsiveCard>
        )}

        {/* クイックアクション */}
        <ResponsiveGrid columns={{ mobile: 2, tablet: 4 }} gap="md">
          <ResponsiveCard 
            padding="sm" 
            className="text-center hover-lift transition-colors hover:bg-blue-50"
            onClick={() => {
              console.log('📊 統計分析クリック');
              onViewStatistics();
            }}
          >
            <div className="text-2xl mb-2">📊</div>
            <div className="text-responsive-sm font-medium">統計分析</div>
          </ResponsiveCard>
          
          <ResponsiveCard 
            padding="sm" 
            className="text-center hover-lift transition-colors hover:bg-green-50"
            onClick={() => {
              console.log('💰 投資管理クリック');
              onViewInvestment?.();
            }}
          >
            <div className="text-2xl mb-2">💰</div>
            <div className="text-responsive-sm font-medium">投資管理</div>
          </ResponsiveCard>
          
          <ResponsiveCard 
            padding="sm" 
            className="text-center hover-lift transition-colors hover:bg-purple-50"
            onClick={() => {
              console.log('📈 成績履歴クリック');
              onViewHistory?.();
            }}
          >
            <div className="text-2xl mb-2">📈</div>
            <div className="text-responsive-sm font-medium">成績履歴</div>
          </ResponsiveCard>
          
          <ResponsiveCard 
            padding="sm" 
            className="text-center hover-lift transition-colors hover:bg-gray-50"
            onClick={() => {
              console.log('⚙️ 設定クリック');
              onViewSettings?.();
            }}
          >
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-responsive-sm font-medium">設定</div>
          </ResponsiveCard>
        </ResponsiveGrid>
      </ResponsiveContainer>
    </div>
  );
};