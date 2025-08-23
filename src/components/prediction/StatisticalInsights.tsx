import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, AlertCircle, CheckCircle } from 'lucide-react';

interface StatisticalInsightsProps {
  currentStats: {
    overallHitRate: number;
    hitPatterns: {
      any1: { rate: number; count: number };
      any2: { rate: number; count: number };
      all3: { rate: number; count: number };
    };
    recentTrend: 'improving' | 'declining' | 'stable';
    conditionSpecificStats: { [key: string]: number };
  };
  confidenceLevel: 'high' | 'medium' | 'low';
  expectedHitRate: number;
  raceConditions: {
    surface?: string;
    distance?: number;
    weather?: string;
  };
}

export const StatisticalInsights: React.FC<StatisticalInsightsProps> = ({
  currentStats,
  confidenceLevel,
  expectedHitRate,
  raceConditions
}) => {
  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Target className="w-4 h-4 text-blue-600" />;
    }
  };

  const getRecommendationIcon = (level: string) => {
    switch (level) {
      case 'high': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'medium': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'low': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <Target className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* 予想信頼度 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {getRecommendationIcon(confidenceLevel)}
            予想信頼度分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-gray-600">現在の信頼度</span>
            <Badge className={getConfidenceColor(confidenceLevel)}>
              {confidenceLevel === 'high' ? '高' : 
               confidenceLevel === 'medium' ? '中' : '低'}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-gray-600">期待的中率</span>
            <span className="font-semibold text-blue-600">
              {(expectedHitRate * 100).toFixed(1)}%
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">最近のトレンド</span>
            <div className="flex items-center gap-1">
              {getTrendIcon(currentStats.recentTrend)}
              <span className="text-sm">
                {currentStats.recentTrend === 'improving' ? '向上中' :
                 currentStats.recentTrend === 'declining' ? '低下中' : '安定'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 的中パターン分析 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">的中パターン実績</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">予想3頭中1頭以上3着以内</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {(currentStats.hitPatterns.any1.rate * 100).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500">
                  ({currentStats.hitPatterns.any1.count}回)
                </span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">予想3頭中2頭以上3着以内</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {(currentStats.hitPatterns.any2.rate * 100).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500">
                  ({currentStats.hitPatterns.any2.count}回)
                </span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">予想3頭すべて3着以内</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {(currentStats.hitPatterns.all3.rate * 100).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500">
                  ({currentStats.hitPatterns.all3.count}回)
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 条件別分析 */}
      {Object.keys(currentStats.conditionSpecificStats).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">今回のレース条件での実績</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(currentStats.conditionSpecificStats).map(([condition, rate]) => {
                const conditionName = this.getConditionDisplayName(condition, raceConditions);
                const isGoodCondition = rate > currentStats.overallHitRate;
                
                return (
                  <div key={condition} className="flex justify-between items-center">
                    <span className="text-sm">{conditionName}</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${
                        isGoodCondition ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(rate * 100).toFixed(1)}%
                      </span>
                      {isGoodCondition ? (
                        <TrendingUp className="w-3 h-3 text-green-600" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 投資推奨 */}
      <Card className="bg-blue-50">
        <CardContent className="pt-4">
          <h4 className="font-semibold text-blue-900 mb-2">📊 統計に基づく推奨</h4>
          <div className="text-sm text-blue-700 space-y-1">
            {confidenceLevel === 'high' && (
              <>
                <p>• 高い信頼度：ワイド・馬連での投資を推奨</p>
                <p>• 3連複も検討可能な精度レベル</p>
              </>
            )}
            {confidenceLevel === 'medium' && (
              <>
                <p>• 中程度の信頼度：複勝・ワイドでの安定投資を推奨</p>
                <p>• 馬連は慎重に検討</p>
              </>
            )}
            {confidenceLevel === 'low' && (
              <>
                <p>• 低い信頼度：複勝での保守的投資を推奨</p>
                <p>• 高配当馬券は避けることを推奨</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ヘルパーメソッド
  private getConditionDisplayName(condition: string, raceConditions: any): string {
    if (condition.startsWith('surface_')) {
      return `${condition.split('_')[1] === 'turf' ? '芝' : 'ダート'}コース`;
    }
    if (condition.startsWith('distance_')) {
      const category = condition.split('_')[1];
      const categoryNames = {
        'short': '短距離',
        'mile': 'マイル',
        'intermediate': '中距離',
        'long': '長距離'
      };
      return categoryNames[category as keyof typeof categoryNames] || '距離';
    }
    if (condition.startsWith('weather_')) {
      return `${condition.split('_')[1]}天候`;
    }
    return condition;
  }
};