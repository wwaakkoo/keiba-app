import { PredictionResult, HorseAnalysis, ConfidenceLevel, RaceConditions } from '@/types/prediction';
import { Investment } from '@/types/investment';
import { EnhancedStatisticsService, EnhancedAccuracyStats } from './enhancedStatisticsService';
import { calculateOptimizedHorseScore, calculateConfidenceLevel } from './predictionService';

export interface AdaptivePredictionWeights {
  speed: number;
  recent: number;
  odds: number;
  adaptionFactor: number; // 適応度係数 (0-1)
}

export interface StatisticalProfile {
  overallHitRate: number;
  hitPatterns: {
    any1: { rate: number; count: number };
    any2: { rate: number; count: number };
    all3: { rate: number; count: number };
  };
  recentTrend: 'improving' | 'declining' | 'stable';
  conditionSpecificStats: { [key: string]: number };
  optimalWeights: AdaptivePredictionWeights;
}

export interface AdaptivePredictionInput {
  race: {
    venue: string;
    distance: number;
    surface: 'turf' | 'dirt';
    condition?: 'good' | 'slightly_heavy' | 'heavy' | 'bad';
    weather?: string;
  };
  horses: any[];
  historicalPredictions: PredictionResult[];
  investments: Investment[];
}

export interface AdaptivePredictionResult {
  predictions: HorseAnalysis[];
  confidenceLevel: ConfidenceLevel;
  statisticalInsights: {
    currentStats: StatisticalProfile;
    expectedHitRate: number;
    recommendedStrategy: 'conservative' | 'balanced' | 'aggressive';
  };
  adaptedWeights: AdaptivePredictionWeights;
}

