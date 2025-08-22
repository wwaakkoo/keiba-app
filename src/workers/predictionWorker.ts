/**
 * 予想計算用Web Worker
 * 重い予想計算処理をメインスレッドから分離
 */

import { Horse, PastRace } from '../types/race';
import { PredictionWeights } from '../types/prediction';

interface PredictionWorkerMessage {
  type: 'CALCULATE_PREDICTIONS' | 'CALCULATE_HORSE_SCORE' | 'ANALYZE_TRENDS';
  payload: any;
}

interface PredictionWorkerResponse {
  type: 'PREDICTIONS_CALCULATED' | 'HORSE_SCORE_CALCULATED' | 'TRENDS_ANALYZED' | 'ERROR';
  payload: any;
}

// 馬のスコア計算（重い処理）
function calculateHorseScore(
  horse: Horse,
  weights: PredictionWeights = { speed: 0.4, recent: 0.4, odds: 0.2 }
): { totalScore: number; speedScore: number; recentScore: number; oddsScore: number; popularityScore: number } {
  let speedScore = 0;
  let recentScore = 0;
  let oddsScore = 0;
  let popularityScore = 0;
  
  // スピード指数の計算（タイムベース）
  const recentRaces = horse.pastRaces.slice(0, 5); // 直近5戦
  if (recentRaces.length > 0) {
    // タイムからスピード指数を計算
    const timeScores = recentRaces.map(race => {
      const distance = race.distance || 1600;
      const time = race.time || 0;
      if (time > 0) {
        // 距離とタイムから相対的なスピードを計算（単純化）
        const standardTime = distance / 1000 * 60; // 1000mあたり60秒の基準
        const speedIndex = Math.max(0, (standardTime - time) / standardTime * 100);
        return Math.max(0, Math.min(100, speedIndex));
      }
      return 50; // デフォルト値
    });
    
    if (timeScores.length > 0) {
      const avgSpeed = timeScores.reduce((sum, speed) => sum + speed, 0) / timeScores.length;
      speedScore = avgSpeed / 100; // 0-1スケールに正規化
    }
  }
  
  // 直近成績の計算（順位ベース）
  const recent3Races = horse.pastRaces.slice(0, 3);
  if (recent3Races.length > 0) {
    const positionScores = recent3Races.map(race => {
      const rank = race.rank || 10; // デフォルトは10位
      return Math.max(0, (19 - rank) / 18); // 1位=1.0, 18位=0.0
    });
    recentScore = positionScores.reduce((sum, score) => sum + score, 0) / positionScores.length;
  }
  
  // オッズの計算（低いほど高評価）
  if (horse.odds && horse.odds > 0) {
    oddsScore = Math.max(0, Math.min(1, (50 - horse.odds) / 50));
  }
  
  // 人気の考慮
  if (horse.popularity && horse.popularity > 0) {
    popularityScore = Math.max(0, (19 - horse.popularity) / 18);
  }
  
  // 重み付き合計スコア
  const totalScore = (speedScore * weights.speed) + 
                    (recentScore * weights.recent) + 
                    (oddsScore * weights.odds) +
                    (popularityScore * 0.1); // 人気は固定重み
  
  return {
    totalScore: Math.max(0, Math.min(1, totalScore)),
    speedScore,
    recentScore,
    oddsScore,
    popularityScore
  };
}

// 複数馬の予想計算
function calculatePredictions(horses: Horse[], weights: PredictionWeights) {
  const predictions = horses.map((horse, index) => {
    const scoreResult = calculateHorseScore(horse, weights);
    
    // デバッグログ
    console.log(`🏇 ${horse.name} スコア詳細:`, {
      speedScore: scoreResult.speedScore,
      recentScore: scoreResult.recentScore,
      oddsScore: scoreResult.oddsScore,
      popularityScore: scoreResult.popularityScore,
      totalScore: scoreResult.totalScore
    });

    const analysisBase = analyzeHorse(horse, scoreResult.totalScore);
    const analysisWithScores = {
      ...analysisBase,
      speedScore: scoreResult.speedScore,
      recentFormScore: scoreResult.recentScore,
      oddsScore: scoreResult.oddsScore,
      popularityScore: scoreResult.popularityScore
    };

    console.log(`📊 ${horse.name} analysis構造:`, analysisWithScores);
    
    return {
      horseNumber: horse.number,
      horseName: horse.name,
      jockey: horse.jockey,
      odds: horse.odds,
      popularity: horse.popularity,
      score: scoreResult.totalScore,
      confidence: calculateConfidence(horse, scoreResult.totalScore),
      recommendation: getRecommendation(scoreResult.totalScore),
      analysis: analysisWithScores
    };
  });
  
  // スコア順にソート
  return predictions.sort((a, b) => b.score - a.score);
}

// 信頼度計算
function calculateConfidence(horse: Horse, score: number): number {
  let confidence = score;
  
  // データの豊富さで調整
  const dataRichness = Math.min(1, horse.pastRaces.length / 10);
  confidence *= (0.5 + dataRichness * 0.5);
  
  // 直近のパフォーマンス安定性
  const recentRaces = horse.pastRaces.slice(0, 5);
  if (recentRaces.length >= 3) {
    const positions = recentRaces.map(race => race.rank || 10); // race.positionをrace.rankに修正
    const avgPosition = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
    const variance = positions.reduce((sum, pos) => sum + Math.pow(pos - avgPosition, 2), 0) / positions.length;
    const stability = Math.max(0, 1 - variance / 100);
    confidence *= (0.7 + stability * 0.3);
  }
  
  return Math.max(0, Math.min(1, confidence));
}

