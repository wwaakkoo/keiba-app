/**
 * ワークフローサービス
 * 予想、投資記録、結果入力の連携を管理する中核サービス
 */

import { db } from './database';
import { predictionRepository } from './repositories/PredictionRepository';
import { investmentRepository } from './repositories/InvestmentRepository';
import { 
  WorkflowState, 
  WorkflowStatus, 
  IncompleteWorkflow, 
  WorkflowUpdateResult,
  WorkflowActivity,
  WorkflowStats,
  WorkflowPriority
} from '@/types/workflow';
import { PredictionResult } from '@/types/prediction';
import { Investment } from '@/types/investment';
import { Race } from '@/types/race';


/**
 * 投資記録フォームデータの型定義
 */
export interface InvestmentFormData {
  raceId: string;
  predictionId: string;
  betType: Investment['betType'];
  selections: number[];
  amount: number;
  odds: number;
  venue: string;
  raceNumber: number;
  raceDate: string;
  // 予想データから自動設定される推奨値
  recommendedSelections: {
    [K in Investment['betType']]: number[];
  };
  predictionConfidence: number;
  expectedValue: number;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * レース結果入力データの型定義
 */
export interface RaceResultInput {
  predictionId: string;
  raceId: string;
  actualRanking: number[];
  payoutData?: {
    [betType: string]: {
      [combination: string]: number;
    };
  };
  manualInvestmentUpdates?: {
    investmentId: string;
    payout: number;
    profit: number;
  }[];
}

/**
 * ワークフローサービスのインターフェース
 */
export interface IWorkflowService {
  // 基本的なワークフロー管理機能
  createWorkflowState(predictionId: string, raceId: string): Promise<string>;
  updateWorkflowState(workflowId: string, updates: Partial<WorkflowState>): Promise<void>;
  getWorkflowStatus(predictionId: string): Promise<WorkflowStatus | null>;
  getIncompleteWorkflows(): Promise<IncompleteWorkflow[]>;
  
  // 予想から投資記録への連携機能
  createInvestmentFromPrediction(predictionId: string): Promise<InvestmentFormData>;
  
  // 統合結果入力機能
  updateResultsWithWorkflow(resultData: RaceResultInput): Promise<WorkflowUpdateResult>;
  
  // 統計とレポート
  getWorkflowStats(): Promise<WorkflowStats>;
  getWorkflowActivities(limit?: number): Promise<WorkflowActivity[]>;
}

/**
 * ワークフローサービスの実装
 */
export class WorkflowService implements IWorkflowService {
  
