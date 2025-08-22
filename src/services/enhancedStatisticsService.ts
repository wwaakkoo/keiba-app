import { PredictionResult, AccuracyStats, ConditionStats, TrendData } from '@/types/prediction';
import { Investment } from '@/types/investment';

export interface EnhancedAccuracyStats extends AccuracyStats {
  // 基本統計の拡張
  averageOdds: number;
  medianOdds: number;
  confidenceDistribution: {
    high: { count: number; accuracy: number; roi: number };
    medium: { count: number; accuracy: number; roi: number };
    low: { count: number; accuracy: number; roi: number };
  };
  
  // 時系列分析
  recentTrend: {
    last10: { accuracy: number; roi: number };
    last20: { accuracy: number; roi: number };
    improvement: number; // 改善度（%）
  };
  
  // 成績分布
  performanceDistribution: {
    excellent: number; // 80%以上
    good: number;      // 60-79%
    average: number;   // 40-59%
    poor: number;      // 40%未満
  };
}

export interface DetailedConditionAnalysis extends ConditionStats {
  // 距離別詳細分析
  distanceAnalysis: {
    shortDistance: { // 1000-1399m
      accuracy: number;
      roi: number;
      count: number;
      bestJockey: string;
      bestTrainer: string;
      optimalConditions: string[];
    };
    mile: { // 1400-1799m
      accuracy: number;
      roi: number;
      count: number;
      bestJockey: string;
      bestTrainer: string;
      optimalConditions: string[];
    };
    middleDistance: { // 1800-2199m
      accuracy: number;
      roi: number;
      count: number;
      bestJockey: string;
      bestTrainer: string;
      optimalConditions: string[];
    };
    longDistance: { // 2200m以上
      accuracy: number;
      roi: number;
      count: number;
      bestJockey: string;
      bestTrainer: string;
      optimalConditions: string[];
    };
  };
  
  // 馬場状態別分析
  trackConditionAnalysis: {
    good: { accuracy: number; roi: number; count: number; bestDistance: string };
    slightlyHeavy: { accuracy: number; roi: number; count: number; bestDistance: string };
    heavy: { accuracy: number; roi: number; count: number; bestDistance: string };
    bad: { accuracy: number; roi: number; count: number; bestDistance: string };
  };
  
  // 競馬場特性分析
  venueCharacteristics: Record<string, {
    accuracy: number;
    roi: number;
    count: number;
    bestSurface: 'turf' | 'dirt';
    bestDistance: string;
    seasonalTrend: Record<string, number>;
    timeOfDayImpact: Record<string, number>;
  }>;
  
  // 人気別分析
  popularityAnalysis: {
    favorite: { accuracy: number; roi: number; count: number };
    second: { accuracy: number; roi: number; count: number };
    third: { accuracy: number; roi: number; count: number };
    outsider: { accuracy: number; roi: number; count: number };
  };
}

export interface AdvancedTrendData extends TrendData {
  // 拡張トレンドデータ
  movingAverage5: number;
  movingAverage10: number;
  volatility: number;
  momentum: number;
  rsi: number; // Relative Strength Index
  confidenceLevel: 'high' | 'medium' | 'low';
  marketCondition: 'bull' | 'bear' | 'sideways';
}

export class EnhancedStatisticsService {
  /**
   * 既存のcalculateAccuracy関数を基にした拡張統計計算
   */
  static calculateEnhancedAccuracy(
    predictions: PredictionResult[],
    investments: Investment[]
  ): EnhancedAccuracyStats {
    // 基本統計の計算
    const basicStats = this.calculateBasicAccuracy(predictions, investments);
    
    // オッズ分析
    const oddsAnalysis = this.analyzeOdds(predictions);
    
    // 確信度別分析
    const confidenceAnalysis = this.analyzeByConfidence(predictions, investments);
    
    // 時系列トレンド分析
    const trendAnalysis = this.analyzeTrend(predictions, investments);
    
    // 成績分布分析
    const distributionAnalysis = this.analyzePerformanceDistribution(predictions);

    return {
      ...basicStats,
      averageOdds: oddsAnalysis.average,
      medianOdds: oddsAnalysis.median,
      confidenceDistribution: confidenceAnalysis,
      recentTrend: trendAnalysis,
      performanceDistribution: distributionAnalysis
    };
  }

