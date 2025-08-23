import React, { useState, memo, useMemo, useCallback } from 'react';
import { TrendingUp, Target, DollarSign, BarChart3, Brain, Lightbulb } from 'lucide-react';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { ResponsiveContainer, ResponsiveCard, ResponsiveGrid, FlexLayout } from '@/components/common/ResponsiveContainer';
import { BackHeaderWithHome } from '@/components/common/MobileHeader';
import { ZoomableChart } from '@/components/common/ZoomableChart';
import { ROIAnalysis } from './ROIAnalysis';
import { HitPatternAnalysis } from './HitPatternAnalysis';
import { TrendAnalysis } from './TrendAnalysis';
import { PredictionInvestmentAnalysis } from './PredictionInvestmentAnalysis';
import { DetailedStatisticsView } from './DetailedStatisticsView';
import { performanceAnalysisService } from '@/services/performanceAnalysisService';
import { DetailedStatistics } from '@/services/detailedStatisticsService';
import { investmentPerformanceService } from '@/services/investmentPerformanceService';
import { detailedAnalysisService } from '@/services/detailedAnalysisService';
import { Investment } from '@/types/investment';
import { HorseAnalysis, ActualResult } from '@/types/prediction';
import { shallowCompare } from '@/utils/performanceOptimization';
import { StrategyRecommendation } from '@/components/investment/StrategyRecommendation';

interface PredictionHistoryEntry {
  id: string;
  date: string;
  race: {
    venue: string;
    raceNumber: number;
    distance: number;
    surface: string;
    raceDate: string;
  };
  predictions: HorseAnalysis[];
  horseCount: number;
  confidenceLevel?: number;
  actualResults?: ActualResult[];
  payoutData?: {
    investment: number;
    totalReturn: number;
  };
  isResultEntered: boolean;
}

interface AccuracyStats {
  totalPredictions: number;
  completedPredictions: number;
  firstPlaceAccuracy: number;
  top3Accuracy: number;
  totalInvestment: number;
  totalPayout: number;
  totalProfit: number;
  returnRate: number;
}

interface TrendDataPoint {
  race: string;
  firstAccuracy: number;
  top3Accuracy: number;
  date: string;
  isFirstHit: boolean;
  isTop3Hit: boolean;
}

interface PeriodStats {
  total: number;
  firstAccuracy: number;
  top3Accuracy: number;
  totalInvestment: number;
  totalPayout: number;
  totalProfit: number;
  returnRate: number;
}

interface ConditionStats {
  distance?: Record<string, { total: number; firstAccuracy: number; top3Accuracy: number }>;
  surface?: Record<string, { total: number; firstAccuracy: number; top3Accuracy: number }>;
  venue?: Record<string, { total: number; firstAccuracy: number; top3Accuracy: number }>;
}

interface StatisticsViewProps {
  onBack: () => void;
  onNavigateToHome?: () => void;
  predictionHistory: PredictionHistoryEntry[];
  accuracyStats: AccuracyStats;
  trendData: TrendDataPoint[];
  periodStats: PeriodStats | null;
  conditionStats: ConditionStats;
  investments?: Investment[];
  detailedStats?: DetailedStatistics;
}

type StatsPeriod = 'all' | 'thisMonth' | 'lastMonth';
type StatsCategory = 'overview' | 'trends' | 'conditions' | 'performance' | 'roi' | 'patterns' | 'advanced' | 'prediction-investment' | 'detailed' | 'strategy';

