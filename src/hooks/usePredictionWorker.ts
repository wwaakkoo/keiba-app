import { useRef, useCallback, useEffect } from 'react';
import { Horse } from '@/types/race';
import { PredictionWeights } from '@/types/prediction';

interface PredictionWorkerHook {
  calculatePredictions: (horses: Horse[], weights?: PredictionWeights) => Promise<any[]>;
  calculateHorseScore: (horse: Horse, weights?: PredictionWeights) => Promise<number>;
  analyzeTrends: (predictionHistory: any[]) => Promise<any>;
  isWorkerSupported: boolean;
  terminate: () => void;
}

export const usePredictionWorker = (): PredictionWorkerHook => {
  const workerRef = useRef<Worker | null>(null);
  const pendingCallbacks = useRef<Map<string, { resolve: Function; reject: Function }>>(new Map());

  // Web Worker初期化
  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      try {
        // Workerファイルを動的にインポート
        const workerBlob = new Blob([`
          // Worker code will be injected here
          ${getWorkerCode()}
        `], { type: 'application/javascript' });
        
        const workerUrl = URL.createObjectURL(workerBlob);
        workerRef.current = new Worker(workerUrl);
        
        // メッセージハンドラー設定
        workerRef.current.onmessage = (e) => {
          const { type, payload } = e.data;
          const callbackId = payload.callbackId;
          
          if (callbackId && pendingCallbacks.current.has(callbackId)) {
            const { resolve, reject } = pendingCallbacks.current.get(callbackId)!;
            pendingCallbacks.current.delete(callbackId);
            
            if (type === 'ERROR') {
              reject(new Error(payload.message));
            } else {
              resolve(payload);
            }
          }
        };
        
        workerRef.current.onerror = (error) => {
          console.error('Worker error:', error);
        };
        
        // クリーンアップ用にURLを保存
        return () => {
          URL.revokeObjectURL(workerUrl);
        };
      } catch (error) {
        console.warn('Web Worker initialization failed:', error);
      }
    }
    
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Workerにメッセージを送信するヘルパー
  const sendMessage = useCallback((type: string, payload: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        // Workerが利用できない場合はフォールバック
        reject(new Error('Web Worker not available'));
        return;
      }
      
      const callbackId = `${type}_${Date.now()}_${Math.random()}`;
      pendingCallbacks.current.set(callbackId, { resolve, reject });
      
      workerRef.current.postMessage({
        type,
        payload: { ...payload, callbackId }
      });
      
      // タイムアウト設定（30秒）
      setTimeout(() => {
        if (pendingCallbacks.current.has(callbackId)) {
          pendingCallbacks.current.delete(callbackId);
          reject(new Error('Worker timeout'));
        }
      }, 30000);
    });
  }, []);

  // 予想計算
  const calculatePredictions = useCallback(async (
    horses: Horse[], 
    weights: PredictionWeights = { speed: 0.4, recent: 0.4, odds: 0.2 }
  ): Promise<any[]> => {
    try {
      const result = await sendMessage('CALCULATE_PREDICTIONS', { horses, weights });
      return result.predictions || result;
    } catch (error) {
      // フォールバック：メインスレッドで計算
      console.warn('Worker calculation failed, falling back to main thread:', error);
      return fallbackCalculatePredictions(horses, weights);
    }
  }, [sendMessage]);

  // 馬スコア計算
  const calculateHorseScore = useCallback(async (
    horse: Horse,
    weights: PredictionWeights = { speed: 0.4, recent: 0.4, odds: 0.2 }
  ): Promise<number> => {
    try {
      const result = await sendMessage('CALCULATE_HORSE_SCORE', { horse, weights });
      return result.score;
    } catch (error) {
      // フォールバック：メインスレッドで計算
      console.warn('Worker calculation failed, falling back to main thread:', error);
      return fallbackCalculateHorseScore(horse, weights);
    }
  }, [sendMessage]);

  // トレンド分析
  const analyzeTrends = useCallback(async (predictionHistory: any[]): Promise<any> => {
    try {
      const result = await sendMessage('ANALYZE_TRENDS', { predictionHistory });
      return result.trends || result;
    } catch (error) {
      // フォールバック：メインスレッドで計算
      console.warn('Worker analysis failed, falling back to main thread:', error);
      return fallbackAnalyzeTrends(predictionHistory);
    }
  }, [sendMessage]);

  // Worker終了
  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    pendingCallbacks.current.clear();
  }, []);

  return {
    calculatePredictions,
    calculateHorseScore,
    analyzeTrends,
    isWorkerSupported: typeof Worker !== 'undefined',
    terminate
  };
};

