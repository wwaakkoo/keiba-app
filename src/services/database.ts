import Dexie, { Table } from 'dexie';
import { Race } from '@/types/race';
import { PredictionResult } from '@/types/prediction';
import { Investment } from '@/types/investment';
import { WorkflowState, WorkflowActivity, WorkflowPriority } from '@/types/workflow';

// アプリケーション設定の型定義
export interface AppSettings {
  id?: number;
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  autoSync: boolean;
  defaultBetAmount: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  predictionWeights: {
    speed: number;
    recent: number;
    odds: number;
  };
  investmentLimits: {
    dailyLimit: number;
    weeklyLimit: number;
    monthlyLimit: number;
    maxBetAmount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// 同期状態の型定義
export interface SyncStatus {
  id?: number;
  lastSync: Date;
  pendingChanges: number;
  conflictResolution: 'local' | 'remote' | 'manual';
  isOnline: boolean;
  syncInProgress: boolean;
}

// データベースクラス
export class KeibaDatabase extends Dexie {
  races!: Table<Race>;
  predictions!: Table<PredictionResult>;
  investments!: Table<Investment>;
  settings!: Table<AppSettings>;
  syncStatus!: Table<SyncStatus>;
  workflowStates!: Table<WorkflowState>;
  workflowActivities!: Table<WorkflowActivity>;

  constructor() {
    super('KeibaDatabase');
    
    // バージョン1: 初期スキーマ
    this.version(1).stores({
      races: '&id, date, venue, raceNumber, surface, grade, createdAt, updatedAt',
      predictions: '&id, raceId, timestamp, accuracy, confidence',
      investments: '&id, raceId, predictionId, betType, timestamp, profit, venue, raceDate',
      settings: '++id, theme, updatedAt',
      syncStatus: '++id, lastSync, isOnline'
    });

    // バージョン2: ワークフロー機能追加
    this.version(2).stores({
      races: '&id, date, venue, raceNumber, surface, grade, createdAt, updatedAt',
      predictions: '&id, raceId, timestamp, accuracy, confidence, workflowStatus, *relatedInvestmentIds',
      investments: '&id, raceId, predictionId, betType, timestamp, profit, venue, raceDate, isResultConfirmed, resultEnteredAt',
      settings: '++id, theme, updatedAt',
      syncStatus: '++id, lastSync, isOnline',
      workflowStates: '&id, predictionId, raceId, isComplete, priority, createdAt, updatedAt, *investmentIds',
      workflowActivities: '&id, workflowId, type, timestamp, predictionId, investmentId'
    }).upgrade(trans => {
      // 既存データのマイグレーション処理
      return this.migrateToVersion2(trans);
    });

    // データベースのフック設定
    this.races.hook('creating', (_primKey, obj, _trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.races.hook('updating', (modifications: any, _primKey, _obj, _trans) => {
      modifications.updatedAt = new Date();
    });

    this.predictions.hook('creating', (_primKey, obj, _trans) => {
      if (!obj.timestamp) {
        obj.timestamp = new Date();
      }
    });

    this.investments.hook('creating', (primKey, obj, trans) => {
      if (!obj.timestamp) {
        obj.timestamp = new Date();
      }
    });

    this.settings.hook('creating', (_primKey, obj, _trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.settings.hook('updating', (modifications: any, _primKey, _obj, _trans) => {
      modifications.updatedAt = new Date();
    });

    // ワークフロー状態のフック設定
    this.workflowStates.hook('creating', (_primKey, obj, _trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.workflowStates.hook('updating', (modifications: any, _primKey, _obj, _trans) => {
      modifications.updatedAt = new Date();
    });

    // ワークフローアクティビティのフック設定
    this.workflowActivities.hook('creating', (_primKey, obj, _trans) => {
      if (!obj.timestamp) {
        obj.timestamp = new Date();
      }
    });
  }

  // データベース初期化
  async initialize(): Promise<void> {
    try {
      await this.open();
      
      // デフォルト設定の作成
      const settingsCount = await this.settings.count();
      if (settingsCount === 0) {
        await this.settings.add({
          theme: 'auto',
          notifications: true,
          autoSync: true,
          defaultBetAmount: 1000,
          riskLevel: 'moderate',
          predictionWeights: {
            speed: 0.4,
            recent: 0.4,
            odds: 0.2
          },
          investmentLimits: {
            dailyLimit: 10000,
            weeklyLimit: 50000,
            monthlyLimit: 200000,
            maxBetAmount: 5000
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // デフォルト同期状態の作成
      const syncCount = await this.syncStatus.count();
      if (syncCount === 0) {
        await this.syncStatus.add({
          lastSync: new Date(),
          pendingChanges: 0,
          conflictResolution: 'local',
          isOnline: navigator.onLine,
          syncInProgress: false
        });
      }

      console.log('データベースが正常に初期化されました');
    } catch (error) {
      console.error('データベース初期化エラー:', error);
      throw error;
    }
  }

  // バージョン2へのマイグレーション処理
  private async migrateToVersion2(trans: any): Promise<void> {
    console.log('ワークフロー機能のマイグレーションを開始します...');
    
    try {
      // 既存の予想データにワークフロー状態を作成
      const predictions = await trans.table('predictions').toArray();
      
      for (const prediction of predictions) {
        // 予想にワークフロー関連プロパティを追加
        await trans.table('predictions').update(prediction.id, {
          workflowStatus: prediction.isResultEntered ? 'prediction_result_entered' : 'prediction_only',
          relatedInvestmentIds: []
        });

        // ワークフロー状態を作成
        const workflowState: Omit<WorkflowState, 'id'> = {
          predictionId: prediction.id,
          raceId: prediction.raceId,
          hasPrediction: true,
          hasInvestment: false,
          hasResult: prediction.isResultEntered || false,
          isComplete: prediction.isResultEntered || false,
          predictionCreatedAt: prediction.timestamp,
          resultEnteredAt: prediction.isResultEntered ? prediction.timestamp : undefined,
          investmentIds: [],
          priority: WorkflowPriority.MEDIUM,
          reminderSent: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await trans.table('workflowStates').add({
          ...workflowState,
          id: `workflow_${prediction.id}`
        });
      }

      // 既存の投資記録データを更新
      const investments = await trans.table('investments').toArray();
      
      for (const investment of investments) {
        // 投資記録にワークフロー関連プロパティを追加
        await trans.table('investments').update(investment.id, {
          isResultConfirmed: investment.payout > 0, // 配当があれば結果確定とみなす
          resultEnteredAt: investment.payout > 0 ? investment.timestamp : undefined
        });

        // 関連する予想のワークフロー状態を更新
        if (investment.predictionId) {
          const workflowState = await trans.table('workflowStates')
            .where('predictionId')
            .equals(investment.predictionId)
            .first();

          if (workflowState) {
            const updatedInvestmentIds = [...(workflowState.investmentIds || []), investment.id];
            const hasResult = investment.payout > 0;
            
            await trans.table('workflowStates').update(workflowState.id, {
              hasInvestment: true,
              hasResult: hasResult,
              isComplete: hasResult,
              investmentCreatedAt: investment.timestamp,
              resultEnteredAt: hasResult ? investment.timestamp : workflowState.resultEnteredAt,
              investmentIds: updatedInvestmentIds,
              updatedAt: new Date()
            });

            // 予想のワークフロー状態も更新
            const newWorkflowStatus = hasResult ? 'completed' : 'prediction_with_investment';
            await trans.table('predictions').update(investment.predictionId, {
              workflowStatus: newWorkflowStatus,
              relatedInvestmentIds: updatedInvestmentIds
            });
          }
        }
      }

      console.log('ワークフロー機能のマイグレーションが完了しました');
    } catch (error) {
      console.error('マイグレーションエラー:', error);
      throw error;
    }
  }

  // データベースのクリア（開発用）
  async clearAllData(): Promise<void> {
    await this.transaction('rw', this.races, this.predictions, this.investments, this.workflowStates, this.workflowActivities, async () => {
      await this.races.clear();
      await this.predictions.clear();
      await this.investments.clear();
      await this.workflowStates.clear();
      await this.workflowActivities.clear();
    });
  }

  // データベースの統計情報取得
  async getStats(): Promise<{
    races: number;
    predictions: number;
    investments: number;
    workflowStates: number;
    workflowActivities: number;
    totalSize: number;
  }> {
    const [racesCount, predictionsCount, investmentsCount, workflowStatesCount, workflowActivitiesCount] = await Promise.all([
      this.races.count(),
      this.predictions.count(),
      this.investments.count(),
      this.workflowStates.count(),
      this.workflowActivities.count()
    ]);

    return {
      races: racesCount,
      predictions: predictionsCount,
      investments: investmentsCount,
      workflowStates: workflowStatesCount,
      workflowActivities: workflowActivitiesCount,
      totalSize: racesCount + predictionsCount + investmentsCount + workflowStatesCount + workflowActivitiesCount
    };
  }

  // ワークフロー関連のヘルパーメソッド
  async getIncompleteWorkflows(): Promise<WorkflowState[]> {
    return await this.workflowStates
      .where('isComplete')
      .equals(0) // Dexieでは boolean false は 0 として扱われる
      .toArray();
  }

  async getWorkflowByPredictionId(predictionId: string): Promise<WorkflowState | undefined> {
    return await this.workflowStates
      .where('predictionId')
      .equals(predictionId)
      .first();
  }

  async createWorkflowActivity(activity: Omit<WorkflowActivity, 'id'>): Promise<string> {
    const id = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.workflowActivities.add({
      ...activity,
      id
    });
    return id;
  }
}

// データベースインスタンス
export const db = new KeibaDatabase();

// データベース初期化の実行
db.initialize().catch(console.error);