  /**
   * ワークフロー状態を作成
   * 予想作成時に自動的に呼び出される
   */
  async createWorkflowState(predictionId: string, raceId: string): Promise<string> {
    try {
      // 既存のワークフロー状態をチェック
      const existingWorkflow = await db.workflowStates
        .where('predictionId')
        .equals(predictionId)
        .first();

      if (existingWorkflow) {
        throw new Error('指定された予想のワークフロー状態は既に存在します');
      }

      // 予想データの存在確認
      const prediction = await predictionRepository.findById(predictionId);
      if (!prediction) {
        throw new Error('指定された予想が見つかりません');
      }

      // レースデータの存在確認
      const race = await db.races.get(raceId);
      if (!race) {
        throw new Error('指定されたレースが見つかりません');
      }

      // 優先度の計算（レース開始時刻に基づく）
      const priority = this.calculatePriority(race);

      // ワークフロー状態を作成
      const workflowState: Omit<WorkflowState, 'id'> = {
        predictionId,
        raceId,
        hasPrediction: true,
        hasInvestment: false,
        hasResult: false,
        isComplete: false,
        predictionCreatedAt: prediction.timestamp,
        investmentIds: [],
        priority,
        reminderSent: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const workflowId = `workflow_${predictionId}`;
      await db.workflowStates.add({
        ...workflowState,
        id: workflowId
      });

      // ワークフローアクティビティを記録
      await this.createWorkflowActivity({
        type: 'prediction-created',
        workflowId,
        predictionId,
        raceInfo: {
          raceId: race.id,
          raceName: `${race.venue} ${race.raceNumber}R`,
          venueName: race.venue,
          raceNumber: race.raceNumber,
          raceDate: new Date(race.date)
        },
        details: `予想が作成されました（確信度: ${prediction.confidenceLevel?.overall || 'unknown'}）`
      });

      console.log(`ワークフロー状態を作成しました: ${workflowId}`);
      return workflowId;
    } catch (error) {
      console.error('ワークフロー状態作成エラー:', error);
      throw error;
    }
  }

  /**
   * ワークフロー状態を更新
   */
  async updateWorkflowState(workflowId: string, updates: Partial<WorkflowState>): Promise<void> {
    try {
      const existingWorkflow = await db.workflowStates.get(workflowId);
      if (!existingWorkflow) {
        throw new Error('指定されたワークフロー状態が見つかりません');
      }

      // 更新データに現在時刻を追加
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      // 完了状態の自動判定
      if (updates.hasInvestment !== undefined || updates.hasResult !== undefined) {
        // const newHasInvestment = updates.hasInvestment ?? existingWorkflow.hasInvestment;
        const newHasResult = updates.hasResult ?? existingWorkflow.hasResult;
        
        // 予想結果が入力されていれば完了とみなす（投資記録は任意）
        updateData.isComplete = newHasResult;
        
        if (updateData.isComplete && !existingWorkflow.completedAt) {
          updateData.completedAt = new Date();
        }
      }

      await db.workflowStates.update(workflowId, updateData);
      console.log(`ワークフロー状態を更新しました: ${workflowId}`);
    } catch (error) {
      console.error('ワークフロー状態更新エラー:', error);
      throw error;
    }
  }

  /**
   * 予想IDからワークフロー状態を取得
   */
  async getWorkflowStatus(predictionId: string): Promise<WorkflowStatus | null> {
    try {
      const workflowState = await db.workflowStates
        .where('predictionId')
        .equals(predictionId)
        .first();

      if (!workflowState) {
        return null;
      }

      return {
        hasPrediction: workflowState.hasPrediction,
        hasInvestment: workflowState.hasInvestment,
        hasResult: workflowState.hasResult,
        isComplete: workflowState.isComplete,
        lastUpdated: workflowState.updatedAt
      };
    } catch (error) {
      console.error('ワークフロー状態取得エラー:', error);
      return null;
    }
  }

  /**
   * 未完了のワークフローを取得
   */
  async getIncompleteWorkflows(): Promise<IncompleteWorkflow[]> {
    try {
      const incompleteWorkflows = await db.workflowStates
        .where('isComplete')
        .equals(0) // Dexieでは boolean false は 0 として扱われる
        .toArray();

      const result: IncompleteWorkflow[] = [];

      for (const workflow of incompleteWorkflows) {
        // レース情報を取得
        const race = await db.races.get(workflow.raceId);
        if (!race) continue;

        // 経過日数を計算
        const daysElapsed = Math.floor(
          (Date.now() - workflow.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        // 次のアクションを決定
        let nextAction: IncompleteWorkflow['nextAction'];
        let actionDescription: string;
        let type: IncompleteWorkflow['type'];

        if (!workflow.hasInvestment && !workflow.hasResult) {
          nextAction = 'create_investment';
          actionDescription = '投資記録を作成するか、結果を入力してください';
          type = 'prediction-result';
        } else if (workflow.hasInvestment && !workflow.hasResult) {
          nextAction = 'complete_investment_result';
          actionDescription = '投資記録の結果を入力してください';
          type = 'investment-result';
        } else if (!workflow.hasInvestment && workflow.hasResult) {
          // 予想結果のみ入力済みの場合は完了扱い
          continue;
        } else {
          nextAction = 'enter_result';
          actionDescription = '結果を入力してください';
          type = 'prediction-result';
        }

        result.push({
          id: workflow.id,
          type,
          raceInfo: {
            raceId: race.id,
            raceName: `${race.venue} ${race.raceNumber}R`,
            venueName: race.venue,
            raceNumber: race.raceNumber,
            raceDate: new Date(race.date),
            startTime: (race as any).startTime ? new Date((race as any).startTime) : undefined
          },
          daysElapsed,
          priority: workflow.priority,
          currentStatus: {
            hasPrediction: workflow.hasPrediction,
            hasInvestment: workflow.hasInvestment,
            hasResult: workflow.hasResult,
            isComplete: workflow.isComplete,
            lastUpdated: workflow.updatedAt
          },
          nextAction,
          actionDescription
        });
      }

      // 優先度と経過日数でソート
      return result.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.daysElapsed - a.daysElapsed;
      });
    } catch (error) {
      console.error('未完了ワークフロー取得エラー:', error);
      return [];
    }
  }

  /**
   * ワークフロー統計を取得
   */
  async getWorkflowStats(): Promise<WorkflowStats> {
    try {
      const allWorkflows = await db.workflowStates.toArray();
      const completed = allWorkflows.filter(w => w.isComplete);
      const incomplete = allWorkflows.filter(w => !w.isComplete);
      const highPriorityIncomplete = incomplete.filter(w => w.priority === 'high');

      // 平均完了時間を計算（時間単位）
      let averageCompletionTime = 0;
      if (completed.length > 0) {
        const totalCompletionTime = completed.reduce((sum, w) => {
          if (w.completedAt && w.createdAt) {
            return sum + (w.completedAt.getTime() - w.createdAt.getTime());
          }
          return sum;
        }, 0);
        averageCompletionTime = totalCompletionTime / completed.length / (1000 * 60 * 60); // ミリ秒を時間に変換
      }

      return {
        total: allWorkflows.length,
        completed: completed.length,
        completionRate: allWorkflows.length > 0 ? (completed.length / allWorkflows.length) * 100 : 0,
        averageCompletionTime,
        incomplete: incomplete.length,
        highPriorityIncomplete: highPriorityIncomplete.length
      };
    } catch (error) {
      console.error('ワークフロー統計取得エラー:', error);
      return {
        total: 0,
        completed: 0,
        completionRate: 0,
        averageCompletionTime: 0,
        incomplete: 0,
        highPriorityIncomplete: 0
      };
    }
  }

  /**
   * ワークフローアクティビティを取得
   */
  async getWorkflowActivities(limit: number = 50): Promise<WorkflowActivity[]> {
    try {
      return await db.workflowActivities
        .orderBy('timestamp')
        .reverse()
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('ワークフローアクティビティ取得エラー:', error);
      return [];
    }
  }

  /**
   * 優先度を計算（レース開始時刻に基づく）
   */
  private calculatePriority(race: Race): WorkflowPriority {
    // レース開始時刻がない場合は中優先度
    if (!(race as any).startTime) {
      return WorkflowPriority.MEDIUM;
    }

    const now = new Date();
    const raceTime = new Date((race as any).startTime);
    const hoursUntilRace = (raceTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilRace <= 1) {
      return WorkflowPriority.HIGH;
    } else if (hoursUntilRace <= 24) {
      return WorkflowPriority.MEDIUM;
    } else {
      return WorkflowPriority.LOW;
    }
  }

  /**
   * ワークフローアクティビティを作成
   */
  private async createWorkflowActivity(
    activity: Omit<WorkflowActivity, 'id' | 'timestamp'>
  ): Promise<string> {
    try {
      const id = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.workflowActivities.add({
        ...activity,
        id,
        timestamp: new Date()
      });
      return id;
    } catch (error) {
      console.error('ワークフローアクティビティ作成エラー:', error);
      throw error;
    }
  }

  /**
   * 予想から投資記録フォームデータを生成
   * 予想データから投資記録の事前入力データを作成し、券種に応じた買い目候補を提供
   */
  async createInvestmentFromPrediction(predictionId: string): Promise<InvestmentFormData> {
    try {
      // 予想データを取得
      const prediction = await predictionRepository.findById(predictionId);
      if (!prediction) {
        throw new Error('指定された予想が見つかりません');
      }

      // レースデータを取得
      const race = await db.races.get(prediction.raceId);
      if (!race) {
        throw new Error('関連するレースが見つかりません');
      }

      // ワークフロー状態を取得
      const workflowState = await db.workflowStates
        .where('predictionId')
        .equals(predictionId)
        .first();

      if (!workflowState) {
        throw new Error('ワークフロー状態が見つかりません');
      }

      // 予想結果から上位馬を取得（スコア順にソート）
      const sortedPredictions = [...prediction.predictions].sort(
        (a, b) => b.scores.total - a.scores.total
      );

      // 券種別の推奨買い目を生成
      const recommendedSelections = this.generateRecommendedSelections(sortedPredictions);

      // 確信度レベルから投資額とリスクレベルを算出
      const { expectedValue, riskLevel } = this.calculateInvestmentMetrics(
        prediction.confidenceLevel,
        sortedPredictions
      );

      // 投資記録フォームデータを作成
      const formData: InvestmentFormData = {
        raceId: prediction.raceId,
        predictionId: prediction.id,
        betType: 'win', // デフォルトは単勝
        selections: recommendedSelections.win, // デフォルトは単勝の推奨買い目
        amount: 1000, // デフォルト投資額（設定から取得可能）
        odds: sortedPredictions[0]?.horse.odds || 1.0,
        venue: race.venue,
        raceNumber: race.raceNumber,
        raceDate: race.date,
        recommendedSelections,
        predictionConfidence: this.calculateConfidenceScore(prediction.confidenceLevel),
        expectedValue,
        riskLevel
      };

      console.log(`投資記録フォームデータを生成しました: ${predictionId}`);
      return formData;
    } catch (error) {
      console.error('投資記録フォームデータ生成エラー:', error);
      throw error;
    }
  }

  /**
   * 券種別の推奨買い目を生成
   */
  private generateRecommendedSelections(
    sortedPredictions: PredictionResult['predictions']
  ): InvestmentFormData['recommendedSelections'] {
    const topHorses = sortedPredictions.slice(0, 3).map(p => p.horse.number);
    
    return {
      win: [topHorses[0]], // 1位馬
      place: [topHorses[0]], // 1位馬
      exacta: topHorses.slice(0, 2), // 1位・2位馬
      quinella: topHorses.slice(0, 2), // 1位・2位馬
      trifecta: topHorses, // 1位・2位・3位馬
      trio: topHorses, // 1位・2位・3位馬
      tierce: topHorses // 1位・2位・3位馬
    };
  }

  /**
   * 投資メトリクス（期待値、リスクレベル）を計算
   */
  private calculateInvestmentMetrics(
    confidenceLevel: PredictionResult['confidenceLevel'],
    sortedPredictions: PredictionResult['predictions']
  ): { expectedValue: number; riskLevel: 'low' | 'medium' | 'high' } {
    if (!confidenceLevel || sortedPredictions.length === 0) {
      return { expectedValue: 0, riskLevel: 'high' };
    }

    const topHorse = sortedPredictions[0];
    const odds = topHorse.horse.odds || 1.0;
    
    // 確信度レベルから勝率を推定
    let estimatedWinRate: number;
    switch (confidenceLevel.overall) {
      case 'high':
        estimatedWinRate = 0.4; // 40%
        break;
      case 'medium':
        estimatedWinRate = 0.25; // 25%
        break;
      case 'low':
        estimatedWinRate = 0.15; // 15%
        break;
      default:
        estimatedWinRate = 0.1; // 10%
    }

    // 期待値 = (勝率 × オッズ) - 1
    const expectedValue = (estimatedWinRate * odds) - 1;

    // リスクレベルの判定
    let riskLevel: 'low' | 'medium' | 'high';
    if (confidenceLevel.overall === 'high' && expectedValue > 0.2) {
      riskLevel = 'low';
    } else if (confidenceLevel.overall === 'medium' && expectedValue > 0) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }

    return { expectedValue, riskLevel };
  }

