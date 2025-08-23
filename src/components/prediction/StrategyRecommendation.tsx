import React from 'react';
import { ResponsiveCard, FlexLayout, ResponsiveGrid } from '@/components/common/ResponsiveContainer';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  Zap, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { AdaptivePredictionResult } from '@/services/adaptivePredictionService';
import { PredictionResult } from '@/types/prediction';
import { Investment } from '@/types/investment';

interface StrategyRecommendationProps {
  adaptivePrediction: AdaptivePredictionResult;
  historicalPredictions: PredictionResult[];
  investments: Investment[];
  raceInfo: {
    venue: string;
    distance: number;
    surface: 'turf' | 'dirt';
    condition: 'good' | 'slightly_heavy' | 'heavy' | 'bad';
  };
  onCreateInvestment?: (strategy: InvestmentStrategy) => void;
}

export interface InvestmentStrategy {
  type: 'win' | 'place' | 'exacta' | 'quinella' | 'trifecta' | 'wide';
  selections: number[];
  recommendedAmount: number;
  expectedOdds: number;
  riskLevel: 'low' | 'medium' | 'high';
  expectedReturn: number;
  rationale: string;
  confidence: number; // 0-100
}

interface StrategyAnalysis {
  primaryStrategies: InvestmentStrategy[];
  alternativeStrategies: InvestmentStrategy[];
  riskAssessment: {
    overall: 'conservative' | 'balanced' | 'aggressive';
    factors: string[];
    warnings: string[];
  };
  budgetRecommendation: {
    total: number;
    distribution: { [key: string]: number };
  };
}

