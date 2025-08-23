import React, { useState, useEffect, memo, useCallback } from 'react';
import { Calculator, Settings, AlertCircle, RefreshCw, DollarSign, BarChart3, TrendingUp } from 'lucide-react';
import { ResponsiveCard, FlexLayout } from '@/components/common/ResponsiveContainer';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { PredictionResults } from './PredictionResults';
import { StatisticalInsights } from './StatisticalInsights';
import { StrategyRecommendation } from '@/components/investment/StrategyRecommendation';
import { AdaptivePredictionService, AdaptivePredictionResult } from '@/services/adaptivePredictionService';
import { detailedStatisticsService } from '@/services/detailedStatisticsService';
import { usePredictionWorker } from '@/hooks/usePredictionWorker';
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
    }>;
  };
  onPredictionSave?: (predictionData: any) => Promise<string>;
  onInvestmentSave?: (investment: any) => void;
  onViewInvestment?: (predictionId?: string, raceData?: any) => void;
}

const EnhancedPredictionEngineComponent: React.FC<EnhancedPredictionEngineProps> = ({
  race,
  onPredictionSave,
  onInvestmentSave,
  onViewInvestment
}) => {
  const [weights, setWeights] = useState({
    speed: 40,
    recent: 30,
    odds: 30
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculated, setLastCalculated] = useState<Date | null>(null);
  const [predictionResult, setPredictionResult] = useState<AdaptivePredictionResult | null>(null);
  const [currentStats, setCurrentStats] = useState<any>(null);
  const [savedPredictionId, setSavedPredictionId] = useState<string | null>(null);
  
  // 統計データを取得
  useEffect(() => {
    const loadStatistics = async () => {
      try {
        const stats = await detailedStatisticsService.getDetailedStatistics();
        setCurrentStats({
          overallHitRate: stats.hitPatterns.any1.rate,
          hitPatterns: stats.hitPatterns,
          recentTrend: 'stable', // 実際の実装では計算
          conditionSpecificStats: {
            [`surface_${race.surface}`]: stats.hitPatterns.any1.rate * 1.1, // 仮の値
            [`distance_${race.distance < 1400 ? 'short' : race.distance < 1800 ? 'mile' : 'intermediate'}`]: stats.hitPatterns.any1.rate * 0.95
          }
        });
      } catch (error) {
        console.error('統計データ取得エラー:', error);
      }
    };

    loadStatistics();
  }, [race.surface, race.distance]);

  // 適応型予想の計算
  const calculateAdaptivePrediction = useCallback(async () => {
    if (!race.horses || race.horses.length === 0 || !currentStats) {
      setPredictionResult(null);
      return;
    }

    setIsCalculating(true);

    try {
      // レース条件を構築
      const raceConditions = {
        surface: race.surface,
        distance: race.distance,
        condition: race.condition,
        weather: 'clear' // 実際の実装では取得
      };

      // 馬データを変換
      const horseData = race.horses.map(horse => ({
        name: horse.name,
        number: horse.number,
        jockey: horse.jockey,
        popularity: horse.popularity,
        odds: horse.odds || 3.0,
        pastRaces: horse.pastRaces,
        confidence: 0.5 // 基本値
      }));

      // 適応型予想を実行
      const result = await AdaptivePredictionService.generateAdaptivePrediction(
        horseData,
        raceConditions
      );

      setPredictionResult(result);
    } catch (error) {
      console.error('適応型予想計算エラー:', error);
      setPredictionResult(null);
    } finally {
      setIsCalculating(false);
      setLastCalculated(new Date());
    }
  }, [race, currentStats]);

  // 統計データが読み込まれたら予想を実行
  useEffect(() => {
    if (currentStats && race.horses && race.horses.length > 0) {
      const timer = setTimeout(() => {
        calculateAdaptivePrediction();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [calculateAdaptivePrediction, currentStats]);

  // 予想保存
  const handleSavePrediction = useMemoizedCallback(async () => {
    if (predictionResult && onPredictionSave) {
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
        weights,
        predictions: predictionResult.rankings.map(horse => ({
          horse: {
            name: horse.name,
            number: horse.number,
            jockey: horse.jockey || '',
            popularity: horse.popularity || 0,
            odds: horse.odds || 3.0
          },
          scores: {
            speed: Math.round(horse.speedIndex || 0),
            recent: Math.round(horse.recentForm === 'excellent' ? 90 : 
                             horse.recentForm === 'good' ? 70 : 
                             horse.recentForm === 'fair' ? 50 : 30),
            odds: Math.round((horse.odds || 3.0) * 10),
            total: Math.round(horse.confidence * 100)
          },
          speedIndex: Math.round(horse.speedIndex || 0),
          recentForm: horse.recentForm || 'fair',
          confidence: horse.confidence > 0.6 ? 'high' : 
                     horse.confidence > 0.4 ? 'medium' : 'low',
          pastRaces: horse.pastRaces || []
        })),
        confidence: {
          level: predictionResult.confidenceLevel === 'high' ? 5 : 
                 predictionResult.confidenceLevel === 'medium' ? 3 : 1,
          score: Math.round(predictionResult.expectedHitRate * 100),
          description: predictionResult.confidenceLevel === 'high' ? '高' : 
                      predictionResult.confidenceLevel === 'medium' ? '中' : '低',
          factors: [
            { name: 'データ品質', score: 80 },
            { name: 'アルゴリズム', score: 75 },
            { name: '統計的信頼性', score: Math.round(predictionResult.expectedHitRate * 100) },
            { name: '市場整合性', score: 70 }
          ]
        },
        adaptiveData: {
          confidenceLevel: predictionResult.confidenceLevel,
          expectedHitRate: predictionResult.expectedHitRate,
          recommendedBetTypes: predictionResult.recommendedBetTypes,
          riskAssessment: predictionResult.riskAssessment
        },
        calculatedAt: lastCalculated
      };
      
      const result = await onPredictionSave(predictionData);
      if (typeof result === 'string') {
        setSavedPredictionId(result);
      }
    }
  }, [predictionResult, onPredictionSave, race, weights, lastCalculated]);

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-blue-600 bg-blue-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!race.horses || race.horses.length === 0) {
    return (
      <ResponsiveCard className="p-6 text-center">
        <Calculator className="mx-auto mb-4 text-gray-400" size={48} />
        <h3 className="text-responsive-lg font-medium text-gray-600 mb-2">
          AI予想エンジン
        </h3>
        <p className="text-responsive-sm text-gray-500">
          出走馬データを入力すると統計に基づく高精度予想を開始できます
        </p>
      </ResponsiveCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* 予想エンジンヘッダー */}
      <ResponsiveCard className="p-4">
        <FlexLayout direction="row" justify="between" align="center" className="mb-4">
          <div>
            <h2 className="text-responsive-lg font-bold flex items-center gap-2">
              <Calculator className="text-blue-600" size={20} />
              AI予想エンジン
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                統計連動
              </span>
            </h2>
            <p className="text-responsive-sm text-gray-600">
              {race.date} {race.venue} {race.raceNumber}R • {race.surface === 'turf' ? '芝' : 'ダート'}{race.distance}m • {race.horses?.length || 0}頭立て
            </p>
          </div>
          
          <FlexLayout direction="row" gap="sm">
            <TouchOptimizedButton
              onClick={() => setShowStatistics(!showStatistics)}
              variant="ghost"
              size="sm"
              icon={BarChart3}
            >
              統計
            </TouchOptimizedButton>
            
            <TouchOptimizedButton
              onClick={() => setShowSettings(!showSettings)}
              variant="ghost"
              size="sm"
              icon={Settings}
            >
              設定
            </TouchOptimizedButton>
          </FlexLayout>
        </FlexLayout>

        {/* 適応型予想の信頼度表示 */}
        {predictionResult && (
          <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg mb-4">
            <FlexLayout direction="row" justify="between" align="center">
              <div>
                <h4 className="font-medium text-gray-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  AI予想信頼度
                </h4>
                <p className="text-sm text-gray-600">
                  統計データに基づく適応型予想
                </p>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${getConfidenceColor(predictionResult.confidenceLevel)}`}>
                  <span className="font-bold">
                    {predictionResult.confidenceLevel === 'high' ? '高' : 
                     predictionResult.confidenceLevel === 'medium' ? '中' : '低'}
                  </span>
                  <span className="text-sm">
                    ({Math.round(predictionResult.expectedHitRate * 100)}%)
                  </span>
                </div>
              </div>
            </FlexLayout>
            
            {/* 推奨馬券タイプ */}
            <div className="mt-3">
              <p className="text-xs text-gray-600 mb-1">推奨馬券:</p>
              <div className="flex gap-1 flex-wrap">
                {predictionResult.recommendedBetTypes.map((betType, index) => (
                  <span key={index} className="text-xs bg-white/70 px-2 py-1 rounded">
                    {betType}
                  </span>
                ))}
              </div>
            </div>

            {/* リスク評価 */}
            <div className="mt-2 text-xs text-gray-600">
              <span className="font-medium">リスク評価:</span> {predictionResult.riskAssessment.reasoning}
            </div>
          </div>
        )}

        {/* 計算状態表示 */}
        {isCalculating && (
          <div className="flex items-center justify-center gap-2 py-4">
            <RefreshCw className="animate-spin text-blue-600" size={20} />
            <span className="text-sm text-gray-600">統計データを分析中...</span>
          </div>
        )}

        {/* 最終計算時刻 */}
        {lastCalculated && !isCalculating && (
          <div className="text-xs text-gray-500 text-center">
            最終更新: {lastCalculated.toLocaleTimeString()}
          </div>
        )}
      </ResponsiveCard>

      {/* 統計分析表示 */}
      {showStatistics && currentStats && predictionResult && (
        <StatisticalInsights
          currentStats={currentStats}
          confidenceLevel={predictionResult.confidenceLevel}
          expectedHitRate={predictionResult.expectedHitRate}
          raceConditions={{
            surface: race.surface,
            distance: race.distance,
            weather: 'clear'
          }}
        />
      )}

      {/* 投資戦略推奨 */}
      {showStrategy && predictionResult && (
        <StrategyRecommendation
          prediction={predictionResult}
          availableOdds={{}} // 実際の実装ではオッズデータを渡す
          onStrategySelect={(strategy) => {
            console.log('選択された戦略:', strategy);
            // 投資記録作成画面に遷移
          }}
        />
      )}

      {/* 予想結果表示 */}
      {predictionResult && !isCalculating && (
        <>
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm text-gray-600">
              統計連動予想結果 • 期待的中率: {Math.round(predictionResult.expectedHitRate * 100)}%
            </div>
            <div className="flex gap-2">
              {predictionResult && onPredictionSave && (
                <TouchOptimizedButton
                  onClick={handleSavePrediction}
                  variant="primary"
                  size="sm"
                >
                  保存
                </TouchOptimizedButton>
              )}
              <TouchOptimizedButton
                onClick={() => setShowStrategy(!showStrategy)}
                variant="secondary"
                size="sm"
                icon={DollarSign}
              >
                投資戦略
              </TouchOptimizedButton>
            </div>
          </div>
          
          <PredictionResults
            predictions={predictionResult.rankings.map(horse => ({
              horse: {
                name: horse.name,
                number: horse.number,
                jockey: horse.jockey || '',
                popularity: horse.popularity || 0,
                odds: horse.odds || 3.0
              },
              scores: {
                speed: Math.round(horse.speedIndex || 0),
                recent: Math.round(horse.recentForm === 'excellent' ? 90 : 
                                 horse.recentForm === 'good' ? 70 : 
                                 horse.recentForm === 'fair' ? 50 : 30),
                odds: Math.round((horse.odds || 3.0) * 10),
                total: Math.round(horse.confidence * 100)
              },
              speedIndex: Math.round(horse.speedIndex || 0),
              recentForm: horse.recentForm || 'fair',
              confidence: horse.confidence > 0.6 ? 'high' : 
                         horse.confidence > 0.4 ? 'medium' : 'low',
              pastRaces: horse.pastRaces || []
            }))}
            raceInfo={race}
            weights={weights}
            onWeightChange={setWeights}
            onViewInvestment={onViewInvestment}
            predictionId={savedPredictionId || undefined}
            race={race}
          />
        </>
      )}
    </div>
  );
};

export const EnhancedPredictionEngine = memo(EnhancedPredictionEngineComponent);