import { Investment } from '@/types/investment';

export interface PerformanceMetrics {
  roi: number; // Return on Investment (%)
  sharpeRatio: number; // リスク調整後リターン
  maxDrawdown: number; // 最大ドローダウン (%)
  winStreak: number; // 最大連勝数
  loseStreak: number; // 最大連敗数
  currentStreak: {
    type: 'win' | 'lose';
    count: number;
  };
  volatility: number; // ボラティリティ (標準偏差)
  profitFactor: number; // プロフィットファクター
  averageWin: number; // 平均勝利額
  averageLoss: number; // 平均損失額
  monthlyReturns: Array<{
    month: string;
    profit: number;
    returnRate: number;
    investment: number;
  }>;
}

export class InvestmentPerformanceService {
  /**
   * 投資パフォーマンス指標を計算
   */
  static calculatePerformance(investments: Investment[]): PerformanceMetrics {
    if (investments.length === 0) {
      return this.getEmptyMetrics();
    }

    // 時系列順にソート
    const sortedInvestments = [...investments].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const totalInvestment = sortedInvestments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalProfit = sortedInvestments.reduce((sum, inv) => sum + inv.profit, 0);
    
    // ROI計算
    const roi = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

    // 勝ち負けの分離
    const wins = sortedInvestments.filter(inv => inv.profit > 0);
    const losses = sortedInvestments.filter(inv => inv.profit < 0);

    // 平均勝利額・損失額
    const averageWin = wins.length > 0 ? wins.reduce((sum, inv) => sum + inv.profit, 0) / wins.length : 0;
    const averageLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, inv) => sum + inv.profit, 0) / losses.length) : 0;

    // プロフィットファクター
    const totalWins = wins.reduce((sum, inv) => sum + inv.profit, 0);
    const totalLosses = Math.abs(losses.reduce((sum, inv) => sum + inv.profit, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    // ボラティリティ（日次リターンの標準偏差）
    const dailyReturns = this.calculateDailyReturns(sortedInvestments);
    const volatility = this.calculateStandardDeviation(dailyReturns);

    // シャープレシオ（リスクフリーレート0と仮定）
    const averageDailyReturn = dailyReturns.length > 0 ? 
      dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length : 0;
    const sharpeRatio = volatility > 0 ? (averageDailyReturn / volatility) * Math.sqrt(252) : 0; // 年率換算

    // 最大ドローダウン
    const maxDrawdown = this.calculateMaxDrawdown(sortedInvestments);

    // 連勝・連敗数
    const streaks = this.calculateStreaks(sortedInvestments);

    // 月次リターン
    const monthlyReturns = this.calculateMonthlyReturns(sortedInvestments);

    return {
      roi,
      sharpeRatio,
      maxDrawdown,
      winStreak: streaks.maxWinStreak,
      loseStreak: streaks.maxLoseStreak,
      currentStreak: streaks.currentStreak,
      volatility: volatility * 100, // パーセント表示
      profitFactor,
      averageWin,
      averageLoss,
      monthlyReturns
    };
  }

  /**
   * 日次リターンを計算
   */
  private static calculateDailyReturns(investments: Investment[]): number[] {
    const dailyData = new Map<string, { investment: number; profit: number }>();

    // 日別にデータを集計
    investments.forEach(inv => {
      const date = new Date(inv.timestamp).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, { investment: 0, profit: 0 });
      }
      const data = dailyData.get(date)!;
      data.investment += inv.amount;
      data.profit += inv.profit;
    });

    // 日次リターン率を計算
    return Array.from(dailyData.values())
      .map(data => data.investment > 0 ? data.profit / data.investment : 0);
  }

  /**
   * 標準偏差を計算
   */
  private static calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    
    return Math.sqrt(variance);
  }

  /**
   * 最大ドローダウンを計算
   */
  private static calculateMaxDrawdown(investments: Investment[]): number {
    let cumulativeProfit = 0;
    let peak = 0;
    let maxDrawdown = 0;

    investments.forEach(inv => {
      cumulativeProfit += inv.profit;
      
      if (cumulativeProfit > peak) {
        peak = cumulativeProfit;
      }
      
      const drawdown = peak - cumulativeProfit;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    // 初期投資額に対する割合として計算
    const totalInvestment = investments.reduce((sum, inv) => sum + inv.amount, 0);
    return totalInvestment > 0 ? (maxDrawdown / totalInvestment) * 100 : 0;
  }

  /**
   * 連勝・連敗数を計算
   */
  private static calculateStreaks(investments: Investment[]): {
    maxWinStreak: number;
    maxLoseStreak: number;
    currentStreak: { type: 'win' | 'lose'; count: number };
  } {
    let maxWinStreak = 0;
    let maxLoseStreak = 0;
    let currentWinStreak = 0;
    let currentLoseStreak = 0;
    let lastResult: 'win' | 'lose' | null = null;

    investments.forEach(inv => {
      const isWin = inv.profit > 0;
      
      if (isWin) {
        currentWinStreak++;
        currentLoseStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
        lastResult = 'win';
      } else {
        currentLoseStreak++;
        currentWinStreak = 0;
        maxLoseStreak = Math.max(maxLoseStreak, currentLoseStreak);
        lastResult = 'lose';
      }
    });

    return {
      maxWinStreak,
      maxLoseStreak,
      currentStreak: {
        type: lastResult || 'win',
        count: lastResult === 'win' ? currentWinStreak : currentLoseStreak
      }
    };
  }

  /**
   * 月次リターンを計算
   */
  private static calculateMonthlyReturns(investments: Investment[]): Array<{
    month: string;
    profit: number;
    returnRate: number;
    investment: number;
  }> {
    const monthlyData = new Map<string, { investment: number; profit: number }>();

    // 月別にデータを集計
    investments.forEach(inv => {
      const date = new Date(inv.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { investment: 0, profit: 0 });
      }
      
      const data = monthlyData.get(monthKey)!;
      data.investment += inv.amount;
      data.profit += inv.profit;
    });

    // 月次リターンデータを生成
    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        profit: data.profit,
        returnRate: data.investment > 0 ? (data.profit / data.investment) * 100 : 0,
        investment: data.investment
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * 空のメトリクスを返す
   */
  private static getEmptyMetrics(): PerformanceMetrics {
    return {
      roi: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winStreak: 0,
      loseStreak: 0,
      currentStreak: { type: 'win', count: 0 },
      volatility: 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0,
      monthlyReturns: []
    };
  }

  /**
   * パフォーマンス評価を取得
   */
  static getPerformanceRating(metrics: PerformanceMetrics): {
    overall: 'excellent' | 'good' | 'fair' | 'poor';
    factors: Array<{
      name: string;
      value: number | string;
      rating: 'excellent' | 'good' | 'fair' | 'poor';
      description: string;
    }>;
  } {
    const factors = [
      {
        name: 'ROI',
        value: `${metrics.roi.toFixed(1)}%`,
        rating: this.getRatingByThreshold(metrics.roi, [20, 10, 0, -Infinity]) as any,
        description: metrics.roi >= 20 ? '優秀な収益率' :
                    metrics.roi >= 10 ? '良好な収益率' :
                    metrics.roi >= 0 ? '収支均衡' : '損失発生'
      },
      {
        name: 'シャープレシオ',
        value: metrics.sharpeRatio.toFixed(2),
        rating: this.getRatingByThreshold(metrics.sharpeRatio, [1.5, 1.0, 0.5, -Infinity]) as any,
        description: metrics.sharpeRatio >= 1.5 ? 'リスク効率が優秀' :
                    metrics.sharpeRatio >= 1.0 ? 'リスク効率が良好' :
                    metrics.sharpeRatio >= 0.5 ? 'リスク効率が普通' : 'リスク効率が低い'
      },
      {
        name: 'プロフィットファクター',
        value: metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2),
        rating: this.getRatingByThreshold(metrics.profitFactor, [2.0, 1.5, 1.0, -Infinity]) as any,
        description: metrics.profitFactor >= 2.0 ? '利益効率が優秀' :
                    metrics.profitFactor >= 1.5 ? '利益効率が良好' :
                    metrics.profitFactor >= 1.0 ? '利益効率が普通' : '利益効率が低い'
      },
      {
        name: '最大ドローダウン',
        value: `${metrics.maxDrawdown.toFixed(1)}%`,
        rating: this.getRatingByThreshold(-metrics.maxDrawdown, [-5, -10, -20, -Infinity]) as any,
        description: metrics.maxDrawdown <= 5 ? 'リスク管理が優秀' :
                    metrics.maxDrawdown <= 10 ? 'リスク管理が良好' :
                    metrics.maxDrawdown <= 20 ? 'リスク管理が普通' : 'リスク管理要改善'
      }
    ];

    // 総合評価を計算
    const ratings = factors.map(f => f.rating);
    const excellentCount = ratings.filter(r => r === 'excellent').length;
    const goodCount = ratings.filter(r => r === 'good').length;
    const fairCount = ratings.filter(r => r === 'fair').length;

    let overall: 'excellent' | 'good' | 'fair' | 'poor';
    if (excellentCount >= 3) overall = 'excellent';
    else if (excellentCount + goodCount >= 3) overall = 'good';
    else if (excellentCount + goodCount + fairCount >= 2) overall = 'fair';
    else overall = 'poor';

    return { overall, factors };
  }

  /**
   * 閾値による評価を取得
   */
  private static getRatingByThreshold(
    value: number, 
    thresholds: [number, number, number, number]
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    if (value >= thresholds[0]) return 'excellent';
    if (value >= thresholds[1]) return 'good';
    if (value >= thresholds[2]) return 'fair';
    return 'poor';
  }
}

export const investmentPerformanceService = InvestmentPerformanceService;