// フォールバック関数（簡略版）
function fallbackCalculatePredictions(horses: Horse[], weights: PredictionWeights): any[] {
  return horses.map(horse => ({
    horseNumber: horse.number,
    horseName: horse.name,
    jockey: horse.jockey,
    odds: horse.odds,
    popularity: horse.popularity,
    score: fallbackCalculateHorseScore(horse, weights),
    confidence: 0.5,
    recommendation: 'moderate' as const,
    analysis: { strengths: [], weaknesses: [], notes: [] }
  })).sort((a, b) => b.score - a.score);
}

function fallbackCalculateHorseScore(horse: Horse, weights: PredictionWeights): number {
  let score = 0;
  
  // 簡略化されたスコア計算
  if (horse.pastRaces.length > 0) {
    const avgPosition = horse.pastRaces.slice(0, 3).reduce((sum, race) => sum + race.rank, 0) / Math.min(3, horse.pastRaces.length);
    score += (19 - avgPosition) / 18 * weights.recent;
  }
  
  if (horse.odds && horse.odds > 0) {
    score += Math.max(0, (50 - horse.odds) / 50) * weights.odds;
  }
  
  return Math.max(0, Math.min(1, score));
}

function fallbackAnalyzeTrends(_predictionHistory: any[]): any {
  return {
    accuracyTrend: [],
    profitTrend: [],
    confidenceTrend: [],
    recommendations: ['Web Workerが利用できないため、簡略化された分析結果です。']
  };
}

// Workerコードを文字列として取得
function getWorkerCode(): string {
  // 実際の実装では、別ファイルからWorkerコードを読み込むか、
  // ビルド時にインライン化する必要があります
  return `
    // 馬のスコア計算
    function calculateHorseScore(horse, weights = { speed: 0.4, recent: 0.4, odds: 0.2 }) {
      let score = 0;
      
      // 直近成績の計算
      const recentRaces = horse.pastRaces.slice(0, 3);
      if (recentRaces.length > 0) {
        const recentScore = recentRaces.reduce((sum, race) => {
          const positionScore = Math.max(0, (19 - race.rank) / 18);
          return sum + positionScore;
        }, 0) / recentRaces.length;
        score += recentScore * weights.recent;
      }
      
      // オッズの計算
      if (horse.odds && horse.odds > 0) {
        const oddsScore = Math.max(0, (50 - horse.odds) / 50);
        score += oddsScore * weights.odds;
      }
      
      return Math.max(0, Math.min(1, score));
    }

    // 予想計算
    function calculatePredictions(horses, weights) {
      const predictions = horses.map((horse) => {
        const score = calculateHorseScore(horse, weights);
        
        return {
          horseNumber: horse.number,
          horseName: horse.name,
          jockey: horse.jockey,
          odds: horse.odds,
          popularity: horse.popularity,
          score: score,
          confidence: score * 0.8,
          recommendation: score >= 0.6 ? 'strong' : score >= 0.4 ? 'moderate' : 'weak',
          analysis: { strengths: [], weaknesses: [], notes: [] }
        };
      });
      
      return predictions.sort((a, b) => b.score - a.score);
    }

    // メッセージハンドラー
    self.onmessage = function(e) {
      const { type, payload } = e.data;
      
      try {
        switch (type) {
          case 'CALCULATE_PREDICTIONS': {
            const { horses, weights, callbackId } = payload;
            const predictions = calculatePredictions(horses, weights);
            
            self.postMessage({
              type: 'PREDICTIONS_CALCULATED',
              payload: { predictions: predictions, callbackId }
            });
            break;
          }
          
          case 'CALCULATE_HORSE_SCORE': {
            const { horse, weights, callbackId } = payload;
            const score = calculateHorseScore(horse, weights);
            
            self.postMessage({
              type: 'HORSE_SCORE_CALCULATED',
              payload: { score, horse: horse.name, callbackId }
            });
            break;
          }
          
          case 'ANALYZE_TRENDS': {
            const { predictionHistory, callbackId } = payload;
            // 簡略化されたトレンド分析
            const trends = {
              accuracyTrend: [],
              profitTrend: [],
              confidenceTrend: [],
              recommendations: ['Web Workerでの分析が完了しました。']
            };
            
            self.postMessage({
              type: 'TRENDS_ANALYZED',
              payload: { trends: trends, callbackId }
            });
            break;
          }
        }
      } catch (error) {
        self.postMessage({
          type: 'ERROR',
          payload: { message: error.message, callbackId: payload.callbackId }
        });
      }
    };
  `;
}