import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Target } from 'lucide-react';
import { BettingStrategyService, BettingStrategy } from '@/services/bettingStrategyService';
import { PredictionResult } from '@/types/prediction';

interface StrategyRecommendationProps {
  prediction: PredictionResult;
  availableOdds: { [key: string]: number };
  onStrategySelect: (strategy: BettingStrategy) => void;
}

export const StrategyRecommendation: React.FC<StrategyRecommendationProps> = ({
  prediction,
  availableOdds,
  onStrategySelect
}) => {
  const [strategies, setStrategies] = useState<BettingStrategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<BettingStrategy | null>(null);

  useEffect(() => {
    const generatedStrategies = BettingStrategyService.generateStrategies(
      prediction,
      availableOdds
    );
    setStrategies(generatedStrategies);
  }, [prediction, availableOdds]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getReturnIcon = (expectedReturn: number) => {
    if (expectedReturn > 0.1) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (expectedReturn > 0) return <Target className="w-4 h-4 text-blue-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">
          📊 あなたの予想精度を活かした投資戦略
        </h3>
        <p className="text-sm text-blue-700">
          予想3頭中1頭が3着以内の確率: <strong>80%</strong><br/>
          この高い的中率を最大限活用する戦略を提案します。
        </p>
      </div>

      <div className="grid gap-4">
        {strategies.map((strategy, index) => (
          <Card 
            key={index} 
            className={`cursor-pointer transition-all ${
              selectedStrategy?.name === strategy.name 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:shadow-md'
            }`}
            onClick={() => setSelectedStrategy(strategy)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{strategy.name}</CardTitle>
                <div className="flex gap-2">
                  <Badge className={getRiskColor(strategy.riskLevel)}>
                    {strategy.riskLevel === 'low' ? '低リスク' : 
                     strategy.riskLevel === 'medium' ? '中リスク' : '高リスク'}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {getReturnIcon(strategy.expectedReturn)}
                    <span className={`text-sm font-medium ${
                      strategy.expectedReturn > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(strategy.expectedReturn * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <p className="text-gray-600 mb-3">{strategy.description}</p>
              
              {strategy.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">推奨購入:</h4>
                  {strategy.recommendations.map((rec, recIndex) => (
                    <div key={recIndex} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                      <span>
                        {rec.betType} {rec.horses.join('-')}番
                      </span>
                      <div className="flex gap-2">
                        <span className="text-gray-600">{rec.amount}円</span>
                        <span className="text-blue-600">
                          予想配当: {rec.expectedOdds.toFixed(1)}倍
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {strategy.recommendations.length === 0 && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>現在の条件では推奨されません</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedStrategy && selectedStrategy.recommendations.length > 0 && (
        <div className="mt-6">
          <Button 
            onClick={() => onStrategySelect(selectedStrategy)}
            className="w-full"
            size="lg"
          >
            この戦略で投資する
          </Button>
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
        <h4 className="font-medium mb-2">💡 戦略のポイント</h4>
        <ul className="space-y-1">
          <li>• 80%の的中率は複勝単体では期待値マイナスの可能性</li>
          <li>• ワイド馬券なら1.25倍以上で期待値プラス</li>
          <li>• 馬連・3連複は的中率は下がるが高配当の可能性</li>
          <li>• 条件付き投資で期待値を最大化</li>
        </ul>
      </div>
    </div>
  );
};