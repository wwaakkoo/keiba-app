import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Target, AlertTriangle, Award, BarChart3 } from 'lucide-react';
import { Investment } from '@/types/investment';
import { investmentPerformanceService, PerformanceMetrics } from '@/services/investmentPerformanceService';
import { investmentRepository } from '@/services/repositories/InvestmentRepository';

interface PerformanceMetricsProps {
  investments?: Investment[];
  period?: 'all' | 'year' | 'month' | 'week';
}

export const PerformanceMetricsComponent: React.FC<PerformanceMetricsProps> = ({
  investments: propInvestments,
  period = 'all'
}) => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInvestments();
  }, [period, propInvestments]);

  const loadInvestments = async () => {
    try {
      setIsLoading(true);
      
      let investmentData: Investment[];
      
      if (propInvestments) {
        investmentData = propInvestments;
      } else {
        // 期間に応じてデータを取得
        const now = new Date();
        let startDate: Date;
        
        switch (period) {
          case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            startDate = new Date(now);
            startDate.setFullYear(now.getFullYear() - 1);
            break;
          default:
            startDate = new Date(0); // 全期間
        }
        
        investmentData = await investmentRepository.getByPeriod(startDate, now);
      }
      
      setInvestments(investmentData);
      
      // パフォーマンス指標を計算
      const performanceMetrics = investmentPerformanceService.calculatePerformance(investmentData);
      setMetrics(performanceMetrics);
      
    } catch (error) {
      console.error('パフォーマンス指標読み込みエラー:', error);
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

  const getRatingColor = (rating: 'excellent' | 'good' | 'fair' | 'poor'): string => {
    switch (rating) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
    }
  };

  const getRatingIcon = (rating: 'excellent' | 'good' | 'fair' | 'poor') => {
    switch (rating) {
      case 'excellent': return <Award className="w-4 h-4" />;
      case 'good': return <TrendingUp className="w-4 h-4" />;
      case 'fair': return <Target className="w-4 h-4" />;
      case 'poor': return <AlertTriangle className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">パフォーマンス分析中...</span>
      </div>
    );
  }

  if (!metrics || investments.length === 0) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">データが不足しています</h3>
        <p className="text-gray-600">
          パフォーマンス分析には投資記録が必要です
        </p>
      </div>
    );
  }

  const performanceRating = investmentPerformanceService.getPerformanceRating(metrics);

  return (
    <div className="space-y-6">
      {/* 総合評価 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">パフォーマンス評価</h3>
          <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRatingColor(performanceRating.overall)}`}>
            {getRatingIcon(performanceRating.overall)}
            <span className="ml-1">
              {performanceRating.overall === 'excellent' ? '優秀' :
               performanceRating.overall === 'good' ? '良好' :
               performanceRating.overall === 'fair' ? '普通' : '要改善'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {performanceRating.factors.map((factor, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{factor.name}</span>
                <div className={`flex items-center px-2 py-1 rounded text-xs font-medium ${getRatingColor(factor.rating)}`}>
                  {getRatingIcon(factor.rating)}
                </div>
              </div>
              <div className="text-lg font-semibold text-gray-900 mb-1">
                {factor.value}
              </div>
              <div className="text-xs text-gray-500">
                {factor.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 詳細指標 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* ROI */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${metrics.roi >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {metrics.roi >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">ROI</p>
              <p className={`text-lg font-semibold ${metrics.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(metrics.roi)}
              </p>
            </div>
          </div>
        </div>

        {/* シャープレシオ */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">シャープレシオ</p>
              <p className="text-lg font-semibold text-gray-900">
                {metrics.sharpeRatio.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* 最大ドローダウン */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">最大DD</p>
              <p className="text-lg font-semibold text-red-600">
                {formatPercentage(metrics.maxDrawdown)}
              </p>
            </div>
          </div>
        </div>

        {/* プロフィットファクター */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">PF</p>
              <p className="text-lg font-semibold text-gray-900">
                {metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* ボラティリティ */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">ボラティリティ</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatPercentage(metrics.volatility)}
              </p>
            </div>
          </div>
        </div>

        {/* 現在の連勝/連敗 */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${metrics.currentStreak.type === 'win' ? 'bg-green-100' : 'bg-red-100'}`}>
              {metrics.currentStreak.type === 'win' ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">現在の連続</p>
              <p className={`text-lg font-semibold ${metrics.currentStreak.type === 'win' ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.currentStreak.type === 'win' ? '連勝' : '連敗'} {metrics.currentStreak.count}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 詳細統計 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">詳細統計</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">最大連勝:</span>
              <span className="font-medium text-green-600">{metrics.winStreak}回</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">最大連敗:</span>
              <span className="font-medium text-red-600">{metrics.loseStreak}回</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">平均勝利額:</span>
              <span className="font-medium text-green-600">{formatCurrency(metrics.averageWin)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">平均損失額:</span>
              <span className="font-medium text-red-600">{formatCurrency(metrics.averageLoss)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">総投資回数:</span>
              <span className="font-medium">{investments.length}回</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">分析期間:</span>
              <span className="font-medium">
                {period === 'all' ? '全期間' :
                 period === 'year' ? '1年' :
                 period === 'month' ? '1ヶ月' : '1週間'}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">勝率:</span>
              <span className="font-medium">
                {investments.length > 0 ? 
                  formatPercentage((investments.filter(inv => inv.profit > 0).length / investments.length) * 100) : 
                  '0%'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">損益比:</span>
              <span className="font-medium">
                {metrics.averageLoss > 0 ? (metrics.averageWin / metrics.averageLoss).toFixed(2) : '∞'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 月次パフォーマンス */}
      {metrics.monthlyReturns.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">月次パフォーマンス</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    月
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    投資額
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    損益
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    リターン率
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metrics.monthlyReturns.slice(-6).map((monthData) => (
                  <tr key={monthData.month}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {new Date(monthData.month + '-01').toLocaleDateString('ja-JP', { 
                        year: 'numeric', 
                        month: 'short' 
                      })}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(monthData.investment)}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${
                      monthData.profit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {monthData.profit >= 0 ? '+' : ''}{formatCurrency(monthData.profit)}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${
                      monthData.returnRate >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatPercentage(monthData.returnRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};