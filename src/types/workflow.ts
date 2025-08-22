/**
 * ワークフロー関連の型定義
 * 予想→投資記録→結果入力の一連のワークフローを管理するための型
 */

/**
 * ワークフローの状態を表す列挙型
 */
export enum WorkflowStatusType {
  /** 予想のみ作成済み */
  PREDICTION_ONLY = 'prediction_only',
  /** 予想と投資記録が作成済み */
  PREDICTION_WITH_INVESTMENT = 'prediction_with_investment',
  /** 予想結果のみ入力済み */
  PREDICTION_RESULT_ENTERED = 'prediction_result_entered',
  /** 全て完了（予想、投資記録、結果入力） */
  COMPLETED = 'completed'
}

/**
 * ワークフローの優先度
 */
export enum WorkflowPriority {
  /** 高優先度（レース開始まで1時間以内など） */
  HIGH = 'high',
  /** 中優先度（レース開始まで24時間以内など） */
  MEDIUM = 'medium',
  /** 低優先度（それ以外） */
  LOW = 'low'
}

/**
 * ワークフローの状態情報
 */
export interface WorkflowStatus {
  /** 予想が作成されているか */
  hasPrediction: boolean;
  /** 投資記録が作成されているか */
  hasInvestment: boolean;
  /** 結果が入力されているか */
  hasResult: boolean;
  /** ワークフローが完了しているか */
  isComplete: boolean;
  /** 最終更新日時 */
  lastUpdated: Date;
}

/**
 * ワークフロー状態の管理エンティティ
 */
export interface WorkflowState {
  /** ワークフロー状態ID */
  id: string;
  /** 関連する予想ID */
  predictionId: string;
  /** 関連するレースID */
  raceId: string;
  
  // 状態フラグ
  /** 予想が作成されているか */
  hasPrediction: boolean;
  /** 投資記録が作成されているか */
  hasInvestment: boolean;
  /** 結果が入力されているか */
  hasResult: boolean;
  /** ワークフローが完了しているか */
  isComplete: boolean;
  
  // タイムスタンプ
  /** 予想作成日時 */
  predictionCreatedAt?: Date;
  /** 投資記録作成日時 */
  investmentCreatedAt?: Date;
  /** 結果入力日時 */
  resultEnteredAt?: Date;
  /** ワークフロー完了日時 */
  completedAt?: Date;
  
  // 関連ID
  /** 関連する投資記録IDのリスト */
  investmentIds: string[];
  
  // 優先度とリマインダー
  /** ワークフローの優先度 */
  priority: WorkflowPriority;
  /** リマインダーが送信されたか */
  reminderSent: boolean;
  /** 最後のリマインダー送信日時 */
  lastReminderAt?: Date;
  
  /** 作成日時 */
  createdAt: Date;
  /** 更新日時 */
  updatedAt: Date;
}

/**
 * 未完了のワークフロー情報
 */
export interface IncompleteWorkflow {
  /** ワークフローID */
  id: string;
  /** ワークフローのタイプ */
  type: 'prediction-result' | 'investment-result';
  /** レース情報 */
  raceInfo: {
    /** レースID */
    raceId: string;
    /** レース名 */
    raceName: string;
    /** 競馬場名 */
    venueName: string;
    /** レース番号 */
    raceNumber: number;
    /** レース日付 */
    raceDate: Date;
    /** レース開始時刻 */
    startTime?: Date;
  };
  /** 経過日数 */
  daysElapsed: number;
  /** 優先度 */
  priority: WorkflowPriority;
  /** 現在のワークフロー状態 */
  currentStatus: WorkflowStatus;
  /** 次に実行すべきアクション */
  nextAction: 'create_investment' | 'enter_result' | 'complete_investment_result';
  /** アクションの説明 */
  actionDescription: string;
}

/**
 * ワークフロー更新の結果
 */
export interface WorkflowUpdateResult {
  /** 予想が更新されたか */
  predictionUpdated: boolean;
  /** 投資記録が更新されたか */
  investmentUpdated: boolean;
  /** 予想精度が計算されたか */
  accuracyCalculated: boolean;
  /** 損益が計算されたか */
  profitCalculated: boolean;
  /** エラーメッセージのリスト */
  errors: string[];
  /** 警告メッセージのリスト */
  warnings: string[];
}

/**
 * ワークフローアクティビティ（履歴）
 */
export interface WorkflowActivity {
  /** アクティビティID */
  id: string;
  /** アクティビティタイプ */
  type: 'prediction-created' | 'investment-added' | 'result-entered' | 'workflow-completed';
  /** 発生日時 */
  timestamp: Date;
  /** 関連するレース情報 */
  raceInfo: {
    raceId: string;
    raceName: string;
    venueName: string;
    raceNumber: number;
    raceDate: Date;
  };
  /** アクティビティの詳細説明 */
  details: string;
  /** 関連するワークフローID */
  workflowId: string;
  /** 関連する予想ID */
  predictionId?: string;
  /** 関連する投資記録ID */
  investmentId?: string;
}

/**
 * ワークフロー統計情報
 */
export interface WorkflowStats {
  /** 総ワークフロー数 */
  total: number;
  /** 完了済みワークフロー数 */
  completed: number;
  /** 完了率（0-100） */
  completionRate: number;
  /** 平均完了時間（時間） */
  averageCompletionTime: number;
  /** 未完了ワークフロー数 */
  incomplete: number;
  /** 高優先度の未完了ワークフロー数 */
  highPriorityIncomplete: number;
}