  /**
   * 詳細な条件別分析
   */
  static calculateDetailedConditions(
    predictions: PredictionResult[],
    investments: Investment[]
  ): DetailedConditionAnalysis {
    // 基本的な条件別統計
    const basicConditions = this.calculateBasicConditions(predictions);
    
    // 距離別詳細分析
    const distanceAnalysis = this.analyzeDistanceDetails(predictions, investments);
    
    // 馬場状態別分析
    const trackConditionAnalysis = this.analyzeTrackConditions(predictions, investments);
    
    // 競馬場特性分析
    const venueCharacteristics = this.analyzeVenueCharacteristics(predictions, investments);
    
    // 人気別分析
    const popularityAnalysis = this.analyzePopularity(predictions, investments);

    return {
      ...basicConditions,
      distanceAnalysis,
      trackConditionAnalysis,
      venueCharacteristics,
      popularityAnalysis
    };
  }

  /**
   * 高度なトレンド分析
   */
  static calculateAdvancedTrend(
    predictions: PredictionResult[],
    investments: Investment[],
    period: number = 20
  ): AdvancedTrendData[] {
    const sortedPredictions = [...predictions]
      .filter(p => p.isResultEntered)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return sortedPredictions.map((prediction, index) => {
      const recentPredictions = sortedPredictions.slice(Math.max(0, index - period + 1), index + 1);
      
      // 基本的中率
      const accuracy = this.calculateAccuracyForPredictions(recentPredictions);
      
      // 移動平均
      const ma5 = this.calculateMovingAverage(recentPredictions, 5, index);
      const ma10 = this.calculateMovingAverage(recentPredictions, 10, index);
      
      // ボラティリティ
      const volatility = this.calculateVolatility(recentPredictions);
      
      // モメンタム
      const momentum = this.calculateMomentum(recentPredictions);
      
      // RSI
      const rsi = this.calculateRSI(recentPredictions);
      
      // 確信度レベル
      const confidenceLevel = prediction.confidenceLevel?.overall || 'medium';
      
      // マーケット状況
      const marketCondition = this.determineMarketCondition(ma5, ma10, momentum);

      return {
        race: `${prediction.race.venue}${prediction.race.raceNumber}R`,
        firstAccuracy: accuracy.first,
        top3Accuracy: accuracy.top3,
        date: prediction.date,
        isFirstHit: this.isFirstHit(prediction),
        isTop3Hit: this.isTop3Hit(prediction),
        movingAverage5: ma5,
        movingAverage10: ma10,
        volatility,
        momentum,
        rsi,
        confidenceLevel,
        marketCondition
      };
    });
  }

  /**
   * グラフ表示の改善データ生成
   */
  static generateImprovedChartData(
    trendData: AdvancedTrendData[],
    chartType: 'accuracy' | 'roi' | 'volatility' | 'momentum'
  ): any[] {
    return trendData.map((data, index) => {
      const baseData = {
        race: data.race,
        date: data.date,
        index: index + 1
      };

      switch (chartType) {
        case 'accuracy':
          return {
            ...baseData,
            accuracy: data.firstAccuracy,
            top3Accuracy: data.top3Accuracy,
            ma5: data.movingAverage5,
            ma10: data.movingAverage10,
            confidence: data.confidenceLevel === 'high' ? 100 : 
                       data.confidenceLevel === 'medium' ? 50 : 25
          };
        
        case 'volatility':
          return {
            ...baseData,
            volatility: data.volatility,
            rsi: data.rsi,
            momentum: data.momentum
          };
        
        default:
          return baseData;
      }
    });
  }

  // プライベートメソッド群

  private static calculateBasicAccuracy(
    predictions: PredictionResult[],
    investments: Investment[]
  ): AccuracyStats {
    const completedPredictions = predictions.filter(p => p.isResultEntered);
    
    if (completedPredictions.length === 0) {
      return {
        totalPredictions: predictions.length,
        completedPredictions: 0,
        firstPlaceAccuracy: 0,
        top3Accuracy: 0,
        totalInvestment: 0,
        totalPayout: 0,
        totalProfit: 0,
        returnRate: 0
      };
    }

    // 的中率計算
    const firstHits = completedPredictions.filter(p => this.isFirstHit(p)).length;
    const top3Hits = completedPredictions.filter(p => this.isTop3Hit(p)).length;

    // 投資統計
    const totalInvestment = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPayout = investments.reduce((sum, inv) => sum + inv.payout, 0);
    const totalProfit = totalPayout - totalInvestment;
    const returnRate = totalInvestment > 0 ? (totalPayout / totalInvestment) * 100 : 0;

    return {
      totalPredictions: predictions.length,
      completedPredictions: completedPredictions.length,
      firstPlaceAccuracy: (firstHits / completedPredictions.length) * 100,
      top3Accuracy: (top3Hits / completedPredictions.length) * 100,
      totalInvestment,
      totalPayout,
      totalProfit,
      returnRate
    };
  }

