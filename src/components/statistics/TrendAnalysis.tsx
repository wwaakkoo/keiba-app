import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar, Target, AlertCircle } from 'lucide-react';
import { ResponsiveCard, ResponsiveGrid, FlexLayout } from '@/components/common/ResponsiveContainer';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { ZoomableChart } from '@/components/common/ZoomableChart';
import { TrendAnalysis as TrendAnalysisType } from '@/services/detailedAnalysisService';
import { TrendData } from '@/types/prediction';

interface TrendAnalysisProps {
  trendAnalysis: TrendAnalysisType;
  trendData: TrendData[];
}

type TrendTab = 'accuracy' | 'roi' | 'streaks' | 'seasonal';

export const TrendAnalysis: React.FC<TrendAnalysisProps> = ({
  trendAnalysis,
  trendData
}) => {
  const [activeTab, setActiveTab] = useState<TrendTab>('accuracy');

  const tabs = [
    { id: 'accuracy' as TrendTab, label: '的中率', icon: Target },
    { id: 'roi' as TrendTab, label: 'ROI', icon: TrendingUp },
    { id: 'streaks' as TrendTab, label: '連勝・連敗', icon: Calendar },
    { id: 'seasonal' as TrendTab, label: '季節パターン', icon: Calendar }
  ];

  const getTrendIcon = (direction: 'improving' | 'declining' | 'stable') => {
    switch (direction) {
      case 'improving': return TrendingUp;
      case 'declining': return TrendingDown;
      case 'stable': return Minus;
    }
  };

  const getTrendColor = (direction: 'improving' | 'declining' | 'stable') => {
    switch (direction) {
      case 'improving': return 'text-green-600';
      case 'declining': return 'text-red-600';
      case 'stable': return 'text-gray-600';
    }
  };

  const getTrendBgColor = (direction: 'improving' | 'declining' | 'stable') => {
    switch (direction) {
      case 'improving': return 'bg-green-50';
      case 'declining': return 'bg-red-50';
      case 'stable': return 'bg-gray-50';
    }
  };

  const renderAccuracyTrend = () => {
    const { accuracyTrend } = trendAnalysis;
    const TrendIcon = getTrendIcon(accuracyTrend.direction);

    return (
      <div className="space-y-6">
        {/* トレンド概要 */}
        <ResponsiveCard>
          <h3 className="text-responsive-lg font-semibold mb-4 flex items-center gap-2">
            <Target size={20} />
            的中率トレンド分析
          </h3>
          
          <div className={`p-4 rounded-lg ${getTrendBgColor(accuracyTrend.direction)}`}>
            <FlexLayout direction="row" align="center" gap="md" className="mb-3">
              <TrendIcon size={24} className={getTrendColor(accuracyTrend.direction)} />
              <div>
                <div className="text-responsive-lg font-semibold">
                  {accuracyTrend.direction === 'improving' ? '改善傾向' :
                   accuracyTrend.direction === 'declining' ? '悪化傾向' : '安定'}
                </div>
                <div className="text-responsive-sm text-gray-600">
                  信頼度: {(accuracyTrend.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </FlexLayout>
            
            <ResponsiveGrid columns={{ mobile: 2 }} gap="md">
              <div>
                <div className="text-responsive-sm text-gray-600">最近の期間</div>
                <div className="text-responsive-lg font-bold text-green-600">
                  {accuracyTrend.recentPeriodAccuracy.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-responsive-sm text-gray-600">以前の期間</div>
                <div className="text-responsive-lg font-bold text-blue-600">
                  {accuracyTrend.previousPeriodAccuracy.toFixed(1)}%
                </div>
              </div>
            </ResponsiveGrid>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-responsive-sm">
                <span className="text-gray-600">変化量: </span>
                <span className={`font-semibold ${
                  accuracyTrend.slope >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {accuracyTrend.slope >= 0 ? '+' : ''}{accuracyTrend.slope.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </ResponsiveCard>

        {/* 的中率推移グラフ */}
        {trendData.length > 0 && (
          <ResponsiveCard>
            <h3 className="text-responsive-lg font-semibold mb-4">的中率推移</h3>
            
            <ZoomableChart
              data={trendData}
              lines={[
                { dataKey: 'firstAccuracy', stroke: '#10b981', name: '1着的中率' },
                { dataKey: 'top3Accuracy', stroke: '#3b82f6', name: '3着以内的中率' }
              ]}
              xAxisDataKey="race"
              height={300}
            />
          </ResponsiveCard>
        )}

        {/* 改善提案 */}
        <ResponsiveCard>
          <h3 className="text-responsive-lg font-semibold mb-4">改善提案</h3>
          
          <div className="space-y-3">
            {accuracyTrend.direction === 'declining' && (
              <div className="p-3 bg-red-50 rounded-lg flex items-start gap-3">
                <AlertCircle size={20} className="text-red-600 mt-0.5" />
                <div>
                  <div className="text-responsive-base font-semibold text-red-800">
                    的中率が低下しています
                  </div>
                  <div className="text-responsive-sm text-red-700 mt-1">
                    予想アルゴリズムの見直しや重み設定の調整を検討してください。
                  </div>
                </div>
              </div>
            )}
            
            {accuracyTrend.direction === 'improving' && (
              <div className="p-3 bg-green-50 rounded-lg flex items-start gap-3">
                <Target size={20} className="text-green-600 mt-0.5" />
                <div>
                  <div className="text-responsive-base font-semibold text-green-800">
                    的中率が向上しています
                  </div>
                  <div className="text-responsive-sm text-green-700 mt-1">
                    現在の予想手法を継続し、さらなる改善を目指しましょう。
                  </div>
                </div>
              </div>
            )}
            
            {accuracyTrend.confidence < 0.5 && (
              <div className="p-3 bg-yellow-50 rounded-lg flex items-start gap-3">
                <AlertCircle size={20} className="text-yellow-600 mt-0.5" />
                <div>
                  <div className="text-responsive-base font-semibold text-yellow-800">
                    データが不足しています
                  </div>
                  <div className="text-responsive-sm text-yellow-700 mt-1">
                    より正確な分析のため、さらに多くの予想データが必要です。
                  </div>
                </div>
              </div>
            )}
          </div>
        </ResponsiveCard>
      </div>
    );
  };

  const renderROITrend = () => {
    const { roiTrend } = trendAnalysis;
    const TrendIcon = getTrendIcon(roiTrend.direction);

    return (
      <div className="space-y-6">
        <ResponsiveCard>
          <h3 className="text-responsive-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            ROIトレンド分析
          </h3>
          
          <div className={`p-4 rounded-lg ${getTrendBgColor(roiTrend.direction)}`}>
            <FlexLayout direction="row" align="center" gap="md" className="mb-3">
              <TrendIcon size={24} className={getTrendColor(roiTrend.direction)} />
              <div>
                <div className="text-responsive-lg font-semibold">
                  {roiTrend.direction === 'improving' ? '収益改善' :
                   roiTrend.direction === 'declining' ? '収益悪化' : '収益安定'}
                </div>
                <div className="text-responsive-sm text-gray-600">
                  信頼度: {(roiTrend.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </FlexLayout>
            
            <ResponsiveGrid columns={{ mobile: 2 }} gap="md">
              <div>
                <div className="text-responsive-sm text-gray-600">最近のROI</div>
                <div className={`text-responsive-lg font-bold ${
                  roiTrend.recentPeriodROI >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {roiTrend.recentPeriodROI >= 0 ? '+' : ''}{roiTrend.recentPeriodROI.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-responsive-sm text-gray-600">以前のROI</div>
                <div className={`text-responsive-lg font-bold ${
                  roiTrend.previousPeriodROI >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {roiTrend.previousPeriodROI >= 0 ? '+' : ''}{roiTrend.previousPeriodROI.toFixed(1)}%
                </div>
              </div>
            </ResponsiveGrid>
          </div>
        </ResponsiveCard>
      </div>
    );
  };

  const renderStreakAnalysis = () => {
    const { streakAnalysis } = trendAnalysis;

    return (
      <div className="space-y-6">
        <ResponsiveCard>
          <h3 className="text-responsive-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar size={20} />
            連勝・連敗分析
          </h3>
          
          {/* 現在の連勝・連敗 */}
          <div className={`p-4 rounded-lg mb-4 ${
            streakAnalysis.currentStreak.type === 'winning' ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <div className="text-center">
              <div className={`text-3xl font-bold mb-2 ${
                streakAnalysis.currentStreak.type === 'winning' ? 'text-green-600' : 'text-red-600'
              }`}>
                {streakAnalysis.currentStreak.count}
              </div>
              <div className="text-responsive-base font-semibold">
                現在{streakAnalysis.currentStreak.type === 'winning' ? '連勝' : '連敗'}中
              </div>
              <div className="text-responsive-sm text-gray-600 mt-1">
                {streakAnalysis.currentStreak.startDate}から
              </div>
            </div>
          </div>

          {/* 記録 */}
          <ResponsiveGrid columns={{ mobile: 2 }} gap="md">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {streakAnalysis.longestWinStreak.count}
              </div>
              <div className="text-responsive-sm font-semibold">最長連勝記録</div>
              <div className="text-responsive-xs text-gray-600 mt-1">
                {streakAnalysis.longestWinStreak.startDate} - {streakAnalysis.longestWinStreak.endDate}
              </div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600 mb-1">
                {streakAnalysis.longestLoseStreak.count}
              </div>
              <div className="text-responsive-sm font-semibold">最長連敗記録</div>
              <div className="text-responsive-xs text-gray-600 mt-1">
                {streakAnalysis.longestLoseStreak.startDate} - {streakAnalysis.longestLoseStreak.endDate}
              </div>
            </div>
          </ResponsiveGrid>
        </ResponsiveCard>
      </div>
    );
  };

  const renderSeasonalPatterns = () => {
    const { seasonalPatterns } = trendAnalysis;

    return (
      <div className="space-y-6">
        <ResponsiveCard>
          <h3 className="text-responsive-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar size={20} />
            季節パターン分析
          </h3>
          
          {Object.keys(seasonalPatterns).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar size={48} className="mx-auto mb-2 opacity-50" />
              <p>季節パターンデータがありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(seasonalPatterns).map(([season, data]) => (
                <div key={season} className="p-4 bg-gray-50 rounded-lg">
                  <FlexLayout direction="row" justify="between" align="center" className="mb-3">
                    <span className="text-responsive-base font-semibold">{season}</span>
                    <span className={`text-responsive-base font-bold ${
                      data.roi >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ROI: {data.roi >= 0 ? '+' : ''}{data.roi.toFixed(1)}%
                    </span>
                  </FlexLayout>
                  
                  <div className="grid grid-cols-2 gap-4 text-responsive-sm mb-3">
                    <div>
                      <span className="text-gray-600">的中率: </span>
                      <span className="font-semibold">{data.accuracy.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">回数: </span>
                      <span className="font-semibold">{data.count}回</span>
                    </div>
                  </div>
                  
                  {data.bestConditions.length > 0 && (
                    <div>
                      <div className="text-responsive-xs text-gray-600 mb-1">得意条件:</div>
                      <div className="flex flex-wrap gap-1">
                        {data.bestConditions.map((condition, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-responsive-xs rounded">
                            {condition}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ResponsiveCard>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'accuracy': return renderAccuracyTrend();
      case 'roi': return renderROITrend();
      case 'streaks': return renderStreakAnalysis();
      case 'seasonal': return renderSeasonalPatterns();
      default: return renderAccuracyTrend();
    }
  };

  return (
    <div className="space-y-6">
      {/* タブナビゲーション */}
      <ResponsiveCard>
        <FlexLayout direction="row" gap="sm" className="overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <TouchOptimizedButton
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                variant={activeTab === tab.id ? 'primary' : 'ghost'}
                size="sm"
                icon={Icon}
                className="whitespace-nowrap"
              >
                {tab.label}
              </TouchOptimizedButton>
            );
          })}
        </FlexLayout>
      </ResponsiveCard>

      {/* コンテンツ */}
      {renderContent()}
    </div>
  );
};