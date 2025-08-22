/**
 * 詳細統計分析サービス
 * 予想上位3位と結果上位3位の詳細な対応関係を分析
 */

import { HorseAnalysis, ActualResult } from '@/types/prediction';

interface PredictionHistoryEntry {
  id: string;
  date: string;
  race: {
    venue: string;
    raceNumber: number;
    distance: number;
    surface: string;
    raceDate: string;
  };
  predictions: HorseAnalysis[];
  horseCount: number;
  confidenceLevel?: number;
  actualResults?: ActualResult[];
  payoutData?: {
    investment: number;
    totalReturn: number;
  };
  isResultEntered: boolean;
}

export interface DetailedPredictionAnalysis {
  // 基本情報
  predictionId: string;
  raceInfo: {
    venue: string;
    raceNumber: number;
    distance: number;
    surface: string;
    date: string;
  };
  
  // 予想順位（上位3位）
  predictions: {
    rank: number;
    horseNumber: number;
    horseName: string;
    confidence: string;
    actualRank?: number; // 実際の着順
  }[];
  
  // 実際の結果（上位3位）
  actualResults: {
    rank: number;
    horseNumber: number;
    predictedRank?: number; // 予想での順位
  }[];
  
  // 的中判定
  accuracyAnalysis: {
    exactMatch: boolean; // 1位完全一致
    positionMatches: { predictedRank: number; actualRank: number }[]; // 各順位の一致
    withinTop3: boolean; // 予想1位が3着以内
    top3Coverage: number; // 予想上位3位のうち実際に3着以内に入った数
    rankingScore: number; // 順位精度スコア（0-100）
  };
}

export interface DetailedStatistics {
  // 全体統計
  overview: {
    totalRaces: number;
    completedRaces: number;
    dataCompleteness: number; // データ完全性（%）
  };
  
  // 順位別的中率
  positionAccuracy: {
    exact: {
      first: number;    // 予想1位→結果1位
      second: number;   // 予想2位→結果2位  
      third: number;    // 予想3位→結果3位
    };
    withinRange: {
      firstToTop3: number;    // 予想1位→結果1-3位
      secondToTop3: number;   // 予想2位→結果1-3位
      thirdToTop3: number;    // 予想3位→結果1-3位
    };
  };
  
  // 的中パターン分析
  hitPatterns: {
    perfectTriple: number;     // 1-2-3位完全一致
    exactFirst: number;        // 1位のみ完全一致
    top3Coverage: {
      all3: number;            // 予想3頭すべて3着以内
      any2: number;            // 予想3頭中2頭が3着以内
      any1: number;            // 予想3頭中1頭が3着以内
    };
  };
  
  // 投資効果分析
  investmentEffectiveness: {
    singleWin: {              // 単勝想定
      hitRate: number;
      averageOdds: number;
      returnRate: number;
    };
    placeWin: {               // 複勝想定（上位3頭）
      hitRate: number;
      averageReturn: number;
      returnRate: number;
    };
    exacta: {                 // 馬連想定（1-2位）
      hitRate: number;
      estimatedReturn: number;
    };
  };
  
  // 条件別詳細分析
  conditionAnalysis: {
    byDistance: Record<string, DetailedConditionStats>;
    bySurface: Record<string, DetailedConditionStats>;
    byVenue: Record<string, DetailedConditionStats>;
  };
  
  // トレンド分析
  trends: {
    recent10: DetailedTrendData[];
    monthly: Record<string, DetailedMonthlyStats>;
  };
}

export interface DetailedConditionStats {
  totalRaces: number;
  positionAccuracy: {
    exact: { first: number; second: number; third: number };
    withinRange: { firstToTop3: number; secondToTop3: number; thirdToTop3: number };
  };
  averageRankingScore: number;
  hitPatterns: {
    perfectTriple: number;
    exactFirst: number;
    top3Coverage: { all3: number; any2: number; any1: number };
  };
}

export interface DetailedTrendData {
  raceId: string;
  date: string;
  raceLabel: string;
  rankingScore: number;
  exactFirst: boolean;
  top3Coverage: number;
  cumulativeStats: {
    exactFirstRate: number;
    averageRankingScore: number;
    averageTop3Coverage: number;
  };
}

