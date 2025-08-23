import { PredictionResult, HorseAnalysis, ActualResult } from '@/types/prediction';
import { Investment } from '@/types/investment';

// 人気帯の定義
export interface PopularityRange {
  range: string;
  min: number;
  max: number;
  color: string;
}

// 人気分析結果の型定義
export interface PopularityAnalysis {
  range: string;
  totalPredictions: number;
  hitCount: number;
  hitRate: number;
  totalInvestment: number;
  totalPayout: number;
  averageOdds: number;
  roi: number;
  color: string;
}

// オッズ分析結果の型定義
export interface OddsAnalysis {
  range: string;
  totalPredictions: number;
  hitCount: number;
  hitRate: number;
  totalInvestment: number;
  totalPayout: number;
  averageOdds: number;
  roi: number;
  color: string;
}

// 予想順位別分析結果の型定義
export interface PredictionRankAnalysis {
  rank: number;
  totalPredictions: number;
  hitCount: number;
  hitRate: number;
  averagePopularity: number;
  averageOdds: number;
}

class PopularityAnalysisService {
  // 人気帯の定義
  private readonly popularityRanges: PopularityRange[] = [
    { range: '1-3番人気', min: 1, max: 3, color: '#10B981' },
    { range: '4-6番人気', min: 4, max: 6, color: '#F59E0B' },
    { range: '7-9番人気', min: 7, max: 9, color: '#EF4444' },
    { range: '10番人気以下', min: 10, max: 18, color: '#8B5CF6' }
  ];

  // オッズ帯の定義
  private readonly oddsRanges: PopularityRange[] = [
    { range: '1.0-2.9倍', min: 1.0, max: 2.9, color: '#10B981' },
    { range: '3.0-4.9倍', min: 3.0, max: 4.9, color: '#3B82F6' },
    { range: '5.0-9.9倍', min: 5.0, max: 9.9, color: '#F59E0B' },
    { range: '10.0倍以上', min: 10.0, max: 999, color: '#EF4444' }
  ];

  /**
   * 人気別分析を実行
   */
  analyzeByPopularity(
    predictions: PredictionResult[],
    investments: Investment[]
  ): PopularityAnalysis[] {
    const investmentMap = new Map(investments.map(inv => [inv.predictionId, inv]));
    
    return this.popularityRanges.map(range => {
      const rangeData = this.extractDataByPopularityRange(predictions, investmentMap, range);
      
      return {
        range: range.range,
        totalPredictions: rangeData.total,
        hitCount: rangeData.hits,
        hitRate: rangeData.total > 0 ? (rangeData.hits / rangeData.total) * 100 : 0,
        totalInvestment: rangeData.investment,
        totalPayout: rangeData.payout,
        averageOdds: rangeData.total > 0 ? rangeData.totalOdds / rangeData.total : 0,
        roi: rangeData.investment > 0 ? ((rangeData.payout - rangeData.investment) / rangeData.investment) * 100 : 0,
        color: range.color
      };
    });
  }

  /**
   * オッズ別分析を実行
   */
  analyzeByOdds(
    predictions: PredictionResult[],
    investments: Investment[]
  ): OddsAnalysis[] {
    const investmentMap = new Map(investments.map(inv => [inv.predictionId, inv]));
    
    return this.oddsRanges.map(range => {
      const rangeData = this.extractDataByOddsRange(predictions, investmentMap, range);
      
      return {
        range: range.range,
        totalPredictions: rangeData.total,
        hitCount: rangeData.hits,
        hitRate: rangeData.total > 0 ? (rangeData.hits / rangeData.total) * 100 : 0,
        totalInvestment: rangeData.investment,
        totalPayout: rangeData.payout,
        averageOdds: rangeData.total > 0 ? rangeData.totalOdds / rangeData.total : 0,
        roi: rangeData.investment > 0 ? ((rangeData.payout - rangeData.investment) / rangeData.investment) * 100 : 0,
        color: range.color
      };
    });
  }

