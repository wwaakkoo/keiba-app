import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, BarChart3, Activity } from 'lucide-react';
import { ResponsiveCard, FlexLayout, ResponsiveGrid } from '@/components/common/ResponsiveContainer';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { 
  calculatePredictionPerformanceSummary, 
  analyzePredictionAccuracyCorrelation,
  PredictionPerformanceSummary,
  PredictionInvestmentStats
} from '@/services/predictionInvestmentService';

interface PredictionInvestmentAnalysisProps {
  className?: string;
}

export const PredictionInvestmentAnalysis: React.FC<PredictionInvestmentAnalysisProps> = ({
  className = ''
}) => {
  const [summary, setSummary] = useState<PredictionPerformanceSummary | null>(null);
  const [correlation, setCorrelation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'summary' | 'details' | 'correlation'>('summary');

  useEffect(() => {
    loadAnalysisData();
  }, []);

  const loadAnalysisData = async () => {
    try {
      setIsLoading(true);
      const [summaryData, correlationData] = await Promise.all([
        calculatePredictionPerformanceSummary(),
        analyzePredictionAccuracyCorrelation()
      ]);
      setSummary(summaryData);
      setCorrelation(correlationData);
    } catch (error) {
      console.error('予想投資分析データ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getPerformanceColor = (value: number, threshold: number = 100) => {
    if (value >= threshold) return 'text-green-600';
    if (value >= threshold * 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCorrelationDescription = (strength: string) => {
    switch (strength) {
      case 'strong': return '予想精度と回収率に強い相関あり';
      case 'moderate': return '予想精度と回収率に中程度の相関あり';
      case 'weak': return '予想精度と回収率に弱い相関あり';
      default: return '予想精度と回収率に相関なし';
    }
  };

  if (isLoading) {
    return (
      <ResponsiveCard className={`p-6 text-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">予想投資分析を読み込み中...</p>
      </ResponsiveCard>
    );
  }

  if (!summary) {
    return (
      <ResponsiveCard className={`p-6 text-center ${className}`}>
        <DollarSign className="mx-auto mb-4 text-gray-400" size={48} />
        <h3 className="text-responsive-lg font-medium text-gray-600 mb-2">
          予想投資分析
        </h3>
        <p className="text-responsive-sm text-gray-500">
          予想と投資記録を作成すると、ここに分析結果が表示されます
        </p>
      </ResponsiveCard>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ナビゲーションタブ */}
      <ResponsiveCard className="p-4">
        <FlexLayout direction="row" gap="sm" wrap>
          <TouchOptimizedButton
            onClick={() => setSelectedView('summary')}
            variant={selectedView === 'summary' ? 'primary' : 'ghost'}
            size="sm"
            icon={BarChart3}
          >
            サマリー
          </TouchOptimizedButton>
          <TouchOptimizedButton
            onClick={() => setSelectedView('details')}
            variant={selectedView === 'details' ? 'primary' : 'ghost'}
            size="sm"
            icon={Target}
          >
            詳細
          </TouchOptimizedButton>
          <TouchOptimizedButton
            onClick={() => setSelectedView('correlation')}
            variant={selectedView === 'correlation' ? 'primary' : 'ghost'}
            size="sm"
            icon={Activity}
          >
            相関分析
          </TouchOptimizedButton>
        </FlexLayout>
      </ResponsiveCard>

      {/* サマリー表示 */}
      {selectedView === 'summary' && (
        <ResponsiveCard className="p-4">
          <h3 className="text-responsive-lg font-bold mb-4 flex items-center gap-2">
            <DollarSign className="text-blue-600" size={20} />
            予想投資パフォーマンス
          </h3>

          <ResponsiveGrid columns={{ mobile: 2, tablet: 3, desktop: 4 }} gap="md" className="mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-responsive-lg font-bold text-blue-600">
                {summary.totalPredictions}
              </div>
              <div className="text-responsive-sm text-gray-600">総予想数</div>
            </div>

            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-responsive-lg font-bold text-green-600">
                {formatCurrency(summary.totalInvestmentAmount)}
              </div>
              <div className="text-responsive-sm text-gray-600">総投資額</div>
            </div>

            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className={`text-responsive-lg font-bold ${getPerformanceColor(summary.overallReturnRate)}`}>
                {formatPercentage(summary.overallReturnRate)}
              </div>
              <div className="text-responsive-sm text-gray-600">総合回収率</div>
            </div>

            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className={`text-responsive-lg font-bold ${
                summary.totalProfitAmount >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {summary.totalProfitAmount >= 0 ? '+' : ''}{formatCurrency(summary.totalProfitAmount)}
              </div>
              <div className="text-responsive-sm text-gray-600">総収支</div>
            </div>
          </ResponsiveGrid>

          {/* 最高・最低パフォーマンス */}
          {summary.bestPerformingPrediction && summary.worstPerformingPrediction && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-800">パフォーマンス詳細</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 最高パフォーマンス */}
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="text-green-600" size={16} />
                    <span className="font-medium text-green-800">最高パフォーマンス</span>
                  </div>
                  <div className="text-sm text-green-700">
                    <div>回収率: {formatPercentage(summary.bestPerformingPrediction.returnRate)}</div>
                    <div>投資額: {formatCurrency(summary.bestPerformingPrediction.totalInvestment)}</div>
                    <div>利益: {formatCurrency(summary.bestPerformingPrediction.totalProfit)}</div>
                  </div>
                </div>

                {/* 最低パフォーマンス */}
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="text-red-600" size={16} />
                    <span className="font-medium text-red-800">最低パフォーマンス</span>
                  </div>
                  <div className="text-sm text-red-700">
                    <div>回収率: {formatPercentage(summary.worstPerformingPrediction.returnRate)}</div>
                    <div>投資額: {formatCurrency(summary.worstPerformingPrediction.totalInvestment)}</div>
                    <div>損失: {formatCurrency(summary.worstPerformingPrediction.totalProfit)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ResponsiveCard>
      )}

      {/* 詳細表示 */}
      {selectedView === 'details' && (
        <div className="space-y-4">
          {summary.predictionStats
            .filter(stats => stats.betCount > 0)
            .sort((a, b) => b.returnRate - a.returnRate)
            .map((stats) => (
              <PredictionDetailCard key={stats.predictionId} stats={stats} />
            ))}
          
          {summary.predictionStats.filter(stats => stats.betCount > 0).length === 0 && (
            <ResponsiveCard className="p-6 text-center">
              <Target className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-600">投資記録がある予想がありません</p>
            </ResponsiveCard>
          )}
        </div>
      )}

      {/* 相関分析表示 */}
      {selectedView === 'correlation' && correlation && (
        <ResponsiveCard className="p-4">
          <h3 className="text-responsive-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="text-purple-600" size={20} />
            予想精度と投資パフォーマンスの相関
          </h3>

          <div className="mb-6 p-4 bg-purple-50 rounded-lg">
            <div className="text-center">
              <div className="text-responsive-lg font-bold text-purple-600 mb-2">
                {correlation.correlationStrength.toUpperCase()}
              </div>
              <div className="text-responsive-sm text-purple-700">
                {getCorrelationDescription(correlation.correlationStrength)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-center">
                <div className="text-responsive-lg font-bold text-green-600">
                  {correlation.highAccuracyHighReturn}
                </div>
                <div className="text-responsive-xs text-green-700">
                  高精度・高回収
                </div>
              </div>
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-center">
                <div className="text-responsive-lg font-bold text-yellow-600">
                  {correlation.highAccuracyLowReturn}
                </div>
                <div className="text-responsive-xs text-yellow-700">
                  高精度・低回収
                </div>
              </div>
            </div>

            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="text-center">
                <div className="text-responsive-lg font-bold text-orange-600">
                  {correlation.lowAccuracyHighReturn}
                </div>
                <div className="text-responsive-xs text-orange-700">
                  低精度・高回収
                </div>
              </div>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-center">
                <div className="text-responsive-lg font-bold text-red-600">
                  {correlation.lowAccuracyLowReturn}
                </div>
                <div className="text-responsive-xs text-red-700">
                  低精度・低回収
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>分析結果:</strong> 予想精度と投資回収率の相関は{correlation.correlationStrength === 'strong' ? '強く' : correlation.correlationStrength === 'moderate' ? '中程度で' : correlation.correlationStrength === 'weak' ? '弱く' : 'なく'}、
              {correlation.correlationStrength !== 'none' ? '予想の質が投資パフォーマンスに影響を与えています。' : '予想以外の要因（券種、オッズなど）が重要な可能性があります。'}
            </p>
          </div>
        </ResponsiveCard>
      )}
    </div>
  );
};

// 予想詳細カードコンポーネント
interface PredictionDetailCardProps {
  stats: PredictionInvestmentStats;
}

const PredictionDetailCard: React.FC<PredictionDetailCardProps> = ({ stats }) => {
  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <ResponsiveCard className="p-4">
      <FlexLayout direction="row" justify="between" align="start" className="mb-3">
        <div>
          <div className="font-medium text-gray-900">
            {formatDate(stats.prediction.timestamp)} {stats.prediction.race?.venue} {stats.prediction.race?.raceNumber}R
          </div>
          <div className="text-sm text-gray-600">
            {stats.prediction.race?.surface === 'turf' ? '芝' : 'ダート'}{stats.prediction.race?.distance}m
          </div>
        </div>
        
        <div className="text-right">
          <div className={`text-lg font-bold ${
            stats.returnRate >= 100 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatPercentage(stats.returnRate)}
          </div>
          <div className="text-sm text-gray-600">回収率</div>
        </div>
      </FlexLayout>

      <ResponsiveGrid columns={{ mobile: 3, tablet: 4 }} gap="sm" className="text-center">
        <div>
          <div className="font-medium text-blue-600">{stats.betCount}</div>
          <div className="text-xs text-gray-600">投資数</div>
        </div>
        <div>
          <div className="font-medium text-green-600">{formatCurrency(stats.totalInvestment)}</div>
          <div className="text-xs text-gray-600">投資額</div>
        </div>
        <div>
          <div className={`font-medium ${stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.totalProfit >= 0 ? '+' : ''}{formatCurrency(stats.totalProfit)}
          </div>
          <div className="text-xs text-gray-600">損益</div>
        </div>
        <div>
          <div className="font-medium text-purple-600">{formatPercentage(stats.averageOdds)}倍</div>
          <div className="text-xs text-gray-600">平均オッズ</div>
        </div>
      </ResponsiveGrid>

      {stats.isCompleted && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
          <div className="text-xs text-green-700">
            ✅ レース結果入力済み - 予想精度: {stats.prediction.accuracy || 0}%
          </div>
        </div>
      )}
    </ResponsiveCard>
  );
};