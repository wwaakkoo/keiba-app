import { PredictionResult } from '@/types/prediction';
import { Investment } from '@/types/investment';

export interface DetailedConditionStats {
  distance: Record<string, {
    total: number;
    firstAccuracy: number;
    top3Accuracy: number;
    averageOdds: number;
    roi: number;
    bestTimeRange: string;
    worstTimeRange: string;
    monthlyTrend: Array<{
      month: string;
      accuracy: number;
      count: number;
    }>;
  }>;
  surface: Record<string, {
    total: number;
    firstAccuracy: number;
    top3Accuracy: number;
    roi: number;
    bestDistance: string;
    worstDistance: string;
    weatherImpact: Record<string, {
      accuracy: number;
      count: number;
    }>;
  }>;
  venue: Record<string, {
    total: number;
    firstAccuracy: number;
    top3Accuracy: number;
    roi: number;
    bestSurface: string;
    bestDistance: string;
    seasonalTrend: Record<string, {
      accuracy: number;
      count: number;
    }>;
  }>;
  grade: Record<string, {
    total: number;
    firstAccuracy: number;
    top3Accuracy: number;
    roi: number;
    averageField: number;
    competitionLevel: 'high' | 'medium' | 'low';
  }>;
  weather: Record<string, {
    total: number;
    firstAccuracy: number;
    top3Accuracy: number;
    roi: number;
    bestSurface: string;
  }>;
}

export interface TrendAnalysis {
  accuracyTrend: {
    direction: 'improving' | 'declining' | 'stable';
    slope: number;
    confidence: number;
    recentPeriodAccuracy: number;
    previousPeriodAccuracy: number;
  };
  roiTrend: {
    direction: 'improving' | 'declining' | 'stable';
    slope: number;
    confidence: number;
    recentPeriodROI: number;
    previousPeriodROI: number;
  };
  streakAnalysis: {
    currentStreak: {
      type: 'winning' | 'losing';
      count: number;
      startDate: string;
    };
    longestWinStreak: {
      count: number;
      startDate: string;
      endDate: string;
    };
    longestLoseStreak: {
      count: number;
      startDate: string;
      endDate: string;
    };
  };
  seasonalPatterns: Record<string, {
    accuracy: number;
    roi: number;
    count: number;
    bestConditions: string[];
  }>;
}

export class DetailedAnalysisService {
  /**
   * 詳細な条件別統計を計算
   */
  static calculateDetailedConditionStats(
    predictions: PredictionResult[],
    investments: Investment[]
  ): DetailedConditionStats {
    const investmentMap = new Map<string, Investment[]>();
    investments.forEach(inv => {
      if (!investmentMap.has(inv.predictionId)) {
        investmentMap.set(inv.predictionId, []);
      }
      investmentMap.get(inv.predictionId)!.push(inv);
    });

    // 距離別詳細分析
    const distanceStats = this.analyzeByDistance(predictions, investmentMap);
    
    // 馬場別詳細分析
    const surfaceStats = this.analyzeBySurface(predictions, investmentMap);
    
    // 競馬場別詳細分析
    const venueStats = this.analyzeByVenue(predictions, investmentMap);
    
    // グレード別分析
    const gradeStats = this.analyzeByGrade(predictions, investmentMap);
    
    // 天候別分析
    const weatherStats = this.analyzeByWeather(predictions, investmentMap);

    return {
      distance: distanceStats,
      surface: surfaceStats,
      venue: venueStats,
      grade: gradeStats,
      weather: weatherStats
    };
  }

