// 予想と投資記録を紐づけた統計計算サービス

import { investmentRepository } from '@/services/repositories/InvestmentRepository';
import { predictionRepository } from '@/services/repositories/PredictionRepository';
import { Investment } from '@/types/investment';
import { PredictionResult } from '@/types/prediction';

export interface PredictionInvestmentStats {
  predictionId: string;
  prediction: PredictionResult;
  investments: Investment[];
  totalInvestment: number;
  totalPayout: number;
  totalProfit: number;
  returnRate: number;
  winRate: number;
  betCount: number;
  averageOdds: number;
  isCompleted: boolean; // レース結果が入力済みかどうか
}

export interface PredictionPerformanceSummary {
  totalPredictions: number;
  totalInvestmentAmount: number;
  totalPayoutAmount: number;
  totalProfitAmount: number;
  overallReturnRate: number;
  overallWinRate: number;
  bestPerformingPrediction: PredictionInvestmentStats | null;
  worstPerformingPrediction: PredictionInvestmentStats | null;
  predictionStats: PredictionInvestmentStats[];
}

/**
 * 特定の予想IDに関連する投資記録の統計を計算
 */
export async function calculatePredictionInvestmentStats(predictionId: string): Promise<PredictionInvestmentStats | null> {
  try {
    // 予想データを取得
    const prediction = await predictionRepository.findById(predictionId);
    if (!prediction) {
      return null;
    }

    // 関連する投資記録を取得
    const allInvestments = await investmentRepository.getRecentInvestments(1000);
    const investments = allInvestments.filter(inv => inv.predictionId === predictionId);

    if (investments.length === 0) {
      return {
        predictionId,
        prediction,
        investments: [],
        totalInvestment: 0,
        totalPayout: 0,
        totalProfit: 0,
        returnRate: 0,
        winRate: 0,
        betCount: 0,
        averageOdds: 0,
        isCompleted: prediction.isResultEntered
      };
    }

    // 統計計算
    const totalInvestment = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPayout = investments.reduce((sum, inv) => sum + inv.payout, 0);
    const totalProfit = investments.reduce((sum, inv) => sum + inv.profit, 0);
    const returnRate = totalInvestment > 0 ? (totalPayout / totalInvestment) * 100 : 0;
    
    const winningBets = investments.filter(inv => inv.profit > 0).length;
    const winRate = investments.length > 0 ? (winningBets / investments.length) * 100 : 0;
    
    const totalOdds = investments.reduce((sum, inv) => sum + inv.odds, 0);
    const averageOdds = investments.length > 0 ? totalOdds / investments.length : 0;

    return {
      predictionId,
      prediction,
      investments,
      totalInvestment,
      totalPayout,
      totalProfit,
      returnRate,
      winRate,
      betCount: investments.length,
      averageOdds,
      isCompleted: prediction.isResultEntered
    };
  } catch (error) {
    console.error('予想別投資統計計算エラー:', error);
    return null;
  }
}

/**
 * 全ての予想に対する投資パフォーマンスサマリーを計算
 */
export async function calculatePredictionPerformanceSummary(): Promise<PredictionPerformanceSummary> {
  try {
    // 全ての予想を取得
    const predictions = await predictionRepository.getHistory(100);
    
    // 各予想の投資統計を計算
    const predictionStatsPromises = predictions.map(async (prediction) => {
      return await calculatePredictionInvestmentStats(prediction.id);
    });
    
    const allPredictionStats = await Promise.all(predictionStatsPromises);
    const validPredictionStats = allPredictionStats.filter(stats => stats !== null) as PredictionInvestmentStats[];

    // 投資記録があるもののみフィルター
    const statsWithInvestments = validPredictionStats.filter(stats => stats.betCount > 0);

    if (statsWithInvestments.length === 0) {
      return {
        totalPredictions: validPredictionStats.length,
        totalInvestmentAmount: 0,
        totalPayoutAmount: 0,
        totalProfitAmount: 0,
        overallReturnRate: 0,
        overallWinRate: 0,
        bestPerformingPrediction: null,
        worstPerformingPrediction: null,
        predictionStats: validPredictionStats
      };
    }

    // 全体統計を計算
    const totalInvestmentAmount = statsWithInvestments.reduce((sum, stats) => sum + stats.totalInvestment, 0);
    const totalPayoutAmount = statsWithInvestments.reduce((sum, stats) => sum + stats.totalPayout, 0);
    const totalProfitAmount = statsWithInvestments.reduce((sum, stats) => sum + stats.totalProfit, 0);
    const overallReturnRate = totalInvestmentAmount > 0 ? (totalPayoutAmount / totalInvestmentAmount) * 100 : 0;

    // 勝率計算（予想単位での勝率）
    const profitablePredictions = statsWithInvestments.filter(stats => stats.totalProfit > 0).length;
    const overallWinRate = statsWithInvestments.length > 0 ? (profitablePredictions / statsWithInvestments.length) * 100 : 0;

    // 最高・最低パフォーマンスの予想を特定
    const bestPerformingPrediction = statsWithInvestments.reduce((best, current) => 
      current.returnRate > best.returnRate ? current : best
    );

    const worstPerformingPrediction = statsWithInvestments.reduce((worst, current) => 
      current.returnRate < worst.returnRate ? current : worst
    );

    return {
      totalPredictions: validPredictionStats.length,
      totalInvestmentAmount,
      totalPayoutAmount,
      totalProfitAmount,
      overallReturnRate,
      overallWinRate,
      bestPerformingPrediction,
      worstPerformingPrediction,
      predictionStats: validPredictionStats
    };
  } catch (error) {
    console.error('予想パフォーマンスサマリー計算エラー:', error);
    return {
      totalPredictions: 0,
      totalInvestmentAmount: 0,
      totalPayoutAmount: 0,
      totalProfitAmount: 0,
      overallReturnRate: 0,
      overallWinRate: 0,
      bestPerformingPrediction: null,
      worstPerformingPrediction: null,
      predictionStats: []
    };
  }
}