  /**
   * 確信度レベルから数値スコアを計算
   */
  private calculateConfidenceScore(
    confidenceLevel: PredictionResult['confidenceLevel']
  ): number {
    if (!confidenceLevel) return 0;

    let baseScore: number;
    switch (confidenceLevel.overall) {
      case 'high':
        baseScore = 80;
        break;
      case 'medium':
        baseScore = 60;
        break;
      case 'low':
        baseScore = 40;
        break;
      default:
        baseScore = 20;
    }

    // トップピックのスコアとデータ品質で調整
    const topPickBonus = (confidenceLevel.topPick || 0) * 0.2;
    const dataQualityBonus = confidenceLevel.dataQuality === 'excellent' ? 10 :
                            confidenceLevel.dataQuality === 'good' ? 5 :
                            confidenceLevel.dataQuality === 'fair' ? 0 : -5;

    return Math.min(100, Math.max(0, baseScore + topPickBonus + dataQualityBonus));
  }

  /**
   * 統合結果入力機能
   * 予想結果の更新と投資記録の損益計算を同時実行
   */
  async updateResultsWithWorkflow(resultData: RaceResultInput): Promise<WorkflowUpdateResult> {
    const result: WorkflowUpdateResult = {
      predictionUpdated: false,
      investmentUpdated: false,
      accuracyCalculated: false,
      profitCalculated: false,
      errors: [],
      warnings: []
    };

    try {
      // トランザクション内で処理を実行
      await db.transaction('rw', 
        [db.predictions, db.investments, db.workflowStates, db.workflowActivities], 
        async () => {
          // 1. 予想データを取得
          const prediction = await predictionRepository.findById(resultData.predictionId);
          if (!prediction) {
            throw new Error('指定された予想が見つかりません');
          }

          // 2. ワークフロー状態を取得
          const workflowState = await db.workflowStates
            .where('predictionId')
            .equals(resultData.predictionId)
            .first();

          if (!workflowState) {
            throw new Error('ワークフロー状態が見つかりません');
          }

          // 3. 予想精度を計算
          const accuracyResult = this.calculatePredictionAccuracy(
            prediction.predictions,
            resultData.actualRanking
          );

          // 4. 予想結果を更新
          await predictionRepository.updateResult(resultData.predictionId, {
            actualRanking: resultData.actualRanking,
            accuracy: accuracyResult.accuracy,
            isCorrect: accuracyResult.isCorrect
          });

          // 予想のワークフロー状態を更新
          await db.predictions.update(resultData.predictionId, {
            isResultEntered: true,
            workflowStatus: workflowState.hasInvestment ? 'completed' : 'prediction_result_entered'
          });

          result.predictionUpdated = true;
          result.accuracyCalculated = true;

          // 5. 関連する投資記録を処理
          if (workflowState.investmentIds.length > 0) {
            for (const investmentId of workflowState.investmentIds) {
              try {
                const investment = await investmentRepository.findById(investmentId);
                if (!investment) {
                  result.warnings.push(`投資記録が見つかりません: ${investmentId}`);
                  continue;
                }

                // 損益を計算
                const profitResult = this.calculateInvestmentProfit(
                  investment,
                  resultData.actualRanking,
                  resultData.payoutData,
                  resultData.manualInvestmentUpdates
                );

                // 投資記録を更新
                await investmentRepository.update(investmentId, {
                  payout: profitResult.payout,
                  profit: profitResult.profit,
                  isResultConfirmed: true,
                  resultEnteredAt: new Date()
                });

                result.investmentUpdated = true;
                result.profitCalculated = true;
              } catch (investmentError) {
                const errorMessage = investmentError instanceof Error ? investmentError.message : String(investmentError);
                result.errors.push(`投資記録更新エラー (${investmentId}): ${errorMessage}`);
              }
            }
          }

          // 6. ワークフロー状態を更新
          await this.updateWorkflowState(workflowState.id, {
            hasResult: true,
            resultEnteredAt: new Date(),
            isComplete: true
          });

          // 7. ワークフローアクティビティを記録
          const race = await db.races.get(resultData.raceId);
          if (race) {
            await this.createWorkflowActivity({
              type: 'result-entered',
              workflowId: workflowState.id,
              predictionId: resultData.predictionId,
              raceInfo: {
                raceId: race.id,
                raceName: `${race.venue} ${race.raceNumber}R`,
                venueName: race.venue,
                raceNumber: race.raceNumber,
                raceDate: new Date(race.date)
              },
              details: `結果が入力されました（精度: ${accuracyResult.accuracy.toFixed(1)}%）`
            });

            // ワークフロー完了のアクティビティも記録
            await this.createWorkflowActivity({
              type: 'workflow-completed',
              workflowId: workflowState.id,
              predictionId: resultData.predictionId,
              raceInfo: {
                raceId: race.id,
                raceName: `${race.venue} ${race.raceNumber}R`,
                venueName: race.venue,
                raceNumber: race.raceNumber,
                raceDate: new Date(race.date)
              },
              details: 'ワークフローが完了しました'
            });
          }
        }
      );

      console.log(`統合結果入力が完了しました: ${resultData.predictionId}`);
      return result;
    } catch (error) {
      console.error('統合結果入力エラー:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      return result;
    }
  }

  /**
   * 予想精度を計算
   */
  private calculatePredictionAccuracy(
    predictions: PredictionResult['predictions'],
    actualRanking: number[]
  ): { accuracy: number; isCorrect: boolean } {
    if (predictions.length === 0 || actualRanking.length === 0) {
      return { accuracy: 0, isCorrect: false };
    }

    // 予想順位（スコア順）を取得
    const predictedRanking = [...predictions]
      .sort((a, b) => b.scores.total - a.scores.total)
      .map(p => p.horse.number);

    // 1着的中判定
    const isFirstCorrect = predictedRanking[0] === actualRanking[0];

    // 3着以内的中数を計算
    const top3Predicted = predictedRanking.slice(0, 3);
    const top3Actual = actualRanking.slice(0, 3);
    const top3Hits = top3Predicted.filter(num => top3Actual.includes(num)).length;

    // 精度スコアを計算（1着的中: 50点、3着以内的中: 各10点、順位ボーナス: 最大30点）
    let accuracy = 0;
    
    if (isFirstCorrect) {
      accuracy += 50; // 1着的中
    }
    
    accuracy += top3Hits * 10; // 3着以内的中

    // 順位ボーナス（予想順位と実際順位の差が小さいほど高得点）
    let positionBonus = 0;
    for (let i = 0; i < Math.min(3, predictedRanking.length, actualRanking.length); i++) {
      const predictedHorse = predictedRanking[i];
      const actualPosition = actualRanking.indexOf(predictedHorse);
      if (actualPosition !== -1) {
        const positionDiff = Math.abs(i - actualPosition);
        positionBonus += Math.max(0, 10 - positionDiff * 2);
      }
    }
    
    accuracy += Math.min(30, positionBonus);

    return {
      accuracy: Math.min(100, accuracy),
      isCorrect: isFirstCorrect
    };
  }

  /**
   * 投資記録の損益を計算
   */
  private calculateInvestmentProfit(
    investment: Investment,
    actualRanking: number[],
    payoutData?: RaceResultInput['payoutData'],
    manualUpdates?: RaceResultInput['manualInvestmentUpdates']
  ): { payout: number; profit: number } {
    // 手動更新データがある場合はそれを使用
    const manualUpdate = manualUpdates?.find(u => u.investmentId === investment.id);
    if (manualUpdate) {
      return {
        payout: manualUpdate.payout,
        profit: manualUpdate.profit
      };
    }

    // 自動計算を試行
    if (payoutData && this.isWinningBet(investment, actualRanking)) {
      const payout = this.calculatePayout(investment, payoutData);
      return {
        payout,
        profit: payout - investment.amount
      };
    }

    // 的中しなかった場合
    return {
      payout: 0,
      profit: -investment.amount
    };
  }

  /**
   * 投資が的中したかを判定
   */
  private isWinningBet(investment: Investment, actualRanking: number[]): boolean {
    const selections = investment.selections;
    
    switch (investment.betType) {
      case 'win':
        return selections.length > 0 && selections[0] === actualRanking[0];
      
      case 'place':
        return selections.length > 0 && actualRanking.slice(0, 3).includes(selections[0]);
      
      case 'exacta':
        return selections.length >= 2 && 
               selections[0] === actualRanking[0] && 
               selections[1] === actualRanking[1];
      
      case 'quinella':
        return selections.length >= 2 && 
               actualRanking.slice(0, 2).includes(selections[0]) &&
               actualRanking.slice(0, 2).includes(selections[1]) &&
               selections[0] !== selections[1];
      
      case 'trifecta':
        return selections.length >= 3 && 
               selections[0] === actualRanking[0] && 
               selections[1] === actualRanking[1] && 
               selections[2] === actualRanking[2];
      
      case 'trio':
        return selections.length >= 3 && 
               actualRanking.slice(0, 3).includes(selections[0]) &&
               actualRanking.slice(0, 3).includes(selections[1]) &&
               actualRanking.slice(0, 3).includes(selections[2]) &&
               new Set(selections.slice(0, 3)).size === 3;
      
      default:
        return false;
    }
  }

  /**
   * 配当額を計算
   */
  private calculatePayout(
    investment: Investment,
    payoutData: RaceResultInput['payoutData']
  ): number {
    if (!payoutData || !payoutData[investment.betType]) {
      return 0;
    }

    const betTypePayouts = payoutData[investment.betType];
    const combinationKey = investment.selections.join('-');
    
    // 完全一致する組み合わせを探す
    if (betTypePayouts[combinationKey]) {
      return (betTypePayouts[combinationKey] / 100) * investment.amount;
    }

    // 馬連・ワイドの場合は順序を逆にしても試す
    if (investment.betType === 'quinella' && investment.selections.length >= 2) {
      const reversedKey = [investment.selections[1], investment.selections[0]].join('-');
      if (betTypePayouts[reversedKey]) {
        return (betTypePayouts[reversedKey] / 100) * investment.amount;
      }
    }

    return 0;
  }
}

// シングルトンインスタンス
export const workflowService = new WorkflowService();