export interface DetailedMonthlyStats {
  month: string;
  totalRaces: number;
  exactFirstRate: number;
  averageRankingScore: number;
  top3CoverageRate: number;
  bestRace: { date: string; score: number };
  worstRace: { date: string; score: number };
}

/**
 * 予想の詳細分析を実行
 */
export function analyzePrediction(
  predictions: HorseAnalysis[],
  actualResults: ActualResult[]
): DetailedPredictionAnalysis['accuracyAnalysis'] {
  const top3Predictions = predictions.slice(0, 3);
  const top3Actual = actualResults
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3);

  // 完全一致チェック
  const exactMatch = top3Predictions[0]?.horse?.number === top3Actual[0]?.number;
  
  // 各順位の一致チェック
  const positionMatches: { predictedRank: number; actualRank: number }[] = [];
  
  top3Predictions.forEach((prediction, predIndex) => {
    const actualIndex = top3Actual.findIndex(actual => 
      actual.number === prediction.horse?.number
    );
    
    if (actualIndex !== -1) {
      positionMatches.push({
        predictedRank: predIndex + 1,
        actualRank: actualIndex + 1
      });
    }
  });
  
  // 予想1位が3着以内かチェック
  const withinTop3 = top3Actual.some(actual => 
    actual.number === top3Predictions[0]?.horse?.number
  );
  
  // 予想上位3位のうち実際に3着以内に入った数
  const top3Coverage = positionMatches.length;
  
  // 順位精度スコア計算（0-100）
  let rankingScore = 0;
  positionMatches.forEach(match => {
    const positionDiff = Math.abs(match.predictedRank - match.actualRank);
    const positionScore = Math.max(0, 100 - (positionDiff * 25)); // 1つずれるごとに25点減点
    rankingScore += positionScore;
  });
  
  // 3頭の平均スコア
  rankingScore = Math.round(rankingScore / 3);
  
  return {
    exactMatch,
    positionMatches,
    withinTop3,
    top3Coverage,
    rankingScore
  };
}

/**
 * 詳細統計の計算
 */
export function calculateDetailedStatistics(
  predictionHistory: PredictionHistoryEntry[]
): DetailedStatistics {
  const completedPredictions = predictionHistory.filter(p => p.isResultEntered);
  
  if (completedPredictions.length === 0) {
    return createEmptyStatistics();
  }
  
  // 各予想の詳細分析
  const analyses: DetailedPredictionAnalysis['accuracyAnalysis'][] = completedPredictions.map(prediction => {
    return analyzePrediction(
      prediction.predictions || [],
      prediction.actualResults || []
    );
  });
  
  // 全体統計計算
  const overview = {
    totalRaces: predictionHistory.length,
    completedRaces: completedPredictions.length,
    dataCompleteness: Math.round((completedPredictions.length / predictionHistory.length) * 100)
  };
  
  // 順位別的中率計算
  const positionAccuracy = calculatePositionAccuracy(analyses);
  
  // 的中パターン分析
  const hitPatterns = calculateHitPatterns(analyses);
  
  // 投資効果分析
  const investmentEffectiveness = calculateInvestmentEffectiveness(analyses, completedPredictions);
  
  // 条件別分析
  const conditionAnalysis = calculateConditionAnalysis(completedPredictions);
  
  // トレンド分析
  const trends = calculateTrends(completedPredictions);
  
  return {
    overview,
    positionAccuracy,
    hitPatterns,
    investmentEffectiveness,
    conditionAnalysis,
    trends
  };
}

