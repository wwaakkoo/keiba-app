import React, { useState } from 'react';
import { TrendingUp, Target, AlertTriangle, CheckCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { ResponsiveCard, ResponsiveGrid, FlexLayout } from '@/components/common/ResponsiveContainer';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { ZoomableChart } from '@/components/common/ZoomableChart';
import { ROIAnalysis as ROIAnalysisType, ImprovementSuggestion } from '@/services/performanceAnalysisService';
import { PerformanceMetrics } from '@/services/investmentPerformanceService';

interface ROIAnalysisProps {
  roiAnalysis: ROIAnalysisType;
  performanceMetrics: PerformanceMetrics;
  suggestions: ImprovementSuggestion[];
}

type AnalysisTab = 'overview' | 'breakdown' | 'suggestions';

export const ROIAnalysis: React.FC<ROIAnalysisProps> = ({
  roiAnalysis,
  performanceMetrics,
  suggestions
}) => {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('overview');

  const tabs = [
    { id: 'overview' as AnalysisTab, label: '概要', icon: TrendingUp },
    { id: 'breakdown' as AnalysisTab, label: '詳細分析', icon: Target },
    { id: 'suggestions' as AnalysisTab, label: '改善提案', icon: AlertTriangle }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* 主要指標 */}
      <ResponsiveCard>
        <h3 className="text-responsive-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp size={20} />
          投資パフォーマンス概要
        </h3>
        
        <ResponsiveGrid columns={{ mobile: 2, tablet: 4 }} gap="md">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className={`text-2xl font-bold mb-1 ${
              roiAnalysis.overall.roi >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {roiAnalysis.overall.roi >= 0 ? '+' : ''}{roiAnalysis.overall.roi.toFixed(1)}%
            </div>
            <div className="text-responsive-xs text-gray-600">ROI</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {roiAnalysis.overall.winRate.toFixed(1)}%
            </div>
            <div className="text-responsive-xs text-gray-600">的中率</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {performanceMetrics.profitFactor === Infinity ? '∞' : performanceMetrics.profitFactor.toFixed(2)}
            </div>
            <div className="text-responsive-xs text-gray-600">PF</div>
          </div>
          
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {performanceMetrics.sharpeRatio.toFixed(2)}
            </div>
            <div className="text-responsive-xs text-gray-600">シャープレシオ</div>
          </div>
        </ResponsiveGrid>
      </ResponsiveCard>

      {/* 収支詳細 */}
      <ResponsiveCard>
        <h3 className="text-responsive-lg font-semibold mb-4">収支詳細</h3>
        
        <div className="space-y-3">
          <FlexLayout direction="row" justify="between" align="center">
            <span className="text-responsive-sm text-gray-600">投資総額</span>
            <span className="text-responsive-base font-semibold text-blue-600">
              ¥{roiAnalysis.overall.totalInvestment.toLocaleString()}
            </span>
          </FlexLayout>
          
          <FlexLayout direction="row" justify="between" align="center">
            <span className="text-responsive-sm text-gray-600">払戻総額</span>
            <span className="text-responsive-base font-semibold text-green-600">
              ¥{roiAnalysis.overall.totalReturn.toLocaleString()}
            </span>
          </FlexLayout>
          
          <hr className="border-gray-200" />
          
          <FlexLayout direction="row" justify="between" align="center">
            <span className="text-responsive-base font-medium">純損益</span>
            <span className={`text-responsive-lg font-bold flex items-center gap-1 ${
              roiAnalysis.overall.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {roiAnalysis.overall.totalProfit >= 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
              ¥{Math.abs(roiAnalysis.overall.totalProfit).toLocaleString()}
            </span>
          </FlexLayout>
          
          <FlexLayout direction="row" justify="between" align="center">
            <span className="text-responsive-base font-medium">平均払戻額</span>
            <span className="text-responsive-base font-semibold text-gray-700">
              ¥{Math.round(roiAnalysis.overall.averageReturn).toLocaleString()}
            </span>
          </FlexLayout>
        </div>
      </ResponsiveCard>

      {/* 月次パフォーマンス */}
      {performanceMetrics.monthlyReturns.length > 0 && (
        <ResponsiveCard>
          <h3 className="text-responsive-lg font-semibold mb-4">月次ROI推移</h3>
          
          <ZoomableChart
            data={performanceMetrics.monthlyReturns}
            lines={[
              { dataKey: 'returnRate', stroke: '#3b82f6', name: 'ROI (%)' }
            ]}
            xAxisDataKey="month"
            height={250}
          />
        </ResponsiveCard>
      )}
    </div>
  );

  const renderBreakdown = () => (
    <div className="space-y-6">
      {/* 券種別分析 */}
      <ResponsiveCard>
        <h3 className="text-responsive-lg font-semibold mb-4">券種別パフォーマンス</h3>
        
        <div className="space-y-3">
          {Object.entries(roiAnalysis.byBetType)
            .sort(([,a], [,b]) => b.roi - a.roi)
            .map(([betType, data]) => (
              <div key={betType} className="p-3 bg-gray-50 rounded-lg">
                <FlexLayout direction="row" justify="between" align="center" className="mb-2">
                  <span className="text-responsive-base font-medium">{betType}</span>
                  <span className={`text-responsive-base font-bold ${
                    data.roi >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {data.roi >= 0 ? '+' : ''}{data.roi.toFixed(1)}%
                  </span>
                </FlexLayout>
                
                <div className="grid grid-cols-3 gap-2 text-responsive-xs text-gray-600">
                  <div>回数: {data.count}</div>
                  <div>的中率: {data.winRate.toFixed(1)}%</div>
                  <div>投資額: ¥{data.totalInvestment.toLocaleString()}</div>
                </div>
              </div>
            ))}
        </div>
      </ResponsiveCard>

      {/* 確信度別分析 */}
      <ResponsiveCard>
        <h3 className="text-responsive-lg font-semibold mb-4">確信度別パフォーマンス</h3>
        
        <div className="space-y-3">
          {Object.entries(roiAnalysis.byConfidence)
            .sort(([,a], [,b]) => b.roi - a.roi)
            .map(([confidence, data]) => (
              <div key={confidence} className="p-3 bg-gray-50 rounded-lg">
                <FlexLayout direction="row" justify="between" align="center" className="mb-2">
                  <span className="text-responsive-base font-medium">
                    {confidence === 'high' ? '高確信度' : 
                     confidence === 'medium' ? '中確信度' : 
                     confidence === 'low' ? '低確信度' : '不明'}
                  </span>
                  <span className={`text-responsive-base font-bold ${
                    data.roi >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {data.roi >= 0 ? '+' : ''}{data.roi.toFixed(1)}%
                  </span>
                </FlexLayout>
                
                <div className="grid grid-cols-3 gap-2 text-responsive-xs text-gray-600">
                  <div>回数: {data.count}</div>
                  <div>的中率: {data.winRate.toFixed(1)}%</div>
                  <div>投資額: ¥{data.totalInvestment.toLocaleString()}</div>
                </div>
              </div>
            ))}
        </div>
      </ResponsiveCard>

      {/* オッズ範囲別分析 */}
      <ResponsiveCard>
        <h3 className="text-responsive-lg font-semibold mb-4">オッズ範囲別パフォーマンス</h3>
        
        <div className="space-y-3">
          {Object.entries(roiAnalysis.byOddsRange)
            .sort(([,a], [,b]) => b.roi - a.roi)
            .map(([oddsRange, data]) => (
              <div key={oddsRange} className="p-3 bg-gray-50 rounded-lg">
                <FlexLayout direction="row" justify="between" align="center" className="mb-2">
                  <span className="text-responsive-base font-medium">{oddsRange}</span>
                  <span className={`text-responsive-base font-bold ${
                    data.roi >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {data.roi >= 0 ? '+' : ''}{data.roi.toFixed(1)}%
                  </span>
                </FlexLayout>
                
                <div className="grid grid-cols-3 gap-2 text-responsive-xs text-gray-600">
                  <div>回数: {data.count}</div>
                  <div>的中率: {data.winRate.toFixed(1)}%</div>
                  <div>投資額: ¥{data.totalInvestment.toLocaleString()}</div>
                </div>
              </div>
            ))}
        </div>
      </ResponsiveCard>
    </div>
  );

  const renderSuggestions = () => (
    <div className="space-y-4">
      {suggestions.length === 0 ? (
        <ResponsiveCard>
          <div className="text-center py-8">
            <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
            <h3 className="text-responsive-lg font-semibold mb-2">素晴らしいパフォーマンスです！</h3>
            <p className="text-responsive-sm text-gray-600">
              現在のところ、特に改善が必要な項目はありません。
              この調子で投資を続けてください。
            </p>
          </div>
        </ResponsiveCard>
      ) : (
        suggestions.map((suggestion, index) => (
          <ResponsiveCard key={index}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${
                suggestion.priority === 'high' ? 'bg-red-100' :
                suggestion.priority === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
              }`}>
                <AlertTriangle size={16} className={
                  suggestion.priority === 'high' ? 'text-red-600' :
                  suggestion.priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                } />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-responsive-base font-semibold">{suggestion.title}</h4>
                  <span className={`px-2 py-1 rounded-full text-responsive-xs font-medium ${
                    suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
                    suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {suggestion.priority === 'high' ? '高優先度' :
                     suggestion.priority === 'medium' ? '中優先度' : '低優先度'}
                  </span>
                </div>
                
                <p className="text-responsive-sm text-gray-600 mb-3">
                  {suggestion.description}
                </p>
                
                <div className="mb-3">
                  <div className="text-responsive-xs text-gray-500 mb-1">期待効果</div>
                  <div className="text-responsive-sm font-medium text-green-600">
                    {suggestion.expectedImpact}
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="text-responsive-xs text-gray-500 mb-1">目標指標</div>
                  <div className="text-responsive-sm">
                    {suggestion.metrics.current.toFixed(1)}{suggestion.metrics.unit} → {' '}
                    <span className="font-semibold text-green-600">
                      {suggestion.metrics.target.toFixed(1)}{suggestion.metrics.unit}
                    </span>
                  </div>
                </div>
                
                <div>
                  <div className="text-responsive-xs text-gray-500 mb-2">アクション項目</div>
                  <ul className="space-y-1">
                    {suggestion.actionItems.map((item, itemIndex) => (
                      <li key={itemIndex} className="text-responsive-sm flex items-start gap-2">
                        <span className="text-gray-400 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </ResponsiveCard>
        ))
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'breakdown': return renderBreakdown();
      case 'suggestions': return renderSuggestions();
      default: return renderOverview();
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