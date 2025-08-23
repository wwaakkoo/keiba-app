import { db } from './database';
import { PredictionResult } from '@/types/prediction';

/**
 * データベースマイグレーション機能
 * 既存データの不整合を修正する
 */
export class DataMigrationService {
  /**
   * 競馬場情報の修正
   * 「東京」がデフォルト値として設定されている予想データを修正
   */
  static async fixVenueData(): Promise<{
    totalChecked: number;
    totalFixed: number;
    fixedRecords: Array<{ id: string; oldVenue: string; newVenue: string }>;
  }> {
    console.log('🔧 競馬場データ修正を開始します...');
    
    try {
      // 全ての予想データを取得
      const allPredictions = await db.predictions.toArray();
      console.log(`📊 チェック対象: ${allPredictions.length}件の予想データ`);
      
      let totalFixed = 0;
      const fixedRecords: Array<{ id: string; oldVenue: string; newVenue: string }> = [];
      
      for (const prediction of allPredictions) {
        let needsUpdate = false;
        let newVenue = prediction.race?.venue;
        
        // raceIdから競馬場情報を推測
        if (prediction.raceId && prediction.race?.venue === '東京') {
          const raceIdParts = prediction.raceId.split('_');
          if (raceIdParts.length >= 3) {
            const venueFromRaceId = raceIdParts[0];
            
            // 有効な競馬場名かチェック
            const validVenues = ['札幌', '函館', '福島', '新潟', '東京', '中山', '中京', '京都', '阪神', '小倉'];
            if (validVenues.includes(venueFromRaceId) && venueFromRaceId !== '東京') {
              newVenue = venueFromRaceId;
              needsUpdate = true;
            }
          }
        }
        
        // 「未設定」の場合もraceIdから推測
        if (prediction.raceId && (prediction.race?.venue === '未設定' || !prediction.race?.venue)) {
          const raceIdParts = prediction.raceId.split('_');
          if (raceIdParts.length >= 3) {
            const venueFromRaceId = raceIdParts[0];
            const validVenues = ['札幌', '函館', '福島', '新潟', '東京', '中山', '中京', '京都', '阪神', '小倉'];
            if (validVenues.includes(venueFromRaceId)) {
              newVenue = venueFromRaceId;
              needsUpdate = true;
            }
          }
        }
        
        // 更新が必要な場合
        if (needsUpdate && newVenue && newVenue !== prediction.race?.venue) {
          const oldVenue = prediction.race?.venue || '未設定';
          
          // データベースを更新
          await db.predictions.update(prediction.id, {
            race: {
              ...prediction.race,
              venue: newVenue
            }
          });
          
          totalFixed++;
          fixedRecords.push({
            id: prediction.id,
            oldVenue,
            newVenue
          });
          
          console.log(`✅ 修正: ${prediction.id} - ${oldVenue} → ${newVenue}`);
        }
      }
      
      console.log(`🎉 競馬場データ修正完了: ${totalFixed}件を修正しました`);
      
      return {
        totalChecked: allPredictions.length,
        totalFixed,
        fixedRecords
      };
    } catch (error) {
      console.error('❌ 競馬場データ修正エラー:', error);
      throw error;
    }
  }
  
  /**
   * 投資記録の競馬場情報も同様に修正
   */
  static async fixInvestmentVenueData(): Promise<{
    totalChecked: number;
    totalFixed: number;
    fixedRecords: Array<{ id: string; oldVenue: string; newVenue: string }>;
  }> {
    console.log('🔧 投資記録の競馬場データ修正を開始します...');
    
    try {
      const allInvestments = await db.investments.toArray();
      console.log(`📊 チェック対象: ${allInvestments.length}件の投資記録`);
      
      let totalFixed = 0;
      const fixedRecords: Array<{ id: string; oldVenue: string; newVenue: string }> = [];
      
      for (const investment of allInvestments) {
        let needsUpdate = false;
        let newVenue = investment.venue;
        
        // raceIdから競馬場情報を推測
        if (investment.raceId && investment.venue === '東京') {
          const raceIdParts = investment.raceId.split('_');
          if (raceIdParts.length >= 3) {
            const venueFromRaceId = raceIdParts[0];
            const validVenues = ['札幌', '函館', '福島', '新潟', '東京', '中山', '中京', '京都', '阪神', '小倉'];
            if (validVenues.includes(venueFromRaceId) && venueFromRaceId !== '東京') {
              newVenue = venueFromRaceId;
              needsUpdate = true;
            }
          }
        }
        
        // 更新が必要な場合
        if (needsUpdate && newVenue && newVenue !== investment.venue) {
          const oldVenue = investment.venue || '未設定';
          
          await db.investments.update(investment.id, {
            venue: newVenue
          });
          
          totalFixed++;
          fixedRecords.push({
            id: investment.id,
            oldVenue,
            newVenue
          });
          
          console.log(`✅ 投資記録修正: ${investment.id} - ${oldVenue} → ${newVenue}`);
        }
      }
      
      console.log(`🎉 投資記録の競馬場データ修正完了: ${totalFixed}件を修正しました`);
      
      return {
        totalChecked: allInvestments.length,
        totalFixed,
        fixedRecords
      };
    } catch (error) {
      console.error('❌ 投資記録の競馬場データ修正エラー:', error);
      throw error;
    }
  }
  
  /**
   * 全データの整合性チェックと修正
   */
  static async runFullMigration(): Promise<{
    predictions: { totalChecked: number; totalFixed: number };
    investments: { totalChecked: number; totalFixed: number };
    summary: string;
  }> {
    console.log('🚀 データマイグレーション開始');
    
    const predictionResult = await this.fixVenueData();
    const investmentResult = await this.fixInvestmentVenueData();
    
    const summary = `
データマイグレーション完了:
- 予想データ: ${predictionResult.totalChecked}件中${predictionResult.totalFixed}件を修正
- 投資記録: ${investmentResult.totalChecked}件中${investmentResult.totalFixed}件を修正
- 合計修正件数: ${predictionResult.totalFixed + investmentResult.totalFixed}件
    `.trim();
    
    console.log('🎉 ' + summary);
    
    return {
      predictions: {
        totalChecked: predictionResult.totalChecked,
        totalFixed: predictionResult.totalFixed
      },
      investments: {
        totalChecked: investmentResult.totalChecked,
        totalFixed: investmentResult.totalFixed
      },
      summary
    };
  }
}

export const dataMigrationService = DataMigrationService;