import { PredictionResult } from '@/types/prediction';
import { Investment } from '@/types/investment';
import { PerformanceMetrics } from './investmentPerformanceService';

export interface ROIAnalysis {
  overall: {
    roi: number;
    totalInvestment: number;
    totalReturn: number;
    totalProfit: number;
    winRate: number;
    averageReturn: number;
  };
  byBetType: Record<string, {
    roi: number;
    count: number;
    totalInvestment: number;
    totalReturn: number;
    winRate: number;
  }>;
  byConfidence: Record<string, {
    roi: number;
    count: number;
    totalInvestment: number;
    totalReturn: number;
    winRate: number;
  }>;
  byOddsRange: Record<string, {
    roi: number;
    count: number;
    totalInvestment: number;
    totalReturn: number;
    winRate: number;
  }>;
}

export interface HitPattern {
  favoritePerformance: {
    rank1: { hitRate: number; count: number; roi: number };
    rank2: { hitRate: number; count: number; roi: number };
    rank3: { hitRate: number; count: number; roi: number };
    outsider: { hitRate: number; count: number; roi: number };
  };
  distancePerformance: Record<string, {
    hitRate: number;
    count: number;
    roi: number;
    bestOddsRange: string;
  }>;
  surfacePerformance: {
    turf: { hitRate: number; count: number; roi: number };
    dirt: { hitRate: number; count: number; roi: number };
  };
  venuePerformance: Record<string, {
    hitRate: number;
    count: number;
    roi: number;
    bestDistance: string;
  }>;
  timePatterns: {
    hourly: Record<string, { hitRate: number; count: number; roi: number }>;
    dayOfWeek: Record<string, { hitRate: number; count: number; roi: number }>;
    monthly: Record<string, { hitRate: number; count: number; roi: number }>;
  };
}

export interface ImprovementSuggestion {
  category: 'betting' | 'prediction' | 'risk' | 'timing';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: string;
  actionItems: string[];
  metrics: {
    current: number;
    target: number;
    unit: string;
  };
}

export class PerformanceAnalysisService {
  /**
   * ROI分析を実行
   */
  static analyzeROI(predictions: PredictionResult[], investments: Investment[]): ROIAnalysis {
    const investmentMap = new Map<string, Investment[]>();
    
    // 予想IDごとに投資をグループ化
    investments.forEach(inv => {
      if (!investmentMap.has(inv.predictionId)) {
        investmentMap.set(inv.predictionId, []);
      }
      investmentMap.get(inv.predictionId)!.push(inv);
    });

    // 全体のROI計算
    const totalInvestment = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalReturn = investments.reduce((sum, inv) => sum + inv.payout, 0);
    const totalProfit = totalReturn - totalInvestment;
    const winCount = investments.filter(inv => inv.profit > 0).length;
    const winRate = investments.length > 0 ? (winCount / investments.length) * 100 : 0;
    const averageReturn = investments.length > 0 ? totalReturn / investments.length : 0;

    const overall = {
      roi: totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0,
      totalInvestment,
      totalReturn,
      totalProfit,
      winRate,
      averageReturn
    };

    // 券種別ROI
    const byBetType = this.calculateROIByCategory(investments, 'betType');

    // 確信度別ROI
    const byConfidence = this.calculateROIByPredictionConfidence(predictions, investments);

    // オッズ範囲別ROI
    const byOddsRange = this.calculateROIByOddsRange(investments);

    return {
      overall,
      byBetType,
      byConfidence,
      byOddsRange
    };
  }

  /**
   * 的中パターン分析を実行
   */
  static analyzeHitPatterns(predictions: PredictionResult[], investments: Investment[]): HitPattern {
    // 人気別パフォーマンス
    const favoritePerformance = this.analyzeFavoritePerformance(predictions, investments);

    // 距離別パフォーマンス
    const distancePerformance = this.analyzeDistancePerformance(predictions, investments);

    // 馬場別パフォーマンス
    const surfacePerformance = this.analyzeSurfacePerformance(predictions, investments);

    // 競馬場別パフォーマンス
    const venuePerformance = this.analyzeVenuePerformance(predictions, investments);

    // 時間パターン分析
    const timePatterns = this.analyzeTimePatterns(predictions, investments);

    return {
      favoritePerformance,
      distancePerformance,
      surfacePerformance,
      venuePerformance,
      timePatterns
    };
  }