export class AdaptivePredictionService {
  /**
   * メインの適応型予想計算
   */
  static async generateAdaptivePrediction(
    input: AdaptivePredictionInput
  ): Promise<AdaptivePredictionResult> {
    try {
      // 1. 統計プロファイルの生成
      const statisticalProfile = await this.buildStatisticalProfile(
        input.historicalPredictions,
        input.investments,
        input.race
      );

      // 2. 適応的重み調整
      const adaptedWeights = this.calculateAdaptiveWeights(
        statisticalProfile,
        input.race
      );

      // 3. 予想の実行
      const predictions = this.generatePredictionsWithAdaptedWeights(
        input.horses,
        input.race,
        adaptedWeights
      );

      // 4. 確信度レベルの計算
      const confidenceLevel = this.calculateEnhancedConfidence(
        predictions,
        statisticalProfile,
        adaptedWeights
      );

      // 5. 期待的中率の計算
      const expectedHitRate = this.calculateExpectedHitRate(
        statisticalProfile,
        input.race,
        confidenceLevel
      );

      // 6. 推奨戦略の決定
      const recommendedStrategy = this.determineRecommendedStrategy(
        confidenceLevel,
        statisticalProfile,
        expectedHitRate
      );

      return {
        predictions,
        confidenceLevel,
        statisticalInsights: {
          currentStats: statisticalProfile,
          expectedHitRate,
          recommendedStrategy
        },
        adaptedWeights
      };
    } catch (error) {
      console.error('Adaptive prediction generation failed:', error);
      throw new Error(`適応型予想の生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  /**
   * 統計プロファイルの構築
   */
  private static async buildStatisticalProfile(
    historicalPredictions: PredictionResult[],
    investments: Investment[],
    currentRace: any
  ): Promise<StatisticalProfile> {
    const completedPredictions = historicalPredictions.filter(p => p.isResultEntered);
    
    if (completedPredictions.length === 0) {
      return this.getDefaultStatisticalProfile();
    }

    // 全体的中率計算
    const overallHitRate = this.calculateOverallHitRate(completedPredictions);

    // 的中パターン分析
    const hitPatterns = this.analyzeHitPatterns(completedPredictions);

    // トレンド分析
    const recentTrend = this.analyzeRecentTrend(completedPredictions);

    // 条件特化統計
    const conditionSpecificStats = this.analyzeConditionSpecificStats(
      completedPredictions,
      currentRace
    );

    // 最適重み計算
    const optimalWeights = await this.calculateOptimalWeights(
      completedPredictions,
      investments
    );

    return {
      overallHitRate,
      hitPatterns,
      recentTrend,
      conditionSpecificStats,
      optimalWeights
    };
  }

  /**
   * 適応的重み調整
   */
  private static calculateAdaptiveWeights(
    profile: StatisticalProfile,
    race: any
  ): AdaptivePredictionWeights {
    const baseWeights = profile.optimalWeights;
    const adaptionFactor = this.calculateAdaptionFactor(profile);

    // 条件別調整
    let speedAdjustment = 0;
    let recentAdjustment = 0;
    let oddsAdjustment = 0;

    // 距離による調整
    const distanceCategory = this.categorizeDistance(race.distance);
    const distanceKey = `distance_${distanceCategory}`;
    if (profile.conditionSpecificStats[distanceKey]) {
      const distancePerformance = profile.conditionSpecificStats[distanceKey];
      if (distancePerformance > profile.overallHitRate) {
        speedAdjustment += 5; // 距離適性が良い場合はスピード重視
      }
    }

    // 馬場による調整
    if (race.surface) {
      const surfaceKey = `surface_${race.surface}`;
      if (profile.conditionSpecificStats[surfaceKey]) {
        const surfacePerformance = profile.conditionSpecificStats[surfaceKey];
        if (surfacePerformance > profile.overallHitRate) {
          recentAdjustment += 3; // 馬場適性が良い場合は直近重視
        }
      }
    }

    // トレンドによる調整
    if (profile.recentTrend === 'improving') {
      recentAdjustment += 5;
      oddsAdjustment -= 3;
    } else if (profile.recentTrend === 'declining') {
      oddsAdjustment += 5; // 人気薄狙いに調整
      recentAdjustment -= 3;
    }

    return {
      speed: Math.max(20, Math.min(60, baseWeights.speed + speedAdjustment)),
      recent: Math.max(15, Math.min(45, baseWeights.recent + recentAdjustment)),
      odds: Math.max(15, Math.min(45, baseWeights.odds + oddsAdjustment)),
      adaptionFactor
    };
  }

  /**
   * 適応的重みを使った予想生成
   */
  private static generatePredictionsWithAdaptedWeights(
    horses: any[],
    race: any,
    weights: AdaptivePredictionWeights
  ): HorseAnalysis[] {
    const horsesWithScores = horses.map(horse => {
      const scores = calculateOptimizedHorseScore(horse, race, {
        speed: weights.speed,
        recent: weights.recent,
        odds: weights.odds
      });

      // 適応係数を適用
      const adaptedTotal = scores.total * (1 + weights.adaptionFactor * 0.1);

      return {
        horse: {
          name: horse.name,
          number: horse.number,
          jockey: horse.jockey,
          popularity: horse.popularity,
          odds: horse.odds
        },
        scores: {
          ...scores,
          total: Math.round(adaptedTotal * 10) / 10
        },
        speedIndex: scores.speed,
        recentForm: this.categorizeRecentForm(scores.recent),
        confidence: this.determineHorseConfidence(scores, weights.adaptionFactor),
        pastRaces: horse.pastRaces || []
      } as HorseAnalysis;
    });

    // 総合スコア順にソート
    return horsesWithScores.sort((a, b) => b.scores.total - a.scores.total);
  }

  /**
   * 拡張確信度計算
   */
  private static calculateEnhancedConfidence(
    predictions: HorseAnalysis[],
    profile: StatisticalProfile,
    weights: AdaptivePredictionWeights
  ): ConfidenceLevel {
    const baseConfidence = calculateConfidenceLevel(predictions, weights);
    
    // 統計プロファイルによる調整
    let overallAdjustment = 0;

    // 全体的中率による調整
    if (profile.overallHitRate > 0.3) overallAdjustment += 0.1;
    if (profile.overallHitRate > 0.5) overallAdjustment += 0.1;

    // トレンドによる調整
    if (profile.recentTrend === 'improving') overallAdjustment += 0.15;
    else if (profile.recentTrend === 'declining') overallAdjustment -= 0.1;

    // 適応係数による調整
    overallAdjustment += weights.adaptionFactor * 0.05;

    const baseScore = baseConfidence.score || 50; // デフォルト値を設定
    const adjustedScore = Math.min(100, Math.max(0, baseScore + overallAdjustment * 100));

    // スコア差による確信度
    const scores = predictions.map(p => p.scores.total);
    const topScore = scores[0] || 0;
    const secondScore = scores[1] || 0;
    const spread = topScore - secondScore;

    return {
      overall: adjustedScore >= 75 ? 'high' : adjustedScore >= 50 ? 'medium' : 'low',
      topPick: Math.min(100, topScore),
      spread: Math.round(spread * 10) / 10,
      dataQuality: this.assessDataQuality(profile)
    };
  }

  /**
   * 期待的中率計算
   */
  private static calculateExpectedHitRate(
    profile: StatisticalProfile,
    race: any,
    confidence: ConfidenceLevel
  ): number {
    let baseRate = profile.overallHitRate;

    // 条件調整
    const distanceKey = `distance_${this.categorizeDistance(race.distance)}`;
    const surfaceKey = `surface_${race.surface}`;

    if (profile.conditionSpecificStats[distanceKey]) {
      baseRate = (baseRate + profile.conditionSpecificStats[distanceKey]) / 2;
    }

    if (profile.conditionSpecificStats[surfaceKey]) {
      baseRate = (baseRate + profile.conditionSpecificStats[surfaceKey]) / 2;
    }

    // 確信度による調整
    const confidenceMultiplier = confidence.overall === 'high' ? 1.2 :
                                confidence.overall === 'medium' ? 1.0 : 0.8;

    // トレンドによる調整
    const trendMultiplier = profile.recentTrend === 'improving' ? 1.1 :
                           profile.recentTrend === 'declining' ? 0.9 : 1.0;

    return Math.min(0.8, Math.max(0.05, baseRate * confidenceMultiplier * trendMultiplier));
  }

  // ヘルパーメソッド群

  private static getDefaultStatisticalProfile(): StatisticalProfile {
    return {
      overallHitRate: 0.2,
      hitPatterns: {
        any1: { rate: 0.6, count: 0 },
        any2: { rate: 0.3, count: 0 },
        all3: { rate: 0.1, count: 0 }
      },
      recentTrend: 'stable',
      conditionSpecificStats: {},
      optimalWeights: {
        speed: 40,
        recent: 30,
        odds: 30,
        adaptionFactor: 0.5
      }
    };
  }

  private static calculateOverallHitRate(predictions: PredictionResult[]): number {
    const hits = predictions.filter(p => {
      if (!p.actualResults || p.predictions.length === 0) return false;
      const topPrediction = p.predictions[0];
      const result = p.actualResults.find(r => r.number === topPrediction.horse.number);
      return result?.rank === 1;
    }).length;

    return predictions.length > 0 ? hits / predictions.length : 0;
  }

  private static analyzeHitPatterns(predictions: PredictionResult[]) {
    let any1Count = 0;
    let any2Count = 0;
    let all3Count = 0;

    predictions.forEach(prediction => {
      if (!prediction.actualResults || prediction.predictions.length < 3) return;

      const top3Predictions = prediction.predictions.slice(0, 3);
      const hitCount = top3Predictions.filter(pred => {
        const result = prediction.actualResults!.find(r => r.number === pred.horse.number);
        return result && result.rank <= 3;
      }).length;

      if (hitCount >= 1) any1Count++;
      if (hitCount >= 2) any2Count++;
      if (hitCount === 3) all3Count++;
    });

    const total = predictions.length;
    return {
      any1: { rate: total > 0 ? any1Count / total : 0, count: any1Count },
      any2: { rate: total > 0 ? any2Count / total : 0, count: any2Count },
      all3: { rate: total > 0 ? all3Count / total : 0, count: all3Count }
    };
  }

  private static analyzeRecentTrend(predictions: PredictionResult[]): 'improving' | 'declining' | 'stable' {
    if (predictions.length < 6) return 'stable';

    const sortedPredictions = [...predictions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const recent = sortedPredictions.slice(0, Math.floor(predictions.length / 2));
    const older = sortedPredictions.slice(Math.floor(predictions.length / 2));

    const recentHitRate = this.calculateOverallHitRate(recent);
    const olderHitRate = this.calculateOverallHitRate(older);

    const difference = recentHitRate - olderHitRate;

    if (difference > 0.05) return 'improving';
    if (difference < -0.05) return 'declining';
    return 'stable';
  }

  private static analyzeConditionSpecificStats(
    predictions: PredictionResult[],
    currentRace: any
  ): { [key: string]: number } {
    const stats: { [key: string]: number } = {};

    // 距離別統計
    const distanceCategory = this.categorizeDistance(currentRace.distance);
    const distancePreds = predictions.filter(p => 
      this.categorizeDistance(p.race.distance) === distanceCategory
    );
    if (distancePreds.length > 0) {
      stats[`distance_${distanceCategory}`] = this.calculateOverallHitRate(distancePreds);
    }

    // 馬場別統計
    if (currentRace.surface) {
      const surfacePreds = predictions.filter(p => p.race.surface === currentRace.surface);
      if (surfacePreds.length > 0) {
        stats[`surface_${currentRace.surface}`] = this.calculateOverallHitRate(surfacePreds);
      }
    }

    return stats;
  }

  private static async calculateOptimalWeights(
    predictions: PredictionResult[],
    investments: Investment[]
  ): Promise<AdaptivePredictionWeights> {
    // 簡易的な最適重み計算
    // より高度な機械学習アルゴリズムで実装可能
    
    const enhancedStats = EnhancedStatisticsService.calculateEnhancedAccuracy(predictions, investments);
    
    // パフォーマンスに基づく重み調整
    let speedWeight = 40;
    let recentWeight = 30;
    let oddsWeight = 30;

    if (enhancedStats.returnRate > 120) {
      // 高収益の場合、現在の重みを維持
    } else if (enhancedStats.returnRate < 80) {
      // 低収益の場合、オッズ重視に調整
      oddsWeight += 10;
      speedWeight -= 5;
      recentWeight -= 5;
    }

    const adaptionFactor = Math.min(1.0, enhancedStats.completedPredictions / 20);

    return {
      speed: speedWeight,
      recent: recentWeight,
      odds: oddsWeight,
      adaptionFactor
    };
  }

  private static calculateAdaptionFactor(profile: StatisticalProfile): number {
    let factor = profile.optimalWeights.adaptionFactor;

    // 実績数による調整
    const totalPredictions = Object.values(profile.hitPatterns).reduce((sum, pattern) => sum + pattern.count, 0);
    if (totalPredictions < 10) factor *= 0.5;
    else if (totalPredictions > 50) factor = Math.min(1.0, factor * 1.2);

    // トレンドによる調整
    if (profile.recentTrend === 'improving') factor = Math.min(1.0, factor * 1.1);
    else if (profile.recentTrend === 'declining') factor *= 0.9;

    return Math.max(0.1, Math.min(1.0, factor));
  }

  private static categorizeDistance(distance: number): string {
    if (distance < 1400) return 'short';
    if (distance < 1800) return 'mile';
    if (distance < 2200) return 'intermediate';
    return 'long';
  }

  private static categorizeRecentForm(recentScore: number): string {
    if (recentScore >= 25) return 'excellent';
    if (recentScore >= 15) return 'good';
    if (recentScore >= 8) return 'fair';
    return 'poor';
  }

  private static determineHorseConfidence(scores: any, adaptionFactor: number): 'high' | 'medium' | 'low' {
    const adjustedTotal = scores.total * (1 + adaptionFactor * 0.1);
    
    if (adjustedTotal >= 70) return 'high';
    if (adjustedTotal >= 45) return 'medium';
    return 'low';
  }

  private static assessDataQuality(profile: StatisticalProfile): 'excellent' | 'good' | 'fair' | 'poor' {
    const totalCount = Object.values(profile.hitPatterns).reduce((sum, pattern) => sum + pattern.count, 0);
    const conditionVariety = Object.keys(profile.conditionSpecificStats).length;
    
    if (totalCount >= 50 && conditionVariety >= 4) return 'excellent';
    if (totalCount >= 20 && conditionVariety >= 2) return 'good';
    if (totalCount >= 10) return 'fair';
    return 'poor';
  }

  private static determineRecommendedStrategy(
    confidence: ConfidenceLevel,
    profile: StatisticalProfile,
    expectedHitRate: number
  ): 'conservative' | 'balanced' | 'aggressive' {
    const riskScore = confidence.overall === 'high' ? 3 : 
                     confidence.overall === 'medium' ? 2 : 1;
    
    const performanceScore = profile.overallHitRate >= 0.3 ? 2 : 
                            profile.overallHitRate >= 0.2 ? 1 : 0;
    
    const trendScore = profile.recentTrend === 'improving' ? 2 : 
                      profile.recentTrend === 'stable' ? 1 : 0;

    const totalScore = riskScore + performanceScore + trendScore;

    if (totalScore >= 6) return 'aggressive';
    if (totalScore >= 4) return 'balanced';
    return 'conservative';
  }
}

export const adaptivePredictionService = AdaptivePredictionService;