import React, { useState, useEffect, memo, useCallback } from 'react';
import { Brain, TrendingUp, Settings, AlertCircle, RefreshCw, DollarSign, Zap, Target } from 'lucide-react';
import { ResponsiveCard, FlexLayout } from '@/components/common/ResponsiveContainer';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { PredictionResults } from './PredictionResults';
import { StatisticalInsights } from './StatisticalInsights';
import { StrategyRecommendation, InvestmentStrategy } from './StrategyRecommendation';
import { EnhancedInvestmentModal } from './EnhancedInvestmentModal';
import { 
  AdaptivePredictionService, 
  AdaptivePredictionInput, 
  AdaptivePredictionResult,
  AdaptivePredictionWeights 
} from '@/services/adaptivePredictionService';
import { PredictionResult } from '@/types/prediction';
import { Investment } from '@/types/investment';
import { useMemoizedCallback } from '@/utils/performanceOptimization';

interface EnhancedPredictionEngineProps {
  race: {
    id?: string;
    date: string;
    venue: string;
    raceNumber: number;
    distance: number;
    surface: 'turf' | 'dirt';
    condition: 'good' | 'slightly_heavy' | 'heavy' | 'bad';
    weather?: string;
    horses: Array<{
      name: string;
      number: number;
      jockey: string;
      popularity: number;
      odds: number | null;
      pastRaces: Array<{
        rank: number;
        distance: number;
        time: number;
        surface: 'turf' | 'dirt';
        condition: 'good' | 'slightly_heavy' | 'heavy' | 'bad';
      }>;
      isDebutant?: boolean;
      trainerRating?: number;
      jockeyRating?: number;
      pedigreeRating?: number;
    }>;
  };
  historicalPredictions: PredictionResult[];
  investments: Investment[];
  onPredictionSave?: (predictionData: any) => Promise<string>;
  onInvestmentSave?: (investment: any) => void;
  onViewInvestment?: (predictionId?: string, raceData?: any) => void;
}

