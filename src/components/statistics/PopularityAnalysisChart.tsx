import React, { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Target, DollarSign, Percent } from 'lucide-react';
import { ResponsiveCard } from '@/components/common/ResponsiveContainer';
import { PopularityAnalysis, OddsAnalysis, PredictionRankAnalysis } from '@/services/popularityAnalysisService';

interface PopularityAnalysisChartProps {
  popularityData: PopularityAnalysis[];
  oddsData: OddsAnalysis[];
  rankData: PredictionRankAnalysis[];
  className?: string;
}

// カスタムツールチップコンポーネント
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-medium text-gray-800">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? 
              (entry.name.includes('率') || entry.name.includes('ROI') ? 
                `${entry.value.toFixed(1)}%` : 
                entry.value.toFixed(1)
              ) : 
              entry.value
            }
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// 統計カード表示コンポーネント
const StatsCard = memo(({ icon: Icon, title, value, subtitle, color = "blue" }: {
  icon: React.ComponentType<any>;
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
}) => (
  <div className="bg-white rounded-lg p-4 shadow-sm border">
    <div className="flex items-center">
      <div className={`p-2 rounded-lg bg-${color}-100`}>
        <Icon className={`w-5 h-5 text-${color}-600`} />
      </div>
      <div className="ml-3">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-500">{subtitle}</p>
        )}
      </div>
    </div>
  </div>
));

export const PopularityAnalysisChart = memo<PopularityAnalysisChartProps>(({ 
  popularityData, 
  oddsData, 
  rankData,
  className = "" 
}) => {
  // 全体統計の計算
  const totalStats = React.useMemo(() => {
    const totalPredictions = popularityData.reduce((sum, item) => sum + item.totalPredictions, 0);
    const totalHits = popularityData.reduce((sum, item) => sum + item.hitCount, 0);
    const totalInvestment = popularityData.reduce((sum, item) => sum + item.totalInvestment, 0);
    const totalPayout = popularityData.reduce((sum, item) => sum + item.totalPayout, 0);
    const overallROI = totalInvestment > 0 ? ((totalPayout - totalInvestment) / totalInvestment) * 100 : 0;
    
    return {
      totalPredictions,
      overallHitRate: totalPredictions > 0 ? (totalHits / totalPredictions) * 100 : 0,
      overallROI,
      totalProfit: totalPayout - totalInvestment
    };
  }, [popularityData]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 概要統計 */}
      <ResponsiveCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">人気・オッズ分析概要</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            icon={Target}
            title="総予想数"
            value={totalStats.totalPredictions.toString()}
            color="blue"
          />
          <StatsCard
            icon={TrendingUp}
            title="全体的中率"
            value={`${totalStats.overallHitRate.toFixed(1)}%`}
            color="green"
          />
          <StatsCard
            icon={DollarSign}
            title="全体ROI"
            value={`${totalStats.overallROI.toFixed(1)}%`}
            subtitle={totalStats.overallROI >= 0 ? "利益" : "損失"}
            color={totalStats.overallROI >= 0 ? "green" : "red"}
          />
          <StatsCard
            icon={Percent}
            title="収支"
            value={`${totalStats.totalProfit >= 0 ? '+' : ''}${totalStats.totalProfit.toLocaleString()}円`}
            color={totalStats.totalProfit >= 0 ? "green" : "red"}
          />
        </div>
      </ResponsiveCard>

      {/* 人気別分析 */}
      <ResponsiveCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">人気別パフォーマンス</h3>
        <div className="h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={popularityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="hitRate" 
                name="的中率(%)" 
                fill="#10B981" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                yAxisId="right"
                dataKey="roi" 
                name="ROI(%)" 
                fill="#3B82F6" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 人気別詳細データテーブル */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  人気帯
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  予想数
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  的中数
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  的中率
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  平均オッズ
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ROI
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {popularityData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="text-sm font-medium text-gray-900">
                        {item.range}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-gray-900">
                    {item.totalPredictions}
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-gray-900">
                    {item.hitCount}
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-gray-900">
                    {item.hitRate.toFixed(1)}%
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-gray-900">
                    {item.averageOdds.toFixed(1)}倍
                  </td>
                  <td className={`px-4 py-4 text-center text-sm font-medium ${
                    item.roi >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.roi >= 0 ? '+' : ''}{item.roi.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ResponsiveCard>

      {/* オッズ別分析 */}
      <ResponsiveCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">オッズ別パフォーマンス</h3>
        <div className="h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={oddsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="hitRate" 
                name="的中率(%)" 
                fill="#F59E0B" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                yAxisId="right"
                dataKey="roi" 
                name="ROI(%)" 
                fill="#EF4444" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* オッズ別詳細データテーブル */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  オッズ帯
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  予想数
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  的中数
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  的中率
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  平均オッズ
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ROI
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {oddsData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="text-sm font-medium text-gray-900">
                        {item.range}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-gray-900">
                    {item.totalPredictions}
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-gray-900">
                    {item.hitCount}
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-gray-900">
                    {item.hitRate.toFixed(1)}%
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-gray-900">
                    {item.averageOdds.toFixed(1)}倍
                  </td>
                  <td className={`px-4 py-4 text-center text-sm font-medium ${
                    item.roi >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.roi >= 0 ? '+' : ''}{item.roi.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ResponsiveCard>

      {/* 予想順位別分析 */}
      <ResponsiveCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">予想順位別パフォーマンス</h3>
        <div className="h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rankData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="rank" />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="hitRate" 
                name="的中率(%)" 
                fill="#8B5CF6" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                yAxisId="right"
                dataKey="averagePopularity" 
                name="平均人気" 
                fill="#6366F1" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 予想順位別詳細データ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rankData.map((item, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="text-center">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  {item.rank}位予想
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">予想数:</span>
                    <span className="font-medium">{item.totalPredictions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">的中率:</span>
                    <span className="font-medium text-green-600">{item.hitRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">平均人気:</span>
                    <span className="font-medium">{item.averagePopularity.toFixed(1)}番</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">平均オッズ:</span>
                    <span className="font-medium">{item.averageOdds.toFixed(1)}倍</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ResponsiveCard>
    </div>
  );
});

PopularityAnalysisChart.displayName = 'PopularityAnalysisChart';