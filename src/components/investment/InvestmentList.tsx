import React, { useState, memo, useMemo, useCallback } from 'react';
import { ArrowLeft, Filter, Download, Trash2, Calendar } from 'lucide-react';
import { Investment } from '@/types/investment';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { investmentRepository } from '@/services/repositories/InvestmentRepository';
import { shallowCompare } from '@/utils/performanceOptimization';

interface InvestmentListProps {
  investments: Investment[];
  onBack: () => void;
  onRefresh: () => Promise<void>;
}

interface FilterOptions {
  betType: Investment['betType'] | 'all';
  period: 'all' | 'today' | 'week' | 'month';
  profitFilter: 'all' | 'profit' | 'loss';
}

const InvestmentListComponent: React.FC<InvestmentListProps> = ({
  investments,
  onBack,
  onRefresh
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    betType: 'all',
    period: 'all',
    profitFilter: 'all'
  });
  const [selectedInvestments, setSelectedInvestments] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // フィルタリング処理（メモ化）
  const filteredInvestments = useMemo(() => {
    return investments.filter(investment => {
      // 券種フィルタ
      if (filters.betType !== 'all' && investment.betType !== filters.betType) {
        return false;
      }

      // 期間フィルタ
      if (filters.period !== 'all') {
        const now = new Date();
        const investmentDate = new Date(investment.timestamp);
        
        switch (filters.period) {
          case 'today':
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            if (investmentDate < today || investmentDate >= tomorrow) return false;
            break;
          case 'week':
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            if (investmentDate < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = new Date(now);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            if (investmentDate < monthAgo) return false;
            break;
        }
      }

      // 損益フィルタ
      if (filters.profitFilter !== 'all') {
        if (filters.profitFilter === 'profit' && investment.profit <= 0) return false;
        if (filters.profitFilter === 'loss' && investment.profit >= 0) return false;
      }

      return true;
    });
  }, [investments, filters]);

  // メモ化されたフォーマット関数
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(amount);
  }, []);

  const formatDate = useCallback((date: Date): string => {
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }, []);

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

  // メモ化されたイベントハンドラー
  const handleSelectInvestment = useCallback((id: string) => {
    setSelectedInvestments(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedInvestments(prev => {
      if (prev.size === filteredInvestments.length) {
        return new Set();
      } else {
        return new Set(filteredInvestments.map(inv => inv.id));
      }
    });
  }, [filteredInvestments]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedInvestments.size === 0) return;

    try {
      setIsDeleting(true);
      await investmentRepository.deleteMany(Array.from(selectedInvestments));
      setSelectedInvestments(new Set());
      await onRefresh();
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedInvestments, onRefresh]);

  const handleExport = useCallback(async () => {
    try {
      const blob = await investmentRepository.export('csv');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `投資記録_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('エクスポートエラー:', error);
      alert('エクスポートに失敗しました');
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <TouchOptimizedButton
            variant="secondary"
            size="sm"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4" />
          </TouchOptimizedButton>
          <h2 className="text-xl font-bold text-gray-900 ml-3">投資履歴</h2>
        </div>
        <div className="flex space-x-2">
          <TouchOptimizedButton
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
          </TouchOptimizedButton>
          <TouchOptimizedButton
            variant="secondary"
            size="sm"
            onClick={handleExport}
          >
            <Download className="w-4 h-4" />
          </TouchOptimizedButton>
        </div>
      </div>

      {/* フィルタ */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h3 className="font-medium text-gray-900">フィルタ</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 券種フィルタ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                券種
              </label>
              <select
                value={filters.betType}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  betType: e.target.value as FilterOptions['betType'] 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                <option value="win">単勝</option>
                <option value="place">複勝</option>
                <option value="exacta">馬連</option>
                <option value="quinella">馬単</option>
                <option value="trio">3連複</option>
                <option value="trifecta">3連単</option>
                <option value="tierce">ワイド</option>
              </select>
            </div>

            {/* 期間フィルタ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                期間
              </label>
              <select
                value={filters.period}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  period: e.target.value as FilterOptions['period'] 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                <option value="today">今日</option>
                <option value="week">1週間</option>
                <option value="month">1ヶ月</option>
              </select>
            </div>

            {/* 損益フィルタ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                損益
              </label>
              <select
                value={filters.profitFilter}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  profitFilter: e.target.value as FilterOptions['profitFilter'] 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                <option value="profit">利益のみ</option>
                <option value="loss">損失のみ</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 選択操作 */}
      {filteredInvestments.length > 0 && (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={selectedInvestments.size === filteredInvestments.length && filteredInvestments.length > 0}
              onChange={handleSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              {selectedInvestments.size > 0 ? 
                `${selectedInvestments.size}件選択中` : 
                'すべて選択'}
            </span>
          </div>
          {selectedInvestments.size > 0 && (
            <TouchOptimizedButton
              variant="danger"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {isDeleting ? '削除中...' : '削除'}
            </TouchOptimizedButton>
          )}
        </div>
      )}

      {/* 投資リスト */}
      <div className="space-y-3">
        {filteredInvestments.map((investment) => (
          <div
            key={investment.id}
            className={`bg-white rounded-lg shadow p-4 ${
              selectedInvestments.has(investment.id) ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={selectedInvestments.has(investment.id)}
                  onChange={() => handleSelectInvestment(investment.id)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getBetTypeLabel(investment.betType)}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {investment.selections.join('-')}番
                    </span>
                    <span className="text-xs text-gray-500">
                      {investment.odds.toFixed(1)}倍
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <div className="flex items-center space-x-4">
                      <span>{investment.venue} {investment.raceNumber}R</span>
                      <span className="flex items-center">
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
              </div>

              <div className="text-right">
                <div className={`text-lg font-semibold ${
                  investment.profit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {investment.profit >= 0 ? '+' : ''}{formatCurrency(investment.profit)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  回収率: {((investment.payout / investment.amount) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 結果が空の場合 */}
      {filteredInvestments.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <Filter className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            条件に一致する記録がありません
          </h3>
          <p className="text-gray-600">
            フィルタ条件を変更してください
          </p>
        </div>
      )}

      {/* サマリー */}
      {filteredInvestments.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-medium text-gray-900 mb-3">表示中の統計</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">件数:</span>
                <span className="font-medium">{filteredInvestments.length}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">総投資:</span>
                <span className="font-medium">
                  {formatCurrency(filteredInvestments.reduce((sum, inv) => sum + inv.amount, 0))}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">総払戻:</span>
                <span className="font-medium">
                  {formatCurrency(filteredInvestments.reduce((sum, inv) => sum + inv.payout, 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">損益:</span>
                <span className={`font-medium ${
                  filteredInvestments.reduce((sum, inv) => sum + inv.profit, 0) >= 0 ? 
                  'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(filteredInvestments.reduce((sum, inv) => sum + inv.profit, 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// メモ化されたコンポーネントをエクスポート
export const InvestmentList = memo(InvestmentListComponent, shallowCompare);