function calculatePositionAccuracy(analyses: DetailedPredictionAnalysis['accuracyAnalysis'][]) {
  const exactMatches = { first: 0, second: 0, third: 0 };
  const withinRangeMatches = { firstToTop3: 0, secondToTop3: 0, thirdToTop3: 0 };
  
  analyses.forEach(analysis => {
    // 完全一致カウント
    analysis.positionMatches.forEach(match => {
      if (match.predictedRank === match.actualRank) {
        if (match.predictedRank === 1) exactMatches.first++;
        else if (match.predictedRank === 2) exactMatches.second++;
        else if (match.predictedRank === 3) exactMatches.third++;
      }
    });
    
    // 範囲内一致カウント
    analysis.positionMatches.forEach(match => {
      if (match.actualRank <= 3) {
        if (match.predictedRank === 1) withinRangeMatches.firstToTop3++;
        else if (match.predictedRank === 2) withinRangeMatches.secondToTop3++;
        else if (match.predictedRank === 3) withinRangeMatches.thirdToTop3++;
      }
    });
  });
  
  const total = analyses.length;
  
  return {
    exact: {
      first: Math.round((exactMatches.first / total) * 100),
      second: Math.round((exactMatches.second / total) * 100),
      third: Math.round((exactMatches.third / total) * 100)
    },
    withinRange: {
      firstToTop3: Math.round((withinRangeMatches.firstToTop3 / total) * 100),
      secondToTop3: Math.round((withinRangeMatches.secondToTop3 / total) * 100),
      thirdToTop3: Math.round((withinRangeMatches.thirdToTop3 / total) * 100)
    }
  };
}

function calculateHitPatterns(analyses: DetailedPredictionAnalysis['accuracyAnalysis'][]) {
  let perfectTriple = 0;
  let exactFirst = 0;
  const top3Coverage = { all3: 0, any2: 0, any1: 0 };
  
  analyses.forEach(analysis => {
    // 完全三連単
    const perfectOrder = analysis.positionMatches.length === 3 &&
      analysis.positionMatches.every(match => match.predictedRank === match.actualRank);
    if (perfectOrder) perfectTriple++;
    
    // 1位的中
    if (analysis.exactMatch) exactFirst++;
    
    // 3着以内カバー率
    if (analysis.top3Coverage === 3) top3Coverage.all3++;
    else if (analysis.top3Coverage === 2) top3Coverage.any2++;
    else if (analysis.top3Coverage === 1) top3Coverage.any1++;
  });
  
  const total = analyses.length;
  
  return {
    perfectTriple: Math.round((perfectTriple / total) * 100),
    exactFirst: Math.round((exactFirst / total) * 100),
    top3Coverage: {
      all3: Math.round((top3Coverage.all3 / total) * 100),
      any2: Math.round((top3Coverage.any2 / total) * 100),
      any1: Math.round((top3Coverage.any1 / total) * 100)
    }
  };
}

function calculateInvestmentEffectiveness(
  analyses: DetailedPredictionAnalysis['accuracyAnalysis'][],
  predictions: any[]
) {
  const singleWinHits = analyses.filter(a => a.exactMatch).length;
  const placeWinHits = analyses.filter(a => a.withinTop3).length;
  const exactaHits = analyses.filter(a => 
    a.positionMatches.some(m => m.predictedRank === 1 && m.actualRank <= 2) &&
    a.positionMatches.some(m => m.predictedRank === 2 && m.actualRank <= 2)
  ).length;
  
  const total = analyses.length;
  
  return {
    singleWin: {
      hitRate: Math.round((singleWinHits / total) * 100),
      averageOdds: 3.5, // 仮の平均オッズ
      returnRate: Math.round((singleWinHits / total) * 3.5 * 100)
    },
    placeWin: {
      hitRate: Math.round((placeWinHits / total) * 100),
      averageReturn: 1.8, // 仮の平均払戻
      returnRate: Math.round((placeWinHits / total) * 1.8 * 100)
    },
    exacta: {
      hitRate: Math.round((exactaHits / total) * 100),
      estimatedReturn: Math.round((exactaHits / total) * 15 * 100) // 仮の馬連平均配当
    }
  };
}

