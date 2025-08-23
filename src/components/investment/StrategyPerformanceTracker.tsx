import React, { useState, useEffect } from 'react';
import { ResponsiveCard, FlexLayout, ResponsiveGrid } from '@/components/common/ResponsiveContainer';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield, 
  Zap, 
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { Investment } from '@/types/investment';

interface StrategyPerformanceData {
  strategyType: string;
  totalInvestments: number;
  totalAmount: number;
  totalReturn: number;
  profit: number;
  roi: number;
  winRate: number;
  averageOdds: number;
  riskLevel: 'low' | 'medium' | 'high';
  bestPerformingBetType: string;
  recentTrend: 'improving' | 'declining' | 'stable';
}

interface StrategyPerformanceTrackerProps {
  investments: Investment[];
}

export const StrategyPerformanceTracker: React.FC<StrategyPerformanceTrackerProps> = ({
  investments
}) => {
  const [performanceData, setPerformanceData] = useState<StrategyPerformanceData[]>([]);
  const [viewMode, setViewMode] = useState<'strategy' | 'betType' | 'risk'>('strategy');
  const [timeRange, setTimeRange] = useState<'all' | 'month' | 'week'>('month');

  useEffect(() => {
    analyzeStrategyPerformance();
  }, [investments, timeRange]);

  const analyzeStrategyPerformance = () => {
    // 時期フィルタリング
    const filteredInvestments = filterByTimeRange(investments, timeRange);
    
    // 戦略使用済み投資のみを対象
    const strategyInvestments = filteredInvestments.filter(inv => inv.strategyUsed);
    
    if (strategyInvestments.length === 0) {
      setPerformanceData([]);
      return;
    }

    // 戦略タイプ別にグループ化
    const strategyGroups = strategyInvestments.reduce((acc, inv) => {
      const key = inv.strategyType || 'unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(inv);
      return acc;
    }, {} as { [key: string]: Investment[] });

    const analysis: StrategyPerformanceData[] = Object.entries(strategyGroups).map(([strategyType, invs]) => {
      const totalAmount = invs.reduce((sum, inv) => sum + inv.amount, 0);
      const totalReturn = invs.reduce((sum, inv) => sum + inv.payout, 0);
      const profit = totalReturn - totalAmount;
      const roi = totalAmount > 0 ? (profit / totalAmount) * 100 : 0;
      const winningInvestments = invs.filter(inv => inv.payout > inv.amount);
      const winRate = invs.length > 0 ? (winningInvestments.length / invs.length) * 100 : 0;
      const averageOdds = invs.length > 0 ? invs.reduce((sum, inv) => sum + inv.odds, 0) / invs.length : 0;

      // リスクレベルの算出（平均から）
      const riskLevels = invs.map(inv => inv.strategyRiskLevel).filter(Boolean) as ('low' | 'medium' | 'high')[];
      const riskLevel = getMostCommonRiskLevel(riskLevels) || 'medium';

      // 最も成績の良い券種
      const betTypeStats = invs.reduce((acc, inv) => {
        if (!acc[inv.betType]) acc[inv.betType] = { profit: 0, count: 0 };
        acc[inv.betType].profit += inv.payout - inv.amount;
        acc[inv.betType].count += 1;
        return acc;
      }, {} as { [key: string]: { profit: number; count: number } });
      
      const bestBetType = Object.entries(betTypeStats).reduce((best, [type, stats]) => {
        const avgProfit = stats.profit / stats.count;
        return !best || avgProfit > best.avgProfit ? { type, avgProfit } : best;
      }, null as { type: string; avgProfit: number } | null);

      // トレンド分析（最近の成績）
      const recentTrend = calculateRecentTrend(invs);

      return {
        strategyType,
        totalInvestments: invs.length,
        totalAmount,
        totalReturn,
        profit,
        roi,
        winRate,
        averageOdds,
        riskLevel,
        bestPerformingBetType: bestBetType?.type || 'win',
        recentTrend
      };
    });

    // ROIで降順ソート
    analysis.sort((a, b) => b.roi - a.roi);
    setPerformanceData(analysis);
  };

  const filterByTimeRange = (investments: Investment[], range: string): Investment[] => {
    const now = new Date();
    switch (range) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return investments.filter(inv => new Date(inv.timestamp) >= weekAgo);
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return investments.filter(inv => new Date(inv.timestamp) >= monthAgo);
      default:
        return investments;
    }
  };

  const getMostCommonRiskLevel = (riskLevels: ('low' | 'medium' | 'high')[]): 'low' | 'medium' | 'high' | null => {
    if (riskLevels.length === 0) return null;
    const counts = riskLevels.reduce((acc, level) => {
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    const mostCommon = Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    return mostCommon as 'low' | 'medium' | 'high';
  };

  const calculateRecentTrend = (investments: Investment[]): 'improving' | 'declining' | 'stable' => {
    if (investments.length < 4) return 'stable';
    
    const sorted = [...investments].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const recent = sorted.slice(0, Math.floor(investments.length / 2));
    const older = sorted.slice(Math.floor(investments.length / 2));
    
    const recentROI = calculateROI(recent);
    const olderROI = calculateROI(older);
    
    const difference = recentROI - olderROI;
    if (difference > 10) return 'improving';
    if (difference < -10) return 'declining';
    return 'stable';
  };

  const calculateROI = (investments: Investment[]): number => {
    const totalAmount = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalReturn = investments.reduce((sum, inv) => sum + inv.payout, 0);
    return totalAmount > 0 ? ((totalReturn - totalAmount) / totalAmount) * 100 : 0;
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'low': return <Shield className="w-4 h-4" />;
      case 'medium': return <Target className="w-4 h-4" />;
      case 'high': return <Zap className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getBetTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      win: '単勝',
      place: '複勝',
      exacta: '馬連',
      quinella: '馬単',
      trifecta: '3連複',
      wide: 'ワイド'
    };
    return labels[type] || type;
  };

  if (performanceData.length === 0) {
    return (
      <ResponsiveCard className="p-6 text-center">
        <BarChart3 className="mx-auto mb-4 text-gray-400" size={48} />
        <h3 className="text-responsive-lg font-medium text-gray-600 mb-2">
          戦略パフォーマンス分析
        </h3>
        <p className="text-responsive-sm text-gray-500">
          AI推奨戦略を使用した投資記録がありません
        </p>
      </ResponsiveCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* ヘッダーと設定 */}
      <ResponsiveCard className="p-4">
        <FlexLayout direction="row" justify="between" align="center" className="mb-4">
          <h3 className="text-responsive-lg font-bold flex items-center gap-2">
            <BarChart3 className="text-purple-600" size={20} />
            戦略パフォーマンス分析
          </h3>
        </FlexLayout>

        {/* 時期選択 */}
        <div className="mb-4">
          <FlexLayout direction="row" gap="sm" className="mb-2">
            <TouchOptimizedButton
              onClick={() => setTimeRange('week')}
              variant={timeRange === 'week' ? 'primary' : 'ghost'}
              size="sm"
            >
              1週間
            </TouchOptimizedButton>
            <TouchOptimizedButton
              onClick={() => setTimeRange('month')}
              variant={timeRange === 'month' ? 'primary' : 'ghost'}
              size="sm"
            >
              1ヶ月
            </TouchOptimizedButton>
            <TouchOptimizedButton
              onClick={() => setTimeRange('all')}
              variant={timeRange === 'all' ? 'primary' : 'ghost'}
              size="sm"
            >
              全期間
            </TouchOptimizedButton>
          </FlexLayout>
        </div>

        {/* 全体サマリー */}
        <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
          <h4 className="font-medium text-purple-900 mb-2">戦略使用実績</h4>
          <ResponsiveGrid columns={{ mobile: 2, tablet: 4 }} gap="sm" className="text-center">
            <div>
              <div className="text-responsive-lg font-bold text-purple-600">
                {performanceData.reduce((sum, data) => sum + data.totalInvestments, 0)}
              </div>
              <div className="text-responsive-xs text-purple-700">総投資回数</div>
            </div>
            <div>
              <div className="text-responsive-lg font-bold text-blue-600">
                {performanceData.reduce((sum, data) => sum + data.totalAmount, 0).toLocaleString()}円
              </div>
              <div className="text-responsive-xs text-blue-700">総投資額</div>
            </div>
            <div>
              <div className="text-responsive-lg font-bold text-green-600">
                {performanceData.reduce((sum, data) => sum + data.profit, 0).toLocaleString()}円
              </div>
              <div className="text-responsive-xs text-green-700">総損益</div>
            </div>
            <div>
              <div className="text-responsive-lg font-bold text-orange-600">
                {(performanceData.reduce((sum, data, _, arr) => sum + (data.roi * data.totalInvestments), 0) / performanceData.reduce((sum, data) => sum + data.totalInvestments, 0) || 0).toFixed(1)}%
              </div>
              <div className="text-responsive-xs text-orange-700">平均ROI</div>
            </div>
          </ResponsiveGrid>
        </div>
      </ResponsiveCard>

      {/* 戦略別パフォーマンス */}
      <div className="space-y-3">
        {performanceData.map((data, index) => (
          <ResponsiveCard key={data.strategyType} className="p-4">
            <FlexLayout direction="row" justify="between" align="center" className="mb-3">
              <div>
                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                  {data.strategyType === 'win' ? '🏆' : 
                   data.strategyType === 'place' ? '🥉' :
                   data.strategyType === 'exacta' ? '🎯' :
                   data.strategyType === 'quinella' ? '💫' :
                   data.strategyType === 'trifecta' ? '🎲' :
                   data.strategyType === 'wide' ? '🌟' : '💰'}
                  {getBetTypeLabel(data.strategyType)}戦略
                </h4>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{data.totalInvestments}回投資</span>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getRiskLevelColor(data.riskLevel)}`}>
                    {getRiskLevelIcon(data.riskLevel)}
                    <span>{data.riskLevel === 'low' ? '低リスク' : data.riskLevel === 'medium' ? '中リスク' : '高リスク'}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`text-responsive-lg font-bold ${data.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.roi >= 0 ? '+' : ''}{data.roi.toFixed(1)}%
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {getTrendIcon(data.recentTrend)}
                  <span className="text-gray-600">
                    {data.recentTrend === 'improving' ? '改善中' : 
                     data.recentTrend === 'declining' ? '低下中' : '安定'}
                  </span>
                </div>
              </div>
            </FlexLayout>

            <ResponsiveGrid columns={{ mobile: 2, tablet: 4 }} gap="sm" className="text-sm">
              <div>
                <div className="text-gray-600">投資額</div>
                <div className="font-bold text-blue-600">{data.totalAmount.toLocaleString()}円</div>
              </div>
              <div>
                <div className="text-gray-600">払戻額</div>
                <div className="font-bold text-green-600">{data.totalReturn.toLocaleString()}円</div>
              </div>
              <div>
                <div className="text-gray-600">的中率</div>
                <div className="font-bold text-purple-600">{data.winRate.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-gray-600">平均オッズ</div>
                <div className="font-bold text-orange-600">{data.averageOdds.toFixed(1)}倍</div>
              </div>
            </ResponsiveGrid>

            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center text-xs text-gray-600">
                <span>最良券種: {getBetTypeLabel(data.bestPerformingBetType)}</span>
                <span className={`font-medium ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  損益: {data.profit >= 0 ? '+' : ''}{data.profit.toLocaleString()}円
                </span>
              </div>
            </div>
          </ResponsiveCard>
        ))}
      </div>
    </div>
  );
};