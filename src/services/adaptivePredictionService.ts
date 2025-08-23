import { PredictionResult, HorseData, RaceConditions } from '@/types/prediction';
import { detailedStatisticsService } from './detailedStatisticsService';
import { predictionService } from './predictionService';

export interface PredictionContext {
  raceConditions: RaceConditions;
  currentStats: {
    overallHitRate: number;
    hitPatterns: any;
    conditionSpecificStats: { [key: string]: number };
    recentTrend: 'improving' | 'declining' | 'stable';
  };
}

export interface AdaptivePredictionResult extends PredictionResult {
  confidenceLevel: 'high' | 'medium' | 'low';
  recommendedBetTypes: string[];
  expectedHitRate: number;
  riskAssessment: {
    level: 'conservative' | 'moderate' | 'aggressive';
    reasoning: string;
  };
}

export class AdaptivePredictionService {
  /**
   * 統計データを活用した適応型予想
   */
  static async generateAdaptivePrediction(
    horses: HorseData[],
    raceConditions: RaceConditions
  ): Promise<AdaptivePredictionResult> {
    // 基本予想を取得
    const basePrediction = await predictionService.generatePrediction(horses, raceConditions);
    
    // 現在の統計データを取得
    const currentStats = await this.getCurrentStatistics(raceConditions);
    
    // 統計データに基づいて予想を調整
    const adjustedPrediction = this.adjustPredictionWithStats(basePrediction, currentStats);
    
    // 信頼度レベルを判定
    const confidenceLevel = this.assessConfidenceLevel(currentStats, raceConditions);
    
    // 推奨馬券タイプを決定
    const recommendedBetTypes = this.recommendBetTypes(currentStats, confidenceLevel);
    
    // 期待的中率を計算
    const expectedHitRate = this.calculateExpectedHitRate(currentStats, raceConditions);
    
    // リスク評価
    const riskAssessment = this.assessRisk(currentStats, confidenceLevel);

    return {
      ...adjustedPrediction,
      confidenceLevel,
      recommendedBetTypes,
      expectedHitRate,
      riskAssessment
    };
  }

  /**
   * 現在の統計データを取得・分析
   */
  private static async getCurrentStatistics(raceConditions: RaceConditions) {
    const stats = await detailedStatisticsService.getDetailedStatistics();
    
    // 条件別統計を計算
    const conditionSpecificStats = await this.getConditionSpecificStats(raceConditions);
    
    // 最近のトレンドを分析
    const recentTrend = this.analyzeRecentTrend(stats);
    
    return {
      overallHitRate: stats.hitPatterns.any1.rate,
      hitPatterns: stats.hitPatterns,
      conditionSpecificStats,
      recentTrend
    };
  }

  /**
   * 条件別統計データを取得
   */
  private static async getConditionSpecificStats(conditions: RaceConditions) {
    // レース条件（芝/ダート、距離、天候等）別の的中率を分析
    const conditionStats: { [key: string]: number } = {};
    
    // 実装例：芝/ダート別の的中率
    if (conditions.surface) {
      conditionStats[`surface_${conditions.surface}`] = await this.getHitRateByCondition('surface', conditions.surface);
    }
    
    // 距離別の的中率
    if (conditions.distance) {
      const distanceCategory = this.categorizeDistance(conditions.distance);
      conditionStats[`distance_${distanceCategory}`] = await this.getHitRateByCondition('distance', distanceCategory);
    }
    
    // 天候別の的中率
    if (conditions.weather) {
      conditionStats[`weather_${conditions.weather}`] = await this.getHitRateByCondition('weather', conditions.weather);
    }
    
    return conditionStats;
  }

  /**
   * 統計データに基づいて予想を調整
   */
  private static adjustPredictionWithStats(
    basePrediction: PredictionResult,
    stats: any
  ): PredictionResult {
    const adjustedRankings = basePrediction.rankings.map((horse, index) => {
      let adjustedConfidence = horse.confidence;
      
      // 最近のトレンドに基づく調整
      if (stats.recentTrend === 'improving') {
        adjustedConfidence *= 1.1; // 10%向上
      } else if (stats.recentTrend === 'declining') {
        adjustedConfidence *= 0.9; // 10%低下
      }
      
      // 条件別統計に基づく調整
      Object.entries(stats.conditionSpecificStats).forEach(([condition, hitRate]) => {
        if (typeof hitRate === 'number') {
          const adjustment = hitRate / stats.overallHitRate;
          adjustedConfidence *= adjustment;
        }
      });
      
      // 信頼度を0-1の範囲に正規化
      adjustedConfidence = Math.max(0, Math.min(1, adjustedConfidence));
      
      return {
        ...horse,
        confidence: adjustedConfidence
      };
    });

    // 調整後の信頼度でソート
    adjustedRankings.sort((a, b) => b.confidence - a.confidence);

    return {
      ...basePrediction,
      rankings: adjustedRankings
    };
  }

