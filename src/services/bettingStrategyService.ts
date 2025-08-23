import { PredictionResult, HorseData } from '@/types/prediction';

export interface BettingStrategy {
  name: string;
  description: string;
  expectedReturn: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: BettingRecommendation[];
}

export interface BettingRecommendation {
  betType: string;
  horses: number[];
  amount: number;
  expectedOdds: number;
  confidence: number;
}

export class BettingStrategyService {
  /**
   * 現在の統計データを活かした動的投資戦略を提案
   */
  static generateStrategies(
    prediction: PredictionResult,
    availableOdds: { [key: string]: number },
    currentStats?: {
      hitPatterns: any;
      confidenceLevel: 'high' | 'medium' | 'low';
      expectedHitRate: number;
      recentTrend: 'improving' | 'declining' | 'stable';
    }
  ): BettingStrategy[] {
    const strategies: BettingStrategy[] = [];
    const top3Horses = prediction.rankings.slice(0, 3);
    
    // 統計データがない場合はデフォルト値を使用
    const stats = currentStats || {
      hitPatterns: { any1: { rate: 0.7 }, any2: { rate: 0.4 }, all3: { rate: 0.15 } },
      confidenceLevel: 'medium' as const,
      expectedHitRate: 0.7,
      recentTrend: 'stable' as const
    };

    // 統計データに基づいて戦略を動的に選択
    if (stats.confidenceLevel === 'high' && stats.hitPatterns.any1.rate > 0.75) {
      strategies.push(this.createWideStrategy(top3Horses, availableOdds, stats));
      strategies.push(this.createUmarenAxisStrategy(top3Horses, availableOdds, stats));
      
      if (stats.hitPatterns.all3.rate > 0.2) {
        strategies.push(this.createConditionalHighPayoutStrategy(prediction, availableOdds, stats));
      }
    } else if (stats.confidenceLevel === 'medium') {
      strategies.push(this.createFukushoInsuranceStrategy(top3Horses, availableOdds, stats));
      strategies.push(this.createWideStrategy(top3Horses, availableOdds, stats));
      
      if (stats.hitPatterns.any2.rate > 0.4) {
        strategies.push(this.createUmarenAxisStrategy(top3Horses, availableOdds, stats));
      }
    } else {
      // 低信頼度の場合は保守的戦略のみ
      strategies.push(this.createFukushoInsuranceStrategy(top3Horses, availableOdds, stats));
      
      if (stats.hitPatterns.any1.rate > 0.6) {
        strategies.push(this.createWideStrategy(top3Horses, availableOdds, stats));
      }
    }

    return strategies.filter(strategy => strategy.recommendations.length > 0);
  }

  /**
   * ワイド3通り購入戦略（最も安定）
   */
  private static createWideStrategy(
    horses: HorseData[],
    odds: { [key: string]: number }
  ): BettingStrategy {
    const combinations = [
      [horses[0].number, horses[1].number],
      [horses[0].number, horses[2].number],
      [horses[1].number, horses[2].number]
    ];

    const recommendations: BettingRecommendation[] = combinations.map(combo => ({
      betType: 'ワイド',
      horses: combo,
      amount: 1000, // 均等投資
      expectedOdds: this.getWideOdds(combo, odds),
      confidence: 0.8 // 80%の的中率から
    }));

    return {
      name: 'ワイド総当たり戦略',
      description: '予想上位3頭のワイド3通りを均等購入。安定した収益を目指す。',
      expectedReturn: this.calculateExpectedReturn(recommendations, 0.8),
      riskLevel: 'low',
      recommendations
    };
  }

  /**
   * 複勝保険戦略
   */
  private static createFukushoInsuranceStrategy(
    horses: HorseData[],
    odds: { [key: string]: number }
  ): BettingStrategy {
    // 1位馬に重点投資、2-3位馬で保険
    const recommendations: BettingRecommendation[] = [
      {
        betType: '複勝',
        horses: [horses[0].number],
        amount: 2000,
        expectedOdds: this.getFukushoOdds(horses[0].number, odds),
        confidence: 0.6 // 1位的中率
      },
      {
        betType: '複勝',
        horses: [horses[1].number],
        amount: 1000,
        expectedOdds: this.getFukushoOdds(horses[1].number, odds),
        confidence: 0.4
      },
      {
        betType: '複勝',
        horses: [horses[2].number],
        amount: 1000,
        expectedOdds: this.getFukushoOdds(horses[2].number, odds),
        confidence: 0.4
      }
    ];

    return {
      name: '複勝保険戦略',
      description: '1位予想馬に重点投資し、2-3位馬で保険をかける。',
      expectedReturn: this.calculateExpectedReturn(recommendations, 0.8),
      riskLevel: 'low',
      recommendations
    };
  }