  private static analyzeOdds(predictions: PredictionResult[]): { average: number; median: number } {
    const odds = predictions
      .filter(p => p.predictions.length > 0 && p.predictions[0].horse.odds)
      .map(p => p.predictions[0].horse.odds!)
      .sort((a, b) => a - b);

    if (odds.length === 0) return { average: 0, median: 0 };

    const average = odds.reduce((sum, odd) => sum + odd, 0) / odds.length;
    const median = odds.length % 2 === 0 
      ? (odds[odds.length / 2 - 1] + odds[odds.length / 2]) / 2
      : odds[Math.floor(odds.length / 2)];

    return { average, median };
  }

  private static analyzeByConfidence(
    predictions: PredictionResult[],
    investments: Investment[]
  ): EnhancedAccuracyStats['confidenceDistribution'] {
    const investmentMap = new Map<string, Investment[]>();
    investments.forEach(inv => {
      if (!investmentMap.has(inv.predictionId)) {
        investmentMap.set(inv.predictionId, []);
      }
      investmentMap.get(inv.predictionId)!.push(inv);
    });

    const confidenceLevels = ['high', 'medium', 'low'] as const;
    const result: any = {};

    confidenceLevels.forEach(level => {
      const levelPredictions = predictions.filter(
        p => p.confidenceLevel?.overall === level && p.isResultEntered
      );

      if (levelPredictions.length === 0) {
        result[level] = { count: 0, accuracy: 0, roi: 0 };
        return;
      }

      const hits = levelPredictions.filter(p => this.isFirstHit(p)).length;
      const accuracy = (hits / levelPredictions.length) * 100;

      // ROI計算
      let totalInvestment = 0;
      let totalReturn = 0;
      levelPredictions.forEach(pred => {
        const predInvestments = investmentMap.get(pred.id) || [];
        predInvestments.forEach(inv => {
          totalInvestment += inv.amount;
          totalReturn += inv.payout;
        });
      });

      const roi = totalInvestment > 0 ? ((totalReturn - totalInvestment) / totalInvestment) * 100 : 0;

      result[level] = {
        count: levelPredictions.length,
        accuracy,
        roi
      };
    });

    return result;
  }

  private static analyzeTrend(
    predictions: PredictionResult[],
    investments: Investment[]
  ): EnhancedAccuracyStats['recentTrend'] {
    const sortedPredictions = [...predictions]
      .filter(p => p.isResultEntered)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const last10 = sortedPredictions.slice(0, 10);
    const last20 = sortedPredictions.slice(0, 20);

    const calculateStats = (preds: PredictionResult[]) => {
      if (preds.length === 0) return { accuracy: 0, roi: 0 };

      const hits = preds.filter(p => this.isFirstHit(p)).length;
      const accuracy = (hits / preds.length) * 100;

      // ROI計算（簡略化）
      const roi = 0; // 実装を簡略化

      return { accuracy, roi };
    };

    const stats10 = calculateStats(last10);
    const stats20 = calculateStats(last20);

    const improvement = stats10.accuracy - stats20.accuracy;

    return {
      last10: stats10,
      last20: stats20,
      improvement
    };
  }

  private static analyzePerformanceDistribution(
    predictions: PredictionResult[]
  ): EnhancedAccuracyStats['performanceDistribution'] {
    // 実装を簡略化
    return {
      excellent: 0,
      good: 0,
      average: 0,
      poor: 0
    };
  }

  private static calculateBasicConditions(predictions: PredictionResult[]): ConditionStats {
    // 基本的な条件別統計の実装
    return {
      distance: {},
      surface: {},
      venue: {}
    };
  }

