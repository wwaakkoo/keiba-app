import { useState, useEffect, useCallback } from 'react';
import { raceRepository } from '@/services/repositories/RaceRepository';
import { predictionRepository } from '@/services/repositories/PredictionRepository';
import { investmentRepository } from '@/services/repositories/InvestmentRepository';
import { Race } from '@/types/race';
import { PredictionResult, HorseAnalysis, ActualResult } from '@/types/prediction';
import { Investment } from '@/types/investment';
import { 
  calculateDetailedStatistics, 
  DetailedStatistics,
  analyzePrediction,
  type DetailedPredictionAnalysis 
} from '@/services/detailedStatisticsService';

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

interface AccuracyStats {
  totalPredictions: number;
  completedPredictions: number;
  firstPlaceAccuracy: number;
  top3Accuracy: number;
  totalInvestment: number;
  totalPayout: number;
  totalProfit: number;
  returnRate: number;
}

export const useDataManager = () => {
  // 予想履歴の管理（IndexedDBから取得）
  const [predictionHistory, setPredictionHistory] = useState<PredictionHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // IndexedDBからデータを読み込み
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 予想履歴を取得してレガシー形式に変換
      const predictions = await predictionRepository.getHistory(50);
      const races = await raceRepository.getAll();
      const investments = await investmentRepository.getRecentInvestments(50);

      const historyEntries: PredictionHistoryEntry[] = await Promise.all(
        predictions.map(async (prediction) => {
          const race = races.find(r => r.id === prediction.raceId);
          const raceInvestments = investments.filter(inv => inv.predictionId === prediction.id);
          
          // デバッグ: レースデータが見つからない場合のログ
          if (!race) {
            console.warn(`予想 ${prediction.id} に対応するレース ${prediction.raceId} が見つかりません`);
          } else if (!race.venue || race.venue === '不明') {
            console.warn(`レース ${prediction.raceId} の競馬場情報が不足しています:`, {
              venue: race.venue,
              distance: race.distance,
              surface: race.surface
            });
          }
          
          const totalInvestment = raceInvestments.reduce((sum, inv) => sum + inv.amount, 0);
          const totalReturn = raceInvestments.reduce((sum, inv) => sum + inv.payout, 0);

          return {
            id: prediction.id,
            date: prediction.timestamp.toISOString(),
            race: {
              venue: race?.venue && race.venue !== '不明' ? race.venue : 'データ不足',
              raceNumber: race?.raceNumber || 1,
              distance: race?.distance || 1200,
              surface: race?.surface || 'turf',
              raceDate: race?.date || ''
            },
            predictions: prediction.predictions || [],
            horseCount: prediction.predictions?.length || 0,
            confidenceLevel: prediction.confidence,
            actualResults: prediction.actualRanking ? 
              prediction.actualRanking.map((number, index) => ({ number, rank: index + 1 })) : 
              undefined,
            payoutData: raceInvestments.length > 0 ? {
              investment: totalInvestment,
              totalReturn: totalReturn
            } : undefined,
            isResultEntered: !!prediction.actualRanking
          };
        })
      );

      setPredictionHistory(historyEntries);
    } catch (err) {
      console.error('データ読み込みエラー:', err);
      setError('データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初期データ読み込み
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 予想結果を履歴に保存（IndexedDBに保存）
  const savePredictionResult = async (raceData: any, predictions: any[], confidenceLevel: number | null = null) => {
    try {
      // レースデータを保存
      const race: Omit<Race, 'id' | 'createdAt' | 'updatedAt'> = {
        date: raceData.date,
        venue: raceData.venue,
        raceNumber: raceData.raceNumber,
        distance: raceData.distance,
        surface: raceData.surface,
        condition: raceData.condition || 'good',
        horses: raceData.horses || []
      };

      const savedRace = await raceRepository.create(race);

      // 予想データを保存
      const predictionData: Omit<PredictionResult, 'id'> = {
        raceId: savedRace.id,
        timestamp: new Date(),
        date: new Date().toISOString().split('T')[0],
        race: {
          venue: savedRace.venue,
          raceNumber: savedRace.raceNumber,
          distance: savedRace.distance,
          surface: savedRace.surface,
          raceDate: savedRace.date
        },
        predictions: predictions.slice(0, 5), // 上位5頭のみ保存
        horseCount: predictions.length,
        confidenceLevel: confidenceLevel ? {
          overall: confidenceLevel > 80 ? 'high' : confidenceLevel > 60 ? 'medium' : 'low',
          topPick: confidenceLevel,
          spread: 10,
          dataQuality: 'good'
        } : null,
        actualResults: null,
        payoutData: null,
        isResultEntered: false
      };

      const predictionId = await predictionRepository.save(predictionData);

      // データを再読み込み
      await loadData();

      return predictionId;
    } catch (err) {
      console.error('予想保存エラー:', err);
      setError('予想の保存に失敗しました');
      throw err;
    }
  };
  
  // 実際の結果を入力（配当情報付き）
  const saveActualResults = async (
    predictionId: string, 
    actualResults: ActualResult[], 
    payoutData: { investment: number; totalReturn: number } | null = null
  ) => {
    try {
      // 予想結果を更新
      const actualRanking = actualResults
        .sort((a, b) => a.rank - b.rank)
        .map(result => result.number);

      // 的中判定（1着予想が当たったかどうか）
      const prediction = await predictionRepository.findById(predictionId);
      const isCorrect = prediction?.predictions?.[0]?.horse?.number === actualRanking[0];
      
      await predictionRepository.updateResult(predictionId, {
        actualRanking,
        accuracy: isCorrect ? 100 : 0,
        isCorrect
      });

      // 投資記録を保存（payoutDataがある場合）
      if (payoutData && prediction) {
        const investment: Omit<Investment, 'id'> = {
          raceId: prediction.raceId,
          predictionId: predictionId,
          betType: 'win', // デフォルトは単勝
          selections: [prediction.predictions?.[0]?.horse?.number || 1],
          amount: payoutData.investment || 0,
          odds: 0, // オッズ情報がない場合は0
          payout: payoutData.totalReturn || 0,
          profit: (payoutData.totalReturn || 0) - (payoutData.investment || 0),
          timestamp: new Date()
        };

        await investmentRepository.record(investment);
      }

      // データを再読み込み
      await loadData();
    } catch (err) {
      console.error('結果保存エラー:', err);
      setError('結果の保存に失敗しました');
      throw err;
    }
  };
  
  // 的中率統計の計算（収支情報付き）
  const calculateAccuracy = async (): Promise<AccuracyStats> => {
    try {
      // IndexedDBから統計を取得
      const accuracyStats = await predictionRepository.getAccuracyStats();
      const investmentStats = await investmentRepository.calculateStats();

      return {
        totalPredictions: accuracyStats.totalPredictions,
        completedPredictions: accuracyStats.totalPredictions,
        firstPlaceAccuracy: accuracyStats.accuracy,
        top3Accuracy: accuracyStats.accuracy, // 簡略化
        totalInvestment: investmentStats.totalInvestment,
        totalPayout: investmentStats.totalPayout,
        totalProfit: investmentStats.totalProfit,
        returnRate: investmentStats.returnRate
      };
    } catch (err) {
      console.error('統計計算エラー:', err);
      return {
        totalPredictions: 0,
        completedPredictions: 0,
        firstPlaceAccuracy: 0,
        top3Accuracy: 0,
        totalInvestment: 0,
        totalPayout: 0,
        totalProfit: 0,
        returnRate: 0
      };
    }
  };

  // レガシー関数（互換性のため）
  const calculateAccuracyLegacy = (): AccuracyStats => {
    if (predictionHistory.length === 0) {
      return {
        totalPredictions: 0,
        completedPredictions: 0,
        firstPlaceAccuracy: 0,
        top3Accuracy: 0,
        totalInvestment: 0,
        totalPayout: 0,
        totalProfit: 0,
        returnRate: 0
      };
    }
    
    // 結果が入力されている予想のみで計算
    const completedPredictions = predictionHistory.filter(p => p.isResultEntered);
    
    if (completedPredictions.length === 0) {
      return {
        totalPredictions: predictionHistory.length,
        completedPredictions: 0,
        firstPlaceAccuracy: 0,
        top3Accuracy: 0,
        totalInvestment: 0,
        totalPayout: 0,
        totalProfit: 0,
        returnRate: 0
      };
    }
    
    // 1着的中率計算
    const firstPlaceHits = completedPredictions.filter(prediction => {
      const topPrediction = prediction.predictions[0]; // 予想1位
      const firstPlace = prediction.actualResults?.find(result => result.rank === 1);
      return topPrediction && firstPlace && topPrediction.horse.number === firstPlace.number;
    }).length;
    
    // 3着以内的中率計算（予想上位3頭のうち1頭でも3着以内に入れば的中）
    const top3Hits = completedPredictions.filter(prediction => {
      const top3Predictions = prediction.predictions.slice(0, 3);
      const top3Actual = prediction.actualResults?.filter(result => result.rank <= 3) || [];
      
      return top3Predictions.some(pred => 
        top3Actual.some(actual => pred.horse.number === actual.number)
      );
    }).length;
    
    // 収支計算
    let totalInvestment = 0;
    let totalPayout = 0;
    
    completedPredictions.forEach(prediction => {
      if (prediction.payoutData) {
        totalInvestment += prediction.payoutData.investment || 0;
        totalPayout += prediction.payoutData.totalReturn || 0;
      }
    });
    
    const totalProfit = totalPayout - totalInvestment;
    const returnRate = totalInvestment > 0 ? Math.round((totalPayout / totalInvestment) * 100) : 0;
    
    return {
      totalPredictions: predictionHistory.length,
      completedPredictions: completedPredictions.length,
      firstPlaceAccuracy: Math.round((firstPlaceHits / completedPredictions.length) * 100),
      top3Accuracy: Math.round((top3Hits / completedPredictions.length) * 100),
      totalInvestment,
      totalPayout,
      totalProfit,
      returnRate
    };
  };
  
  const calculateTrendData = (period: number = 10) => {
    const completedPredictions = predictionHistory
      .filter(p => p.isResultEntered)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // 日付順にソート
      .slice(-period); // 期間指定
    
    if (completedPredictions.length === 0) return [];
    
    const trendData: any[] = [];
    let cumulativeFirstHits = 0;
    let cumulativeTop3Hits = 0;
    
    completedPredictions.forEach((prediction, index) => {
      // 1着的中チェック
      const topPrediction = prediction.predictions[0];
      const firstPlace = prediction.actualResults?.find(r => r.rank === 1);
      const isFirstHit = topPrediction && firstPlace && topPrediction.horse.number === firstPlace.number;
      
      // 3着以内的中チェック
      const top3Predictions = prediction.predictions.slice(0, 3);
      const top3Actual = prediction.actualResults?.filter(r => r.rank <= 3) || [];
      const isTop3Hit = top3Predictions.some(pred => 
        top3Actual.some(actual => pred.horse.number === actual.number)
      );
      
      if (isFirstHit) cumulativeFirstHits++;
      if (isTop3Hit) cumulativeTop3Hits++;
      
      const firstAccuracy = Math.round((cumulativeFirstHits / (index + 1)) * 100);
      const top3Accuracy = Math.round((cumulativeTop3Hits / (index + 1)) * 100);
      
      trendData.push({
        race: `${prediction.race.venue}${prediction.race.raceNumber}R`,
        firstAccuracy: firstAccuracy,
        top3Accuracy: top3Accuracy,
        date: new Date(prediction.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
        isFirstHit: isFirstHit,
        isTop3Hit: isTop3Hit
      });
    });
    
    return trendData;
  };
  
  // 期間別統計の計算（収支情報付き）
  const calculatePeriodStats = (period: 'all' | 'thisMonth' | 'lastMonth' = 'all') => {
    const now = new Date();
    const completedPredictions = predictionHistory.filter(p => p.isResultEntered);
    
    let filteredPredictions = [];
    
    if (period === 'thisMonth') {
      filteredPredictions = completedPredictions.filter(p => {
        const predDate = new Date(p.date);
        return predDate.getMonth() === now.getMonth() && predDate.getFullYear() === now.getFullYear();
      });
    } else if (period === 'lastMonth') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      filteredPredictions = completedPredictions.filter(p => {
        const predDate = new Date(p.date);
        return predDate.getMonth() === lastMonth.getMonth() && predDate.getFullYear() === lastMonth.getFullYear();
      });
    } else {
      filteredPredictions = completedPredictions;
    }
    
    if (filteredPredictions.length === 0) return null;
    
    // 1着的中計算
    const firstHits = filteredPredictions.filter(prediction => {
      const topPrediction = prediction.predictions[0];
      const firstPlace = prediction.actualResults?.find(r => r.rank === 1);
      return topPrediction && firstPlace && topPrediction.horse.number === firstPlace.number;
    }).length;
    
    // 3着以内的中計算
    const top3Hits = filteredPredictions.filter(prediction => {
      const top3Predictions = prediction.predictions.slice(0, 3);
      const top3Actual = prediction.actualResults?.filter(r => r.rank <= 3) || [];
      return top3Predictions.some(pred => 
        top3Actual.some(actual => pred.horse.number === actual.number)
      );
    }).length;
    
    // 収支計算
    let totalInvestment = 0;
    let totalPayout = 0;
    
    filteredPredictions.forEach(prediction => {
      if (prediction.payoutData) {
        totalInvestment += prediction.payoutData.investment || 0;
        totalPayout += prediction.payoutData.totalReturn || 0;
      }
    });
    
    const totalProfit = totalPayout - totalInvestment;
    const returnRate = totalInvestment > 0 ? Math.round((totalPayout / totalInvestment) * 100) : 0;
    
    return {
      total: filteredPredictions.length,
      firstAccuracy: Math.round((firstHits / filteredPredictions.length) * 100),
      top3Accuracy: Math.round((top3Hits / filteredPredictions.length) * 100),
      totalInvestment,
      totalPayout,
      totalProfit,
      returnRate
    };
  };
  
  // 条件別統計の計算
  const calculateConditionStats = () => {
    const completedPredictions = predictionHistory.filter(p => p.isResultEntered);
    
    if (completedPredictions.length === 0) return {};
    
    // 距離別統計
    const distanceStats: Record<string, any> = {};
    // 馬場別統計
    const surfaceStats: Record<string, any> = {};
    // 競馬場別統計
    const venueStats: Record<string, any> = {};
    
    completedPredictions.forEach(prediction => {
      const distance = prediction.race.distance.toString();
      const surface = prediction.race.surface;
      const venue = prediction.race.venue || '未設定';
      
      // 1着的中チェック
      const topPrediction = prediction.predictions[0];
      const firstPlace = prediction.actualResults?.find(r => r.rank === 1);
      const isFirstHit = topPrediction && firstPlace && topPrediction.horse.number === firstPlace.number;
      
      // 3着以内的中チェック
      const top3Predictions = prediction.predictions.slice(0, 3);
      const top3Actual = prediction.actualResults?.filter(r => r.rank <= 3) || [];
      const isTop3Hit = top3Predictions.some(pred => 
        top3Actual.some(actual => pred.horse.number === actual.number)
      );
      
      // 距離別
      if (!distanceStats[distance]) {
        distanceStats[distance] = { total: 0, firstHits: 0, top3Hits: 0 };
      }
      distanceStats[distance].total++;
      if (isFirstHit) distanceStats[distance].firstHits++;
      if (isTop3Hit) distanceStats[distance].top3Hits++;
      
      // 馬場別
      if (!surfaceStats[surface]) {
        surfaceStats[surface] = { total: 0, firstHits: 0, top3Hits: 0 };
      }
      surfaceStats[surface].total++;
      if (isFirstHit) surfaceStats[surface].firstHits++;
      if (isTop3Hit) surfaceStats[surface].top3Hits++;
      
      // 競馬場別
      if (!venueStats[venue]) {
        venueStats[venue] = { total: 0, firstHits: 0, top3Hits: 0 };
      }
      venueStats[venue].total++;
      if (isFirstHit) venueStats[venue].firstHits++;
      if (isTop3Hit) venueStats[venue].top3Hits++;
    });
    
    // パーセンテージ計算
    const calculatePercentages = (stats: Record<string, any>) => {
      const result: Record<string, any> = {};
      Object.keys(stats).forEach(key => {
        const stat = stats[key];
        result[key] = {
          total: stat.total,
          firstAccuracy: Math.round((stat.firstHits / stat.total) * 100),
          top3Accuracy: Math.round((stat.top3Hits / stat.total) * 100)
        };
      });
      return result;
    };
    
    return {
      distance: calculatePercentages(distanceStats),
      surface: calculatePercentages(surfaceStats),
      venue: calculatePercentages(venueStats)
    };
  };

  // 詳細統計の計算（新機能）
  const calculateDetailedStats = useCallback((): DetailedStatistics => {
    return calculateDetailedStatistics(predictionHistory);
  }, [predictionHistory]);

  // 単一予想の詳細分析（新機能）
  const analyzeSinglePrediction = useCallback((
    predictions: any[], 
    actualResults: any[]
  ): DetailedPredictionAnalysis['accuracyAnalysis'] => {
    return analyzePrediction(predictions, actualResults);
  }, []);

  // 詳細トレンド分析（拡張版）
  const calculateDetailedTrends = useCallback((period: number = 10) => {
    const completedPredictions = predictionHistory
      .filter(p => p.isResultEntered)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-period);
    
    if (completedPredictions.length === 0) return [];
    
    const detailedTrends: any[] = [];
    let cumulativeStats = {
      exactFirstHits: 0,
      totalRankingScore: 0,
      totalTop3Coverage: 0,
      perfectTriples: 0
    };
    
    completedPredictions.forEach((prediction, index) => {
      const analysis = analyzePrediction(
        prediction.predictions || [], 
        prediction.actualResults || []
      );
      
      // 累積統計更新
      if (analysis.exactMatch) cumulativeStats.exactFirstHits++;
      cumulativeStats.totalRankingScore += analysis.rankingScore;
      cumulativeStats.totalTop3Coverage += analysis.top3Coverage;
      
      const isPerfectTriple = analysis.positionMatches.length === 3 &&
        analysis.positionMatches.every(m => m.predictedRank === m.actualRank);
      if (isPerfectTriple) cumulativeStats.perfectTriples++;
      
      const raceCount = index + 1;
      
      detailedTrends.push({
        race: `${prediction.race.venue}${prediction.race.raceNumber}R`,
        date: new Date(prediction.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
        raceId: prediction.id,
        
        // 個別レース結果
        exactFirst: analysis.exactMatch,
        rankingScore: analysis.rankingScore,
        top3Coverage: analysis.top3Coverage,
        perfectTriple: isPerfectTriple,
        positionMatches: analysis.positionMatches.length,
        
        // 累積統計
        cumulativeStats: {
          exactFirstRate: Math.round((cumulativeStats.exactFirstHits / raceCount) * 100),
          averageRankingScore: Math.round(cumulativeStats.totalRankingScore / raceCount),
          averageTop3Coverage: Math.round((cumulativeStats.totalTop3Coverage / raceCount) * 100) / 100,
          perfectTripleRate: Math.round((cumulativeStats.perfectTriples / raceCount) * 100)
        }
      });
    });
    
    return detailedTrends;
  }, [predictionHistory]);

  // 投資効果シミュレーション（新機能）
  const simulateInvestmentStrategies = useCallback(() => {
    const completedPredictions = predictionHistory.filter(p => p.isResultEntered);
    
    if (completedPredictions.length === 0) return null;
    
    const strategies = {
      singleWinOnly: { bets: 0, hits: 0, estimatedReturn: 0 },
      placeTop3: { bets: 0, hits: 0, estimatedReturn: 0 },
      exactaTop2: { bets: 0, hits: 0, estimatedReturn: 0 },
      trioTop3: { bets: 0, hits: 0, estimatedReturn: 0 }
    };
    
    completedPredictions.forEach(prediction => {
      const analysis = analyzePrediction(
        prediction.predictions || [], 
        prediction.actualResults || []
      );
      
      // 単勝（予想1位のみ）
      strategies.singleWinOnly.bets++;
      if (analysis.exactMatch) {
        strategies.singleWinOnly.hits++;
        strategies.singleWinOnly.estimatedReturn += 350; // 平均3.5倍と仮定
      }
      
      // 複勝（予想1位）
      strategies.placeTop3.bets++;
      if (analysis.withinTop3) {
        strategies.placeTop3.hits++;
        strategies.placeTop3.estimatedReturn += 180; // 平均1.8倍と仮定
      }
      
      // 馬連（予想1-2位）
      const exactaHit = analysis.positionMatches.some(m => m.predictedRank === 1 && m.actualRank <= 2) &&
                        analysis.positionMatches.some(m => m.predictedRank === 2 && m.actualRank <= 2);
      strategies.exactaTop2.bets++;
      if (exactaHit) {
        strategies.exactaTop2.hits++;
        strategies.exactaTop2.estimatedReturn += 1200; // 平均12倍と仮定
      }
      
      // 三連複（予想1-3位すべて3着以内）
      strategies.trioTop3.bets++;
      if (analysis.top3Coverage === 3) {
        strategies.trioTop3.hits++;
        strategies.trioTop3.estimatedReturn += 3000; // 平均30倍と仮定
      }
    });
    
    // ROI計算（100円ベット想定）
    Object.keys(strategies).forEach(key => {
      const strategy = strategies[key as keyof typeof strategies];
      const investment = strategy.bets * 100;
      strategy.estimatedReturn = Math.round((strategy.estimatedReturn / investment) * 100);
    });
    
    return strategies;
  }, [predictionHistory]);
  
  return {
    predictionHistory,
    savePredictionResult,
    saveActualResults,
    calculateAccuracy,
    calculateAccuracyLegacy,
    calculateTrendData,
    calculatePeriodStats,
    calculateConditionStats,
    loadData,
    isLoading,
    error,
    
    // 新しい詳細統計機能
    calculateDetailedStats,
    analyzeSinglePrediction,
    calculateDetailedTrends,
    simulateInvestmentStrategies
  };
};