/**
 * 予想の精度と投資パフォーマンスの相関分析
 */
export async function analyzePredictionAccuracyCorrelation(): Promise<{
  highAccuracyHighReturn: number;
  highAccuracyLowReturn: number;
  lowAccuracyHighReturn: number;
  lowAccuracyLowReturn: number;
  correlationStrength: 'strong' | 'moderate' | 'weak' | 'none';
}> {
  try {
    const summary = await calculatePredictionPerformanceSummary();
    const completedStats = summary.predictionStats.filter(stats => 
      stats.isCompleted && stats.betCount > 0
    );

    if (completedStats.length === 0) {
      return {
        highAccuracyHighReturn: 0,
        highAccuracyLowReturn: 0,
        lowAccuracyHighReturn: 0,
        lowAccuracyLowReturn: 0,
        correlationStrength: 'none'
      };
    }

    // 的中率とリターン率の中央値を求める
    const accuracies = completedStats.map(stats => stats.prediction.accuracy || 0);
    const returns = completedStats.map(stats => stats.returnRate);
    
    const medianAccuracy = accuracies.sort((a, b) => a - b)[Math.floor(accuracies.length / 2)];
    const medianReturn = returns.sort((a, b) => a - b)[Math.floor(returns.length / 2)];

    // 4象限に分類
    let highAccuracyHighReturn = 0;
    let highAccuracyLowReturn = 0;
    let lowAccuracyHighReturn = 0;
    let lowAccuracyLowReturn = 0;

    completedStats.forEach(stats => {
      const accuracy = stats.prediction.accuracy || 0;
      const returnRate = stats.returnRate;

      if (accuracy >= medianAccuracy && returnRate >= medianReturn) {
        highAccuracyHighReturn++;
      } else if (accuracy >= medianAccuracy && returnRate < medianReturn) {
        highAccuracyLowReturn++;
      } else if (accuracy < medianAccuracy && returnRate >= medianReturn) {
        lowAccuracyHighReturn++;
      } else {
        lowAccuracyLowReturn++;
      }
    });

    // 相関の強さを判定
    const total = completedStats.length;
    const strongCorrelation = (highAccuracyHighReturn + lowAccuracyLowReturn) / total;
    
    let correlationStrength: 'strong' | 'moderate' | 'weak' | 'none';
    if (strongCorrelation >= 0.8) {
      correlationStrength = 'strong';
    } else if (strongCorrelation >= 0.6) {
      correlationStrength = 'moderate';
    } else if (strongCorrelation >= 0.4) {
      correlationStrength = 'weak';
    } else {
      correlationStrength = 'none';
    }

    return {
      highAccuracyHighReturn,
      highAccuracyLowReturn,
      lowAccuracyHighReturn,
      lowAccuracyLowReturn,
      correlationStrength
    };
  } catch (error) {
    console.error('予想精度相関分析エラー:', error);
    return {
      highAccuracyHighReturn: 0,
      highAccuracyLowReturn: 0,
      lowAccuracyHighReturn: 0,
      lowAccuracyLowReturn: 0,
      correlationStrength: 'none'
    };
  }
}