export const StrategyRecommendation: React.FC<StrategyRecommendationProps> = ({
  adaptivePrediction,
  historicalPredictions,
  investments,
  raceInfo,
  onCreateInvestment
}) => {
  // 戦略分析の実行
  const strategyAnalysis = React.useMemo(() => {
    return analyzeInvestmentStrategies(
      adaptivePrediction,
      historicalPredictions,
      investments,
      raceInfo
    );
  }, [adaptivePrediction, historicalPredictions, investments, raceInfo]);

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'low': return <Shield className="w-4 h-4" />;
      case 'medium': return <Target className="w-4 h-4" />;
      case 'high': return <Zap className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getStrategyIcon = (type: string) => {
    switch (type) {
      case 'win': return '🏆';
      case 'place': return '🥉';
      case 'exacta': return '🎯';
      case 'quinella': return '💫';
      case 'trifecta': return '🎲';
      case 'wide': return '🌟';
      default: return '💰';
    }
  };

  const getStrategyName = (type: string) => {
    const names: { [key: string]: string } = {
      win: '単勝',
      place: '複勝',
      exacta: '馬連',
      quinella: '馬単',
      trifecta: '3連複',
      wide: 'ワイド'
    };
    return names[type] || type;
  };

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <ResponsiveCard className="p-4">
        <FlexLayout direction="row" justify="between" align="center" className="mb-4">
          <div>
            <h3 className="text-responsive-lg font-bold flex items-center gap-2">
              <DollarSign className="text-green-600" size={20} />
              投資戦略推奨
            </h3>
            <p className="text-responsive-sm text-gray-600">
              AI分析に基づく最適投資プランの提案
            </p>
          </div>
          <div className="text-right">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              strategyAnalysis.riskAssessment.overall === 'conservative' 
                ? 'bg-green-100 text-green-700'
                : strategyAnalysis.riskAssessment.overall === 'aggressive'
                ? 'bg-red-100 text-red-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {strategyAnalysis.riskAssessment.overall === 'conservative' 
                ? '保守的'
                : strategyAnalysis.riskAssessment.overall === 'aggressive'
                ? 'アグレッシブ'
                : 'バランス'
              }
            </div>
          </div>
        </FlexLayout>

        {/* 全体的なリスク評価 */}
        <div className="p-3 bg-blue-50 rounded-lg mb-4">
          <h4 className="font-semibold text-blue-900 mb-2">リスク評価</h4>
          <div className="space-y-2 text-sm">
            {strategyAnalysis.riskAssessment.factors.map((factor, index) => (
              <div key={index} className="flex items-center gap-2 text-blue-700">
                <CheckCircle className="w-3 h-3 flex-shrink-0" />
                <span>{factor}</span>
              </div>
            ))}
          </div>
          {strategyAnalysis.riskAssessment.warnings.length > 0 && (
            <div className="mt-3 space-y-2">
              {strategyAnalysis.riskAssessment.warnings.map((warning, index) => (
                <div key={index} className="flex items-center gap-2 text-orange-700 text-sm">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </ResponsiveCard>

      {/* 主要戦略 */}
      <ResponsiveCard className="p-4">
        <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="text-green-600" size={16} />
          推奨戦略
        </h4>
        
        <div className="space-y-3">
          {strategyAnalysis.primaryStrategies.map((strategy, index) => (
            <StrategyCard
              key={index}
              strategy={strategy}
              onSelect={() => onCreateInvestment?.(strategy)}
              isRecommended={true}
            />
          ))}
        </div>
      </ResponsiveCard>

      {/* 代替戦略 */}
      {strategyAnalysis.alternativeStrategies.length > 0 && (
        <ResponsiveCard className="p-4">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Target className="text-blue-600" size={16} />
            代替戦略
          </h4>
          
          <div className="space-y-3">
            {strategyAnalysis.alternativeStrategies.map((strategy, index) => (
              <StrategyCard
                key={index}
                strategy={strategy}
                onSelect={() => onCreateInvestment?.(strategy)}
                isRecommended={false}
              />
            ))}
          </div>
        </ResponsiveCard>
      )}

      {/* 予算配分推奨 */}
      <ResponsiveCard className="p-4">
        <h4 className="font-semibold text-gray-800 mb-4">推奨予算配分</h4>
        
        <div className="mb-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-responsive-lg font-bold text-green-700">
              推奨総投資額: {strategyAnalysis.budgetRecommendation.total.toLocaleString()}円
            </div>
          </div>
        </div>

        <ResponsiveGrid columns={{ mobile: 2, tablet: 3 }} gap="sm">
          {Object.entries(strategyAnalysis.budgetRecommendation.distribution).map(([type, amount], index) => (
            <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg mb-1">{getStrategyIcon(type)}</div>
              <div className="text-sm text-gray-600">{getStrategyName(type)}</div>
              <div className="font-bold text-gray-800">{amount.toLocaleString()}円</div>
            </div>
          ))}
        </ResponsiveGrid>
      </ResponsiveCard>

      {/* パフォーマンス予測 */}
      <ResponsiveCard className="p-4 bg-gradient-to-r from-purple-50 to-blue-50">
        <h4 className="font-semibold text-purple-900 mb-4">期待パフォーマンス</h4>
        
        <ResponsiveGrid columns={{ mobile: 2, tablet: 4 }} gap="sm">
          <div className="text-center">
            <div className="text-responsive-lg font-bold text-purple-600">
              {adaptivePrediction.statisticalInsights.expectedHitRate > 0 
                ? (adaptivePrediction.statisticalInsights.expectedHitRate * 100).toFixed(1) 
                : '0.0'
              }%
            </div>
            <div className="text-responsive-xs text-purple-700">期待的中率</div>
          </div>
          
          <div className="text-center">
            <div className="text-responsive-lg font-bold text-blue-600">
              {calculateExpectedROI(strategyAnalysis.primaryStrategies).toFixed(1)}%
            </div>
            <div className="text-responsive-xs text-blue-700">期待ROI</div>
          </div>
          
          <div className="text-center">
            <div className="text-responsive-lg font-bold text-green-600">
              {calculateRiskScore(strategyAnalysis.primaryStrategies)}/10
            </div>
            <div className="text-responsive-xs text-green-700">リスクスコア</div>
          </div>
          
          <div className="text-center">
            <div className="text-responsive-lg font-bold text-orange-600">
              {Math.round(strategyAnalysis.primaryStrategies.reduce((sum, s) => sum + s.confidence, 0) / strategyAnalysis.primaryStrategies.length)}%
            </div>
            <div className="text-responsive-xs text-orange-700">平均確信度</div>
          </div>
        </ResponsiveGrid>
      </ResponsiveCard>
    </div>
  );
};

// 戦略カードコンポーネント
interface StrategyCardProps {
  strategy: InvestmentStrategy;
  onSelect: () => void;
  isRecommended: boolean;
}

const StrategyCard: React.FC<StrategyCardProps> = ({ strategy, onSelect, isRecommended }) => {
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'low': return <Shield className="w-4 h-4" />;
      case 'medium': return <Target className="w-4 h-4" />;
      case 'high': return <Zap className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getStrategyIcon = (type: string) => {
    switch (type) {
      case 'win': return '🏆';
      case 'place': return '🥉';
      case 'exacta': return '🎯';
      case 'quinella': return '💫';
      case 'trifecta': return '🎲';
      case 'wide': return '🌟';
      default: return '💰';
    }
  };

  const getStrategyName = (type: string) => {
    const names: { [key: string]: string } = {
      win: '単勝',
      place: '複勝',
      exacta: '馬連',
      quinella: '馬単',
      trifecta: '3連複',
      wide: 'ワイド'
    };
    return names[type] || type;
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${isRecommended ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
      <FlexLayout direction="row" justify="between" align="center" className="mb-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{getStrategyIcon(strategy.type)}</div>
          <div>
            <h5 className="font-bold text-gray-800">{getStrategyName(strategy.type)}</h5>
            <div className="text-sm text-gray-600">
              選択: {strategy.selections.join('番・')}番
            </div>
          </div>
        </div>
        
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(strategy.riskLevel)}`}>
          {getRiskLevelIcon(strategy.riskLevel)}
          <span>{strategy.riskLevel === 'low' ? '低リスク' : strategy.riskLevel === 'medium' ? '中リスク' : '高リスク'}</span>
        </div>
      </FlexLayout>

      <ResponsiveGrid columns={{ mobile: 2, tablet: 4 }} gap="sm" className="mb-3">
        <div>
          <div className="text-xs text-gray-600">推奨投資額</div>
          <div className="font-bold text-blue-600">{strategy.recommendedAmount.toLocaleString()}円</div>
        </div>
        <div>
          <div className="text-xs text-gray-600">期待オッズ</div>
          <div className="font-bold text-green-600">{strategy.expectedOdds.toFixed(1)}倍</div>
        </div>
        <div>
          <div className="text-xs text-gray-600">期待収益</div>
          <div className={`font-bold ${strategy.expectedReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {strategy.expectedReturn >= 0 ? '+' : ''}{strategy.expectedReturn.toLocaleString()}円
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600">確信度</div>
          <div className="font-bold text-purple-600">{strategy.confidence}%</div>
        </div>
      </ResponsiveGrid>

      <p className="text-sm text-gray-700 mb-3">{strategy.rationale}</p>

      <TouchOptimizedButton
        onClick={onSelect}
        variant={isRecommended ? "primary" : "secondary"}
        size="sm"
        fullWidth
      >
        この戦略で投資記録を作成
      </TouchOptimizedButton>
    </div>
  );
};

// 戦略分析ロジック
function analyzeInvestmentStrategies(
  adaptivePrediction: AdaptivePredictionResult,
  historicalPredictions: PredictionResult[],
  investments: Investment[],
  raceInfo: any
): StrategyAnalysis {
  const confidence = adaptivePrediction.confidenceLevel;
  const expectedHitRate = adaptivePrediction.statisticalInsights.expectedHitRate;
  const predictions = adaptivePrediction.predictions.slice(0, 3);
  
  // 過去の成績分析
  const historicalAnalysis = analyzeHistoricalPerformance(historicalPredictions, investments);
  
  const primaryStrategies: InvestmentStrategy[] = [];
  const alternativeStrategies: InvestmentStrategy[] = [];

  // 確信度に基づく戦略決定
  if (confidence.overall === 'high') {
    // 高確信度: より積極的な戦略
    primaryStrategies.push({
      type: 'win',
      selections: [predictions[0].horse.number],
      recommendedAmount: 3000,
      expectedOdds: predictions[0].horse.odds || 3.0,
      riskLevel: 'medium',
      expectedReturn: (3000 * (predictions[0].horse.odds || 3.0) - 3000) * expectedHitRate,
      rationale: `${predictions[0].horse.name}の単勝。高い確信度とAI分析により、的中確率が高いと判断されます。`,
      confidence: confidence.topPick
    });

    primaryStrategies.push({
      type: 'exacta',
      selections: [predictions[0].horse.number, predictions[1].horse.number],
      recommendedAmount: 2000,
      expectedOdds: ((predictions[0].horse.odds || 3.0) * (predictions[1].horse.odds || 4.0)) / 2,
      riskLevel: 'high',
      expectedReturn: (2000 * (((predictions[0].horse.odds || 3.0) * (predictions[1].horse.odds || 4.0)) / 2) - 2000) * (expectedHitRate * 0.3),
      rationale: `上位2頭の馬連。統計的に安定した組み合わせと判断されます。`,
      confidence: Math.round(confidence.topPick * 0.7)
    });

    // 代替戦略
    alternativeStrategies.push({
      type: 'place',
      selections: [predictions[0].horse.number],
      recommendedAmount: 2000,
      expectedOdds: (predictions[0].horse.odds || 3.0) * 0.4,
      riskLevel: 'low',
      expectedReturn: (2000 * ((predictions[0].horse.odds || 3.0) * 0.4) - 2000) * (expectedHitRate * 2.5),
      rationale: `${predictions[0].horse.name}の複勝。安全な投資でリスクを抑えた戦略です。`,
      confidence: Math.round(confidence.topPick * 0.9)
    });
  } else if (confidence.overall === 'medium') {
    // 中確信度: バランス戦略
    primaryStrategies.push({
      type: 'place',
      selections: [predictions[0].horse.number],
      recommendedAmount: 2500,
      expectedOdds: (predictions[0].horse.odds || 3.0) * 0.4,
      riskLevel: 'low',
      expectedReturn: (2500 * ((predictions[0].horse.odds || 3.0) * 0.4) - 2500) * (expectedHitRate * 2.5),
      rationale: `${predictions[0].horse.name}の複勝。中程度の確信度でリスクを抑えた戦略です。`,
      confidence: confidence.topPick
    });

    primaryStrategies.push({
      type: 'wide',
      selections: [predictions[0].horse.number, predictions[1].horse.number],
      recommendedAmount: 1500,
      expectedOdds: Math.sqrt((predictions[0].horse.odds || 3.0) * (predictions[1].horse.odds || 4.0)),
      riskLevel: 'medium',
      expectedReturn: (1500 * Math.sqrt((predictions[0].horse.odds || 3.0) * (predictions[1].horse.odds || 4.0)) - 1500) * (expectedHitRate * 1.5),
      rationale: `上位2頭のワイド。適度なリスクで安定した収益を狙います。`,
      confidence: Math.round(confidence.topPick * 0.8)
    });

    // 代替戦略
    alternativeStrategies.push({
      type: 'win',
      selections: [predictions[0].horse.number],
      recommendedAmount: 1000,
      expectedOdds: predictions[0].horse.odds || 3.0,
      riskLevel: 'medium',
      expectedReturn: (1000 * (predictions[0].horse.odds || 3.0) - 1000) * expectedHitRate,
      rationale: `少額での単勝投資。リスクを限定しつつ高配当を狙います。`,
      confidence: Math.round(confidence.topPick * 0.9)
    });
  } else {
    // 低確信度: 保守的戦略
    primaryStrategies.push({
      type: 'place',
      selections: [predictions[0].horse.number],
      recommendedAmount: 1500,
      expectedOdds: (predictions[0].horse.odds || 3.0) * 0.4,
      riskLevel: 'low',
      expectedReturn: (1500 * ((predictions[0].horse.odds || 3.0) * 0.4) - 1500) * (expectedHitRate * 2.5),
      rationale: `保守的な複勝投資。データの信頼性が低いため、損失を最小限に抑えます。`,
      confidence: confidence.topPick
    });

    // 代替戦略
    alternativeStrategies.push({
      type: 'wide',
      selections: [predictions[0].horse.number, predictions[1].horse.number],
      recommendedAmount: 1000,
      expectedOdds: Math.sqrt((predictions[0].horse.odds || 3.0) * (predictions[1].horse.odds || 4.0)),
      riskLevel: 'low',
      expectedReturn: (1000 * Math.sqrt((predictions[0].horse.odds || 3.0) * (predictions[1].horse.odds || 4.0)) - 1000) * (expectedHitRate * 1.5),
      rationale: `上位2頭のワイド。的中範囲を広げてリスクを分散します。`,
      confidence: Math.round(confidence.topPick * 0.7)
    });
  }

  // リスク評価
  const riskFactors = [];
  const warnings = [];

  if (expectedHitRate > 0.4) riskFactors.push('高い期待的中率');
  if (confidence.dataQuality === 'excellent') riskFactors.push('優秀なデータ品質');
  if (adaptivePrediction.statisticalInsights.currentStats.recentTrend === 'improving') riskFactors.push('成績向上トレンド');

  if (expectedHitRate < 0.2) warnings.push('期待的中率が低めです');
  if (confidence.dataQuality === 'poor') warnings.push('データが不足しています');
  if (historicalAnalysis.averageROI < 80) warnings.push('過去の収益率が低いです');

  // 予算配分
  const totalBudget = primaryStrategies.reduce((sum, s) => sum + s.recommendedAmount, 0);
  const distribution: { [key: string]: number } = {};
  primaryStrategies.forEach(strategy => {
    distribution[strategy.type] = strategy.recommendedAmount;
  });

  return {
    primaryStrategies,
    alternativeStrategies,
    riskAssessment: {
      overall: adaptivePrediction.statisticalInsights.recommendedStrategy,
      factors: riskFactors,
      warnings
    },
    budgetRecommendation: {
      total: totalBudget,
      distribution
    }
  };
}

// 過去成績分析
function analyzeHistoricalPerformance(predictions: PredictionResult[], investments: Investment[]) {
  const completed = predictions.filter(p => p.isResultEntered);
  const totalInvestment = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPayout = investments.reduce((sum, inv) => sum + inv.payout, 0);
  
  return {
    totalPredictions: predictions.length,
    completedPredictions: completed.length,
    averageROI: totalInvestment > 0 ? (totalPayout / totalInvestment) * 100 : 100,
    hitRate: completed.length > 0 ? completed.filter(p => 
      p.actualResults?.find(r => r.number === p.predictions[0]?.horse.number)?.rank === 1
    ).length / completed.length : 0
  };
}

// 期待ROI計算
function calculateExpectedROI(strategies: InvestmentStrategy[]): number {
  if (strategies.length === 0) return 0;
  return strategies.reduce((sum, s) => {
    const roi = s.recommendedAmount > 0 ? (s.expectedReturn / s.recommendedAmount) * 100 : 0;
    return sum + roi;
  }, 0) / strategies.length;
}

// リスクスコア計算
function calculateRiskScore(strategies: InvestmentStrategy[]): number {
  if (strategies.length === 0) return 5;
  const riskValues = { low: 3, medium: 5, high: 8 };
  const avgRisk = strategies.reduce((sum, s) => sum + riskValues[s.riskLevel], 0) / strategies.length;
  return Math.round(avgRisk);
}