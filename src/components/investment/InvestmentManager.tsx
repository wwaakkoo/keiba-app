import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, Plus, History } from 'lucide-react';
import { Investment, InvestmentStats } from '@/types/investment';
import { investmentRepository } from '@/services/repositories/InvestmentRepository';
import { BetRecordForm } from './BetRecordForm';
import { InvestmentList } from './InvestmentList';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';

interface InvestmentManagerProps {
  raceId: string;
  predictionId: string;
  venue?: string;
  raceNumber?: number;
  raceDate?: string;
  initialViewMode?: ViewMode;
}

type ViewMode = 'overview' | 'add' | 'list';

export const InvestmentManager: React.FC<InvestmentManagerProps> = ({
  raceId,
  predictionId,
  venue,
  raceNumber,
  raceDate,
  initialViewMode = 'overview'
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [stats, setStats] = useState<InvestmentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // データ読み込み
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // 最近の投資記録を取得
      const recentInvestments = await investmentRepository.getRecentInvestments(20);
      setInvestments(recentInvestments);

      // 統計データを取得
      const statsData = await investmentRepository.calculateStats();
      setStats(statsData);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddInvestment = async (investmentData: Omit<Investment, 'id' | 'timestamp'>) => {
    try {
      setIsSubmitting(true);
      // timestampを追加してからrecordに渡す
      const completeInvestmentData = {
        ...investmentData,
        timestamp: new Date()
      };
      
      await investmentRepository.record(completeInvestmentData);
      
      // データを再読み込み
      await loadData();
      
      // 概要画面に戻る
      setViewMode('overview');
    } catch (error) {
      console.error('投資記録エラー:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">読み込み中...</span>
      </div>
    );
  }

  // 投資記録フォーム表示
  if (viewMode === 'add') {
    return (
      <BetRecordForm
        raceId={raceId}
        predictionId={predictionId}
        venue={venue}
        raceNumber={raceNumber}
        raceDate={raceDate}
        onSubmit={handleAddInvestment}
        onCancel={() => setViewMode('overview')}
        isSubmitting={isSubmitting}
      />
    );
  }

  // 投資履歴リスト表示
  if (viewMode === 'list') {
    return (
      <InvestmentList
        investments={investments}
        onBack={() => setViewMode('overview')}
        onRefresh={loadData}
      />
    );
  }

  // 概要画面
  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <DollarSign className="w-5 h-5 mr-2" />
          投資管理
        </h2>
        <div className="flex space-x-2">
          <TouchOptimizedButton
            variant="secondary"
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <History className="w-4 h-4 mr-1" />
            履歴
          </TouchOptimizedButton>
          <TouchOptimizedButton
            variant="primary"
            size="sm"
            onClick={() => setViewMode('add')}
          >
            <Plus className="w-4 h-4 mr-1" />
            記録
          </TouchOptimizedButton>
        </div>
      </div>

      {/* 統計サマリー */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          {/* 総投資額 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">総投資額</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(stats.totalInvestment)}
                </p>
              </div>
            </div>
          </div>

          {/* 総損益 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${stats.totalProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {stats.totalProfit >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">総損益</p>
                <p className={`text-lg font-semibold ${stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.totalProfit >= 0 ? '+' : ''}{formatCurrency(stats.totalProfit)}
                </p>
              </div>
            </div>
          </div>

          {/* 回収率 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${stats.returnRate >= 100 ? 'bg-green-100' : 'bg-orange-100'}`}>
                <Target className={`w-5 h-5 ${stats.returnRate >= 100 ? 'text-green-600' : 'text-orange-600'}`} />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">回収率</p>
                <p className={`text-lg font-semibold ${stats.returnRate >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                  {formatPercentage(stats.returnRate)}
                </p>
              </div>
            </div>
          </div>

          {/* 的中率 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">的中率</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatPercentage(stats.winRate)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 詳細統計 */}
      {stats && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">詳細統計</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">総賭け数:</span>
                <span className="font-medium">{stats.totalBets}回</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">的中数:</span>
                <span className="font-medium text-green-600">{stats.winningBets}回</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">外れ数:</span>
                <span className="font-medium text-red-600">{stats.losingBets}回</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">平均オッズ:</span>
                <span className="font-medium">{stats.averageOdds.toFixed(1)}倍</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">最大勝利:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(stats.bestWin)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">最大損失:</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(Math.abs(stats.worstLoss))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 最近の投資記録 */}
      {investments.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">最近の記録</h3>
            <TouchOptimizedButton
              variant="secondary"
              size="sm"
              onClick={() => setViewMode('list')}
            >
              すべて見る
            </TouchOptimizedButton>
          </div>
          <div className="space-y-3">
            {investments.slice(0, 5).map((investment) => (
              <div key={investment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      {investment.betType === 'win' ? '単勝' :
                       investment.betType === 'place' ? '複勝' :
                       investment.betType === 'exacta' ? '馬連' :
                       investment.betType === 'quinella' ? '馬単' :
                       investment.betType === 'trio' ? '3連複' :
                       investment.betType === 'trifecta' ? '3連単' : 'ワイド'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {investment.selections.join('-')}番
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {investment.venue} {investment.raceNumber}R • {formatCurrency(investment.amount)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${investment.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {investment.profit >= 0 ? '+' : ''}{formatCurrency(investment.profit)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {investment.odds.toFixed(1)}倍
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 投資記録がない場合 */}
      {investments.length === 0 && (
        <div className="text-center py-8">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">投資記録がありません</h3>
          <p className="text-gray-600 mb-4">
            馬券購入記録を追加して投資成績を管理しましょう
          </p>
          <TouchOptimizedButton
            variant="primary"
            onClick={() => setViewMode('add')}
          >
            <Plus className="w-4 h-4 mr-2" />
            最初の記録を追加
          </TouchOptimizedButton>
        </div>
      )}
    </div>
  );
};