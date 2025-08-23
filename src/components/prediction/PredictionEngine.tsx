import React, { useState, useEffect, memo, useCallback } from 'react';
import { Calculator, Settings, AlertCircle, RefreshCw, DollarSign } from 'lucide-react';
import { ResponsiveCard, FlexLayout } from '@/components/common/ResponsiveContainer';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { PredictionResults } from './PredictionResults';
import { calculateAllPredictions } from '@/services/predictionService';
import { usePredictionWorker } from '@/hooks/usePredictionWorker';
import { useMemoizedCallback } from '@/utils/performanceOptimization';

interface PredictionEngineProps {
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

const PredictionEngineComponent: React.FC<PredictionEngineProps> = ({
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
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculated, setLastCalculated] = useState<Date | null>(null);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [lastSavedPrediction, setLastSavedPrediction] = useState<any>(null);
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [savedPredictionId, setSavedPredictionId] = useState<string | null>(null);
  
  // Web Worker フック
  const { calculatePredictions, isWorkerSupported } = usePredictionWorker();

  // 予想結果の計算（Web Worker使用）
  const calculatePredictionsAsync = useCallback(async () => {
    if (!race.horses || race.horses.length === 0) {
      // デバッグログは削除（本番環境最適化）
      setPredictionResult(null);
      return;
    }

    // デバッグログは削除（本番環境最適化）

    setIsCalculating(true);

    try {
      // デバッグ用：WebWorkerを無効化してメインスレッド計算を強制
      const forceMainThread = true;
      
      if (isWorkerSupported && !forceMainThread) {
        // Web Workerで計算
        const normalizedWeights = {
          speed: weights.speed / 100,
          recent: weights.recent / 100,
          odds: weights.odds / 100
        };
        
        const predictions = await calculatePredictions(race.horses, normalizedWeights);
        
        // スコア詳細のデバッグログ
        console.log('🔍 WebWorker予想結果（スコア詳細）:', predictions.slice(0, 2).map(p => ({
          name: p.horseName,
          totalScore: p.score,
          analysis: p.analysis
        })));
        
        const result = {
          predictions: predictions.map(p => {
            const originalHorse = race.horses.find(h => h.name === p.horseName);
            return {
              horse: {
                name: p.horseName,
                number: p.horseNumber,
                jockey: p.jockey,
                popularity: originalHorse?.popularity || 0,
                odds: p.odds
              },
              scores: {
                speed: Math.round((p.analysis?.speedScore || 0) * 100),
                recent: Math.round((p.analysis?.recentFormScore || 0) * 100),
                odds: Math.round((p.analysis?.oddsScore || 0) * 100),
                total: Math.round(p.score * 100)  // WebWorkerの0-1スケールを100点満点に変換
              },
              speedIndex: Math.round((p.analysis?.speedScore || 0) * 100),
              recentForm: p.confidence > 0.7 ? 'excellent' : p.confidence > 0.5 ? 'good' : p.confidence > 0.3 ? 'fair' : 'poor',
              confidence: p.confidence > 0.6 ? 'high' : p.confidence > 0.4 ? 'medium' : 'low',
              pastRaces: originalHorse?.pastRaces || []
            };
          }),
          confidence: {
            level: Math.round(predictions[0]?.confidence * 5) || 1,
            score: Math.round((predictions[0]?.confidence || 0) * 100),
            description: predictions[0]?.confidence > 0.8 ? '高' : 
                        predictions[0]?.confidence > 0.6 ? '中' : '低',
            factors: [
              { name: 'データ品質', score: 80 },
              { name: 'アルゴリズム', score: 75 },
              { name: '市場整合性', score: 70 },
              { name: '統計的信頼性', score: 85 }
            ]
          }
        };
        
        console.log('🔍 WebWorker予想結果構造確認 (全データ):', result.predictions);
        console.log('🔍 WebWorker予想結果サイズ:', result.predictions.length);
        setPredictionResult(result);
        console.log('Web Worker予想計算完了:', predictions.length);
      } else {
        // フォールバック：メインスレッドで計算
        const rawResult = calculateAllPredictions(race, weights);
        console.log('🔍 メインスレッド予想結果構造確認:', rawResult.predictions.slice(0, 2));
        
        // WebWorkerと同じ形式に変換
        const result = {
          predictions: rawResult.predictions.map((horseWithScore: any) => ({
            horse: {
              name: horseWithScore.name,
              number: horseWithScore.number,
              jockey: horseWithScore.jockey,
              popularity: horseWithScore.popularity || 0,
              odds: horseWithScore.odds
            },
            scores: {
              speed: Math.round(horseWithScore.scores.speed),
              recent: Math.round(horseWithScore.scores.recent),
              odds: Math.round(horseWithScore.scores.odds),
              total: Math.round(horseWithScore.scores.total)
            },
            speedIndex: Math.round(horseWithScore.scores.speed),
            recentForm: horseWithScore.scores.confidence > 70 ? 'excellent' : 
                       horseWithScore.scores.confidence > 50 ? 'good' : 
                       horseWithScore.scores.confidence > 30 ? 'fair' : 'poor',
            confidence: horseWithScore.scores.confidence > 60 ? 'high' : 
                       horseWithScore.scores.confidence > 40 ? 'medium' : 'low',
            pastRaces: horseWithScore.pastRaces || []
          })),
          confidence: rawResult.confidence
        };
        
        console.log('🎯 メインスレッド変換後スコア詳細:', result.predictions.slice(0, 2).map((p: any) => ({
          name: p.horse.name,
          scores: p.scores,
          speedIndex: p.speedIndex,
          recentForm: p.recentForm,
          confidence: p.confidence
        })));
        
        setPredictionResult(result);
        console.log('メインスレッド予想計算完了');
      }
    } catch (error) {
      console.error('予想計算エラー:', error);
      // エラー時はフォールバック
      try {
        const result = calculateAllPredictions(race, weights);
        setPredictionResult(result);
      } catch (fallbackError) {
        console.error('フォールバック計算もエラー:', fallbackError);
        setPredictionResult(null);
      }
    } finally {
      setIsCalculating(false);
      setLastCalculated(new Date());
    }
  }, [race, weights, calculatePredictions, isWorkerSupported]);

  // 重み変更時の自動再計算
  useEffect(() => {
    if (race.horses && race.horses.length > 0) {
      const timer = setTimeout(() => {
        calculatePredictionsAsync();
      }, 300); // デバウンス
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [calculatePredictionsAsync]);

  // メモ化されたイベントハンドラー
  const handleWeightChange = useMemoizedCallback((newWeights: typeof weights) => {
    setWeights(newWeights);
  }, []);

  const handlePresetWeights = useMemoizedCallback((preset: string) => {
    switch (preset) {
      case 'speed':
        setWeights({ speed: 60, recent: 25, odds: 15 });
        break;
      case 'recent':
        setWeights({ speed: 25, recent: 60, odds: 15 });
        break;
      case 'odds':
        setWeights({ speed: 25, recent: 15, odds: 60 });
        break;
      case 'balanced':
        setWeights({ speed: 40, recent: 30, odds: 30 });
        break;
      default:
        break;
    }
  }, []);

  const handleSavePrediction = useMemoizedCallback(async () => {
    if (predictionResult && onPredictionSave) {
      console.log('🎯 PredictionEngine - 予想保存開始');
      console.log('🎯 PredictionEngine - race情報:', race);
      console.log('🎯 PredictionEngine - race.venue:', race.venue);
      
      const predictionData = {
        raceId: race.id || `${race.venue}_${race.date}_${race.raceNumber}`,
        date: new Date().toISOString(),
        raceInfo: {
          date: race.date,
          venue: race.venue, // レースの実際の競馬場を使用
          raceNumber: race.raceNumber || 1,
          distance: race.distance || 1600,
          surface: race.surface || 'turf',
          condition: race.condition || 'good'
        },
        weights,
        predictions: predictionResult.predictions,
        confidence: predictionResult.confidence,
        calculatedAt: lastCalculated
      };
      
      console.log('🎯 PredictionEngine - 作成した予想データ:', predictionData);
      console.log('🎯 PredictionEngine - raceInfo.venue:', predictionData.raceInfo.venue);
      
      const result = await onPredictionSave(predictionData);
      // predictionIdを受け取る（App.tsxで設定される）
      if (typeof result === 'string') {
        setSavedPredictionId(result);
      }
      setLastSavedPrediction(predictionData);
    }
  }, [predictionResult, onPredictionSave, race, weights, lastCalculated]);

  const handleCreateInvestment = useMemoizedCallback(() => {
    setShowInvestmentModal(true);
  }, []);

  const getConfidenceColor = (level: number) => {
    if (level >= 4) return 'text-green-600 bg-green-100';
    if (level >= 3) return 'text-blue-600 bg-blue-100';
    if (level >= 2) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getWeightTotal = () => weights.speed + weights.recent + weights.odds;

  if (!race.horses || race.horses.length === 0) {
    return (
      <ResponsiveCard className="p-6 text-center">
        <Calculator className="mx-auto mb-4 text-gray-400" size={48} />
        <h3 className="text-responsive-lg font-medium text-gray-600 mb-2">
          予想エンジン
        </h3>
        <p className="text-responsive-sm text-gray-500">
          出走馬データを入力すると予想を開始できます
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
              予想エンジン
            </h2>
            <p className="text-responsive-sm text-gray-600">
              {race.date} {race.venue} {race.raceNumber}R • {race.surface === 'turf' ? '芝' : 'ダート'}{race.distance}m • {race.horses?.length || 0}頭立て
            </p>
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
            
            <FlexLayout direction="row" gap="sm">
              {predictionResult && onPredictionSave && !lastSavedPrediction && (
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
        </FlexLayout>

        {/* 予想確信度表示 */}
        {predictionResult && (
          <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg mb-4">
            <FlexLayout direction="row" justify="between" align="center">
              <div>
                <h4 className="font-medium text-gray-800">予想確信度</h4>
                <p className="text-sm text-gray-600">
                  データ品質とアルゴリズムの信頼性
                </p>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${getConfidenceColor(predictionResult.confidence.level)}`}>
                  <span className="font-bold">{predictionResult.confidence.description}</span>
                  <span className="text-sm">({predictionResult.confidence.score}/100)</span>
                </div>
              </div>
            </FlexLayout>
            
            {/* 確信度要因の詳細 */}
            <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
              {predictionResult.confidence.factors.map((factor: any, index: number) => (
                <div key={index} className="text-center p-2 bg-white/50 rounded">
                  <div className="font-medium">{factor.name}</div>
                  <div className="text-gray-600">{factor.score.toFixed(0)}pt</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 重み設定 */}
        {showSettings && (
          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <h4 className="font-medium mb-3">予想重み設定</h4>
            
            {/* プリセット */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">プリセット:</p>
              <div className="flex flex-wrap gap-2">
                <TouchOptimizedButton
                  onClick={() => handlePresetWeights('balanced')}
                  variant="ghost"
                  size="sm"
                >
                  バランス型
                </TouchOptimizedButton>
                <TouchOptimizedButton
                  onClick={() => handlePresetWeights('speed')}
                  variant="ghost"
                  size="sm"
                >
                  スピード重視
                </TouchOptimizedButton>
                <TouchOptimizedButton
                  onClick={() => handlePresetWeights('recent')}
                  variant="ghost"
                  size="sm"
                >
                  調子重視
                </TouchOptimizedButton>
                <TouchOptimizedButton
                  onClick={() => handlePresetWeights('odds')}
                  variant="ghost"
                  size="sm"
                >
                  オッズ重視
                </TouchOptimizedButton>
              </div>
            </div>
            
            {/* 詳細設定 */}
            <div className="space-y-4">
              <div>
                <FlexLayout direction="row" justify="between" align="center" className="mb-2">
                  <label className="text-sm font-medium">スピード指数</label>
                  <span className="text-sm text-gray-600">
                    {weights.speed} ({((weights.speed / getWeightTotal()) * 100).toFixed(0)}%)
                  </span>
                </FlexLayout>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weights.speed}
                  onChange={(e) => handleWeightChange({
                    ...weights,
                    speed: parseInt(e.target.value)
                  })}
                  className="w-full accent-blue-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  過去成績から算出した能力値を重視
                </p>
              </div>
              
              <div>
                <FlexLayout direction="row" justify="between" align="center" className="mb-2">
                  <label className="text-sm font-medium">直近成績</label>
                  <span className="text-sm text-gray-600">
                    {weights.recent} ({((weights.recent / getWeightTotal()) * 100).toFixed(0)}%)
                  </span>
                </FlexLayout>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weights.recent}
                  onChange={(e) => handleWeightChange({
                    ...weights,
                    recent: parseInt(e.target.value)
                  })}
                  className="w-full accent-green-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  最新レースの着順と調子を重視
                </p>
              </div>
              
              <div>
                <FlexLayout direction="row" justify="between" align="center" className="mb-2">
                  <label className="text-sm font-medium">オッズ評価</label>
                  <span className="text-sm text-gray-600">
                    {weights.odds} ({((weights.odds / getWeightTotal()) * 100).toFixed(0)}%)
                  </span>
                </FlexLayout>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weights.odds}
                  onChange={(e) => handleWeightChange({
                    ...weights,
                    odds: parseInt(e.target.value)
                  })}
                  className="w-full accent-yellow-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  市場の期待値（オッズ・人気）を重視
                </p>
              </div>
            </div>
            
            {/* 重み合計の警告 */}
            {getWeightTotal() === 0 && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded flex items-center gap-2">
                <AlertCircle className="text-red-500" size={16} />
                <span className="text-sm text-red-700">
                  すべての重みが0です。予想を実行するには少なくとも1つの重みを設定してください。
                </span>
              </div>
            )}
          </div>
        )}

        {/* 計算状態表示 */}
        {isCalculating && (
          <div className="flex items-center justify-center gap-2 py-4">
            <RefreshCw className="animate-spin text-blue-600" size={20} />
            <span className="text-sm text-gray-600">予想を計算中...</span>
          </div>
        )}

        {/* 最終計算時刻 */}
        {lastCalculated && !isCalculating && (
          <div className="text-xs text-gray-500 text-center">
            最終更新: {lastCalculated.toLocaleTimeString()}
          </div>
        )}
      </ResponsiveCard>

      {/* 予想結果表示 */}
      {predictionResult && !isCalculating && (
        <>
          <div className="p-2 bg-yellow-100 text-yellow-800 text-xs rounded mb-2">
            デバッグ: 予想結果あり - {predictionResult.predictions?.length || 0}頭
          </div>
          <PredictionResults
            predictions={predictionResult.predictions}
            raceInfo={race}
            weights={weights}
            onWeightChange={handleWeightChange}
            onViewInvestment={onViewInvestment}
            predictionId={savedPredictionId || undefined}
            race={race}
          />
        </>
      )}
      
      {/* 予想結果がない場合のデバッグ */}
      {!predictionResult && !isCalculating && (
        <div className="p-2 bg-gray-100 text-gray-800 text-xs rounded mb-2">
          デバッグ: 予想結果なし
        </div>
      )}
      
      {/* 計算中の場合のデバッグ */}
      {isCalculating && (
        <div className="p-2 bg-blue-100 text-blue-800 text-xs rounded mb-2">
          デバッグ: 計算中
        </div>
      )}

      {/* 投資記録作成モーダル */}
      {showInvestmentModal && lastSavedPrediction && (
        <InvestmentCreationModal
          prediction={lastSavedPrediction}
          race={race}
          savedPredictionId={savedPredictionId}
          onPredictionSave={onPredictionSave}
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

// 投資記録作成モーダル
interface InvestmentCreationModalProps {
  prediction: any;
  race: any;
  onClose: () => void;
  onSave: (investment: any) => void;
  savedPredictionId: string | null; // 予想IDを追加
  onPredictionSave?: (predictionData: any) => Promise<string>; // 予想保存関数を追加
}

const InvestmentCreationModal: React.FC<InvestmentCreationModalProps> = ({
  prediction,
  race,
  onClose,
  onSave,
  savedPredictionId,
  onPredictionSave
}) => {
  const [betType, setBetType] = useState<'win' | 'place' | 'exacta' | 'quinella' | 'trifecta'>('win');
  const [amount, setAmount] = useState(1000);
  const [selections, setSelections] = useState<number[]>([]);
  const [odds, setOdds] = useState(0);
  const [isSimulated, setIsSimulated] = useState(true);

  // 予想に基づいてデフォルト選択を設定
  useEffect(() => {
    if (prediction?.predictions && prediction.predictions.length > 0) {
      const topHorse = prediction.predictions[0];
      if (topHorse?.horse?.number) {
        setSelections([topHorse.horse.number]);
        setOdds(topHorse.horse.odds || 3.0);
      }
    }
  }, [prediction]);

  const handleBetTypeChange = (newBetType: typeof betType) => {
    setBetType(newBetType);
    
    // 券種に応じてデフォルト選択を更新
    if (prediction?.predictions) {
      switch (newBetType) {
        case 'win':
        case 'place':
          setSelections([prediction.predictions[0]?.horse?.number || 1]);
          break;
        case 'exacta':
        case 'quinella':
          setSelections([
            prediction.predictions[0]?.horse?.number || 1,
            prediction.predictions[1]?.horse?.number || 2
          ]);
          break;
        case 'trifecta':
          setSelections([
            prediction.predictions[0]?.horse?.number || 1,
            prediction.predictions[1]?.horse?.number || 2,
            prediction.predictions[2]?.horse?.number || 3
          ]);
          break;
      }
    }
  };

  const handleSave = async () => {
    console.log('🔍 handleSave開始 - savedPredictionId:', savedPredictionId);
    
    if (selections.length === 0) {
      alert('馬番を選択してください');
      return;
    }

    // 予想が保存されていない場合は先に保存する
    let currentPredictionId = savedPredictionId;
    if (!currentPredictionId && prediction && onPredictionSave) {
      console.log('🔄 投資記録作成前に予想を自動保存します...');
      try {
        // 予想を保存（predictionオブジェクトを使用）
        const result = await onPredictionSave(prediction);
        if (typeof result === 'string') {
          currentPredictionId = result;
          console.log('✅ 予想自動保存完了:', result);
        }
      } catch (error) {
        console.error('❌ 予想自動保存エラー:', error);
        alert('予想の保存に失敗しました。先に「予想を保存」ボタンで予想を保存してください。');
        return;
      }
    }

    if (!currentPredictionId) {
      alert('予想IDが取得できません。先に「予想を保存」ボタンで予想を保存してください。');
      return;
    }

    const investment = {
      raceId: race.id || `${race.venue}_${race.date}_${race.raceNumber}`,
      predictionId: currentPredictionId, // 正しい予想IDを使用
      betType,
      selections,
      amount,
      odds,
      payout: 0, // BetRecordFormの修正に合わせて0に設定
      profit: 0, // BetRecordFormの修正に合わせて0に設定（未確定状態）
      timestamp: new Date(),
      venue: race.venue,
      raceNumber: race.raceNumber,
      raceDate: race.date,
      isSimulated
    };

    console.log('📊 投資記録作成:', { predictionId: currentPredictionId, investment });
    onSave(investment);
  };

  const getBetTypeLabel = (type: string) => {
    const labels = {
      win: '単勝',
      place: '複勝',
      exacta: '馬連',
      quinella: '馬単',
      trifecta: '3連複'
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">投資記録を作成</h3>
        
        {/* 予想情報の表示 */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">予想情報</h4>
          <p className="text-sm text-blue-700">
            {race.date} {race.venue} {race.raceNumber}R
          </p>
          <div className="text-sm text-blue-600 mt-2">
            予想: {prediction.predictions?.slice(0, 3).map((p: any, i: number) => 
              `${i + 1}位 ${p.horse?.number}番`
            ).join(', ')}
          </div>
        </div>

        {/* 券種選択 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            券種
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['win', 'place', 'exacta', 'quinella', 'trifecta'] as const).map((type) => (
              <button
                key={type}
                onClick={() => handleBetTypeChange(type)}
                className={`p-2 rounded border text-sm font-medium ${
                  betType === type
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {getBetTypeLabel(type)}
              </button>
            ))}
          </div>
        </div>

        {/* 選択馬番 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            選択馬番
          </label>
          <div className="flex gap-2">
            {selections.map((num, index) => (
              <input
                key={index}
                type="number"
                min="1"
                max="18"
                value={num}
                onChange={(e) => {
                  const newSelections = [...selections];
                  newSelections[index] = parseInt(e.target.value) || 1;
                  setSelections(newSelections);
                }}
                className="w-16 p-2 border border-gray-300 rounded text-center"
              />
            ))}
          </div>
        </div>

        {/* 投資額 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            投資額 (円)
          </label>
          <input
            type="number"
            min="100"
            step="100"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value) || 1000)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        {/* 予想オッズ */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            予想オッズ
          </label>
          <input
            type="number"
            min="1.0"
            step="0.1"
            value={odds}
            onChange={(e) => setOdds(parseFloat(e.target.value) || 1.0)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        {/* シミュレーション設定 */}
        <div className="mb-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isSimulated}
              onChange={(e) => setIsSimulated(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">
              シミュレーション投資（実際には購入していない）
            </span>
          </label>
        </div>

        {/* 予想収支シミュレーション */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2">収支予想</h4>
          <div className="text-sm text-gray-600">
            <div>投資額: {amount.toLocaleString()}円</div>
            <div>予想払戻: {(amount * odds).toLocaleString()}円</div>
            <div className={`font-medium ${
              (amount * odds - amount) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              予想損益: {((amount * odds - amount) >= 0 ? '+' : '')}{(amount * odds - amount).toLocaleString()}円
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <FlexLayout direction="row" gap="md">
          <TouchOptimizedButton
            onClick={onClose}
            variant="secondary"
            className="flex-1"
          >
            キャンセル
          </TouchOptimizedButton>
          <TouchOptimizedButton
            onClick={handleSave}
            variant="primary"
            className="flex-1"
          >
            記録作成
          </TouchOptimizedButton>
        </FlexLayout>
      </div>
    </div>
  );
};

// メモ化されたコンポーネントをエクスポート
export const PredictionEngine = memo(PredictionEngineComponent);