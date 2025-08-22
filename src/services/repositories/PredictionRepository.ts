import { db } from '../database';
import { PredictionResult, HorseAnalysis } from '@/types/prediction';
import { v4 as uuidv4 } from 'uuid';

export interface PredictionRepository {
  save(prediction: Omit<PredictionResult, 'id'>): Promise<string>;
  findById(id: string): Promise<PredictionResult | null>;
  findByRaceId(raceId: string): Promise<PredictionResult[]>;
  getHistory(limit?: number): Promise<PredictionResult[]>;
  updateResult(id: string, actualResult: { 
    actualRanking: number[]; 
    accuracy: number; 
    isCorrect: boolean 
  }): Promise<void>;
  delete(id: string): Promise<void>;
  getAccuracyStats(): Promise<{
    totalPredictions: number;
    correctPredictions: number;
    accuracy: number;
    averageConfidence: number;
  }>;
  getRecentAccuracy(days: number): Promise<number>;
  getPendingPredictions(): Promise<PredictionResult[]>;
}

export class PredictionRepositoryImpl implements PredictionRepository {
  async save(predictionData: Omit<PredictionResult, 'id'>): Promise<string> {
    try {
      const prediction: PredictionResult = {
        ...predictionData,
        id: uuidv4(),
        timestamp: predictionData.timestamp || new Date()
      };

      await db.predictions.add(prediction);
      return prediction.id;
    } catch (error) {
      console.error('予想保存エラー:', error);
      throw new Error('予想の保存に失敗しました');
    }
  }

  async findById(id: string): Promise<PredictionResult | null> {
    try {
      const prediction = await db.predictions.get(id);
      return prediction || null;
    } catch (error) {
      console.error('予想取得エラー:', error);
      return null;
    }
  }

  async findByRaceId(raceId: string): Promise<PredictionResult[]> {
    try {
      return await db.predictions
        .where('raceId')
        .equals(raceId)
        .reverse()
        .sortBy('timestamp');
    } catch (error) {
      console.error('レース別予想取得エラー:', error);
      return [];
    }
  }

  async getHistory(limit: number = 50): Promise<PredictionResult[]> {
    try {
      return await db.predictions
        .orderBy('timestamp')
        .reverse()
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('予想履歴取得エラー:', error);
      return [];
    }
  }

  async updateResult(
    id: string, 
    actualResult: { 
      actualRanking: number[]; 
      accuracy: number; 
      isCorrect: boolean 
    }
  ): Promise<void> {
    try {
      const existingPrediction = await this.findById(id);
      if (!existingPrediction) {
        throw new Error('更新対象の予想が見つかりません');
      }

      await db.predictions.update(id, {
        actualRanking: actualResult.actualRanking,
        accuracy: actualResult.accuracy,
        isCorrect: actualResult.isCorrect
      });
    } catch (error) {
      console.error('予想結果更新エラー:', error);
      throw new Error('予想結果の更新に失敗しました');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const deleteCount = await db.predictions.delete(id);
      if (deleteCount === 0) {
        throw new Error('削除対象の予想が見つかりません');
      }
    } catch (error) {
      console.error('予想削除エラー:', error);
      throw new Error('予想の削除に失敗しました');
    }
  }

  async getAccuracyStats(): Promise<{
    totalPredictions: number;
    correctPredictions: number;
    accuracy: number;
    averageConfidence: number;
  }> {
    try {
      const predictions = await db.predictions.toArray();
      const completedPredictions = predictions.filter(p => p.accuracy !== undefined);
      
      const totalPredictions = completedPredictions.length;
      const correctPredictions = completedPredictions.filter(p => p.isCorrect).length;
      const accuracy = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
      
      const totalConfidence = predictions.reduce((sum, p) => sum + (p.confidence || 0), 0);
      const averageConfidence = predictions.length > 0 ? totalConfidence / predictions.length : 0;

      return {
        totalPredictions,
        correctPredictions,
        accuracy,
        averageConfidence
      };
    } catch (error) {
      console.error('精度統計取得エラー:', error);
      return {
        totalPredictions: 0,
        correctPredictions: 0,
        accuracy: 0,
        averageConfidence: 0
      };
    }
  }