const StatisticsViewComponent: React.FC<StatisticsViewProps> = ({
  onBack,
  onNavigateToHome,
  predictionHistory,
  accuracyStats,
  trendData,
  conditionStats,
  investments = [],
  detailedStats
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<StatsPeriod>('all');
  const [selectedCategory, setSelectedCategory] = useState<StatsCategory>('overview');

  // 分析データの計算（メモ化）
  const analysisData = useMemo(() => {
    if (investments.length === 0 || predictionHistory.length === 0) {
      return {
        roiAnalysis: null,
        hitPatterns: null,
        performanceMetrics: null,
        suggestions: [],
        trendAnalysisData: null
      };
    }

    // ROI分析
    const roiData = performanceAnalysisService.analyzeROI(predictionHistory as any[], investments);
    
    // 的中パターン分析
    const patternData = performanceAnalysisService.analyzeHitPatterns(predictionHistory as any[], investments);
    
    // パフォーマンス指標
    const metricsData = investmentPerformanceService.calculatePerformance(investments);
    
    // 改善提案
    const suggestionData = performanceAnalysisService.generateImprovementSuggestions(
      roiData,
      patternData,
      metricsData
    );
    
    // トレンド分析
    const trendData = detailedAnalysisService.analyzeTrends(predictionHistory as any[], investments);

    return {
      roiAnalysis: roiData,
      hitPatterns: patternData,
      performanceMetrics: metricsData,
      suggestions: suggestionData,
      trendAnalysisData: trendData
    };
  }, [investments, predictionHistory]);

  // 分析データを直接使用（無限ループを防ぐため）
  const {
    roiAnalysis: currentROIAnalysis,
    hitPatterns: currentHitPatterns,
    performanceMetrics: currentPerformanceMetrics,
    suggestions: currentSuggestions,
    trendAnalysisData: currentTrendAnalysisData
  } = analysisData;

  // メモ化されたオプション
  const periodOptions = useMemo(() => [
    { value: 'all' as StatsPeriod, label: '全期間' },
    { value: 'thisMonth' as StatsPeriod, label: '今月' },
    { value: 'lastMonth' as StatsPeriod, label: '先月' }
  ], []);

  const categoryOptions = useMemo(() => [
    { value: 'overview' as StatsCategory, label: '概要', icon: BarChart3 },
    { value: 'detailed' as StatsCategory, label: '詳細統計', icon: Target },
    { value: 'strategy' as StatsCategory, label: '投資戦略', icon: Lightbulb },
    { value: 'trends' as StatsCategory, label: 'トレンド', icon: TrendingUp },
    { value: 'conditions' as StatsCategory, label: '条件別', icon: Target },
    { value: 'performance' as StatsCategory, label: '収支', icon: DollarSign },
    { value: 'prediction-investment' as StatsCategory, label: '予想投資分析', icon: DollarSign },
    { value: 'roi' as StatsCategory, label: 'ROI分析', icon: Brain },
    { value: 'patterns' as StatsCategory, label: '的中パターン', icon: Lightbulb },
    { value: 'advanced' as StatsCategory, label: '高度な分析', icon: Brain }
  ], []);

  // メモ化されたイベントハンドラー
  const handlePeriodChange = useCallback((period: StatsPeriod) => {
    setSelectedPeriod(period);
  }, []);

  const handleCategoryChange = useCallback((category: StatsCategory) => {
    setSelectedCategory(category);
  }, []);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* 基本統計 */}
      <ResponsiveCard>
        <h3 className="text-responsive-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 size={20} />
          基本統計
        </h3>
        
        <ResponsiveGrid columns={{ mobile: 2, tablet: 4 }} gap="md">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {accuracyStats?.totalPredictions || 0}
            </div>
            <div className="text-responsive-xs text-gray-600">総予想回数</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {accuracyStats?.firstPlaceAccuracy || 0}%
            </div>
            <div className="text-responsive-xs text-gray-600">1着的中率</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {accuracyStats?.top3Accuracy || 0}%
            </div>
            <div className="text-responsive-xs text-gray-600">3着以内的中率</div>
          </div>
          
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {accuracyStats?.completedPredictions || 0}
            </div>
            <div className="text-responsive-xs text-gray-600">結果入力済み</div>
          </div>
        </ResponsiveGrid>
      </ResponsiveCard>

      {/* 収支サマリー */}
      {accuracyStats?.totalInvestment > 0 && (
        <ResponsiveCard>
          <h3 className="text-responsive-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign size={20} />
            収支サマリー
          </h3>
          
          <div className="space-y-3">
            <FlexLayout direction="row" justify="between" align="center">
              <span className="text-responsive-sm text-gray-600">投資総額</span>
              <span className="text-responsive-base font-semibold text-blue-600">
                {accuracyStats.totalInvestment.toLocaleString()}円
              </span>
            </FlexLayout>
            
            <FlexLayout direction="row" justify="between" align="center">
              <span className="text-responsive-sm text-gray-600">払戻総額</span>
              <span className="text-responsive-base font-semibold text-green-600">
                {accuracyStats.totalPayout.toLocaleString()}円
              </span>
            </FlexLayout>
            
            <hr className="border-gray-200" />
            
            <FlexLayout direction="row" justify="between" align="center">
              <span className="text-responsive-base font-medium">収支</span>
              <span className={`text-responsive-lg font-bold ${
                accuracyStats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {accuracyStats.totalProfit >= 0 ? '+' : ''}{accuracyStats.totalProfit.toLocaleString()}円
              </span>
            </FlexLayout>
            
            <FlexLayout direction="row" justify="between" align="center">
              <span className="text-responsive-base font-medium">回収率</span>
              <span className={`text-responsive-lg font-bold ${
                accuracyStats.returnRate >= 100 ? 'text-green-600' : 'text-red-600'
              }`}>
                {accuracyStats.returnRate}%
              </span>
            </FlexLayout>
          </div>
        </ResponsiveCard>
      )}
    </div>
  );

  const renderInvestmentStrategy = () => {
    if (!detailedStats) {
      return (
        <ResponsiveCard>
          <div className="text-center py-8">
            <Lightbulb className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-responsive-lg font-medium text-gray-600 mb-2">
              投資戦略分析
            </h3>
            <p className="text-responsive-sm text-gray-500">
              統計データが不足しています。<br/>
              予想結果を入力すると戦略分析が利用できます。
            </p>
          </div>
        </ResponsiveCard>
      );
    }

    // 仮の予想データを作成（実際の実装では最新の予想を使用）
    const mockPrediction = {
      rankings: predictionHistory.length > 0 ? 
        predictionHistory[0].predictions.slice(0, 3).map((pred, index) => ({
          name: pred.horse?.name || `馬${index + 1}`,
          number: pred.horse?.number || index + 1,
          jockey: pred.horse?.jockey || `騎手${index + 1}`,
          popularity: pred.horse?.popularity || index + 1,
          odds: pred.horse?.odds || (3.0 + index),
          confidence: 0.8 - (index * 0.1),
          speedIndex: 80 - (index * 5),
          recentForm: index === 0 ? 'excellent' : index === 1 ? 'good' : 'fair',
          pastRaces: []
        })) : [
          { name: '予想馬1', number: 1, jockey: '騎手1', popularity: 1, odds: 3.0, confidence: 0.8, speedIndex: 80, recentForm: 'excellent', pastRaces: [] },
          { name: '予想馬2', number: 2, jockey: '騎手2', popularity: 2, odds: 4.5, confidence: 0.7, speedIndex: 75, recentForm: 'good', pastRaces: [] },
          { name: '予想馬3', number: 3, jockey: '騎手3', popularity: 3, odds: 6.0, confidence: 0.6, speedIndex: 70, recentForm: 'fair', pastRaces: [] }
        ]
    };

    // 仮のオッズデータ
    const mockOdds = {
      'wide_1_2': 1.8,
      'wide_1_3': 2.2,
      'wide_2_3': 2.5,
      'fukusho_1': 1.5,
      'fukusho_2': 2.0,
      'fukusho_3': 2.8,
      'umaren_1_2': 8.5,
      'umaren_1_3': 12.0,
      'umatan_1_2': 15.0,
      'sanrenpuku_1_2_3': 25.0
    };

    return (
      <div className="space-y-6">
        <ResponsiveCard>
          <h3 className="text-responsive-lg font-semibold mb-4 flex items-center gap-2">
            <Lightbulb size={20} />
            統計に基づく投資戦略推奨
          </h3>
          
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">現在の統計データ</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">3頭中1頭以上3着以内:</span>
                <span className="font-bold ml-2">{(detailedStats.hitPatterns.any1.rate * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-blue-700">3頭中2頭以上3着以内:</span>
                <span className="font-bold ml-2">{(detailedStats.hitPatterns.any2.rate * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-blue-700">3頭すべて3着以内:</span>
                <span className="font-bold ml-2">{(detailedStats.hitPatterns.all3.rate * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-blue-700">1位的中率:</span>
                <span className="font-bold ml-2">{(detailedStats.hitPatterns.first.rate * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <StrategyRecommendation
            prediction={mockPrediction}
            availableOdds={mockOdds}
            onStrategySelect={(strategy) => {
              console.log('選択された戦略:', strategy);
              // 実際の実装では投資記録作成画面に遷移
              alert(`${strategy.name}が選択されました。投資記録作成機能は開発中です。`);
            }}
          />
        </ResponsiveCard>
      </div>
    );
  };

  const renderTrends = () => (
    <div className="space-y-6">
      <ResponsiveCard>
        <h3 className="text-responsive-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp size={20} />
          的中率推移
        </h3>
        
        {trendData && trendData.length > 0 ? (
          <ZoomableChart
            data={trendData}
            lines={[
              { dataKey: 'firstAccuracy', stroke: '#eab308', name: '1着的中率' },
              { dataKey: 'top3Accuracy', stroke: '#8b5cf6', name: '3着以内的中率' }
            ]}
            xAxisDataKey="race"
            height={300}
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp size={48} className="mx-auto mb-2 opacity-50" />
            <p>十分なデータがありません</p>
          </div>
        )}
      </ResponsiveCard>
    </div>
  );

  const renderAdvancedAnalysis = () => {
    if (!currentTrendAnalysisData) {
      return (
        <ResponsiveCard>
          <div className="text-center py-8 text-gray-500">
            <Brain size={48} className="mx-auto mb-2 opacity-50" />
            <p>高度な分析には十分なデータが必要です</p>
          </div>
        </ResponsiveCard>
      );
    }

    return (
      <TrendAnalysis
        trendAnalysis={currentTrendAnalysisData}
        trendData={trendData || []}
      />
    );
  };

  const renderConditions = () => (
    <div className="space-y-6">
      {/* 距離別統計 */}
      {conditionStats?.distance && Object.keys(conditionStats.distance).length > 0 && (
        <ResponsiveCard>
          <h3 className="text-responsive-lg font-semibold mb-4">距離別成績</h3>
          <div className="space-y-3">
            {Object.entries(conditionStats.distance).map(([distance, stats]: [string, any]) => (
              <div key={distance} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-responsive-sm font-medium">{distance}m</span>
                <div className="text-right">
                  <div className="text-responsive-sm">
                    1着: <span className="font-semibold text-green-600">{stats.firstAccuracy}%</span>
                  </div>
                  <div className="text-responsive-xs text-gray-600">
                    ({stats.total}戦)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ResponsiveCard>
      )}

      {/* 馬場別統計 */}
      {conditionStats?.surface && Object.keys(conditionStats.surface).length > 0 && (
        <ResponsiveCard>
          <h3 className="text-responsive-lg font-semibold mb-4">馬場別成績</h3>
          <ResponsiveGrid columns={{ mobile: 2 }} gap="md">
            {Object.entries(conditionStats.surface).map(([surface, stats]: [string, any]) => (
              <div key={surface} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-responsive-base font-semibold mb-2">
                  {surface === 'turf' ? '芝' : 'ダート'}
                </div>
                <div className="text-responsive-sm">
                  1着: <span className="font-semibold text-green-600">{stats.firstAccuracy}%</span>
                </div>
                <div className="text-responsive-sm">
                  3着内: <span className="font-semibold text-purple-600">{stats.top3Accuracy}%</span>
                </div>
                <div className="text-responsive-xs text-gray-600 mt-1">
                  ({stats.total}戦)
                </div>
              </div>
            ))}
          </ResponsiveGrid>
        </ResponsiveCard>
      )}

      {/* 競馬場別統計 */}
      {conditionStats?.venue && Object.keys(conditionStats.venue).length > 0 && (
        <ResponsiveCard>
          <h3 className="text-responsive-lg font-semibold mb-4">競馬場別成績</h3>
          <div className="space-y-2">
            {Object.entries(conditionStats.venue)
              .sort(([,a]: [string, any], [,b]: [string, any]) => b.total - a.total)
              .map(([venue, stats]: [string, any]) => (
                <div key={venue} className="flex items-center justify-between p-2 border-b border-gray-100">
                  <span className="text-responsive-sm font-medium">{venue}</span>
                  <div className="text-right">
                    <span className="text-responsive-sm text-green-600 font-semibold">
                      {stats.firstAccuracy}%
                    </span>
                    <span className="text-responsive-xs text-gray-600 ml-2">
                      ({stats.total}戦)
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </ResponsiveCard>
      )}
    </div>
  );

  const renderPerformance = () => (
    <div className="space-y-6">
      <ResponsiveCard>
        <h3 className="text-responsive-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign size={20} />
          投資パフォーマンス
        </h3>
        
        <div className="space-y-4">
          {/* ROI指標 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {accuracyStats?.returnRate || 0}%
              </div>
              <div className="text-responsive-xs text-gray-600">回収率 (ROI)</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {Math.round((accuracyStats?.totalPayout || 0) / Math.max(1, accuracyStats?.completedPredictions || 1))}
              </div>
              <div className="text-responsive-xs text-gray-600">平均払戻額</div>
            </div>
          </div>
          
          {/* 投資効率 */}
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h4 className="text-responsive-base font-semibold mb-2">投資効率分析</h4>
            <div className="space-y-2 text-responsive-sm">
              <div className="flex justify-between">
                <span>的中時平均配当:</span>
                <span className="font-semibold">
                  {accuracyStats?.totalPayout && accuracyStats?.completedPredictions 
                    ? Math.round(accuracyStats.totalPayout / Math.max(1, accuracyStats.completedPredictions))
                    : 0}円
                </span>
              </div>
              <div className="flex justify-between">
                <span>平均投資額:</span>
                <span className="font-semibold">
                  {accuracyStats?.totalInvestment && accuracyStats?.completedPredictions
                    ? Math.round(accuracyStats.totalInvestment / Math.max(1, accuracyStats.completedPredictions))
                    : 0}円
                </span>
              </div>
            </div>
          </div>
        </div>
      </ResponsiveCard>
    </div>
  );

  const renderROIAnalysis = () => {
    if (!currentROIAnalysis || !currentPerformanceMetrics) {
      return (
        <ResponsiveCard>
          <div className="text-center py-8 text-gray-500">
            <Brain size={48} className="mx-auto mb-2 opacity-50" />
            <p>ROI分析には投資データが必要です</p>
          </div>
        </ResponsiveCard>
      );
    }

    return (
      <ROIAnalysis
        roiAnalysis={currentROIAnalysis}
        performanceMetrics={currentPerformanceMetrics}
        suggestions={currentSuggestions}
      />
    );
  };

  const renderHitPatterns = () => {
    if (!currentHitPatterns) {
      return (
        <ResponsiveCard>
          <div className="text-center py-8 text-gray-500">
            <Lightbulb size={48} className="mx-auto mb-2 opacity-50" />
            <p>的中パターン分析には予想履歴が必要です</p>
          </div>
        </ResponsiveCard>
      );
    }

    return <HitPatternAnalysis hitPattern={currentHitPatterns} />;
  };

  const renderDetailedStatistics = () => {
    if (!detailedStats) {
      return (
        <ResponsiveCard>
          <div className="text-center py-8 text-gray-500">
            <Target size={48} className="mx-auto mb-2 opacity-50" />
            <p>詳細統計には予想履歴が必要です</p>
          </div>
        </ResponsiveCard>
      );
    }

    return <DetailedStatisticsView statistics={detailedStats} />;
  };

  const renderContent = () => {
    switch (selectedCategory) {
      case 'overview': return renderOverview();
      case 'detailed': return renderDetailedStatistics();
      case 'strategy': return renderInvestmentStrategy();
      case 'trends': return renderTrends();
      case 'conditions': return renderConditions();
      case 'performance': return renderPerformance();
      case 'prediction-investment': return <PredictionInvestmentAnalysis />;
      case 'roi': return renderROIAnalysis();
      case 'patterns': return renderHitPatterns();
      case 'advanced': return renderAdvancedAnalysis();
      default: return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <BackHeaderWithHome title="統計分析" onBack={onBack} onHome={onNavigateToHome || (() => {})} />
      
      <ResponsiveContainer maxWidth="mobile" padding="md">
        {/* 期間選択 */}
        <ResponsiveCard className="mb-4">
          <FlexLayout direction="row" gap="sm" className="overflow-x-auto">
            {periodOptions.map(option => (
              <TouchOptimizedButton
                key={option.value}
                onClick={() => handlePeriodChange(option.value)}
                variant={selectedPeriod === option.value ? 'primary' : 'secondary'}
                size="sm"
                className="whitespace-nowrap"
              >
                {option.label}
              </TouchOptimizedButton>
            ))}
          </FlexLayout>
        </ResponsiveCard>

        {/* カテゴリ選択 */}
        <ResponsiveCard className="mb-6">
          <ResponsiveGrid columns={{ mobile: 2, tablet: 4 }} gap="sm">
            {categoryOptions.map(option => {
              const Icon = option.icon;
              return (
                <TouchOptimizedButton
                  key={option.value}
                  onClick={() => handleCategoryChange(option.value)}
                  variant={selectedCategory === option.value ? 'primary' : 'ghost'}
                  size="sm"
                  icon={Icon}
                  className="flex-col h-16"
                >
                  {option.label}
                </TouchOptimizedButton>
              );
            })}
          </ResponsiveGrid>
        </ResponsiveCard>

        {/* コンテンツ */}
        {renderContent()}
      </ResponsiveContainer>
    </div>
  );
};

// メモ化されたコンポーネントをエクスポート
export const StatisticsView = memo(StatisticsViewComponent, shallowCompare);