// 推奨レベル
function getRecommendation(score: number): 'strong' | 'moderate' | 'weak' | 'avoid' {
  if (score >= 0.8) return 'strong';
  if (score >= 0.6) return 'moderate';
  if (score >= 0.4) return 'weak';
  return 'avoid';
}

// 馬の分析
function analyzeHorse(horse: Horse, score: number) {
  const analysis = {
    strengths: [] as string[],
    weaknesses: [] as string[],
    notes: [] as string[]
  };
  
  // スピード指数分析（タイムベース）
  const recentRacesForSpeed = horse.pastRaces.slice(0, 5);
  if (recentRacesForSpeed.length > 0) {
    const timeScores = recentRacesForSpeed.map(race => {
      const distance = race.distance || 1600;
      const time = race.time || 0;
      if (time > 0) {
        const standardTime = distance / 1000 * 60;
        const speedIndex = Math.max(0, (standardTime - time) / standardTime * 100);
        return Math.max(0, Math.min(100, speedIndex));
      }
      return 50;
    });
    
    const avgSpeed = timeScores.reduce((sum, speed) => sum + speed, 0) / timeScores.length;
    if (avgSpeed >= 60) {
      analysis.strengths.push('高いスピード指数');
    } else if (avgSpeed < 40) {
      analysis.weaknesses.push('スピード指数が低い');
    }
  }
  
  // 直近成績分析
  const recentRaces = horse.pastRaces.slice(0, 3);
  if (recentRaces.length > 0) {
    const avgPosition = recentRaces.reduce((sum, race) => sum + (race.rank || 10), 0) / recentRaces.length;
    if (avgPosition <= 3) {
      analysis.strengths.push('直近成績良好');
    } else if (avgPosition > 10) {
      analysis.weaknesses.push('直近成績不振');
    }
  }
  
  // オッズ分析
  if (horse.odds) {
    if (horse.odds <= 3) {
      analysis.notes.push('人気馬（低オッズ）');
    } else if (horse.odds >= 20) {
      analysis.notes.push('穴馬（高オッズ）');
    }
  }
  
  return analysis;
}

// トレンド分析（重い処理）
function analyzeTrends(predictionHistory: any[]) {
  const trends = {
    accuracyTrend: [] as number[],
    profitTrend: [] as number[],
    confidenceTrend: [] as number[],
    recommendations: [] as string[]
  };
  
  // 精度トレンド計算
  const windowSize = 10;
  for (let i = windowSize; i <= predictionHistory.length; i++) {
    const window = predictionHistory.slice(i - windowSize, i);
    const accuracy = window.filter(p => p.isCorrect).length / window.length;
    trends.accuracyTrend.push(accuracy);
  }
  
  // 収益トレンド計算
  let cumulativeProfit = 0;
  for (const prediction of predictionHistory) {
    cumulativeProfit += prediction.profit || 0;
    trends.profitTrend.push(cumulativeProfit);
  }
  
  // 信頼度トレンド
  for (let i = windowSize; i <= predictionHistory.length; i++) {
    const window = predictionHistory.slice(i - windowSize, i);
    const avgConfidence = window.reduce((sum, p) => sum + (p.confidence || 0), 0) / window.length;
    trends.confidenceTrend.push(avgConfidence);
  }
  
  // 推奨事項生成
  if (trends.accuracyTrend.length > 0) {
    const recentAccuracy = trends.accuracyTrend.slice(-3);
    const avgRecentAccuracy = recentAccuracy.reduce((sum, acc) => sum + acc, 0) / recentAccuracy.length;
    
    if (avgRecentAccuracy < 0.3) {
      trends.recommendations.push('予想精度が低下しています。重み設定の見直しを検討してください。');
    } else if (avgRecentAccuracy > 0.7) {
      trends.recommendations.push('予想精度が向上しています。現在の設定を維持することをお勧めします。');
    }
  }
  
  return trends;
}

// メッセージハンドラー
self.onmessage = function(e: MessageEvent<PredictionWorkerMessage>) {
  const { type, payload } = e.data;
  
  try {
    switch (type) {
      case 'CALCULATE_PREDICTIONS': {
        const { horses, weights } = payload;
        const predictions = calculatePredictions(horses, weights);
        
        self.postMessage({
          type: 'PREDICTIONS_CALCULATED',
          payload: predictions
        } as PredictionWorkerResponse);
        break;
      }
      
      case 'CALCULATE_HORSE_SCORE': {
        const { horse, weights } = payload;
        const score = calculateHorseScore(horse, weights);
        
        self.postMessage({
          type: 'HORSE_SCORE_CALCULATED',
          payload: { score, horse: horse.name }
        } as PredictionWorkerResponse);
        break;
      }
      
      case 'ANALYZE_TRENDS': {
        const { predictionHistory } = payload;
        const trends = analyzeTrends(predictionHistory);
        
        self.postMessage({
          type: 'TRENDS_ANALYZED',
          payload: trends
        } as PredictionWorkerResponse);
        break;
      }
      
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      payload: { message: error instanceof Error ? error.message : 'Unknown error' }
    } as PredictionWorkerResponse);
  }
};

export {};