  async getRecentAccuracy(days: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const recentPredictions = await db.predictions
        .where('timestamp')
        .above(cutoffDate)
        .toArray();

      const completedPredictions = recentPredictions.filter(p => p.accuracy !== undefined);
      
      if (completedPredictions.length === 0) return 0;
      
      const correctPredictions = completedPredictions.filter(p => p.isCorrect).length;
      return (correctPredictions / completedPredictions.length) * 100;
    } catch (error) {
      console.error('最近の精度取得エラー:', error);
      return 0;
    }
  }

  // 期間別統計
  async getAccuracyByPeriod(startDate: Date, endDate: Date): Promise<{
    period: { start: Date; end: Date };
    accuracy: number;
    totalPredictions: number;
    correctPredictions: number;
  }> {
    try {
      const predictions = await db.predictions
        .where('timestamp')
        .between(startDate, endDate)
        .toArray();

      const completedPredictions = predictions.filter(p => p.accuracy !== undefined);
      const totalPredictions = completedPredictions.length;
      const correctPredictions = completedPredictions.filter(p => p.isCorrect).length;
      const accuracy = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;

      return {
        period: { start: startDate, end: endDate },
        accuracy,
        totalPredictions,
        correctPredictions
      };
    } catch (error) {
      console.error('期間別精度取得エラー:', error);
      return {
        period: { start: startDate, end: endDate },
        accuracy: 0,
        totalPredictions: 0,
        correctPredictions: 0
      };
    }
  }

  // 信頼度別統計
  async getAccuracyByConfidence(): Promise<Array<{
    confidenceRange: string;
    accuracy: number;
    count: number;
  }>> {
    try {
      const predictions = await db.predictions.toArray();
      const completedPredictions = predictions.filter(p => 
        p.accuracy !== undefined && p.confidence !== undefined
      );

      const ranges = [
        { min: 0, max: 0.2, label: '0-20%' },
        { min: 0.2, max: 0.4, label: '20-40%' },
        { min: 0.4, max: 0.6, label: '40-60%' },
        { min: 0.6, max: 0.8, label: '60-80%' },
        { min: 0.8, max: 1.0, label: '80-100%' }
      ];

      return ranges.map(range => {
        const rangeData = completedPredictions.filter(p => 
          p.confidence! >= range.min && p.confidence! < range.max
        );
        
        const count = rangeData.length;
        const correctCount = rangeData.filter(p => p.isCorrect).length;
        const accuracy = count > 0 ? (correctCount / count) * 100 : 0;

        return {
          confidenceRange: range.label,
          accuracy,
          count
        };
      });
    } catch (error) {
      console.error('信頼度別精度取得エラー:', error);
      return [];
    }
  }

  // バッチ操作
  async saveMany(predictions: Omit<PredictionResult, 'id'>[]): Promise<string[]> {
    try {
      const predictionsWithIds: PredictionResult[] = predictions.map(prediction => ({
        ...prediction,
        id: uuidv4(),
        timestamp: prediction.timestamp || new Date()
      }));

      await db.predictions.bulkAdd(predictionsWithIds);
      return predictionsWithIds.map(p => p.id);
    } catch (error) {
      console.error('予想一括保存エラー:', error);
      throw new Error('予想の一括保存に失敗しました');
    }
  }

  async deleteMany(ids: string[]): Promise<void> {
    try {
      await db.predictions.bulkDelete(ids);
    } catch (error) {
      console.error('予想一括削除エラー:', error);
      throw new Error('予想の一括削除に失敗しました');
    }
  }

  // 投資記録が未作成の予想一覧を取得
  async getPendingPredictions(): Promise<PredictionResult[]> {
    try {
      const predictions = await db.predictions
        .orderBy('timestamp')
        .reverse()
        .toArray();

      // 投資記録が関連付けられていない予想をフィルター
      const pendingPredictions = predictions.filter(prediction => {
        // workflowStatusが'prediction_only'または未設定の予想
        return !prediction.workflowStatus || 
               prediction.workflowStatus === 'prediction_only' ||
               (prediction.relatedInvestmentIds && prediction.relatedInvestmentIds.length === 0);
      });

      return pendingPredictions;
    } catch (error) {
      console.error('保留中予想取得エラー:', error);
      return [];
    }
  }
}

// シングルトンインスタンス
export const predictionRepository = new PredictionRepositoryImpl();