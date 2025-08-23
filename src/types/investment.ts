// 投資記録の型定義
export interface Investment {
  id: string;
  raceId: string;
  predictionId: string;
  betType: 'win' | 'place' | 'exacta' | 'quinella' | 'trifecta' | 'trio' | 'tierce';
  selections: number[];
  amount: number;
  odds: number;
  payout: number;
  profit: number;
  timestamp: Date;
  venue?: string;
  raceNumber?: number;
  raceDate?: string;
  
  // ワークフロー関連プロパティ（後方互換性のためオプショナル）
  /** 結果が確定されているか */
  isResultConfirmed?: boolean;
  /** 結果入力日時 */
  resultEnteredAt?: Date;
  /** 予想の確信度（予想から引き継がれる） */
  predictionConfidence?: number;
  /** 期待値 */
  expectedValue?: number;
  /** リスクレベル */
  riskLevel?: 'low' | 'medium' | 'high';
  
  // AI戦略関連プロパティ
  /** AI推奨戦略が使用されたか */
  strategyUsed?: boolean;
  /** 使用された戦略タイプ */
  strategyType?: 'win' | 'place' | 'exacta' | 'quinella' | 'trifecta' | 'wide';
  /** 戦略のリスクレベル */
  strategyRiskLevel?: 'low' | 'medium' | 'high';
  /** 戦略の確信度 */
  strategyConfidence?: number;
  /** 戦略の理由 */
  strategyRationale?: string;
  /** AI予想期待収益 */
  expectedReturn?: number;
  /** シミュレーション投資かどうか */
  isSimulated?: boolean;
}

// 投資統計の型定義
export interface InvestmentStats {
  totalInvestment: number;
  totalPayout: number;
  totalProfit: number;
  returnRate: number;
  winRate: number;
  averageOdds: number;
  bestWin: number;
  worstLoss: number;
  totalBets: number;
  winningBets: number;
  losingBets: number;
}

// 期間別投資統計の型定義
export interface PeriodInvestmentStats extends InvestmentStats {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate: Date;
}

// 券種別統計の型定義
export interface BetTypeStats {
  betType: Investment['betType'];
  count: number;
  totalInvestment: number;
  totalPayout: number;
  profit: number;
  returnRate: number;
  winRate: number;
  averageOdds: number;
}

// 投資制限設定の型定義
export interface InvestmentLimits {
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  maxBetAmount: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  autoStop: boolean;
  stopLossAmount: number;
}

// 投資パフォーマンス指標の型定義
export interface InvestmentPerformance {
  roi: number; // Return on Investment
  sharpeRatio: number;
  maxDrawdown: number;
  winStreak: number;
  loseStreak: number;
  currentStreak: {
    type: 'win' | 'lose';
    count: number;
  };
  monthlyReturns: Array<{
    month: string;
    profit: number;
    returnRate: number;
  }>;
}

// 投資レポートの型定義
export interface InvestmentReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: InvestmentStats;
  performance: InvestmentPerformance;
  betTypeBreakdown: BetTypeStats[];
  topWins: Investment[];
  topLosses: Investment[];
  recommendations: string[];
}