  /**
   * 信頼度レベルを評価
   */
  private static assessConfidenceLevel(stats: any, conditions: RaceConditions): 'high' | 'medium' | 'low' {
    let score = 0;
    
    // 全体的中率による評価
    if (stats.overallHitRate > 0.75) score += 3;
    else if (stats.overallHitRate > 0.6) score += 2;
    else score += 1;
    
    // 最近のトレンドによる評価
    if (stats.recentTrend === 'improving') score += 2;
    else if (stats.recentTrend === 'stable') score += 1;
    
    // 条件別統計による評価
    const conditionScores = Object.values(stats.conditionSpecificStats) as number[];
    const avgConditionScore = conditionScores.length > 0 
      ? conditionScores.reduce((sum, score) => sum + score, 0) / conditionScores.length 
      : stats.overallHitRate;
    
    if (avgConditionScore > 0.8) score += 2;
    else if (avgConditionScore > 0.65) score += 1;
    
    // スコアに基づいて信頼度レベルを決定
    if (score >= 6) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  /**
   * 推奨馬券タイプを決定
   */
  private static recommendBetTypes(stats: any, confidenceLevel: 'high' | 'medium' | 'low'): string[] {
    const recommendations: string[] = [];
    
    const { any1, any2, all3 } = stats.hitPatterns;
    
    // 信頼度と的中パターンに基づいて推奨
    if (confidenceLevel === 'high') {
      if (any1.rate > 0.8) recommendations.push('ワイド');
      if (any2.rate > 0.5) recommendations.push('馬連');
      if (all3.rate > 0.2) recommendations.push('3連複');
    } else if (confidenceLevel === 'medium') {
      if (any1.rate > 0.7) recommendations.push('複勝');
      if (any1.rate > 0.75) recommendations.push('ワイド');
      if (any2.rate > 0.4) recommendations.push('馬連');
    } else {
      recommendations.push('複勝');
      if (any1.rate > 0.6) recommendations.push('ワイド');
    }
    
    return recommendations;
  }

  /**
   * 期待的中率を計算
   */
  private static calculateExpectedHitRate(stats: any, conditions: RaceConditions): number {
    let expectedRate = stats.overallHitRate;
    
    // 条件別調整
    Object.values(stats.conditionSpecificStats).forEach((conditionRate) => {
      if (typeof conditionRate === 'number') {
        expectedRate = (expectedRate + conditionRate) / 2;
      }
    });
    
    // トレンド調整
    if (stats.recentTrend === 'improving') {
      expectedRate *= 1.05;
    } else if (stats.recentTrend === 'declining') {
      expectedRate *= 0.95;
    }
    
    return Math.max(0, Math.min(1, expectedRate));
  }

  /**
   * リスク評価
   */
  private static assessRisk(stats: any, confidenceLevel: 'high' | 'medium' | 'low') {
    if (confidenceLevel === 'high' && stats.recentTrend !== 'declining') {
      return {
        level: 'moderate' as const,
        reasoning: '高い信頼度と安定した成績により、適度なリスクでの投資を推奨'
      };
    } else if (confidenceLevel === 'medium') {
      return {
        level: 'conservative' as const,
        reasoning: '中程度の信頼度のため、保守的な投資戦略を推奨'
      };
    } else {
      return {
        level: 'conservative' as const,
        reasoning: '信頼度が低いため、リスクを抑えた慎重な投資を推奨'
      };
    }
  }

  // ヘルパーメソッド
  private static async getHitRateByCondition(conditionType: string, value: string): Promise<number> {
    // 実際の実装では、データベースから条件別の的中率を取得
    // 現在は仮の値を返す
    return 0.7;
  }

  private static categorizeDistance(distance: number): string {
    if (distance < 1400) return 'short';
    if (distance < 1800) return 'mile';
    if (distance < 2200) return 'intermediate';
    return 'long';
  }

  private static analyzeRecentTrend(stats: any): 'improving' | 'declining' | 'stable' {
    // 実際の実装では、最近のレース結果のトレンドを分析
    // 現在は仮の値を返す
    return 'stable';
  }
}