  /**
   * 予想順位別分析を実行
   */
  analyzeByPredictionRank(
    predictions: PredictionResult[],
    investments: Investment[]
  ): PredictionRankAnalysis[] {
    const investmentMap = new Map(investments.map(inv => [inv.predictionId, inv]));
    const rankData: { [key: number]: any } = {};

    predictions.forEach(prediction => {
      const investment = investmentMap.get(prediction.id);
      if (!investment || !prediction.actualResults) return;

      // 上位3頭の予想馬を分析
      prediction.predictions.slice(0, 3).forEach((horse, index) => {
        const rank = index + 1;
        const isHit = this.checkHit(horse, prediction.actualResults!);
        
        if (!rankData[rank]) {
          rankData[rank] = {
            total: 0,
            hits: 0,
            totalPopularity: 0,
            totalOdds: 0
          };
        }

        rankData[rank].total++;
        if (isHit) rankData[rank].hits++;
        rankData[rank].totalPopularity += horse.horse.popularity;
        rankData[rank].totalOdds += horse.horse.odds || 0;
      });
    });

    return [1, 2, 3].map(rank => {
      const data = rankData[rank] || { total: 0, hits: 0, totalPopularity: 0, totalOdds: 0 };
      
      return {
        rank,
        totalPredictions: data.total,
        hitCount: data.hits,
        hitRate: data.total > 0 ? (data.hits / data.total) * 100 : 0,
        averagePopularity: data.total > 0 ? data.totalPopularity / data.total : 0,
        averageOdds: data.total > 0 ? data.totalOdds / data.total : 0
      };
    });
  }

  /**
   * 人気帯別データの抽出
   */
  private extractDataByPopularityRange(
    predictions: PredictionResult[],
    investmentMap: Map<string, Investment>,
    range: PopularityRange
  ) {
    let total = 0;
    let hits = 0;
    let investment = 0;
    let payout = 0;
    let totalOdds = 0;

    predictions.forEach(prediction => {
      const inv = investmentMap.get(prediction.id);
      if (!inv) return;

      // 上位3頭の予想馬をチェック
      prediction.predictions.slice(0, 3).forEach(horse => {
        const popularity = horse.horse.popularity;
        if (popularity >= range.min && popularity <= range.max) {
          total++;
          totalOdds += horse.horse.odds || 0;
          
          // 実際に投資した馬かチェック
          if (inv.selections.includes(horse.horse.number)) {
            investment += inv.amount;
            payout += inv.payout;
            
            // 的中判定
            if (prediction.actualResults && this.checkHit(horse, prediction.actualResults)) {
              hits++;
            }
          }
        }
      });
    });

    return { total, hits, investment, payout, totalOdds };
  }

  /**
   * オッズ帯別データの抽出
   */
  private extractDataByOddsRange(
    predictions: PredictionResult[],
    investmentMap: Map<string, Investment>,
    range: PopularityRange
  ) {
    let total = 0;
    let hits = 0;
    let investment = 0;
    let payout = 0;
    let totalOdds = 0;

    predictions.forEach(prediction => {
      const inv = investmentMap.get(prediction.id);
      if (!inv) return;

      // 上位3頭の予想馬をチェック
      prediction.predictions.slice(0, 3).forEach(horse => {
        const odds = horse.horse.odds || 0;
        if (odds >= range.min && odds <= range.max) {
          total++;
          totalOdds += odds;
          
          // 実際に投資した馬かチェック
          if (inv.selections.includes(horse.horse.number)) {
            investment += inv.amount;
            payout += inv.payout;
            
            // 的中判定
            if (prediction.actualResults && this.checkHit(horse, prediction.actualResults)) {
              hits++;
            }
          }
        }
      });
    });

    return { total, hits, investment, payout, totalOdds };
  }

  /**
   * 的中判定
   */
  private checkHit(horse: HorseAnalysis, actualResults: ActualResult[]): boolean {
    const result = actualResults.find(r => r.number === horse.horse.number);
    return result ? result.rank <= 3 : false;
  }

  /**
   * 人気とオッズの相関分析
   */
  analyzePopularityOddsCorrelation(predictions: PredictionResult[]): Array<{
    popularity: number;
    averageOdds: number;
    count: number;
  }> {
    const correlationData: { [key: number]: { totalOdds: number; count: number } } = {};

    predictions.forEach(prediction => {
      prediction.predictions.slice(0, 3).forEach(horse => {
        const popularity = horse.horse.popularity;
        const odds = horse.horse.odds || 0;

        if (!correlationData[popularity]) {
          correlationData[popularity] = { totalOdds: 0, count: 0 };
        }

        correlationData[popularity].totalOdds += odds;
        correlationData[popularity].count++;
      });
    });

    return Object.entries(correlationData)
      .map(([popularity, data]) => ({
        popularity: parseInt(popularity),
        averageOdds: data.count > 0 ? data.totalOdds / data.count : 0,
        count: data.count
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => a.popularity - b.popularity);
  }
}

export const popularityAnalysisService = new PopularityAnalysisService();