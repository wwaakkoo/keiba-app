import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, DollarSign, AlertTriangle, ArrowLeft } from 'lucide-react';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { ResponsiveContainer, ResponsiveCard, ResponsiveGrid, FlexLayout } from '@/components/common/ResponsiveContainer';
import { BackHeaderWithHome } from '@/components/common/MobileHeader';
import { InvestmentManager } from '@/components/investment/InvestmentManager';
import { InvestmentList } from '@/components/investment/InvestmentList';
import { PredictionSelector } from '@/components/investment/PredictionSelector';
import { PredictionResult } from '@/types/prediction';
import { Investment, InvestmentStats } from '@/types/investment';
import { investmentRepository } from '@/services/repositories/InvestmentRepository';

interface InvestmentScreenProps {
  onBack: () => void;
  onNavigateToHome?: () => void;
  raceId?: string;
  predictionId?: string;
  venue?: string;
  raceNumber?: number;
  raceDate?: string;
}

export const InvestmentScreen: React.FC<InvestmentScreenProps> = ({
  onBack,
  onNavigateToHome = () => {}
  // raceId,
  // predictionId,
  // venue,
  // raceNumber,
  // raceDate
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'add' | 'history' | 'settings'>('overview');
  const [viewMode, setViewMode] = useState<'tab' | 'prediction_select' | 'add_investment'>('tab');
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionResult | null>(null);
  
  // データ状態の追加
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [stats, setStats] = useState<InvestmentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // データ読み込み処理
  useEffect(() => {
    loadInvestmentData();
  }, []);

  // タブが切り替わった時にデータをリフレッシュ
  useEffect(() => {
    if (viewMode === 'tab') {
      loadInvestmentData();
    }
  }, [viewMode, activeTab]);

  const loadInvestmentData = async () => {
    try {
      setIsLoading(true);
      
      // 最近の投資記録を取得
      const recentInvestments = await investmentRepository.getRecentInvestments(20);
      setInvestments(recentInvestments);

      // 統計データを取得
      const statsData = await investmentRepository.calculateStats();
      setStats(statsData);
    } catch (error) {
      console.error('投資データ読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        if (isLoading) {
          return (
            <ResponsiveCard className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">読み込み中...</p>
            </ResponsiveCard>
          );
        }

        return (
          <div className="space-y-6">
            {/* 投資サマリー */}
            <ResponsiveCard>
              <h3 className="text-responsive-lg font-bold mb-4 flex items-center gap-2">
                <DollarSign className="text-green-600" size={20} />
                投資サマリー
              </h3>
              
              <ResponsiveGrid columns={{ mobile: 2, tablet: 4 }} gap="md" className="mb-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats ? formatCurrency(stats.totalInvestment) : '¥0'}
                  </div>
                  <div className="text-sm text-gray-600">総投資額</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {stats ? formatCurrency(stats.totalPayout) : '¥0'}
                  </div>
                  <div className="text-sm text-gray-600">総払戻額</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {stats ? formatPercentage(stats.returnRate) : '0%'}
                  </div>
                  <div className="text-sm text-gray-600">回収率</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats ? stats.totalBets : 0}
                  </div>
                  <div className="text-sm text-gray-600">投資回数</div>
                </div>
              </ResponsiveGrid>

              {/* 損益表示 */}
              {stats && stats.totalBets > 0 && (
                <div className="mb-4">
                  <div className={`text-center p-3 rounded-lg ${
                    stats.totalProfit >= 0 ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <div className={`text-2xl font-bold ${
                      stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stats.totalProfit >= 0 ? '+' : ''}{formatCurrency(stats.totalProfit)}
                    </div>
                    <div className="text-sm text-gray-600">総損益</div>
                  </div>
                </div>
              )}
              
              {(!stats || stats.totalBets === 0) && (
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-gray-600">投資記録がありません</p>
                  <p className="text-sm text-gray-500 mt-1">馬券を購入したら記録を追加しましょう</p>
                </div>
              )}
            </ResponsiveCard>

            {/* クイックアクション */}
            <ResponsiveGrid columns={{ mobile: 2 }} gap="md">
              <TouchOptimizedButton
                onClick={() => setViewMode('prediction_select')}
                variant="primary"
                icon={Plus}
                fullWidth
              >
                投資記録を追加
              </TouchOptimizedButton>
              
              <TouchOptimizedButton
                onClick={() => setActiveTab('history')}
                variant="secondary"
                icon={TrendingUp}
                fullWidth
              >
                履歴を見る
              </TouchOptimizedButton>
            </ResponsiveGrid>
          </div>
        );
        
      case 'add':
        if (selectedPrediction) {
          return (
            <ResponsiveCard>
              <h3 className="text-responsive-lg font-bold mb-4">新規投資記録</h3>
              <InvestmentManager 
                raceId={selectedPrediction.raceId}
                predictionId={selectedPrediction.id}
                venue={selectedPrediction.race.venue}
                raceNumber={selectedPrediction.race.raceNumber}
                raceDate={selectedPrediction.race.raceDate}
                initialViewMode="add"
              />
            </ResponsiveCard>
          );
        }
        return (
          <ResponsiveCard className="p-6 text-center">
            <div className="text-gray-500">
              <p>予想を選択してから投資記録を作成してください</p>
              <TouchOptimizedButton
                onClick={() => setViewMode('prediction_select')}
                variant="primary"
                className="mt-4"
                icon={Plus}
              >
                予想を選択
              </TouchOptimizedButton>
            </div>
          </ResponsiveCard>
        );
        
      case 'history':
        if (isLoading) {
          return (
            <ResponsiveCard className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">読み込み中...</p>
            </ResponsiveCard>
          );
        }

        if (investments.length === 0) {
          return (
            <ResponsiveCard>
              <h3 className="text-responsive-lg font-bold mb-4">投資履歴</h3>
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="mx-auto mb-2" size={32} />
                <p>投資履歴がありません</p>
                <p className="text-sm mt-1">投資記録を追加すると、ここに履歴が表示されます</p>
              </div>
            </ResponsiveCard>
          );
        }

        return (
          <ResponsiveCard>
            <InvestmentList
              investments={investments}
              onBack={() => {}} // 履歴内では戻るボタンは不要
              onRefresh={loadInvestmentData}
            />
          </ResponsiveCard>
        );
        
      case 'settings':
        return (
          <ResponsiveCard>
            <h3 className="text-responsive-lg font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="text-yellow-600" size={20} />
              投資設定
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  日次投資上限
                </label>
                <input
                  type="number"
                  placeholder="10000"
                  className="w-full min-h-touch px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  月次投資上限
                </label>
                <input
                  type="number"
                  placeholder="100000"
                  className="w-full min-h-touch px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <TouchOptimizedButton
                onClick={async () => {
                  try {
                    // 設定保存の実装
                    alert('設定を保存しました（実装予定）');
                  } catch (error) {
                    console.error('設定保存エラー:', error);
                    alert('設定の保存に失敗しました');
                  }
                }}
                variant="primary"
                fullWidth
              >
                設定を保存
              </TouchOptimizedButton>
            </div>
          </ResponsiveCard>
        );
        
      default:
        return null;
    }
  };

  // 予想選択モード
  if (viewMode === 'prediction_select') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <FlexLayout direction="row" align="center" gap="md">
            <TouchOptimizedButton
              onClick={() => setViewMode('tab')}
              variant="ghost"
              size="sm"
              icon={ArrowLeft}
            >
              <span className="sr-only">戻る</span>
            </TouchOptimizedButton>
            <h1 className="text-responsive-lg font-bold">🎯 予想選択</h1>
          </FlexLayout>
        </div>

        <ResponsiveContainer maxWidth="mobile" padding="md">
          <PredictionSelector
            onSelectPrediction={(prediction) => {
              setSelectedPrediction(prediction);
              setActiveTab('add');
              setViewMode('tab');
            }}
            onCreateNewPrediction={() => {
              if (onNavigateToHome) {
                onNavigateToHome();
              }
            }}
            onCancel={() => setViewMode('tab')}
          />
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <BackHeaderWithHome
        title="💰 投資管理"
        onBack={onBack}
        onHome={onNavigateToHome}
      />

      {/* タブナビゲーション */}
      <div className="bg-white border-b border-gray-200 px-4">
        <div className="flex space-x-1">
          {[
            { key: 'overview', label: '概要', icon: '📊' },
            { key: 'add', label: '追加', icon: '➕' },
            { key: 'history', label: '履歴', icon: '📈' },
            { key: 'settings', label: '設定', icon: '⚙️' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-3 px-2 text-center text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div>{tab.icon}</div>
              <div className="mt-1">{tab.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* コンテンツ */}
      <ResponsiveContainer maxWidth="mobile" padding="md">
        {renderTabContent()}
      </ResponsiveContainer>
    </div>
  );
};