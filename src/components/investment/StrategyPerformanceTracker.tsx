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
  Activity,
  Brain,
  User,
  AlertTriangle,
  CheckCircle,
  Info,
  DollarSign
} from 'lucide-react';
import { Investment } from '@/types/investment';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

interface ComparisonData {
  aiStrategy: {
    totalInvestments: number;
    totalAmount: number;
    totalReturn: number;
    profit: number;
    roi: number;
    winRate: number;
    averageConfidence: number;
  };
  manualStrategy: {
    totalInvestments: number;
    totalAmount: number;
    totalReturn: number;
    profit: number;
    roi: number;
    winRate: number;
  };
}

interface TimeSeriesData {
  date: string;
  aiROI: number;
  manualROI: number;
  cumulativeAIProfit: number;
  cumulativeManualProfit: number;
}

interface ImprovementSuggestion {
  type: 'warning' | 'info' | 'success';
  title: string;
  description: string;
  actionable: boolean;
}

interface StrategyPerformanceTrackerProps {
  investments: Investment[];
}

export const StrategyPerformanceTracker: React.FC<StrategyPerformanceTrackerProps> = ({
  investments
}) => {
  const [performanceData, setPerformanceData] = useState<StrategyPerformanceData[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [suggestions, setSuggestions] = useState<ImprovementSuggestion[]>([]);
  const [viewMode, setViewMode] = useState<'overview' | 'comparison' | 'trends' | 'suggestions'>('overview');
  const [timeRange, setTimeRange] = useState<'all' | 'month' | 'week'>('month');

  useEffect(() => {
    analyzeStrategyPerformance();
    analyzeComparison();
    generateTimeSeriesData();
    generateImprovementSuggestions();
  }, [investments, timeRange]);

  const analyzeStrategyPerformance = () => {
    const filteredInvestments = filterByTimeRange(investments, timeRange);
    const strategyInvestments = filteredInvestments.filter(inv => inv.strategyUsed);
    
    if (strategyInvestments.length === 0) {
      setPerformanceData([]);
      return;
    }

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

      const riskLevels = invs.map(inv => inv.strategyRiskLevel).filter(Boolean) as ('low' | 'medium' | 'high')[];
      const riskLevel = getMostCommonRiskLevel(riskLevels) || 'medium';

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

    analysis.sort((a, b) => b.roi - a.roi);
    setPerformanceData(analysis);
  };

  const analyzeComparison = () => {
    const filteredInvestments = filterByTimeRange(investments, timeRange);
    const aiInvestments = filteredInvestments.filter(inv => inv.strategyUsed);
    const manualInvestments = filteredInvestments.filter(inv => !inv.strategyUsed);

    const calculateStats = (invs: Investment[]) => {
      const totalAmount = invs.reduce((sum, inv) => sum + inv.amount, 0);
      const totalReturn = invs.reduce((sum, inv) => sum + inv.payout, 0);
      const profit = totalReturn - totalAmount;
      const roi = totalAmount > 0 ? (profit / totalAmount) * 100 : 0;
      const winningInvestments = invs.filter(inv => inv.payout > inv.amount);
      const winRate = invs.length > 0 ? (winningInvestments.length / invs.length) * 100 : 0;
      
      return {
        totalInvestments: invs.length,
        totalAmount,
        totalReturn,
        profit,
        roi,
        winRate
      };
    };

    const aiStats = calculateStats(aiInvestments);
    const manualStats = calculateStats(manualInvestments);

    const aiConfidenceSum = aiInvestments
      .filter(inv => inv.strategyConfidence)
      .reduce((sum, inv) => sum + (inv.strategyConfidence || 0), 0);
    const averageConfidence = aiInvestments.length > 0 ? aiConfidenceSum / aiInvestments.length : 0;

    setComparisonData({
      aiStrategy: {
        ...aiStats,
        averageConfidence
      },
      manualStrategy: manualStats
    });
  };

  const generateTimeSeriesData = () => {
    const filteredInvestments = filterByTimeRange(investments, timeRange);
    if (filteredInvestments.length === 0) {
      setTimeSeriesData([]);
      return;
    }

    const sortedInvestments = [...filteredInvestments].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const timeSeriesMap = new Map<string, {
      aiInvestments: Investment[];
      manualInvestments: Investment[];
    }>();

    sortedInvestments.forEach(inv => {
      const date = new Date(inv.timestamp).toISOString().split('T')[0];
      if (!timeSeriesMap.has(date)) {
        timeSeriesMap.set(date, { aiInvestments: [], manualInvestments: [] });
      }
      
      const group = timeSeriesMap.get(date)!;
      if (inv.strategyUsed) {
        group.aiInvestments.push(inv);
      } else {
        group.manualInvestments.push(inv);
      }
    });

    let cumulativeAIProfit = 0;
    let cumulativeManualProfit = 0;

    const timeSeriesArray: TimeSeriesData[] = Array.from(timeSeriesMap.entries()).map(([date, data]) => {
      const aiProfit = data.aiInvestments.reduce((sum, inv) => sum + (inv.payout - inv.amount), 0);
      const manualProfit = data.manualInvestments.reduce((sum, inv) => sum + (inv.payout - inv.amount), 0);
      
      const aiAmount = data.aiInvestments.reduce((sum, inv) => sum + inv.amount, 0);
      const manualAmount = data.manualInvestments.reduce((sum, inv) => sum + inv.amount, 0);
      
      const aiROI = aiAmount > 0 ? (aiProfit / aiAmount) * 100 : 0;
      const manualROI = manualAmount > 0 ? (manualProfit / manualAmount) * 100 : 0;

      cumulativeAIProfit += aiProfit;
      cumulativeManualProfit += manualProfit;

      return {
        date,
        aiROI,
        manualROI,
        cumulativeAIProfit,
        cumulativeManualProfit
      };
    });

    setTimeSeriesData(timeSeriesArray);
  };

  const generateImprovementSuggestions = () => {
    const filteredInvestments = filterByTimeRange(investments, timeRange);
    const aiInvestments = filteredInvestments.filter(inv => inv.strategyUsed);
    
    const suggestions: ImprovementSuggestion[] = [];

    const aiUsageRate = filteredInvestments.length > 0 ? (aiInvestments.length / filteredInvestments.length) * 100 : 0;
    if (aiUsageRate < 30) {
      suggestions.push({
        type: 'info',
        title: 'AI戦略の活用を増やしましょう',
        description: `現在のAI戦略使用率は${aiUsageRate.toFixed(1)}%です。AI推奨戦略をより活用することで、投資成績の向上が期待できます。`,
        actionable: true
      });
    }

    if (comparisonData && comparisonData.aiStrategy.roi > comparisonData.manualStrategy.roi + 10) {
      suggestions.push({
        type: 'success',
        title: 'AI戦略が優秀な成績を記録',
        description: `AI戦略のROI（${comparisonData.aiStrategy.roi.toFixed(1)}%）が手動戦略（${comparisonData.manualStrategy.roi.toFixed(1)}%）を大きく上回っています。`,
        actionable: false
      });
    } else if (comparisonData && comparisonData.manualStrategy.roi > comparisonData.aiStrategy.roi + 10) {
      suggestions.push({
        type: 'warning',
        title: '手動戦略の方が好成績',
        description: `手動戦略のROI（${comparisonData.manualStrategy.roi.toFixed(1)}%）がAI戦略（${comparisonData.aiStrategy.roi.toFixed(1)}%）を上回っています。AI戦略の設定を見直してみましょう。`,
        actionable: true
      });
    }

    const riskLevels = aiInvestments.map(inv => inv.strategyRiskLevel).filter(Boolean);
    const highRiskRate = riskLevels.filter(level => level === 'high').length / riskLevels.length;
    if (highRiskRate > 0.7) {
      suggestions.push({
        type: 'warning',
        title: '高リスク戦略の比率が高すぎます',
        description: `高リスク戦略の使用率が${(highRiskRate * 100).toFixed(1)}%です。リスク分散のため、低・中リスク戦略も組み合わせることをお勧めします。`,
        actionable: true
      });
    }

    if (filteredInvestments.length < 5 && timeRange !== 'week') {
      suggestions.push({
        type: 'info',
        title: '投資データが少なめです',
        description: 'より正確な分析のため、継続的な投資記録の蓄積をお勧めします。',
        actionable: true
      });
    }

    setSuggestions(suggestions);
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

  const renderMainContent = () => {
    switch (viewMode) {
      case 'overview':
        return renderOverview();
      case 'comparison':
        return renderComparison();
      case 'trends':
        return renderTrends();
      case 'suggestions':
        return renderSuggestions();
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
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
  );

  const renderComparison = () => {
    if (!comparisonData) {
      return (
        <ResponsiveCard className="p-6 text-center">
          <Target className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-500">比較データが不足しています</p>
        </ResponsiveCard>
      );
    }

    const { aiStrategy, manualStrategy } = comparisonData;

    return (
      <ResponsiveCard className="p-4">
        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Target className="text-blue-600" size={20} />
          AI戦略 vs 手動戦略 比較
        </h4>
        
        <ResponsiveGrid columns={{ mobile: 1, tablet: 2 }} gap="md">
          {/* AI戦略 */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="text-purple-600" size={20} />
              <h5 className="font-bold text-purple-900">AI推奨戦略</h5>
            </div>
            
            <ResponsiveGrid columns={{ mobile: 2 }} gap="sm" className="text-sm">
              <div>
                <div className="text-purple-700">投資回数</div>
                <div className="font-bold text-purple-900">{aiStrategy.totalInvestments}回</div>
              </div>
              <div>
                <div className="text-purple-700">投資額</div>
                <div className="font-bold text-purple-900">{aiStrategy.totalAmount.toLocaleString()}円</div>
              </div>
              <div>
                <div className="text-purple-700">ROI</div>
                <div className={`font-bold ${aiStrategy.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {aiStrategy.roi >= 0 ? '+' : ''}{aiStrategy.roi.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-purple-700">的中率</div>
                <div className="font-bold text-purple-900">{aiStrategy.winRate.toFixed(1)}%</div>
              </div>
              <div className="col-span-2">
                <div className="text-purple-700">平均確信度</div>
                <div className="font-bold text-purple-900">{aiStrategy.averageConfidence.toFixed(1)}%</div>
              </div>
            </ResponsiveGrid>
          </div>

          {/* 手動戦略 */}
          <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <User className="text-gray-600" size={20} />
              <h5 className="font-bold text-gray-800">手動戦略</h5>
            </div>
            
            <ResponsiveGrid columns={{ mobile: 2 }} gap="sm" className="text-sm">
              <div>
                <div className="text-gray-600">投資回数</div>
                <div className="font-bold text-gray-800">{manualStrategy.totalInvestments}回</div>
              </div>
              <div>
                <div className="text-gray-600">投資額</div>
                <div className="font-bold text-gray-800">{manualStrategy.totalAmount.toLocaleString()}円</div>
              </div>
              <div>
                <div className="text-gray-600">ROI</div>
                <div className={`font-bold ${manualStrategy.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {manualStrategy.roi >= 0 ? '+' : ''}{manualStrategy.roi.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-gray-600">的中率</div>
                <div className="font-bold text-gray-800">{manualStrategy.winRate.toFixed(1)}%</div>
              </div>
            </ResponsiveGrid>
          </div>
        </ResponsiveGrid>

        {/* 比較結果 */}
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
          <h6 className="font-medium text-yellow-900 mb-2">比較結果</h6>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>ROI差:</span>
              <span className={`font-medium ${(aiStrategy.roi - manualStrategy.roi) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(aiStrategy.roi - manualStrategy.roi) >= 0 ? '+' : ''}{(aiStrategy.roi - manualStrategy.roi).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>的中率差:</span>
              <span className={`font-medium ${(aiStrategy.winRate - manualStrategy.winRate) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(aiStrategy.winRate - manualStrategy.winRate) >= 0 ? '+' : ''}{(aiStrategy.winRate - manualStrategy.winRate).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </ResponsiveCard>
    );
  };

  const renderTrends = () => {
    if (timeSeriesData.length === 0) {
      return (
        <ResponsiveCard className="p-6 text-center">
          <TrendingUp className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-500">推移データが不足しています</p>
        </ResponsiveCard>
      );
    }

    return (
      <div className="space-y-4">
        {/* ROI推移チャート */}
        <ResponsiveCard className="p-4">
          <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="text-green-600" size={20} />
            ROI推移
          </h4>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('ja-JP')}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)}%`,
                    name === 'aiROI' ? 'AI戦略ROI' : '手動戦略ROI'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="aiROI" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="aiROI"
                />
                <Line 
                  type="monotone" 
                  dataKey="manualROI" 
                  stroke="#6b7280" 
                  strokeWidth={2}
                  name="manualROI"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ResponsiveCard>

        {/* 累積損益推移チャート */}
        <ResponsiveCard className="p-4">
          <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <DollarSign className="text-blue-600" size={20} />
            累積損益推移
          </h4>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('ja-JP')}
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()}円`,
                    name === 'cumulativeAIProfit' ? 'AI戦略累積損益' : '手動戦略累積損益'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="cumulativeAIProfit" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="cumulativeAIProfit"
                />
                <Line 
                  type="monotone" 
                  dataKey="cumulativeManualProfit" 
                  stroke="#6b7280" 
                  strokeWidth={2}
                  name="cumulativeManualProfit"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ResponsiveCard>
      </div>
    );
  };

  const renderSuggestions = () => {
    if (suggestions.length === 0) {
      return (
        <ResponsiveCard className="p-6 text-center">
          <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
          <h4 className="text-responsive-lg font-medium text-gray-800 mb-2">
            素晴らしい投資戦略です！
          </h4>
          <p className="text-gray-500">
            現在のところ、改善提案はありません。この調子で継続してください。
          </p>
        </ResponsiveCard>
      );
    }

    return (
      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <ResponsiveCard key={index} className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {suggestion.type === 'warning' && <AlertTriangle className="text-orange-500" size={20} />}
                {suggestion.type === 'info' && <Info className="text-blue-500" size={20} />}
                {suggestion.type === 'success' && <CheckCircle className="text-green-500" size={20} />}
              </div>
              
              <div className="flex-1">
                <h5 className="font-bold text-gray-800 mb-2">{suggestion.title}</h5>
                <p className="text-sm text-gray-600 mb-3">{suggestion.description}</p>
                
                {suggestion.actionable && (
                  <div className="flex items-center gap-2 text-xs text-blue-600">
                    <Target size={12} />
                    <span>アクション推奨</span>
                  </div>
                )}
              </div>
            </div>
          </ResponsiveCard>
        ))}
      </div>
    );
  };

  if (performanceData.length === 0 && viewMode === 'overview') {
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

        {/* ビューモード選択 */}
        <div className="mb-4">
          <FlexLayout direction="row" gap="sm" className="mb-3">
            <TouchOptimizedButton
              onClick={() => setViewMode('overview')}
              variant={viewMode === 'overview' ? 'primary' : 'ghost'}
              size="sm"
              icon={BarChart3}
            >
              概要
            </TouchOptimizedButton>
            <TouchOptimizedButton
              onClick={() => setViewMode('comparison')}
              variant={viewMode === 'comparison' ? 'primary' : 'ghost'}
              size="sm"
              icon={Target}
            >
              比較
            </TouchOptimizedButton>
            <TouchOptimizedButton
              onClick={() => setViewMode('trends')}
              variant={viewMode === 'trends' ? 'primary' : 'ghost'}
              size="sm"
              icon={TrendingUp}
            >
              推移
            </TouchOptimizedButton>
            <TouchOptimizedButton
              onClick={() => setViewMode('suggestions')}
              variant={viewMode === 'suggestions' ? 'primary' : 'ghost'}
              size="sm"
              icon={Info}
            >
              提案
            </TouchOptimizedButton>
          </FlexLayout>
        </div>

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
        {viewMode === 'overview' && performanceData.length > 0 && (
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
        )}
      </ResponsiveCard>

      {/* メインコンテンツ */}
      {renderMainContent()}
    </div>
  );
};