const EnhancedPredictionEngineComponent: React.FC<EnhancedPredictionEngineProps> = ({
  race,
  historicalPredictions,
  investments,
  onPredictionSave,
  onInvestmentSave,
  onViewInvestment
}) => {
  const [adaptivePredictionResult, setAdaptivePredictionResult] = useState<AdaptivePredictionResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const [showStrategies, setShowStrategies] = useState(true); // デフォルトで戦略を表示
  const [lastCalculated, setLastCalculated] = useState<Date | null>(null);
  const [lastSavedPrediction, setLastSavedPrediction] = useState<any>(null);
  const [savedPredictionId, setSavedPredictionId] = useState<string | null>(null);
  const [manualWeights, setManualWeights] = useState<AdaptivePredictionWeights | null>(null);
  const [useAdaptiveWeights, setUseAdaptiveWeights] = useState(true);
  const [selectedStrategy, setSelectedStrategy] = useState<InvestmentStrategy | null>(null);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);

  // AI予想計算
  const calculateAdaptivePredictions = useCallback(async () => {
    if (!race.horses || race.horses.length === 0) {
      setAdaptivePredictionResult(null);
      return;
    }

    setIsCalculating(true);

    try {
      const input: AdaptivePredictionInput = {
        race: {
          venue: race.venue,
          distance: race.distance,
          surface: race.surface,
          condition: race.condition,
          weather: race.weather
        },
        horses: race.horses,
        historicalPredictions,
        investments
      };

      console.log('🤖 AI予想計算開始:', input);

      const result = await AdaptivePredictionService.generateAdaptivePrediction(input);
      
      console.log('✅ AI予想計算完了:', result);
      
      setAdaptivePredictionResult(result);
    } catch (error) {
      console.error('❌ AI予想計算エラー:', error);
      // エラー時は基本予想にフォールバック
      setAdaptivePredictionResult(null);
    } finally {
      setIsCalculating(false);
      setLastCalculated(new Date());
    }
  }, [race, historicalPredictions, investments]);

  // レースデータ変更時の自動再計算
  useEffect(() => {
    if (race.horses && race.horses.length > 0) {
      const timer = setTimeout(() => {
        calculateAdaptivePredictions();
      }, 500); // デバウンス
      
      return () => clearTimeout(timer);
    }
  }, [calculateAdaptivePredictions]);

  // 手動再計算
  const handleRefreshPredictions = useMemoizedCallback(() => {
    calculateAdaptivePredictions();
  }, [calculateAdaptivePredictions]);

  // 予想保存
  const handleSavePrediction = useMemoizedCallback(async () => {
    if (adaptivePredictionResult && onPredictionSave) {
      const predictionData = {
        raceId: race.id || `${race.venue}_${race.date}_${race.raceNumber}`,
        date: new Date().toISOString(),
        raceInfo: {
          date: race.date,
          venue: race.venue,
          raceNumber: race.raceNumber,
          distance: race.distance,
          surface: race.surface,
          condition: race.condition
        },
        predictions: adaptivePredictionResult.predictions,
        confidenceLevel: adaptivePredictionResult.confidenceLevel,
        statisticalInsights: adaptivePredictionResult.statisticalInsights,
        adaptedWeights: adaptivePredictionResult.adaptedWeights,
        calculatedAt: lastCalculated,
        engineType: 'enhanced' // 拡張エンジン使用フラグ
      };
      
      const result = await onPredictionSave(predictionData);
      if (typeof result === 'string') {
        setSavedPredictionId(result);
      }
      setLastSavedPrediction(predictionData);
    }
  }, [adaptivePredictionResult, onPredictionSave, race, lastCalculated]);

  // 投資記録作成（戦略適用）
  const handleCreateInvestment = useMemoizedCallback(() => {
    setSelectedStrategy(null);
    setShowInvestmentModal(true);
  }, []);

  // 戦略選択による投資記録作成
  const handleCreateInvestmentWithStrategy = useMemoizedCallback((strategy: InvestmentStrategy) => {
    setSelectedStrategy(strategy);
    setShowInvestmentModal(true);
  }, []);

  // 重み設定変更
  const handleWeightChange = useMemoizedCallback((newWeights: Partial<AdaptivePredictionWeights>) => {
    if (manualWeights) {
      const updatedWeights = { ...manualWeights, ...newWeights };
      setManualWeights(updatedWeights);
      // 手動重み使用時は自動再計算しない
    }
  }, [manualWeights]);

  // 適応的重み使用の切り替え
  const toggleAdaptiveWeights = useMemoizedCallback((useAdaptive: boolean) => {
    setUseAdaptiveWeights(useAdaptive);
    if (useAdaptive) {
      setManualWeights(null);
      // 適応的重みに切り替え時は再計算
      setTimeout(() => calculateAdaptivePredictions(), 100);
    } else {
      // 手動重みの初期値を現在の適応重みに設定
      if (adaptivePredictionResult) {
        setManualWeights(adaptivePredictionResult.adaptedWeights);
      }
    }
  }, [calculateAdaptivePredictions, adaptivePredictionResult]);

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-blue-600 bg-blue-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'aggressive': return <TrendingUp className="text-red-600" size={16} />;
      case 'balanced': return <Zap className="text-blue-600" size={16} />;
      case 'conservative': return <AlertCircle className="text-green-600" size={16} />;
      default: return <Brain className="text-gray-600" size={16} />;
    }
  };

  const getStrategyLabel = (strategy: string) => {
    switch (strategy) {
      case 'aggressive': return 'アグレッシブ';
      case 'balanced': return 'バランス';
      case 'conservative': return '保守的';
      default: return '標準';
    }
  };

  if (!race.horses || race.horses.length === 0) {
    return (
      <ResponsiveCard className="p-6 text-center">
        <Brain className="mx-auto mb-4 text-gray-400" size={48} />
        <h3 className="text-responsive-lg font-medium text-gray-600 mb-2">
          統計連動AI予想エンジン
        </h3>
        <p className="text-responsive-sm text-gray-500">
          出走馬データを入力すると統計に基づいたAI予想を開始できます
        </p>
      </ResponsiveCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* エンジンヘッダー */}
      <ResponsiveCard className="p-4">
        <FlexLayout direction="row" justify="between" align="center" className="mb-4">
          <div>
            <h2 className="text-responsive-lg font-bold flex items-center gap-2">
              <Brain className="text-purple-600" size={20} />
              統計連動AI予想エンジン
            </h2>
            <p className="text-responsive-sm text-gray-600">
              {race.date} {race.venue} {race.raceNumber}R • {race.surface === 'turf' ? '芝' : 'ダート'}{race.distance}m • {race.horses?.length || 0}頭立て
            </p>
            {historicalPredictions.length > 0 && (
              <p className="text-responsive-xs text-purple-600 mt-1">
                📊 過去{historicalPredictions.length}回の予想データを活用
              </p>
            )}
          </div>
          
          <FlexLayout direction="row" gap="sm">
            <TouchOptimizedButton
              onClick={() => setShowSettings(!showSettings)}
              variant="ghost"
              size="sm"
              icon={Settings}
            >
              設定
            </TouchOptimizedButton>
            
            <TouchOptimizedButton
              onClick={handleRefreshPredictions}
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              disabled={isCalculating}
            >
              再計算
            </TouchOptimizedButton>
            
            {adaptivePredictionResult && (
              <TouchOptimizedButton
                onClick={() => setShowStrategies(!showStrategies)}
                variant={showStrategies ? "primary" : "ghost"}
                size="sm"
                icon={Target}
              >
                戦略推奨
              </TouchOptimizedButton>
            )}
            
            {adaptivePredictionResult && onPredictionSave && !lastSavedPrediction && (
              <TouchOptimizedButton
                onClick={handleSavePrediction}
                variant="primary"
                size="sm"
              >
                保存
              </TouchOptimizedButton>
            )}
            
            {lastSavedPrediction && (
              <TouchOptimizedButton
                onClick={handleCreateInvestment}
                variant="secondary"
                size="sm"
                icon={DollarSign}
              >
                投資記録
              </TouchOptimizedButton>
            )}
          </FlexLayout>
        </FlexLayout>

        {/* AI予想結果サマリー */}
        {adaptivePredictionResult && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg mb-4">
            <FlexLayout direction="row" justify="between" align="center" className="mb-3">
              <div>
                <h4 className="font-medium text-purple-900">AI予想確信度</h4>
                <p className="text-sm text-purple-700">
                  統計分析とデータ品質による総合評価
                </p>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${getConfidenceColor(adaptivePredictionResult.confidenceLevel.overall)}`}>
                  <span className="font-bold">
                    {adaptivePredictionResult.confidenceLevel.overall === 'high' ? '高' : 
                     adaptivePredictionResult.confidenceLevel.overall === 'medium' ? '中' : '低'}
                  </span>
                  <span className="text-sm">({adaptivePredictionResult.confidenceLevel.topPick}/100)</span>
                </div>
              </div>
            </FlexLayout>
            
            <FlexLayout direction="row" justify="between" align="center">
              <div>
                <span className="text-sm text-purple-700">推奨戦略:</span>
                <div className="flex items-center gap-1 mt-1">
                  {getStrategyIcon(adaptivePredictionResult.statisticalInsights.recommendedStrategy)}
                  <span className="font-medium text-purple-800">
                    {getStrategyLabel(adaptivePredictionResult.statisticalInsights.recommendedStrategy)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-purple-700">期待的中率</div>
                <div className="font-bold text-purple-800">
                  {(adaptivePredictionResult.statisticalInsights.expectedHitRate * 100).toFixed(1)}%
                </div>
              </div>
            </FlexLayout>
          </div>
        )}

        {/* 設定パネル */}
        {showSettings && (
          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <h4 className="font-medium mb-4">エンジン設定</h4>
            
            {/* 重み適応モード */}
            <div className="mb-4">
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={useAdaptiveWeights}
                  onChange={(e) => toggleAdaptiveWeights(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium">
                  統計ベース自動重み調整（推奨）
                </span>
              </label>
              <p className="text-xs text-gray-600">
                過去の成績に基づいて重みを自動調整します
              </p>
            </div>

            {/* 適応重み表示 */}
            {useAdaptiveWeights && adaptivePredictionResult && (
              <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                <h5 className="text-sm font-medium text-purple-900 mb-2">現在の適応重み</h5>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-purple-800">{adaptivePredictionResult.adaptedWeights.speed}</div>
                    <div className="text-purple-600">スピード</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-purple-800">{adaptivePredictionResult.adaptedWeights.recent}</div>
                    <div className="text-purple-600">直近</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-purple-800">{adaptivePredictionResult.adaptedWeights.odds}</div>
                    <div className="text-purple-600">オッズ</div>
                  </div>
                </div>
                <div className="text-xs text-purple-600 text-center mt-2">
                  適応係数: {(adaptivePredictionResult.adaptedWeights.adaptionFactor * 100).toFixed(0)}%
                </div>
              </div>
            )}

            {/* 手動重み設定 */}
            {!useAdaptiveWeights && manualWeights && (
              <div className="space-y-3">
                {Object.entries({
                  speed: 'スピード指数',
                  recent: '直近成績',
                  odds: 'オッズ評価'
                }).map(([key, label]) => (
                  <div key={key}>
                    <FlexLayout direction="row" justify="between" align="center" className="mb-2">
                      <label className="text-sm font-medium">{label}</label>
                      <span className="text-sm text-gray-600">
                        {manualWeights[key as keyof AdaptivePredictionWeights]}
                      </span>
                    </FlexLayout>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={manualWeights[key as keyof AdaptivePredictionWeights] as number}
                      onChange={(e) => handleWeightChange({
                        [key]: parseInt(e.target.value)
                      } as Partial<AdaptivePredictionWeights>)}
                      className="w-full accent-purple-600"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 表示オプション */}
            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showInsights}
                  onChange={(e) => setShowInsights(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">
                  統計分析の詳細を表示
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showStrategies}
                  onChange={(e) => setShowStrategies(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">
                  AI投資戦略推奨を表示
                </span>
              </label>
            </div>
          </div>
        )}

        {/* 計算状態表示 */}
        {isCalculating && (
          <div className="flex items-center justify-center gap-2 py-4">
            <RefreshCw className="animate-spin text-purple-600" size={20} />
            <span className="text-sm text-gray-600">AI予想を計算中...</span>
          </div>
        )}

        {/* 最終計算時刻 */}
        {lastCalculated && !isCalculating && (
          <div className="text-xs text-gray-500 text-center">
            最終更新: {lastCalculated.toLocaleTimeString()}
          </div>
        )}
      </ResponsiveCard>

      {/* 統計分析パネル */}
      {adaptivePredictionResult && showInsights && !isCalculating && (
        <StatisticalInsights
          currentStats={adaptivePredictionResult.statisticalInsights.currentStats}
          confidenceLevel={adaptivePredictionResult.confidenceLevel.overall}
          expectedHitRate={adaptivePredictionResult.statisticalInsights.expectedHitRate}
          raceConditions={{
            surface: race.surface,
            distance: race.distance,
            weather: race.weather
          }}
        />
      )}

      {/* AI投資戦略推奨パネル */}
      {adaptivePredictionResult && showStrategies && !isCalculating && (
        <StrategyRecommendation
          adaptivePrediction={adaptivePredictionResult}
          historicalPredictions={historicalPredictions}
          investments={investments}
          raceInfo={{
            venue: race.venue,
            distance: race.distance,
            surface: race.surface,
            condition: race.condition
          }}
          onCreateInvestment={handleCreateInvestmentWithStrategy}
        />
      )}

      {/* AI予想結果表示 */}
      {adaptivePredictionResult && !isCalculating && (
        <PredictionResults
          predictions={adaptivePredictionResult.predictions}
          raceInfo={race}
          weights={{
            speed: adaptivePredictionResult.adaptedWeights.speed,
            recent: adaptivePredictionResult.adaptedWeights.recent,
            odds: adaptivePredictionResult.adaptedWeights.odds
          }}
          onWeightChange={!useAdaptiveWeights ? handleWeightChange : undefined}
          onViewInvestment={onViewInvestment}
          predictionId={savedPredictionId || undefined}
          race={race}
        />
      )}

      {/* データ不足警告 */}
      {historicalPredictions.length < 10 && (
        <ResponsiveCard className="p-4 bg-yellow-50 border border-yellow-200">
          <FlexLayout direction="row" align="center" gap="sm">
            <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
            <div>
              <h4 className="font-medium text-yellow-800">データ学習中</h4>
              <p className="text-sm text-yellow-700 mt-1">
                より高精度な予想のため、予想履歴を蓄積中です。
                現在の予想数: {historicalPredictions.length}/20（推奨数）
              </p>
            </div>
          </FlexLayout>
        </ResponsiveCard>
      )}

      {/* 拡張投資記録作成モーダル */}
      {showInvestmentModal && lastSavedPrediction && (
        <EnhancedInvestmentModal
          prediction={lastSavedPrediction}
          race={race}
          savedPredictionId={savedPredictionId}
          onPredictionSave={onPredictionSave}
          selectedStrategy={selectedStrategy}
          onClose={() => setShowInvestmentModal(false)}
          onSave={(investment) => {
            if (onInvestmentSave) {
              onInvestmentSave(investment);
            }
            setShowInvestmentModal(false);
          }}
        />
      )}
    </div>
  );
};

// メモ化されたコンポーネントをエクスポート
export const EnhancedPredictionEngine = memo(EnhancedPredictionEngineComponent);