  /**
   * トレンド分析を実行
   */
  static analyzeTrends(
    predictions: PredictionResult[],
    investments: Investment[]
  ): TrendAnalysis {
    // 時系列順にソート
    const sortedPredictions = [...predictions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // 的中率トレンド分析
    const accuracyTrend = this.calculateAccuracyTrend(sortedPredictions);
    
    // ROIトレンド分析
    const roiTrend = this.calculateROITrend(sortedPredictions, investments);
    
    // 連勝・連敗分析
    const streakAnalysis = this.analyzeStreaks(sortedPredictions);
    
    // 季節パターン分析
    const seasonalPatterns = this.analyzeSeasonalPatterns(sortedPredictions, investments);

    return {
      accuracyTrend,
      roiTrend,
      streakAnalysis,
      seasonalPatterns
    };
  }

  /**
   * 距離別詳細分析
   */
  private static analyzeByDistance(
    predictions: PredictionResult[],
    investmentMap: Map<string, Investment[]>
  ): Record<string, any> {
    const distanceGroups = this.groupByDistance(predictions);
    const result: Record<string, any> = {};

    Object.entries(distanceGroups).forEach(([distance, preds]) => {
      const stats = this.calculateBasicStats(preds);
      const roi = this.calculateROI(preds, investmentMap);
      const timeAnalysis = this.analyzeTimeImpact(preds);
      const monthlyTrend = this.calculateMonthlyTrend(preds);

      result[distance] = {
        ...stats,
        roi,
        bestTimeRange: timeAnalysis.best,
        worstTimeRange: timeAnalysis.worst,
        monthlyTrend
      };
    });

    return result;
  }

  /**
   * 馬場別詳細分析
   */
  private static analyzeBySurface(
    predictions: PredictionResult[],
    investmentMap: Map<string, Investment[]>
  ): Record<string, any> {
    const surfaceGroups = predictions.reduce((acc, pred) => {
      const surface = pred.race.surface;
      if (!acc[surface]) acc[surface] = [];
      acc[surface].push(pred);
      return acc;
    }, {} as Record<string, PredictionResult[]>);

    const result: Record<string, any> = {};

    Object.entries(surfaceGroups).forEach(([surface, preds]) => {
      const stats = this.calculateBasicStats(preds);
      const roi = this.calculateROI(preds, investmentMap);
      const distanceAnalysis = this.analyzeDistanceImpact(preds);
      const weatherImpact = this.analyzeWeatherImpact(preds);

      result[surface] = {
        ...stats,
        roi,
        bestDistance: distanceAnalysis.best,
        worstDistance: distanceAnalysis.worst,
        weatherImpact
      };
    });

    return result;
  }

  /**
   * 競馬場別詳細分析
   */
  private static analyzeByVenue(
    predictions: PredictionResult[],
    investmentMap: Map<string, Investment[]>
  ): Record<string, any> {
    const venueGroups = predictions.reduce((acc, pred) => {
      const venue = pred.race.venue;
      if (!acc[venue]) acc[venue] = [];
      acc[venue].push(pred);
      return acc;
    }, {} as Record<string, PredictionResult[]>);

    const result: Record<string, any> = {};

    Object.entries(venueGroups).forEach(([venue, preds]) => {
      const stats = this.calculateBasicStats(preds);
      const roi = this.calculateROI(preds, investmentMap);
      const surfaceAnalysis = this.analyzeSurfaceImpact(preds);
      const distanceAnalysis = this.analyzeDistanceImpact(preds);
      const seasonalTrend = this.analyzeSeasonalTrend(preds);

      result[venue] = {
        ...stats,
        roi,
        bestSurface: surfaceAnalysis.best,
        bestDistance: distanceAnalysis.best,
        seasonalTrend
      };
    });

    return result;
  }

  /**
   * グレード別分析
   */
  private static analyzeByGrade(
    predictions: PredictionResult[],
    investmentMap: Map<string, Investment[]>
  ): Record<string, any> {
    // グレード情報が利用可能な場合の実装
    // 現在のデータ構造にはグレード情報がないため、基本的な実装のみ
    return {};
  }

  /**
   * 天候別分析
   */
  private static analyzeByWeather(
    predictions: PredictionResult[],
    investmentMap: Map<string, Investment[]>
  ): Record<string, any> {
    // 天候情報が利用可能な場合の実装
    // 現在のデータ構造には天候情報がないため、基本的な実装のみ
    return {};
  }

  /**
   * 距離でグループ化
   */
  private static groupByDistance(predictions: PredictionResult[]): Record<string, PredictionResult[]> {
    return predictions.reduce((acc, pred) => {
      const distance = pred.race.distance;
      let range: string;

      if (distance < 1400) range = '短距離 (1000-1399m)';
      else if (distance < 1800) range = 'マイル (1400-1799m)';
      else if (distance < 2200) range = '中距離 (1800-2199m)';
      else if (distance < 2800) range = '長距離 (2200-2799m)';
      else range = '超長距離 (2800m以上)';

      if (!acc[range]) acc[range] = [];
      acc[range].push(pred);
      return acc;
    }, {} as Record<string, PredictionResult[]>);
  }

  /**
   * 基本統計を計算
   */
  private static calculateBasicStats(predictions: PredictionResult[]): {
    total: number;
    firstAccuracy: number;
    top3Accuracy: number;
    averageOdds: number;
  } {
    const total = predictions.length;
    const completedPredictions = predictions.filter(p => p.isResultEntered);
    
    if (completedPredictions.length === 0) {
      return { total, firstAccuracy: 0, top3Accuracy: 0, averageOdds: 0 };
    }

    let firstHits = 0;
    let top3Hits = 0;
    let totalOdds = 0;
    let oddsCount = 0;

    completedPredictions.forEach(pred => {
      if (pred.actualResults && pred.predictions.length > 0) {
        const topPrediction = pred.predictions[0];
        const actualResult = pred.actualResults.find(r => r.number === topPrediction.horse.number);
        
        if (actualResult) {
          if (actualResult.rank === 1) firstHits++;
          if (actualResult.rank <= 3) top3Hits++;
        }

        if (topPrediction.horse.odds) {
          totalOdds += topPrediction.horse.odds;
          oddsCount++;
        }
      }
    });

    return {
      total,
      firstAccuracy: (firstHits / completedPredictions.length) * 100,
      top3Accuracy: (top3Hits / completedPredictions.length) * 100,
      averageOdds: oddsCount > 0 ? totalOdds / oddsCount : 0
    };
  }

  /**
   * ROIを計算
   */
  private static calculateROI(
    predictions: PredictionResult[],
    investmentMap: Map<string, Investment[]>
  ): number {
    let totalInvestment = 0;
    let totalReturn = 0;

    predictions.forEach(pred => {
      const investments = investmentMap.get(pred.id) || [];
      investments.forEach(inv => {
        totalInvestment += inv.amount;
        totalReturn += inv.payout;
      });
    });

    return totalInvestment > 0 ? ((totalReturn - totalInvestment) / totalInvestment) * 100 : 0;
  }

  /**
   * 的中率トレンドを計算
   */
  private static calculateAccuracyTrend(predictions: PredictionResult[]): any {
    if (predictions.length < 10) {
      return {
        direction: 'stable' as const,
        slope: 0,
        confidence: 0,
        recentPeriodAccuracy: 0,
        previousPeriodAccuracy: 0
      };
    }

    const midPoint = Math.floor(predictions.length / 2);
    const recentPredictions = predictions.slice(midPoint);
    const previousPredictions = predictions.slice(0, midPoint);

    const recentStats = this.calculateBasicStats(recentPredictions);
    const previousStats = this.calculateBasicStats(previousPredictions);

    const slope = recentStats.firstAccuracy - previousStats.firstAccuracy;
    const direction = slope > 5 ? 'improving' : slope < -5 ? 'declining' : 'stable';

    return {
      direction,
      slope,
      confidence: Math.min(predictions.length / 50, 1), // 50回以上で信頼度100%
      recentPeriodAccuracy: recentStats.firstAccuracy,
      previousPeriodAccuracy: previousStats.firstAccuracy
    };
  }

  /**
   * ROIトレンドを計算
   */
  private static calculateROITrend(
    predictions: PredictionResult[],
    investments: Investment[]
  ): any {
    // ROIトレンド計算の実装
    return {
      direction: 'stable' as const,
      slope: 0,
      confidence: 0,
      recentPeriodROI: 0,
      previousPeriodROI: 0
    };
  }

  /**
   * 連勝・連敗分析
   */
  private static analyzeStreaks(predictions: PredictionResult[]): any {
    // 連勝・連敗分析の実装
    return {
      currentStreak: { type: 'winning' as const, count: 0, startDate: '' },
      longestWinStreak: { count: 0, startDate: '', endDate: '' },
      longestLoseStreak: { count: 0, startDate: '', endDate: '' }
    };
  }

  /**
   * 季節パターン分析
   */
  private static analyzeSeasonalPatterns(
    predictions: PredictionResult[],
    investments: Investment[]
  ): Record<string, any> {
    // 季節パターン分析の実装
    return {};
  }

  // その他のヘルパーメソッド
  private static analyzeTimeImpact(predictions: PredictionResult[]): { best: string; worst: string } {
    return { best: '14-15時', worst: '10-11時' };
  }

  private static calculateMonthlyTrend(predictions: PredictionResult[]): Array<{ month: string; accuracy: number; count: number }> {
    return [];
  }

  private static analyzeDistanceImpact(predictions: PredictionResult[]): { best: string; worst: string } {
    return { best: '1600m', worst: '3000m' };
  }

  private static analyzeWeatherImpact(predictions: PredictionResult[]): Record<string, { accuracy: number; count: number }> {
    return {};
  }

  private static analyzeSurfaceImpact(predictions: PredictionResult[]): { best: string } {
    return { best: 'turf' };
  }

  private static analyzeSeasonalTrend(predictions: PredictionResult[]): Record<string, { accuracy: number; count: number }> {
    return {};
  }
}

export const detailedAnalysisService = DetailedAnalysisService;