  /**
   * 馬連軸流し戦略
   */
  private static createUmarenAxisStrategy(
    horses: HorseData[],
    odds: { [key: string]: number }
  ): BettingStrategy {
    const recommendations: BettingRecommendation[] = [
      {
        betType: '馬連',
        horses: [horses[0].number, horses[1].number],
        amount: 1500,
        expectedOdds: this.getUmarenOdds([horses[0].number, horses[1].number], odds),
        confidence: 0.35 // 1-2位的中の確率
      },
      {
        betType: '馬連',
        horses: [horses[0].number, horses[2].number],
        amount: 1500,
        expectedOdds: this.getUmarenOdds([horses[0].number, horses[2].number], odds),
        confidence: 0.3
      }
    ];

    return {
      name: '馬連軸流し戦略',
      description: '1位予想馬を軸に2-3位馬との馬連。中配当を狙う。',
      expectedReturn: this.calculateExpectedReturn(recommendations, 0.65),
      riskLevel: 'medium',
      recommendations
    };
  }

  /**
   * 条件付き高配当狙い戦略
   */
  private static createConditionalHighPayoutStrategy(
    prediction: PredictionResult,
    odds: { [key: string]: number }
  ): BettingStrategy {
    const horses = prediction.rankings.slice(0, 3);
    
    // 条件：予想1位馬の信頼度が高く、かつオッズが美味しい場合のみ
    const shouldBet = horses[0].confidence > 0.7 && 
                     this.getFukushoOdds(horses[0].number, odds) > 2.0;

    const recommendations: BettingRecommendation[] = shouldBet ? [
      {
        betType: '馬単',
        horses: [horses[0].number, horses[1].number],
        amount: 2000,
        expectedOdds: this.getUmatanOdds([horses[0].number, horses[1].number], odds),
        confidence: 0.25
      },
      {
        betType: '3連複',
        horses: [horses[0].number, horses[1].number, horses[2].number],
        amount: 1000,
        expectedOdds: this.getSanrenpukuOdds(horses.map(h => h.number), odds),
        confidence: 0.15
      }
    ] : [];

    return {
      name: '条件付き高配当戦略',
      description: '予想精度が高い時のみ高配当馬券にチャレンジ。',
      expectedReturn: shouldBet ? this.calculateExpectedReturn(recommendations, 0.4) : 0,
      riskLevel: 'high',
      recommendations
    };
  }

  /**
   * 期待収益率計算
   */
  private static calculateExpectedReturn(
    recommendations: BettingRecommendation[],
    hitRate: number
  ): number {
    const totalInvestment = recommendations.reduce((sum, rec) => sum + rec.amount, 0);
    const expectedReturn = recommendations.reduce((sum, rec) => 
      sum + (rec.amount * rec.expectedOdds * rec.confidence), 0
    );
    
    return (expectedReturn - totalInvestment) / totalInvestment;
  }

  // オッズ取得メソッド（実装は簡略化）
  private static getWideOdds(horses: number[], odds: { [key: string]: number }): number {
    return odds[`wide_${horses[0]}_${horses[1]}`] || 1.5;
  }

  private static getFukushoOdds(horse: number, odds: { [key: string]: number }): number {
    return odds[`fukusho_${horse}`] || 1.8;
  }

  private static getUmarenOdds(horses: number[], odds: { [key: string]: number }): number {
    return odds[`umaren_${horses[0]}_${horses[1]}`] || 8.0;
  }

  private static getUmatanOdds(horses: number[], odds: { [key: string]: number }): number {
    return odds[`umatan_${horses[0]}_${horses[1]}`] || 15.0;
  }

  private static getSanrenpukuOdds(horses: number[], odds: { [key: string]: number }): number {
    return odds[`sanrenpuku_${horses.join('_')}`] || 25.0;
  }
}