  /**
   * 改善提案を生成
   */
  static generateImprovementSuggestions(
    roiAnalysis: ROIAnalysis,
    hitPatterns: HitPattern,
    performanceMetrics: PerformanceMetrics
  ): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];

    // ROIベースの提案
    if (roiAnalysis.overall.roi < 0) {
      suggestions.push({
        category: 'betting',
        priority: 'high',
        title: '投資戦略の見直し',
        description: '現在の投資戦略では損失が発生しています。より慎重な投資判断が必要です。',
        expectedImpact: 'ROIを10-15%改善',
        actionItems: [
          '確信度の高い予想のみに投資を限定',
          '投資額を段階的に調整',
          '損切りルールの設定'
        ],
        metrics: {
          current: roiAnalysis.overall.roi,
          target: 5,
          unit: '%'
        }
      });
    }

    // 的中率ベースの提案
    if (roiAnalysis.overall.winRate < 30) {
      suggestions.push({
        category: 'prediction',
        priority: 'high',
        title: '予想精度の向上',
        description: '的中率が低いため、予想アルゴリズムの調整が必要です。',
        expectedImpact: '的中率を5-10%向上',
        actionItems: [
          '重み設定の最適化',
          'データ品質の向上',
          '過去成績の詳細分析'
        ],
        metrics: {
          current: roiAnalysis.overall.winRate,
          target: 35,
          unit: '%'
        }
      });
    }

    // リスク管理の提案
    if (performanceMetrics.maxDrawdown > 20) {
      suggestions.push({
        category: 'risk',
        priority: 'high',
        title: 'リスク管理の強化',
        description: '最大ドローダウンが大きすぎます。リスク管理を強化する必要があります。',
        expectedImpact: 'ドローダウンを10%以下に抑制',
        actionItems: [
          '投資上限の設定',
          '分散投資の実施',
          'ストップロスの導入'
        ],
        metrics: {
          current: performanceMetrics.maxDrawdown,
          target: 10,
          unit: '%'
        }
      });
    }

    // 券種別の提案
    const bestBetType = Object.entries(roiAnalysis.byBetType)
      .sort(([,a], [,b]) => b.roi - a.roi)[0];
    
    if (bestBetType && bestBetType[1].roi > roiAnalysis.overall.roi + 5) {
      suggestions.push({
        category: 'betting',
        priority: 'medium',
        title: `${bestBetType[0]}への集中投資`,
        description: `${bestBetType[0]}で最も良い成績を残しています。この券種への投資比率を高めることを検討してください。`,
        expectedImpact: 'ROIを3-5%改善',
        actionItems: [
          `${bestBetType[0]}の投資比率を増加`,
          '他の券種の投資を段階的に削減',
          '成功パターンの分析と再現'
        ],
        metrics: {
          current: roiAnalysis.overall.roi,
          target: roiAnalysis.overall.roi + 5,
          unit: '%'
        }
      });
    }

    // 時間パターンの提案
    const bestTimeSlot = Object.entries(hitPatterns.timePatterns.hourly)
      .sort(([,a], [,b]) => b.roi - a.roi)[0];
    
    if (bestTimeSlot && bestTimeSlot[1].count >= 5 && bestTimeSlot[1].roi > 10) {
      suggestions.push({
        category: 'timing',
        priority: 'low',
        title: `${bestTimeSlot[0]}時台への集中`,
        description: `${bestTimeSlot[0]}時台のレースで良い成績を残しています。この時間帯への投資を増やすことを検討してください。`,
        expectedImpact: 'ROIを2-3%改善',
        actionItems: [
          `${bestTimeSlot[0]}時台のレースを優先`,
          '時間帯別の成功要因を分析',
          '他の時間帯での投資を慎重に判断'
        ],
        metrics: {
          current: hitPatterns.timePatterns.hourly[bestTimeSlot[0]].roi,
          target: hitPatterns.timePatterns.hourly[bestTimeSlot[0]].roi + 5,
          unit: '%'
        }
      });
    }

    // 優先度順にソート
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * カテゴリ別ROI計算
   */
  private static calculateROIByCategory(
    investments: Investment[],
    category: keyof Investment
  ): Record<string, { roi: number; count: number; totalInvestment: number; totalReturn: number; winRate: number }> {
    const grouped = investments.reduce((acc, inv) => {
      const key = String(inv[category]);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(inv);
      return acc;
    }, {} as Record<string, Investment[]>);

    const result: Record<string, any> = {};
    
    Object.entries(grouped).forEach(([key, invs]) => {
      const totalInvestment = invs.reduce((sum, inv) => sum + inv.amount, 0);
      const totalReturn = invs.reduce((sum, inv) => sum + inv.payout, 0);
      const winCount = invs.filter(inv => inv.profit > 0).length;
      
      result[key] = {
        roi: totalInvestment > 0 ? ((totalReturn - totalInvestment) / totalInvestment) * 100 : 0,
        count: invs.length,
        totalInvestment,
        totalReturn,
        winRate: invs.length > 0 ? (winCount / invs.length) * 100 : 0
      };
    });

    return result;
  }

  /**
   * 確信度別ROI計算
   */
  private static calculateROIByPredictionConfidence(
    predictions: PredictionResult[],
    investments: Investment[]
  ): Record<string, { roi: number; count: number; totalInvestment: number; totalReturn: number; winRate: number }> {
    const predictionMap = new Map(predictions.map(p => [p.id, p]));
    
    const grouped = investments.reduce((acc, inv) => {
      const prediction = predictionMap.get(inv.predictionId);
      const confidence = prediction?.confidenceLevel?.overall || 'unknown';
      
      if (!acc[confidence]) {
        acc[confidence] = [];
      }
      acc[confidence].push(inv);
      return acc;
    }, {} as Record<string, Investment[]>);

    const result: Record<string, any> = {};
    
    Object.entries(grouped).forEach(([key, invs]) => {
      const totalInvestment = invs.reduce((sum, inv) => sum + inv.amount, 0);
      const totalReturn = invs.reduce((sum, inv) => sum + inv.payout, 0);
      const winCount = invs.filter(inv => inv.profit > 0).length;
      
      result[key] = {
        roi: totalInvestment > 0 ? ((totalReturn - totalInvestment) / totalInvestment) * 100 : 0,
        count: invs.length,
        totalInvestment,
        totalReturn,
        winRate: invs.length > 0 ? (winCount / invs.length) * 100 : 0
      };
    });

    return result;
  }

  /**
   * オッズ範囲別ROI計算
   */
  private static calculateROIByOddsRange(investments: Investment[]): Record<string, any> {
    const getOddsRange = (odds: number): string => {
      if (odds < 2) return '1.0-1.9倍';
      if (odds < 3) return '2.0-2.9倍';
      if (odds < 5) return '3.0-4.9倍';
      if (odds < 10) return '5.0-9.9倍';
      if (odds < 20) return '10.0-19.9倍';
      return '20.0倍以上';
    };

    const grouped = investments.reduce((acc, inv) => {
      const range = getOddsRange(inv.odds);
      if (!acc[range]) {
        acc[range] = [];
      }
      acc[range].push(inv);
      return acc;
    }, {} as Record<string, Investment[]>);

    const result: Record<string, any> = {};
    
    Object.entries(grouped).forEach(([key, invs]) => {
      const totalInvestment = invs.reduce((sum, inv) => sum + inv.amount, 0);
      const totalReturn = invs.reduce((sum, inv) => sum + inv.payout, 0);
      const winCount = invs.filter(inv => inv.profit > 0).length;
      
      result[key] = {
        roi: totalInvestment > 0 ? ((totalReturn - totalInvestment) / totalInvestment) * 100 : 0,
        count: invs.length,
        totalInvestment,
        totalReturn,
        winRate: invs.length > 0 ? (winCount / invs.length) * 100 : 0
      };
    });

    return result;
  }

  /**
   * 人気別パフォーマンス分析
   */
  private static analyzeFavoritePerformance(predictions: PredictionResult[], investments: Investment[]): any {
    // 実装の詳細は省略（人気順位に基づく分析）
    return {
      rank1: { hitRate: 0, count: 0, roi: 0 },
      rank2: { hitRate: 0, count: 0, roi: 0 },
      rank3: { hitRate: 0, count: 0, roi: 0 },
      outsider: { hitRate: 0, count: 0, roi: 0 }
    };
  }

  /**
   * 距離別パフォーマンス分析
   */
  private static analyzeDistancePerformance(predictions: PredictionResult[], investments: Investment[]): Record<string, any> {
    // 実装の詳細は省略（距離に基づく分析）
    return {};
  }

  /**
   * 馬場別パフォーマンス分析
   */
  private static analyzeSurfacePerformance(predictions: PredictionResult[], investments: Investment[]): any {
    // 実装の詳細は省略（馬場に基づく分析）
    return {
      turf: { hitRate: 0, count: 0, roi: 0 },
      dirt: { hitRate: 0, count: 0, roi: 0 }
    };
  }

  /**
   * 競馬場別パフォーマンス分析
   */
  private static analyzeVenuePerformance(predictions: PredictionResult[], investments: Investment[]): Record<string, any> {
    // 実装の詳細は省略（競馬場に基づく分析）
    return {};
  }

  /**
   * 時間パターン分析
   */
  private static analyzeTimePatterns(predictions: PredictionResult[], investments: Investment[]): any {
    // 実装の詳細は省略（時間パターンに基づく分析）
    return {
      hourly: {},
      dayOfWeek: {},
      monthly: {}
    };
  }
}

export const performanceAnalysisService = PerformanceAnalysisService;