function calculateConditionAnalysis(predictions: any[]) {
  const conditionGroups = {
    byDistance: {} as Record<string, any[]>,
    bySurface: {} as Record<string, any[]>,
    byVenue: {} as Record<string, any[]>
  };
  
  // 条件別にグループ化
  predictions.forEach(prediction => {
    const distance = prediction.race.distance.toString();
    const surface = prediction.race.surface;
    const venue = prediction.race.venue;
    
    if (!conditionGroups.byDistance[distance]) conditionGroups.byDistance[distance] = [];
    if (!conditionGroups.bySurface[surface]) conditionGroups.bySurface[surface] = [];
    if (!conditionGroups.byVenue[venue]) conditionGroups.byVenue[venue] = [];
    
    conditionGroups.byDistance[distance].push(prediction);
    conditionGroups.bySurface[surface].push(prediction);
    conditionGroups.byVenue[venue].push(prediction);
  });
  
  // 各条件での詳細統計計算
  const calculateConditionStats = (group: any[]): DetailedConditionStats => {
    const analyses = group.map(p => analyzePrediction(p.predictions || [], p.actualResults || []));
    
    return {
      totalRaces: group.length,
      positionAccuracy: calculatePositionAccuracy(analyses),
      averageRankingScore: Math.round(
        analyses.reduce((sum, a) => sum + a.rankingScore, 0) / analyses.length
      ),
      hitPatterns: calculateHitPatterns(analyses)
    };
  };
  
  return {
    byDistance: Object.fromEntries(
      Object.entries(conditionGroups.byDistance).map(([key, group]) => [key, calculateConditionStats(group)])
    ),
    bySurface: Object.fromEntries(
      Object.entries(conditionGroups.bySurface).map(([key, group]) => [key, calculateConditionStats(group)])
    ),
    byVenue: Object.fromEntries(
      Object.entries(conditionGroups.byVenue).map(([key, group]) => [key, calculateConditionStats(group)])
    )
  };
}

function calculateTrends(predictions: any[]) {
  const sortedPredictions = predictions
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-10); // 直近10戦
  
  const recent10: DetailedTrendData[] = [];
  let cumulativeExactFirst = 0;
  let cumulativeRankingScore = 0;
  let cumulativeTop3Coverage = 0;
  
  sortedPredictions.forEach((prediction, index) => {
    const analysis = analyzePrediction(prediction.predictions || [], prediction.actualResults || []);
    
    if (analysis.exactMatch) cumulativeExactFirst++;
    cumulativeRankingScore += analysis.rankingScore;
    cumulativeTop3Coverage += analysis.top3Coverage;
    
    recent10.push({
      raceId: prediction.id,
      date: prediction.date,
      raceLabel: `${prediction.race.venue}${prediction.race.raceNumber}R`,
      rankingScore: analysis.rankingScore,
      exactFirst: analysis.exactMatch,
      top3Coverage: analysis.top3Coverage,
      cumulativeStats: {
        exactFirstRate: Math.round((cumulativeExactFirst / (index + 1)) * 100),
        averageRankingScore: Math.round(cumulativeRankingScore / (index + 1)),
        averageTop3Coverage: Math.round((cumulativeTop3Coverage / (index + 1)) * 100) / 100
      }
    });
  });
  
  // 月次統計（簡略版）
  const monthly: Record<string, DetailedMonthlyStats> = {};
  
  return {
    recent10,
    monthly
  };
}

function createEmptyStatistics(): DetailedStatistics {
  return {
    overview: {
      totalRaces: 0,
      completedRaces: 0,
      dataCompleteness: 0
    },
    positionAccuracy: {
      exact: { first: 0, second: 0, third: 0 },
      withinRange: { firstToTop3: 0, secondToTop3: 0, thirdToTop3: 0 }
    },
    hitPatterns: {
      perfectTriple: 0,
      exactFirst: 0,
      top3Coverage: { all3: 0, any2: 0, any1: 0 }
    },
    investmentEffectiveness: {
      singleWin: { hitRate: 0, averageOdds: 0, returnRate: 0 },
      placeWin: { hitRate: 0, averageReturn: 0, returnRate: 0 },
      exacta: { hitRate: 0, estimatedReturn: 0 }
    },
    conditionAnalysis: {
      byDistance: {},
      bySurface: {},
      byVenue: {}
    },
    trends: {
      recent10: [],
      monthly: {}
    }
  };
}