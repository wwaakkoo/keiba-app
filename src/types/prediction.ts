// 予想重み設定の型定義
export interface PredictionWeights {
  speed: number;
  recent: number;
  odds: number;
}

// 馬のスコア詳細の型定義
export interface HorseScore {
  speed: number;
  recent: number;
  odds: number;
  total: number;
}

// 馬の分析結果の型定義
export interface HorseAnalysis {
  horse: {
    name: string;
    number: number;
    jockey: string;
    popularity: number;
    odds: number | null;
  };
  scores: HorseScore;
  speedIndex: number;
  recentForm: string;
  confidence: 'high' | 'medium' | 'low';
  pastRaces: {
    rank: number;
    time: number;
    distance: number;
    surface: 'turf' | 'dirt';
    condition: 'good' | 'slightly_heavy' | 'heavy' | 'bad';
  }[];
}

// 予想結果の型定義
export interface PredictionResult {
  id: string;
  raceId: string;
  timestamp: Date;
  date: string;
  race: {
    venue: string;
    raceNumber: number;
    distance: number;
    surface: 'turf' | 'dirt';
    raceDate: string;
  };
  predictions: HorseAnalysis[];
  horseCount: number;
  confidenceLevel: ConfidenceLevel | null;
  actualResults: ActualResult[] | null;
  payoutData: PayoutData | null;
  isResultEntered: boolean;
  // レポジトリで使用されるプロパティ
  accuracy?: number;
  isCorrect?: boolean;
  confidence?: number;
  actualRanking?: number[];
  
  // ワークフロー関連プロパティ（後方互換性のためオプショナル）
  /** ワークフローの状態 */
  workflowStatus?: 'prediction_only' | 'prediction_with_investment' | 'prediction_result_entered' | 'completed';
  /** 関連する投資記録IDのリスト */
  relatedInvestmentIds?: string[];
}

// 確信度レベルの型定義
export interface ConfidenceLevel {
  overall: 'high' | 'medium' | 'low';
  topPick: number; // 0-100のスコア
  spread: number; // スコア差の大きさ
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

// 実際のレース結果の型定義
export interface ActualResult {
  number: number;
  rank: number;
  time?: number;
  margin?: string;
}

// 配当データの型定義
export interface PayoutData {
  investment: number;
  totalReturn: number;
  profit: number;
  betType: 'win' | 'place' | 'exacta' | 'quinella' | 'trifecta';
  selections: number[];
  odds: number;
}

// 統計データの型定義
export interface AccuracyStats {
  totalPredictions: number;
  completedPredictions: number;
  firstPlaceAccuracy: number;
  top3Accuracy: number;
  totalInvestment: number;
  totalPayout: number;
  totalProfit: number;
  returnRate: number;
}

// トレンドデータの型定義
export interface TrendData {
  race: string;
  firstAccuracy: number;
  top3Accuracy: number;
  date: string;
  isFirstHit: boolean;
  isTop3Hit: boolean;
}

// 期間別統計の型定義
export interface PeriodStats {
  total: number;
  firstAccuracy: number;
  top3Accuracy: number;
  totalInvestment: number;
  totalPayout: number;
  totalProfit: number;
  returnRate: number;
}

// 条件別統計の型定義
export interface ConditionStats {
  distance: Record<string, {
    total: number;
    firstAccuracy: number;
    top3Accuracy: number;
  }>;
  surface: Record<string, {
    total: number;
    firstAccuracy: number;
    top3Accuracy: number;
  }>;
  venue: Record<string, {
    total: number;
    firstAccuracy: number;
    top3Accuracy: number;
  }>;
}