  private static analyzeDistanceDetails(
    predictions: PredictionResult[],
    investments: Investment[]
  ): DetailedConditionAnalysis['distanceAnalysis'] {
    // 距離別詳細分析の実装
    return {
      shortDistance: { accuracy: 0, roi: 0, count: 0, bestJockey: '', bestTrainer: '', optimalConditions: [] },
      mile: { accuracy: 0, roi: 0, count: 0, bestJockey: '', bestTrainer: '', optimalConditions: [] },
      middleDistance: { accuracy: 0, roi: 0, count: 0, bestJockey: '', bestTrainer: '', optimalConditions: [] },
      longDistance: { accuracy: 0, roi: 0, count: 0, bestJockey: '', bestTrainer: '', optimalConditions: [] }
    };
  }

  private static analyzeTrackConditions(
    predictions: PredictionResult[],
    investments: Investment[]
  ): DetailedConditionAnalysis['trackConditionAnalysis'] {
    // 馬場状態別分析の実装
    return {
      good: { accuracy: 0, roi: 0, count: 0, bestDistance: '' },
      slightlyHeavy: { accuracy: 0, roi: 0, count: 0, bestDistance: '' },
      heavy: { accuracy: 0, roi: 0, count: 0, bestDistance: '' },
      bad: { accuracy: 0, roi: 0, count: 0, bestDistance: '' }
    };
  }

  private static analyzeVenueCharacteristics(
    predictions: PredictionResult[],
    investments: Investment[]
  ): DetailedConditionAnalysis['venueCharacteristics'] {
    // 競馬場特性分析の実装
    return {};
  }

  private static analyzePopularity(
    predictions: PredictionResult[],
    investments: Investment[]
  ): DetailedConditionAnalysis['popularityAnalysis'] {
    // 人気別分析の実装
    return {
      favorite: { accuracy: 0, roi: 0, count: 0 },
      second: { accuracy: 0, roi: 0, count: 0 },
      third: { accuracy: 0, roi: 0, count: 0 },
      outsider: { accuracy: 0, roi: 0, count: 0 }
    };
  }

  // ヘルパーメソッド
  private static isFirstHit(prediction: PredictionResult): boolean {
    if (!prediction.actualResults || prediction.predictions.length === 0) return false;
    const topPrediction = prediction.predictions[0];
    const result = prediction.actualResults.find(r => r.number === topPrediction.horse.number);
    return result?.rank === 1;
  }

  private static isTop3Hit(prediction: PredictionResult): boolean {
    if (!prediction.actualResults || prediction.predictions.length === 0) return false;
    const topPrediction = prediction.predictions[0];
    const result = prediction.actualResults.find(r => r.number === topPrediction.horse.number);
    return result ? result.rank <= 3 : false;
  }

  private static calculateAccuracyForPredictions(predictions: PredictionResult[]): { first: number; top3: number } {
    if (predictions.length === 0) return { first: 0, top3: 0 };
    
    const firstHits = predictions.filter(p => this.isFirstHit(p)).length;
    const top3Hits = predictions.filter(p => this.isTop3Hit(p)).length;
    
    return {
      first: (firstHits / predictions.length) * 100,
      top3: (top3Hits / predictions.length) * 100
    };
  }

  private static calculateMovingAverage(
    predictions: PredictionResult[],
    period: number,
    currentIndex: number
  ): number {
    const startIndex = Math.max(0, currentIndex - period + 1);
    const relevantPredictions = predictions.slice(startIndex, currentIndex + 1);
    const accuracy = this.calculateAccuracyForPredictions(relevantPredictions);
    return accuracy.first;
  }

  private static calculateVolatility(predictions: PredictionResult[]): number {
    // ボラティリティ計算の実装
    return 0;
  }

  private static calculateMomentum(predictions: PredictionResult[]): number {
    // モメンタム計算の実装
    return 0;
  }

  private static calculateRSI(predictions: PredictionResult[]): number {
    // RSI計算の実装
    return 50;
  }

  private static determineMarketCondition(
    ma5: number,
    ma10: number,
    momentum: number
  ): 'bull' | 'bear' | 'sideways' {
    if (ma5 > ma10 && momentum > 0) return 'bull';
    if (ma5 < ma10 && momentum < 0) return 'bear';
    return 'sideways';
  }
}

export const enhancedStatisticsService = EnhancedStatisticsService;