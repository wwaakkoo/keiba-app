import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, BarChart3, PieChart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell } from 'recharts';
import { Investment, InvestmentStats, BetTypeStats } from '@/types/investment';
import { investmentRepository, StatsCriteria } from '@/services/repositories/InvestmentRepository';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';

interface ProfitLossReportProps {
  onBack?: () => void;
}

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly';
type ReportTab = 'summary' | 'trends' | 'betTypes';

interface PeriodData {
  period: string;
  totalInvestment: number;
  totalPayout: number;
  profit: number;
  returnRate: number;
  winRate: number;
  bets: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];

export const ProfitLossReport: React.FC<ProfitLossReportProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('summary');
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1), // 過去12ヶ月
    end: new Date()
  });
  
  const [overallStats, setOverallStats] = useState<InvestmentStats | null>(null);
  const [periodData, setPeriodData] = useState<PeriodData[]>([]);
  const [betTypeStats, setBetTypeStats] = useState<BetTypeStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, [periodType, dateRange]);

  const loadReportData = async () => {
    try {
      setIsLoading(true);

      // 全体統計を取得
      const criteria: StatsCriteria = {
        startDate: dateRange.start,
        endDate: dateRange.end
      };
      
      const stats = await investmentRepository.calculateStats(criteria);
      setOverallStats(stats);

      // 期間別データを取得
      const investments = await investmentRepository.getByPeriod(dateRange.start, dateRange.end);
      const periodDataMap = generatePeriodData(investments, periodType);
      setPeriodData(periodDataMap);

      // 券種別統計を取得
      const betStats = await investmentRepository.getBetTypeStats(criteria);
      setBetTypeStats(betStats);

    } catch (error) {
      console.error('レポートデータ読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePeriodData = (investments: Investment[], type: PeriodType): PeriodData[] => {
    const dataMap = new Map<string, {
      investments: Investment[];
      totalInvestment: number;
      totalPayout: number;
      profit: number;
      bets: number;
    }>();

    // 投資データを期間別にグループ化
    investments.forEach(investment => {
      const date = new Date(investment.timestamp);
      let key: string;

      switch (type) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'yearly':
          key = String(date.getFullYear());
          break;
      }

      if (!dataMap.has(key)) {
        dataMap.set(key, {
          investments: [],
          totalInvestment: 0,
          totalPayout: 0,
          profit: 0,
          bets: 0
        });
      }

      const data = dataMap.get(key)!;
      data.investments.push(investment);
      data.totalInvestment += investment.amount;
      data.totalPayout += investment.payout;
      data.profit += investment.profit;
      data.bets += 1;
    });

    // PeriodData配列に変換
    return Array.from(dataMap.entries())
      .map(([period, data]) => ({
        period,
        totalInvestment: data.totalInvestment,
        totalPayout: data.totalPayout,
        profit: data.profit,
        returnRate: data.totalInvestment > 0 ? (data.totalPayout / data.totalInvestment) * 100 : 0,
        winRate: data.bets > 0 ? (data.investments.filter(inv => inv.profit > 0).length / data.bets) * 100 : 0,
        bets: data.bets
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPeriodLabel = (period: string, type: PeriodType): string => {
    switch (type) {
      case 'daily':
        return new Date(period).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
      case 'weekly':
        return `${new Date(period).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}週`;
      case 'monthly':
        const [year, month] = period.split('-');
        return `${year}年${parseInt(month)}月`;
      case 'yearly':
        return `${period}年`;
      default:
        return period;
    }
  };

  const getBetTypeLabel = (betType: Investment['betType']): string => {
    const labels = {
      win: '単勝',
      place: '複勝',
      exacta: '馬連',
      quinella: '馬単',
      trio: '3連複',
      trifecta: '3連単',
      tierce: 'ワイド'
    };
    return labels[betType];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">レポート生成中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          収支レポート
        </h2>
        {onBack && (
          <TouchOptimizedButton variant="secondary" size="sm" onClick={onBack}>
            戻る
          </TouchOptimizedButton>
        )}
      </div>

      {/* 期間選択 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">期間設定</h3>
          <div className="flex space-x-2">
            {(['daily', 'weekly', 'monthly', 'yearly'] as PeriodType[]).map(type => (
              <TouchOptimizedButton
                key={type}
                variant={periodType === type ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setPeriodType(type)}
              >
                {type === 'daily' ? '日別' :
                 type === 'weekly' ? '週別' :
                 type === 'monthly' ? '月別' : '年別'}
              </TouchOptimizedButton>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
            <input
              type="date"
              value={dateRange.start.toISOString().split('T')[0]}
              onChange={(e) => setDateRange(prev => ({ 
                ...prev, 
                start: new Date(e.target.value) 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
            <input
              type="date"
              value={dateRange.end.toISOString().split('T')[0]}
              onChange={(e) => setDateRange(prev => ({ 
                ...prev, 
                end: new Date(e.target.value) 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="bg-white rounded-lg shadow">
        <div className="flex border-b border-gray-200">
          {[
            { key: 'summary', label: 'サマリー', icon: BarChart3 },
            { key: 'trends', label: 'トレンド', icon: TrendingUp },
            { key: 'betTypes', label: '券種別', icon: PieChart }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as ReportTab)}
              className={`flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium border-b-2 ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* サマリータブ */}
          {activeTab === 'summary' && overallStats && (
            <div className="space-y-6">
              {/* 全体統計 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">総投資額</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(overallStats.totalInvestment)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`rounded-lg p-4 ${overallStats.totalProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg ${overallStats.totalProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                      {overallStats.totalProfit >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">総損益</p>
                      <p className={`text-lg font-semibold ${overallStats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {overallStats.totalProfit >= 0 ? '+' : ''}{formatCurrency(overallStats.totalProfit)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">回収率</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {overallStats.returnRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Calendar className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">的中率</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {overallStats.winRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 詳細統計 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">詳細統計</h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">総賭け数:</span>
                      <span className="font-medium">{overallStats.totalBets}回</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">的中数:</span>
                      <span className="font-medium text-green-600">{overallStats.winningBets}回</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">外れ数:</span>
                      <span className="font-medium text-red-600">{overallStats.losingBets}回</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">平均オッズ:</span>
                      <span className="font-medium">{overallStats.averageOdds.toFixed(1)}倍</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">最大勝利:</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(overallStats.bestWin)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">最大損失:</span>
                      <span className="font-medium text-red-600">
                        {formatCurrency(Math.abs(overallStats.worstLoss))}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">総払戻:</span>
                      <span className="font-medium">{formatCurrency(overallStats.totalPayout)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">平均投資額:</span>
                      <span className="font-medium">
                        {formatCurrency(overallStats.totalBets > 0 ? overallStats.totalInvestment / overallStats.totalBets : 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* トレンドタブ */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              {/* 損益推移グラフ */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">損益推移</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={periodData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="period" 
                        tickFormatter={(value) => formatPeriodLabel(value, periodType)}
                      />
                      <YAxis tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}K`} />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), '損益']}
                        labelFormatter={(label) => formatPeriodLabel(label, periodType)}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="profit" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 回収率推移グラフ */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">回収率推移</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={periodData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="period" 
                        tickFormatter={(value) => formatPeriodLabel(value, periodType)}
                      />
                      <YAxis tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        formatter={(value: number) => [`${value.toFixed(1)}%`, '回収率']}
                        labelFormatter={(label) => formatPeriodLabel(label, periodType)}
                      />
                      <Bar 
                        dataKey="returnRate" 
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* 券種別タブ */}
          {activeTab === 'betTypes' && (
            <div className="space-y-6">
              {/* 券種別円グラフ */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">券種別投資額分布</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={betTypeStats}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="totalInvestment"
                        nameKey="betType"
                        label={({ betType, percent }) => 
                          `${getBetTypeLabel(betType)} ${(percent * 100).toFixed(1)}%`
                        }
                      >
                        {betTypeStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), '投資額']}
                        labelFormatter={(label) => getBetTypeLabel(label as Investment['betType'])}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 券種別統計テーブル */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">券種別詳細統計</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          券種
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          回数
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          投資額
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          損益
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          回収率
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          的中率
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {betTypeStats.map((stat) => (
                        <tr key={stat.betType}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {getBetTypeLabel(stat.betType)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {stat.count}回
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(stat.totalInvestment)}
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${
                            stat.profit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {stat.profit >= 0 ? '+' : ''}{formatCurrency(stat.profit)}
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${
                            stat.returnRate >= 100 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {stat.returnRate.toFixed(1)}%
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {stat.winRate.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};