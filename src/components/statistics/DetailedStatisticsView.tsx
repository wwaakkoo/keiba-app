import React, { useState } from 'react';
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Award, 
  Calculator,
  Info
} from 'lucide-react';
import { ResponsiveCard } from '@/components/common/ResponsiveContainer';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { DetailedStatistics } from '@/services/detailedStatisticsService';

interface DetailedStatisticsViewProps {
  statistics?: DetailedStatistics | null;
  isLoading?: boolean;
}

export const DetailedStatisticsView: React.FC<DetailedStatisticsViewProps> = ({
  statistics,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'accuracy' | 'patterns' | 'investment' | 'conditions' | 'trends'>('overview');
  const [_expandedSections, _setExpandedSections] = useState<Record<string, boolean>>({});

  const _toggleSection = (section: string) => {
    _setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (isLoading) {
    return (
      <ResponsiveCard className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">詳細統計を計算中...</p>
      </ResponsiveCard>
    );
  }

  if (!statistics || !statistics.overview || statistics.overview.completedRaces === 0) {
    return (
      <ResponsiveCard className="p-6 text-center">
        <BarChart3 className="mx-auto mb-4 text-gray-400" size={48} />
        <h3 className="text-lg font-medium text-gray-600 mb-2">
          統計データがありません
        </h3>
        <p className="text-sm text-gray-500">
          レース結果を入力すると、詳細な統計分析が表示されます
        </p>
      </ResponsiveCard>
    );
  }

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* データ概要 */}
      <ResponsiveCard>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="text-blue-600" size={20} />
          データ概要
        </h3>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{statistics.overview.totalRaces}</div>
            <div className="text-sm text-gray-600">総予想数</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{statistics.overview.completedRaces}</div>
            <div className="text-sm text-gray-600">結果入力済</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{statistics.overview.dataCompleteness}%</div>
            <div className="text-sm text-gray-600">完成度</div>
          </div>
        </div>
      </ResponsiveCard>

      {/* 主要指標サマリー */}
      <ResponsiveCard>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Trophy className="text-yellow-600" size={20} />
          主要指標
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">1位的中率</span>
              <Award className="text-yellow-600" size={16} />
            </div>
            <div className="text-2xl font-bold text-yellow-600">
              {statistics.positionAccuracy.exact.first}%
            </div>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">3着以内率</span>
              <Target className="text-green-600" size={16} />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {statistics.positionAccuracy.withinRange.firstToTop3}%
            </div>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">完全三連単</span>
              <PieChart className="text-blue-600" size={16} />
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {statistics.hitPatterns.perfectTriple}%
            </div>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">単勝想定ROI</span>
              <Calculator className="text-red-600" size={16} />
            </div>
            <div className="text-2xl font-bold text-red-600">
              {statistics.investmentEffectiveness.singleWin.returnRate}%
            </div>
          </div>
        </div>
      </ResponsiveCard>
    </div>
  );

  const renderAccuracyTab = () => (
    <div className="space-y-6">
      {/* 順位別的中率 */}
      <ResponsiveCard>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="text-green-600" size={20} />
          順位別的中率
        </h3>
        
        <div className="space-y-4">
          {/* 完全一致 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">完全一致</span>
              <Info className="text-gray-400" size={16} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-yellow-50 rounded">
                <div className="text-xl font-bold text-yellow-600">
                  {statistics.positionAccuracy.exact.first}%
                </div>
                <div className="text-xs text-gray-600">1位→1位</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-xl font-bold text-gray-600">
                  {statistics.positionAccuracy.exact.second}%
                </div>
                <div className="text-xs text-gray-600">2位→2位</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded">
                <div className="text-xl font-bold text-orange-600">
                  {statistics.positionAccuracy.exact.third}%
                </div>
                <div className="text-xs text-gray-600">3位→3位</div>
              </div>
            </div>
          </div>
          
          {/* 3着以内 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">3着以内的中</span>
              <Info className="text-gray-400" size={16} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="text-xl font-bold text-green-600">
                  {statistics.positionAccuracy.withinRange.firstToTop3}%
                </div>
                <div className="text-xs text-gray-600">1位予想</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="text-xl font-bold text-blue-600">
                  {statistics.positionAccuracy.withinRange.secondToTop3}%
                </div>
                <div className="text-xs text-gray-600">2位予想</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded">
                <div className="text-xl font-bold text-purple-600">
                  {statistics.positionAccuracy.withinRange.thirdToTop3}%
                </div>
                <div className="text-xs text-gray-600">3位予想</div>
              </div>
            </div>
          </div>
        </div>
      </ResponsiveCard>
    </div>
  );

  const renderPatternsTab = () => (
    <div className="space-y-6">
      {/* 的中パターン分析 */}
      <ResponsiveCard>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <PieChart className="text-blue-600" size={20} />
          的中パターン
        </h3>
        
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-gold-50 to-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold text-yellow-700">完全三連単</div>
                <div className="text-sm text-yellow-600">1-2-3位すべて完全一致</div>
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {statistics.hitPatterns.perfectTriple}%
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold text-green-700">1位的中</div>
                <div className="text-sm text-green-600">予想1位が実際1位</div>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {statistics.hitPatterns.exactFirst}%
              </div>
            </div>
          </div>
          
          <div>
            <div className="font-medium mb-3">3着以内カバー率</div>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                <span className="text-sm">予想3頭すべて3着以内</span>
                <span className="font-bold text-blue-600">{statistics.hitPatterns.top3Coverage.all3}%</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                <span className="text-sm">予想3頭中2頭が3着以内</span>
                <span className="font-bold text-green-600">{statistics.hitPatterns.top3Coverage.any2}%</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                <span className="text-sm">予想3頭中1頭が3着以内</span>
                <span className="font-bold text-yellow-600">{statistics.hitPatterns.top3Coverage.any1}%</span>
              </div>
            </div>
          </div>
        </div>
      </ResponsiveCard>
    </div>
  );

  const renderInvestmentTab = () => (
    <div className="space-y-6">
      {/* 投資効果分析 */}
      <ResponsiveCard>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calculator className="text-red-600" size={20} />
          投資効果シミュレーション
        </h3>
        
        <div className="space-y-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium">単勝（予想1位のみ）</div>
              <div className="text-sm text-gray-500">平均3.5倍想定</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {statistics.investmentEffectiveness.singleWin.hitRate}%
                </div>
                <div className="text-xs text-gray-600">的中率</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {statistics.investmentEffectiveness.singleWin.returnRate}%
                </div>
                <div className="text-xs text-gray-600">回収率</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${statistics.investmentEffectiveness.singleWin.returnRate >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                  {statistics.investmentEffectiveness.singleWin.returnRate >= 100 ? '+' : ''}
                  {statistics.investmentEffectiveness.singleWin.returnRate - 100}%
                </div>
                <div className="text-xs text-gray-600">損益</div>
              </div>
            </div>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium">複勝（予想1位）</div>
              <div className="text-sm text-gray-500">平均1.8倍想定</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {statistics.investmentEffectiveness.placeWin.hitRate}%
                </div>
                <div className="text-xs text-gray-600">的中率</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {statistics.investmentEffectiveness.placeWin.returnRate}%
                </div>
                <div className="text-xs text-gray-600">回収率</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${statistics.investmentEffectiveness.placeWin.returnRate >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                  {statistics.investmentEffectiveness.placeWin.returnRate >= 100 ? '+' : ''}
                  {statistics.investmentEffectiveness.placeWin.returnRate - 100}%
                </div>
                <div className="text-xs text-gray-600">損益</div>
              </div>
            </div>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium">馬連（予想1-2位）</div>
              <div className="text-sm text-gray-500">平均12倍想定</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {statistics.investmentEffectiveness.exacta.hitRate}%
                </div>
                <div className="text-xs text-gray-600">的中率</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {statistics.investmentEffectiveness.exacta.estimatedReturn}%
                </div>
                <div className="text-xs text-gray-600">推定回収率</div>
              </div>
            </div>
          </div>
        </div>
      </ResponsiveCard>
    </div>
  );

  const renderTrendsTab = () => {
    if (statistics.trends.recent10.length === 0) {
      return (
        <ResponsiveCard className="p-6 text-center">
          <TrendingUp className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-600">トレンドデータが不十分です</p>
          <p className="text-sm text-gray-500 mt-1">10戦以上のデータが必要です</p>
        </ResponsiveCard>
      );
    }

    return (
      <div className="space-y-6">
        <ResponsiveCard>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="text-purple-600" size={20} />
            直近10戦のトレンド
          </h3>
          
          <div className="space-y-3">
            {statistics.trends.recent10.map((trend, _index) => (
              <div key={trend.raceId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium">{trend.raceLabel}</div>
                  <div className="text-xs text-gray-500">{trend.date}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${trend.exactFirst ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div className="text-sm font-medium">
                    スコア: {trend.rankingScore}
                  </div>
                  <div className="text-sm text-gray-600">
                    {trend.top3Coverage}/3着
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ResponsiveCard>
      </div>
    );
  };

  const tabs = [
    { id: 'overview', label: '概要', icon: BarChart3 },
    { id: 'accuracy', label: '精度分析', icon: Target },
    { id: 'patterns', label: '的中パターン', icon: PieChart },
    { id: 'investment', label: '投資効果', icon: Calculator },
    { id: 'trends', label: 'トレンド', icon: TrendingUp }
  ];

  return (
    <div className="space-y-4">
      {/* タブナビゲーション */}
      <div className="flex overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <TouchOptimizedButton
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                variant={activeTab === tab.id ? 'primary' : 'secondary'}
                size="sm"
                className="whitespace-nowrap"
              >
                <Icon size={16} className="mr-2" />
                {tab.label}
              </TouchOptimizedButton>
            );
          })}
        </div>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'accuracy' && renderAccuracyTab()}
      {activeTab === 'patterns' && renderPatternsTab()}
      {activeTab === 'investment' && renderInvestmentTab()}
      {activeTab === 'trends' && renderTrendsTab()}
    </div>
  );
};