import React, { memo, useCallback } from 'react';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { Investment } from '@/types/investment';
import { VirtualScrollList } from '@/components/common/VirtualScrollList';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';

interface VirtualizedInvestmentListProps {
  investments: Investment[];
  onItemSelect?: (investment: Investment) => void;
  onItemEdit?: (investment: Investment) => void;
  containerHeight?: number;
  itemHeight?: number;
}

const VirtualizedInvestmentListComponent: React.FC<VirtualizedInvestmentListProps> = ({
  investments,
  onItemSelect,
  onItemEdit,
  containerHeight = 400,
  itemHeight = 120
}) => {
  // 通貨フォーマット
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(amount);
  }, []);

  // 日付フォーマット
  const formatDate = useCallback((date: Date): string => {
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }, []);

  // 券種ラベル
  const getBetTypeLabel = useCallback((betType: Investment['betType']): string => {
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
  }, []);

  // アイテムレンダラー
  const renderInvestmentItem = useCallback((investment: Investment, _index: number) => {
    const isProfit = investment.profit >= 0;
    const returnRate = ((investment.payout / investment.amount) * 100).toFixed(1);

    return (
      <div
        className="bg-white border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors"
        onClick={() => onItemSelect?.(investment)}
      >
        <div className="flex items-start justify-between">
          {/* 左側：基本情報 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {getBetTypeLabel(investment.betType)}
              </span>
              <span className="text-sm font-medium text-gray-900 truncate">
                {investment.selections.join('-')}番
              </span>
              <span className="text-xs text-gray-500">
                {investment.odds.toFixed(1)}倍
              </span>
            </div>
            
            <div className="text-sm text-gray-600 mb-2">
              <div className="flex items-center space-x-3">
                <span className="truncate">
                  {investment.venue} {investment.raceNumber}R
                </span>
                <span className="flex items-center flex-shrink-0">
                  <Calendar className="w-3 h-3 mr-1" />
                  {formatDate(investment.timestamp)}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm">
              <span className="text-gray-600">
                投資: {formatCurrency(investment.amount)}
              </span>
              <span className="text-gray-600">
                払戻: {formatCurrency(investment.payout)}
              </span>
            </div>
          </div>

          {/* 右側：損益情報 */}
          <div className="text-right ml-4 flex-shrink-0">
            <div className={`text-lg font-semibold flex items-center ${
              isProfit ? 'text-green-600' : 'text-red-600'
            }`}>
              {isProfit ? (
                <TrendingUp className="w-4 h-4 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 mr-1" />
              )}
              {isProfit ? '+' : ''}{formatCurrency(investment.profit)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              回収率: {returnRate}%
            </div>
            {onItemEdit && (
              <TouchOptimizedButton
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e?.stopPropagation();
                  onItemEdit(investment);
                }}
                className="mt-2"
              >
                編集
              </TouchOptimizedButton>
            )}
          </div>
        </div>
      </div>
    );
  }, [formatCurrency, formatDate, getBetTypeLabel, onItemSelect, onItemEdit]);

  // 投資データが空の場合
  if (investments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>投資記録がありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <VirtualScrollList
        items={investments}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        renderItem={renderInvestmentItem}
        overscan={3}
        className="border border-gray-200"
      />
    </div>
  );
};

export const VirtualizedInvestmentList = memo(VirtualizedInvestmentListComponent);