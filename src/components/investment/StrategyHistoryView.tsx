import React, { useState, useEffect } from 'react';
import { ResponsiveCard, ResponsiveGrid, FlexLayout } from '@/components/common/ResponsiveContainer';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { StrategyEffectivenessChart } from './StrategyEffectivenessChart';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  Zap, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  BarChart3,
  Filter,
  Eye,
  EyeOff,
  PieChart
} from 'lucide-react';
import { Investment } from '@/types/investment';
import { investmentRepository } from '@/services/repositories/InvestmentRepository';

interface StrategyHistoryEntry extends Investment {
  actualReturn?: number;
  strategyAccuracy?: number;
  isSimulated?: boolean;
}

interface StrategyHistoryViewProps {
  investments: Investment[];
}

export const StrategyHistoryView: React.FC<StrategyHistoryViewProps> = ({
  investments
}) => {
  const [strategyInvestments, setStrategyInvestments] = useState<StrategyHistoryEntry[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'ai' | 'manual'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'performance' | 'confidence'>('date');
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({});
  const [viewMode, setViewMode] = useState<'summary' | 'chart' | 'list'>('summary');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStrategyHistory();
  }, [investments]);

  const loadStrategyHistory = async () => {
    try {
      setIsLoading(true);
      
      // 戦略情報付きの投資記録を取得
      const strategyData = investments.map(investment => ({
        ...investment,
        actualReturn: investment.payout - investment.amount,
        strategyAccuracy: calculateStrategyAccuracy(investment)
      })) as StrategyHistoryEntry[];

      // フィルタリングとソート
      const filtered = filterInvestments(strategyData, filterType);
      const sorted = sortInvestments(filtered, sortBy);
      
      setStrategyInvestments(sorted);
    } catch (error) {
      console.error('戦略履歴読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStrategyAccuracy = (investment: Investment): number => {
    if (!investment.strategyUsed || !investment.expectedReturn) return 0;
    
    const actualReturn = investment.payout - investment.amount;
    const expectedReturn = investment.expectedReturn;
    
    if (expectedReturn === 0) return actualReturn >= 0 ? 100 : 0;
    
    // 期待値との乖離率を計算（100%が完全一致）
    const accuracy = Math.max(0, 100 - Math.abs((actualReturn - expectedReturn) / Math.abs(expectedReturn)) * 100);
    return Math.min(100, accuracy);
  };

  const filterInvestments = (investments: StrategyHistoryEntry[], filter: string): StrategyHistoryEntry[] => {
    switch (filter) {
      case 'ai':
        return investments.filter(inv => inv.strategyUsed);
      case 'manual':
        return investments.filter(inv => !inv.strategyUsed);
      default:
        return investments;
    }
  };

  const sortInvestments = (investments: StrategyHistoryEntry[], sort: string): StrategyHistoryEntry[] => {
    return [...investments].sort((a, b) => {
      switch (sort) {
        case 'performance':
          const aReturn = (a.payout - a.amount) / a.amount;
          const bReturn = (b.payout - b.amount) / b.amount;
          return bReturn - aReturn;
        case 'confidence':
          return (b.strategyConfidence || 0) - (a.strategyConfidence || 0);
        case 'date':
        default:
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
    });
  };

  const toggleDetails = (investmentId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [investmentId]: !prev[investmentId]
    }));
  };

  const getRiskLevelColor = (level?: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskLevelIcon = (level?: string) => {
    switch (level) {
      case 'low': return <Shield className="w-4 h-4" />;
      case 'medium': return <Target className="w-4 h-4" />;
      case 'high': return <Zap className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getBetTypeLabel = (type: string) => {
    const labels = {
      win: '単勝',
      place: '複勝',
      exacta: '馬連',
      quinella: '馬単',
      trifecta: '3連複',
      wide: 'ワイド'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getStrategyStats = () => {
    const aiInvestments = strategyInvestments.filter(inv => inv.strategyUsed);
    const manualInvestments = strategyInvestments.filter(inv => !inv.strategyUsed);

    const calculateStats = (investments: StrategyHistoryEntry[]) => {
      if (investments.length === 0) return { roi: 0, hitRate: 0, avgAccuracy: 0 };
      
      const totalInvestment = investments.reduce((sum, inv) => sum + inv.amount, 0);
      const totalPayout = investments.reduce((sum, inv) => sum + inv.payout, 0);
      const roi = totalInvestment > 0 ? ((totalPayout - totalInvestment) / totalInvestment) * 100 : 0;
      
      const hits = investments.filter(inv => inv.payout > inv.amount).length;
      const hitRate = investments.length > 0 ? (hits / investments.length) * 100 : 0;
      
      const avgAccuracy = investments.reduce((sum, inv) => sum + (inv.strategyAccuracy || 0), 0) / investments.length;
      
      return { roi, hitRate, avgAccuracy };
    };

    return {
      ai: calculateStats(aiInvestments),
      manual: calculateStats(manualInvestments),
      aiCount: aiInvestments.length,
      manualCount: manualInvestments.length
    };
  };

  const stats = getStrategyStats();

  if (isLoading) {
    return (
      <ResponsiveCard className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">戦略履歴を読み込み中...</p>
      </ResponsiveCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* ビューモード切り替え */}
      <ResponsiveCard className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-responsive-lg font-bold">戦略分析</h2>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'summary' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              サマリー
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'chart' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              チャート
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              履歴
            </button>
          </div>
        </div>
      </ResponsiveCard>

      {/* チャートビュー */}
      {viewMode === 'chart' && (
        <StrategyEffectivenessChart investments={investments} />
      )}

      {/* サマリービューと履歴ビュー */}
      {viewMode !== 'chart' && (
        <>
          {/* 戦略比較サマリー */}
          <ResponsiveCard className="p-4">
        <h3 className="text-responsive-lg font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="text-blue-600" size={20} />
          AI戦略 vs 手動投資 比較
        </h3>
        
        <ResponsiveGrid columns={{ mobile: 2 }} gap="md" className="mb-4">
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
            <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              AI戦略 ({stats.aiCount}件)
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>ROI:</span>
                <span className={`font-bold ${stats.ai.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.ai.roi >= 0 ? '+' : ''}{stats.ai.roi.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>的中率:</span>
                <span className="font-bold text-blue-600">{stats.ai.hitRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>予測精度:</span>
                <span className="font-bold text-purple-600">{stats.ai.avgAccuracy.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              手動投資 ({stats.manualCount}件)
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>ROI:</span>
                <span className={`font-bold ${stats.manual.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.manual.roi >= 0 ? '+' : ''}{stats.manual.roi.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>的中率:</span>
                <span className="font-bold text-blue-600">{stats.manual.hitRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>-</span>
                <span className="text-gray-400">-</span>
              </div>
            </div>
          </div>
        </ResponsiveGrid>

        {/* パフォーマンス比較 */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <h5 className="font-medium text-blue-900 mb-2">パフォーマンス比較</h5>
          <div className="text-sm text-blue-700">
            {stats.ai.roi > stats.manual.roi ? (
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span>AI戦略が手動投資より{(stats.ai.roi - stats.manual.roi).toFixed(1)}%優秀</span>
              </div>
            ) : stats.ai.roi < stats.manual.roi ? (
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span>手動投資がAI戦略より{(stats.manual.roi - stats.ai.roi).toFixed(1)}%優秀</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-gray-600" />
                <span>AI戦略と手動投資のパフォーマンスは同等</span>
              </div>
            )}
          </div>
        </div>
      </ResponsiveCard>

      {/* フィルター・ソート */}
      {viewMode === 'list' && (
        <ResponsiveCard className="p-4">
        <FlexLayout direction="row" justify="between" align="center" className="mb-4">
          <h3 className="font-semibold">戦略履歴詳細</h3>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {strategyInvestments.length}件
            </span>
          </div>
        </FlexLayout>

        <ResponsiveGrid columns={{ mobile: 2 }} gap="sm" className="mb-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">フィルター</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full p-2 text-sm border border-gray-300 rounded"
            >
              <option value="all">全て</option>
              <option value="ai">AI戦略のみ</option>
              <option value="manual">手動投資のみ</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">ソート</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full p-2 text-sm border border-gray-300 rounded"
            >
              <option value="date">日付順</option>
              <option value="performance">成績順</option>
              <option value="confidence">確信度順</option>
            </select>
          </div>
        </ResponsiveGrid>
        </ResponsiveCard>
      )}

      {/* 戦略履歴リスト */}
      {viewMode === 'list' && (
        <div className="space-y-3">
        {strategyInvestments.length === 0 ? (
          <ResponsiveCard className="p-6 text-center">
            <Target className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-responsive-lg font-medium text-gray-600 mb-2">
              戦略履歴がありません
            </h3>
            <p className="text-responsive-sm text-gray-500">
              AI戦略を使用した投資記録がここに表示されます
            </p>
          </ResponsiveCard>
        ) : (
          strategyInvestments.map((investment) => (
            <StrategyHistoryCard
              key={investment.id}
              investment={investment}
              showDetails={showDetails[investment.id || ''] || false}
              onToggleDetails={() => toggleDetails(investment.id || '')}
            />
          ))
        )}
        </div>
      )}
      </>
      )}
    </div>
  );
};

// 戦略履歴カードコンポーネント
interface StrategyHistoryCardProps {
  investment: StrategyHistoryEntry;
  showDetails: boolean;
  onToggleDetails: () => void;
}

const StrategyHistoryCard: React.FC<StrategyHistoryCardProps> = ({
  investment,
  showDetails,
  onToggleDetails
}) => {
  const isProfit = investment.payout > investment.amount;
  const roi = investment.amount > 0 ? ((investment.payout - investment.amount) / investment.amount) * 100 : 0;
  
  const getRiskLevelColor = (level?: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskLevelIcon = (level?: string) => {
    switch (level) {
      case 'low': return <Shield className="w-3 h-3" />;
      case 'medium': return <Target className="w-3 h-3" />;
      case 'high': return <Zap className="w-3 h-3" />;
      default: return <AlertTriangle className="w-3 h-3" />;
    }
  };

  const getBetTypeLabel = (type: string) => {
    const labels = {
      win: '単勝',
      place: '複勝',
      exacta: '馬連',
      quinella: '馬単',
      trifecta: '3連複',
      wide: 'ワイド'
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <ResponsiveCard className={`p-4 ${investment.strategyUsed ? 'border-l-4 border-purple-500' : ''}`}>
      <FlexLayout direction="row" justify="between" align="center" className="mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${investment.strategyUsed ? 'bg-purple-100' : 'bg-gray-100'}`}>
            {investment.strategyUsed ? (
              <Target className="w-4 h-4 text-purple-600" />
            ) : (
              <DollarSign className="w-4 h-4 text-gray-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {investment.venue} {investment.raceNumber}R
              </span>
              {investment.strategyUsed && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                  AI戦略
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              {new Date(investment.timestamp).toLocaleDateString('ja-JP')}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
            {isProfit ? '+' : ''}{(investment.payout - investment.amount).toLocaleString()}円
          </div>
          <div className="text-sm text-gray-600">
            ROI: {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
          </div>
        </div>
      </FlexLayout>

      <ResponsiveGrid columns={{ mobile: 3 }} gap="sm" className="mb-3">
        <div>
          <div className="text-xs text-gray-600">券種</div>
          <div className="font-medium">{getBetTypeLabel(investment.betType)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600">投資額</div>
          <div className="font-medium">{investment.amount.toLocaleString()}円</div>
        </div>
        <div>
          <div className="text-xs text-gray-600">払戻額</div>
          <div className="font-medium">{investment.payout.toLocaleString()}円</div>
        </div>
      </ResponsiveGrid>

      {investment.strategyUsed && (
        <div className="mb-3 p-3 bg-purple-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-900">AI戦略情報</span>
            {investment.strategyRiskLevel && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getRiskLevelColor(investment.strategyRiskLevel)}`}>
                {getRiskLevelIcon(investment.strategyRiskLevel)}
                <span>{investment.strategyRiskLevel === 'low' ? '低リスク' : investment.strategyRiskLevel === 'medium' ? '中リスク' : '高リスク'}</span>
              </div>
            )}
          </div>
          
          <ResponsiveGrid columns={{ mobile: 2 }} gap="sm" className="text-sm">
            {investment.strategyConfidence && (
              <div>
                <span className="text-purple-700">確信度:</span>
                <span className="font-medium ml-1">{investment.strategyConfidence}%</span>
              </div>
            )}
            {investment.strategyAccuracy !== undefined && (
              <div>
                <span className="text-purple-700">予測精度:</span>
                <span className="font-medium ml-1">{investment.strategyAccuracy.toFixed(1)}%</span>
              </div>
            )}
          </ResponsiveGrid>

          {investment.expectedReturn !== undefined && (
            <div className="mt-2 pt-2 border-t border-purple-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-purple-700">期待収益:</span>
                <span className={`font-medium ${investment.expectedReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {investment.expectedReturn >= 0 ? '+' : ''}{investment.expectedReturn.toLocaleString()}円
                </span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-purple-700">実際収益:</span>
                <span className={`font-medium ${investment.actualReturn && investment.actualReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {investment.actualReturn && investment.actualReturn >= 0 ? '+' : ''}{investment.actualReturn?.toLocaleString()}円
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <TouchOptimizedButton
        onClick={onToggleDetails}
        variant="ghost"
        size="sm"
        icon={showDetails ? EyeOff : Eye}
        fullWidth
      >
        {showDetails ? '詳細を隠す' : '詳細を表示'}
      </TouchOptimizedButton>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">選択馬番:</span>
              <span className="ml-2 font-medium">{investment.selections.join('番・')}番</span>
            </div>
            <div>
              <span className="text-gray-600">オッズ:</span>
              <span className="ml-2 font-medium">{investment.odds.toFixed(1)}倍</span>
            </div>
            {investment.strategyRationale && (
              <div>
                <span className="text-gray-600">戦略根拠:</span>
                <p className="mt-1 text-gray-700 italic">"{investment.strategyRationale}"</p>
              </div>
            )}
            {investment.isSimulated && (
              <div className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="w-4 h-4" />
                <span>シミュレーション投資</span>
              </div>
            )}
          </div>
        </div>
      )}
    </ResponsiveCard>
  );
};