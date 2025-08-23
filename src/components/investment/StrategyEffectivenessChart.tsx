import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ResponsiveCard, ResponsiveGrid } from '@/components/common/ResponsiveContainer';
import { TrendingUp, TrendingDown, Target, DollarSign, BarChart3 } from 'lucide-react';
import { Investment } from '@/types/investment';

interface StrategyEffectivenessChartProps {
  investments: Investment[];
}

interface ChartDataPoint {
  date: string;
  aiROI: number;
  manualROI: number;
  aiCumulative: number;
  manualCumulative: number;
  aiCount: number;
  manualCount: number;
}

export const StrategyEffectivenessChart: React.FC<StrategyEffectivenessChartProps> = ({
  investments
}) => {
  // データを日付順にソート
  const sortedInvestments = [...investments].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // 日別データを生成
  const generateChartData = (): ChartDataPoint[] => {
    const dailyData = new Map<string, {
      aiInvestments: Investment[];
      manualInvestments: Investment[];
    }>();

    // 日別にデータを分類
    sortedInvestments.forEach(investment => {
      const date = new Date(investment.timestamp).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, { aiInvestments: [], manualInvestments: [] });
      }
      
      const dayData = dailyData.get(date)!;
      if (investment.strategyUsed) {
        dayData.aiInvestments.push(investment);
      } else {
        dayData.manualInvestments.push(investment);
      }
    });

    // チャートデータを生成
    const chartData: ChartDataPoint[] = [];
    let aiCumulative = 0;
    let manualCumulative = 0;

    Array.from(dailyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, data]) => {
        // AI戦略のROI計算
        const aiTotalInvestment = data.aiInvestments.reduce((sum, inv) => sum + inv.amount, 0);
        const aiTotalPayout = data.aiInvestments.reduce((sum, inv) => sum + inv.payout, 0);
        const aiDailyROI = aiTotalInvestment > 0 ? ((aiTotalPayout - aiTotalInvestment) / aiTotalInvestment) * 100 : 0;
        
        // 手動投資のROI計算
        const manualTotalInvestment = data.manualInvestments.reduce((sum, inv) => sum + inv.amount, 0);
        const manualTotalPayout = data.manualInvestments.reduce((sum, inv) => sum + inv.payout, 0);
        const manualDailyROI = manualTotalInvestment > 0 ? ((manualTotalPayout - manualTotalInvestment) / manualTotalInvestment) * 100 : 0;

        // 累積損益を更新
        aiCumulative += aiTotalPayout - aiTotalInvestment;
        manualCumulative += manualTotalPayout - manualTotalInvestment;

        chartData.push({
          date: new Date(date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
          aiROI: Number(aiDailyROI.toFixed(1)),
          manualROI: Number(manualDailyROI.toFixed(1)),
          aiCumulative: Number(aiCumulative.toFixed(0)),
          manualCumulative: Number(manualCumulative.toFixed(0)),
          aiCount: data.aiInvestments.length,
          manualCount: data.manualInvestments.length
        });
      });

    return chartData;
  };

  const chartData = generateChartData();

  // 統計サマリーを計算
  const calculateSummaryStats = () => {
    const aiInvestments = investments.filter(inv => inv.strategyUsed);
    const manualInvestments = investments.filter(inv => !inv.strategyUsed);

    const calculateStats = (invs: Investment[]) => {
      if (invs.length === 0) return { roi: 0, hitRate: 0, avgAmount: 0, totalProfit: 0 };
      
      const totalInvestment = invs.reduce((sum, inv) => sum + inv.amount, 0);
      const totalPayout = invs.reduce((sum, inv) => sum + inv.payout, 0);
      const roi = totalInvestment > 0 ? ((totalPayout - totalInvestment) / totalInvestment) * 100 : 0;
      const hits = invs.filter(inv => inv.payout > inv.amount).length;
      const hitRate = invs.length > 0 ? (hits / invs.length) * 100 : 0;
      const avgAmount = totalInvestment / invs.length;
      const totalProfit = totalPayout - totalInvestment;
      
      return { roi, hitRate, avgAmount, totalProfit };
    };

    return {
      ai: calculateStats(aiInvestments),
      manual: calculateStats(manualInvestments),
      aiCount: aiInvestments.length,
      manualCount: manualInvestments.length
    };
  };

  const stats = calculateSummaryStats();

  if (chartData.length === 0) {
    return (
      <ResponsiveCard className="p-6 text-center">
        <Target className="mx-auto mb-4 text-gray-400" size={48} />
        <h3 className="text-responsive-lg font-medium text-gray-600 mb-2">
          戦略効果データがありません
        </h3>
        <p className="text-responsive-sm text-gray-500">
          AI戦略と手動投資の両方のデータが蓄積されると、効果比較チャートが表示されます
        </p>
      </ResponsiveCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* サマリー統計 */}
      <ResponsiveCard className="p-4">
        <h3 className="text-responsive-lg font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="text-blue-600" size={20} />
          戦略効果サマリー
        </h3>
        
        <ResponsiveGrid columns={{ mobile: 2 }} gap="md">
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
            <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              AI戦略 ({stats.aiCount}件)
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-700">ROI:</span>
                <span className={`font-bold ${stats.ai.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.ai.roi >= 0 ? '+' : ''}{stats.ai.roi.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-700">的中率:</span>
                <span className="font-bold text-blue-600">{stats.ai.hitRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-700">総損益:</span>
                <span className={`font-bold ${stats.ai.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.ai.totalProfit >= 0 ? '+' : ''}{stats.ai.totalProfit.toLocaleString()}円
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              手動投資 ({stats.manualCount}件)
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">ROI:</span>
                <span className={`font-bold ${stats.manual.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.manual.roi >= 0 ? '+' : ''}{stats.manual.roi.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">的中率:</span>
                <span className="font-bold text-blue-600">{stats.manual.hitRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">総損益:</span>
                <span className={`font-bold ${stats.manual.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.manual.totalProfit >= 0 ? '+' : ''}{stats.manual.totalProfit.toLocaleString()}円
                </span>
              </div>
            </div>
          </div>
        </ResponsiveGrid>

        {/* パフォーマンス比較 */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h5 className="font-medium text-blue-900 mb-2">パフォーマンス差</h5>
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">ROI差:</span>
            <div className="flex items-center gap-2">
              {stats.ai.roi > stats.manual.roi ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : stats.ai.roi < stats.manual.roi ? (
                <TrendingDown className="w-4 h-4 text-red-600" />
              ) : (
                <Target className="w-4 h-4 text-gray-600" />
              )}
              <span className={`font-bold ${
                stats.ai.roi > stats.manual.roi ? 'text-green-600' : 
                stats.ai.roi < stats.manual.roi ? 'text-red-600' : 'text-gray-600'
              }`}>
                {stats.ai.roi > stats.manual.roi ? '+' : ''}{(stats.ai.roi - stats.manual.roi).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-blue-700">的中率差:</span>
            <span className={`font-bold ${
              stats.ai.hitRate > stats.manual.hitRate ? 'text-green-600' : 
              stats.ai.hitRate < stats.manual.hitRate ? 'text-red-600' : 'text-gray-600'
            }`}>
              {stats.ai.hitRate > stats.manual.hitRate ? '+' : ''}{(stats.ai.hitRate - stats.manual.hitRate).toFixed(1)}%
            </span>
          </div>
        </div>
      </ResponsiveCard>

      {/* 累積損益推移チャート */}
      <ResponsiveCard className="p-4">
        <h3 className="text-responsive-lg font-bold mb-4">累積損益推移</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                fontSize={12}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                fontSize={12}
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => `${value.toLocaleString()}円`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString()}円`,
                  name === 'aiCumulative' ? 'AI戦略' : '手動投資'
                ]}
                labelFormatter={(label) => `日付: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="aiCumulative" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                name="AI戦略"
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="manualCumulative" 
                stroke="#6b7280" 
                strokeWidth={2}
                name="手動投資"
                dot={{ fill: '#6b7280', strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ResponsiveCard>

      {/* 日次ROI比較チャート */}
      <ResponsiveCard className="p-4">
        <h3 className="text-responsive-lg font-bold mb-4">日次ROI比較</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                fontSize={12}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                fontSize={12}
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value}%`,
                  name === 'aiROI' ? 'AI戦略ROI' : '手動投資ROI'
                ]}
                labelFormatter={(label) => `日付: ${label}`}
              />
              <Legend />
              <Bar 
                dataKey="aiROI" 
                fill="#8b5cf6" 
                name="AI戦略ROI"
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="manualROI" 
                fill="#6b7280" 
                name="手動投資ROI"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ResponsiveCard>

      {/* 投資回数推移 */}
      <ResponsiveCard className="p-4">
        <h3 className="text-responsive-lg font-bold mb-4">日次投資回数</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                fontSize={12}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                fontSize={12}
                tick={{ fontSize: 10 }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value}件`,
                  name === 'aiCount' ? 'AI戦略' : '手動投資'
                ]}
                labelFormatter={(label) => `日付: ${label}`}
              />
              <Legend />
              <Bar 
                dataKey="aiCount" 
                fill="#8b5cf6" 
                name="AI戦略"
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="manualCount" 
                fill="#6b7280" 
                name="手動投資"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ResponsiveCard>
    </div>
  );
};