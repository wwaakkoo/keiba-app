import { raceRepository } from './repositories/RaceRepository';
import { predictionRepository } from './repositories/PredictionRepository';
import { investmentRepository } from './repositories/InvestmentRepository';
import { db } from './database';

// エクスポート設定の型定義
export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeRaces?: boolean;
  includePredictions?: boolean;
  includeInvestments?: boolean;
  includeSettings?: boolean;
  compression?: boolean;
}

// インポート結果の型定義
export interface ImportResult {
  success: boolean;
  importedItems: {
    races: number;
    predictions: number;
    investments: number;
    settings: number;
  };
  errors: string[];
  warnings: string[];
}

export class DataExportService {
  // 予想履歴のCSVエクスポート
  async exportPredictionsToCSV(options?: { dateRange?: { start: Date; end: Date } }): Promise<Blob> {
    try {
      const predictions = await predictionRepository.getHistory(1000);
      let filteredPredictions = predictions;

      // 日付範囲でフィルタ
      if (options?.dateRange) {
        filteredPredictions = predictions.filter(p => 
          p.timestamp >= options.dateRange!.start && 
          p.timestamp <= options.dateRange!.end
        );
      }

      // CSVヘッダー
      const headers = [
        'ID', '日時', 'レースID', '予想順位', '信頼度', '実際の順位', 
        '的中', '精度', 'タイムスタンプ'
      ];

      const csvRows = [headers.join(',')];

      // データ行の作成
      for (const prediction of filteredPredictions) {
        const _race = await raceRepository.findById(prediction.raceId);
        
        const row = [
          prediction.id,
          prediction.timestamp.toISOString(),
          prediction.raceId,
          prediction.predictions?.map(p => p.horse?.number).join('-') || '',
          prediction.confidence || '',
          prediction.actualRanking?.join('-') || '',
          prediction.isCorrect ? '○' : '×',
          prediction.accuracy || '',
          prediction.timestamp.getTime()
        ];
        
        csvRows.push(row.map(field => `"${field}"`).join(','));
      }

      const csvContent = csvRows.join('\n');
      return new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    } catch (error) {
      console.error('予想履歴CSVエクスポートエラー:', error);
      throw new Error('予想履歴のエクスポートに失敗しました');
    }
  }

  // 投資記録のCSVエクスポート
  async exportInvestmentsToCSV(options?: { dateRange?: { start: Date; end: Date } }): Promise<Blob> {
    try {
      let investments = await investmentRepository.getRecentInvestments(1000);

      // 日付範囲でフィルタ
      if (options?.dateRange) {
        investments = investments.filter(inv => 
          inv.timestamp >= options.dateRange!.start && 
          inv.timestamp <= options.dateRange!.end
        );
      }

      // CSVヘッダー
      const headers = [
        'ID', '日時', 'レースID', '予想ID', '券種', '買い目', 
        '投資額', 'オッズ', '払戻', '損益', '競馬場', 'レース番号', 'レース日'
      ];

      const csvRows = [headers.join(',')];

      // データ行の作成
      investments.forEach(investment => {
        const row = [
          investment.id,
          investment.timestamp.toISOString(),
          investment.raceId,
          investment.predictionId,
          investment.betType,
          investment.selections.join('-'),
          investment.amount,
          investment.odds,
          investment.payout,
          investment.profit,
          investment.venue || '',
          investment.raceNumber || '',
          investment.raceDate || ''
        ];
        
        csvRows.push(row.map(field => `"${field}"`).join(','));
      });

      const csvContent = csvRows.join('\n');
      return new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    } catch (error) {
      console.error('投資記録CSVエクスポートエラー:', error);
      throw new Error('投資記録のエクスポートに失敗しました');
    }
  }

  // 設定データのJSONエクスポート
  async exportSettingsToJSON(): Promise<Blob> {
    try {
      const settings = await db.settings.toArray();
      const syncStatus = await db.syncStatus.toArray();

      const exportData = {
        settings,
        syncStatus,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      return new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
    } catch (error) {
      console.error('設定データJSONエクスポートエラー:', error);
      throw new Error('設定データのエクスポートに失敗しました');
    }
  }

  // 全データの包括的エクスポート
  async exportAllData(options: ExportOptions): Promise<Blob> {
    try {
      const exportData: any = {
        metadata: {
          exportedAt: new Date().toISOString(),
          version: '1.0',
          options
        }
      };

      // レースデータ
      if (options.includeRaces) {
        let races = await raceRepository.getAll();
        
        if (options.dateRange) {
          races = races.filter(race => {
            const raceDate = new Date(race.date);
            return raceDate >= options.dateRange!.start && raceDate <= options.dateRange!.end;
          });
        }
        
        exportData.races = races;
      }

      // 予想データ
      if (options.includePredictions) {
        let predictions = await predictionRepository.getHistory(10000);
        
        if (options.dateRange) {
          predictions = predictions.filter(p => 
            p.timestamp >= options.dateRange!.start && 
            p.timestamp <= options.dateRange!.end
          );
        }
        
        exportData.predictions = predictions;
      }

      // 投資データ
      if (options.includeInvestments) {
        let investments = await investmentRepository.getRecentInvestments(10000);
        
        if (options.dateRange) {
          investments = investments.filter(inv => 
            inv.timestamp >= options.dateRange!.start && 
            inv.timestamp <= options.dateRange!.end
          );
        }
        
        exportData.investments = investments;
      }

      // 設定データ
      if (options.includeSettings) {
        exportData.settings = await db.settings.toArray();
        exportData.syncStatus = await db.syncStatus.toArray();
      }

      // フォーマットに応じてエクスポート
      switch (options.format) {
        case 'json':
          const jsonContent = JSON.stringify(exportData, null, 2);
          return new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
          
        case 'csv':
          // CSVの場合は複数ファイルをZIPにまとめる（簡略化のためJSONで返す）
          return new Blob([JSON.stringify(exportData, null, 2)], { 
            type: 'application/json;charset=utf-8' 
          });
          
        default:
          throw new Error(`サポートされていないフォーマット: ${options.format}`);
      }
    } catch (error) {
      console.error('全データエクスポートエラー:', error);
      throw new Error('データのエクスポートに失敗しました');
    }
  }

  // データのインポート
  async importData(file: File): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      importedItems: {
        races: 0,
        predictions: 0,
        investments: 0,
        settings: 0
      },
      errors: [],
      warnings: []
    };

    try {
      const fileContent = await this.readFileContent(file);
      let importData: any;

      // ファイル形式の判定と解析
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        try {
          importData = JSON.parse(fileContent);
        } catch (parseError) {
          throw new Error('JSONファイルの解析に失敗しました。ファイル形式を確認してください。');
        }
      } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        // CSV形式の場合は投資記録として扱う
        return await this.importInvestmentsFromCSV(fileContent);
      } else {
        throw new Error('サポートされていないファイル形式です');
      }

      // データの検証と正規化
      if (!this.validateImportData(importData)) {
        throw new Error('無効なデータ形式です。エクスポートされた正しいJSONファイルを選択してください。');
      }

      // データの正規化（古い形式のデータを新しい形式に変換）
      importData = this.normalizeImportData(importData);

      // トランザクション内でインポート実行
      await db.transaction('rw', db.races, db.predictions, db.investments, db.settings, async () => {
        // レースデータのインポート
        if (importData.races && Array.isArray(importData.races)) {
          for (const raceData of importData.races) {
            try {
              const existingRace = await raceRepository.findById(raceData.id);
              if (existingRace) {
                result.warnings.push(`レース ${raceData.id} は既に存在します（スキップ）`);
              } else {
                // 必須フィールドの確認と設定
                const normalizedRaceData = {
                  ...raceData,
                  createdAt: raceData.createdAt ? new Date(raceData.createdAt) : new Date(),
                  updatedAt: raceData.updatedAt ? new Date(raceData.updatedAt) : new Date(),
                  // 日付を正規化
                  date: raceData.date ? (typeof raceData.date === 'string' ? raceData.date : new Date(raceData.date).toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
                  // レース詳細情報の必須フィールドを明示的に設定
                  venue: raceData.venue || '不明',
                  raceNumber: raceData.raceNumber || 1,
                  distance: raceData.distance || 1200,
                  surface: raceData.surface || 'turf',
                  condition: raceData.condition || 'good',
                  horses: raceData.horses || [],
                  // オプショナルフィールド
                  grade: raceData.grade || undefined,
                  prizeMoney: raceData.prizeMoney || undefined,
                  weather: raceData.weather || undefined
                };
                
                // 元のIDを保持してダイレクトにDBに挿入
                await db.races.put({ ...normalizedRaceData, id: raceData.id });
                result.importedItems.races++;
              }
            } catch (error) {
              console.error('レースインポートエラー詳細:', error);
              result.errors.push(`レース ${raceData.id || '不明'} のインポートに失敗: ${error instanceof Error ? error.message : '不明なエラー'}`);
            }
          }
        }

        // 予想データのインポート
        if (importData.predictions && Array.isArray(importData.predictions)) {
          for (const predictionData of importData.predictions) {
            try {
              const existingPrediction = await predictionRepository.findById(predictionData.id);
              if (existingPrediction) {
                result.warnings.push(`予想 ${predictionData.id} は既に存在します（スキップ）`);
              } else {
                // 新しいスキーマに適合するよう正規化
                const normalizedPredictionData = {
                  ...predictionData,
                  timestamp: predictionData.timestamp ? new Date(predictionData.timestamp) : new Date(),
                  workflowStatus: predictionData.workflowStatus || (predictionData.isResultEntered ? 'prediction_result_entered' : 'prediction_only'),
                  relatedInvestmentIds: predictionData.relatedInvestmentIds || []
                };
                
                // IDを除去してsaveメソッドに渡す
                const { id, ...dataWithoutId } = normalizedPredictionData;
                const newId = await predictionRepository.save(dataWithoutId);
                
                // 元のIDで更新（IDの整合性を保つため）
                if (id && id !== newId) {
                  await db.predictions.delete(newId);
                  await db.predictions.put({ ...normalizedPredictionData, id });
                }
                
                result.importedItems.predictions++;
              }
            } catch (error) {
              console.error('予想インポートエラー詳細:', error);
              result.errors.push(`予想 ${predictionData.id || '不明'} のインポートに失敗: ${error instanceof Error ? error.message : '不明なエラー'}`);
            }
          }
        }

        // 投資データのインポート
        if (importData.investments && Array.isArray(importData.investments)) {
          for (const investmentData of importData.investments) {
            try {
              const existingInvestment = await investmentRepository.findById(investmentData.id);
              if (existingInvestment) {
                result.warnings.push(`投資記録 ${investmentData.id} は既に存在します（スキップ）`);
              } else {
                // 新しいスキーマに適合するよう正規化
                const normalizedInvestmentData = {
                  ...investmentData,
                  timestamp: investmentData.timestamp ? new Date(investmentData.timestamp) : new Date(),
                  isResultConfirmed: investmentData.isResultConfirmed || false,
                  resultEnteredAt: investmentData.resultEnteredAt ? new Date(investmentData.resultEnteredAt) : undefined
                };
                await investmentRepository.record(normalizedInvestmentData);
                result.importedItems.investments++;
              }
            } catch (error) {
              console.error('投資インポートエラー詳細:', error);
              result.errors.push(`投資記録 ${investmentData.id || '不明'} のインポートに失敗: ${error instanceof Error ? error.message : '不明なエラー'}`);
            }
          }
        }

        // 設定データのインポート
        if (importData.settings && Array.isArray(importData.settings)) {
          for (const settingData of importData.settings) {
            try {
              // 設定データを正規化
              const normalizedSettingData = {
                ...settingData,
                createdAt: settingData.createdAt ? new Date(settingData.createdAt) : new Date(),
                updatedAt: new Date(), // インポート時は現在時刻に更新
                // デフォルト値の確保
                theme: settingData.theme || 'auto',
                notifications: settingData.notifications !== undefined ? settingData.notifications : true,
                autoSync: settingData.autoSync !== undefined ? settingData.autoSync : true,
                defaultBetAmount: settingData.defaultBetAmount || 1000,
                riskLevel: settingData.riskLevel || 'moderate',
                predictionWeights: settingData.predictionWeights || { speed: 0.4, recent: 0.4, odds: 0.2 },
                investmentLimits: settingData.investmentLimits || {
                  dailyLimit: 10000,
                  weeklyLimit: 50000,
                  monthlyLimit: 200000,
                  maxBetAmount: 5000
                }
              };
              
              await db.settings.put(normalizedSettingData);
              result.importedItems.settings++;
            } catch (error) {
              console.error('設定インポートエラー詳細:', error);
              result.errors.push(`設定データのインポートに失敗: ${error instanceof Error ? error.message : '不明なエラー'}`);
            }
          }
        }
      });

      // インポート後の検証と警告
      const totalImported = result.importedItems.races + result.importedItems.predictions + 
                           result.importedItems.investments + result.importedItems.settings;
      
      if (totalImported === 0 && result.warnings.length === 0) {
        result.warnings.push('インポート可能な新しいデータが見つかりませんでした。すべてのデータが既に存在している可能性があります。');
      }

      result.success = result.errors.length === 0;
      
      console.log('データインポート完了:', {
        success: result.success,
        importedItems: result.importedItems,
        totalImported,
        errorCount: result.errors.length,
        warningCount: result.warnings.length
      });
      
      // 成功した場合の追加メッセージ
      if (result.success && totalImported > 0) {
        result.warnings.unshift(`合計 ${totalImported} 件のデータが正常にインポートされました。`);
      }
      
      return result;
    } catch (error) {
      console.error('データインポート致命的エラー:', error);
      
      // より詳細なエラー情報を追加
      if (error instanceof Error) {
        result.errors.push(`インポート処理中に致命的なエラーが発生しました: ${error.message}`);
        
        // スタックトレースがある場合は詳細をコンソールに出力
        if (error.stack) {
          console.error('エラーのスタックトレース:', error.stack);
        }
      } else {
        result.errors.push('データインポート中に不明なエラーが発生しました');
      }
      
      return result;
    }
  }

  // CSVから投資記録をインポート
  private async importInvestmentsFromCSV(csvContent: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      importedItems: { races: 0, predictions: 0, investments: 0, settings: 0 },
      errors: [],
      warnings: []
    };

    try {
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      
      // 必要なヘッダーの確認
      const requiredHeaders = ['投資額', '券種', '買い目'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        throw new Error(`必要なヘッダーが不足しています: ${missingHeaders.join(', ')}`);
      }

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const values = line.split(',').map(v => v.replace(/"/g, '').trim());
          const rowData: any = {};
          
          headers.forEach((header, index) => {
            rowData[header] = values[index];
          });

          // 投資記録データの作成
          const investmentData = {
            raceId: rowData['レースID'] || `imported-${Date.now()}-${i}`,
            predictionId: rowData['予想ID'] || `imported-${Date.now()}-${i}`,
            betType: rowData['券種'] || 'win',
            selections: rowData['買い目'] ? rowData['買い目'].split('-').map(Number) : [1],
            amount: parseFloat(rowData['投資額']) || 0,
            odds: parseFloat(rowData['オッズ']) || 0,
            payout: parseFloat(rowData['払戻']) || 0,
            profit: parseFloat(rowData['損益']) || 0,
            timestamp: rowData['日時'] ? new Date(rowData['日時']) : new Date(),
            venue: rowData['競馬場'],
            raceNumber: parseInt(rowData['レース番号']) || undefined,
            raceDate: rowData['レース日']
          };

          await investmentRepository.record(investmentData);
          result.importedItems.investments++;
        } catch (error) {
          result.errors.push(`行 ${i + 1} のインポートに失敗: ${error}`);
        }
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      console.error('CSV投資記録インポートエラー:', error);
      result.errors.push(error instanceof Error ? error.message : '不明なエラー');
      return result;
    }
  }

  // ファイル内容の読み取り
  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (_e) => reject(new Error('ファイルの読み取りに失敗しました'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  // インポートデータの検証
  private validateImportData(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // 基本的な構造チェック
    const validStructure = 
      data.metadata ||
      data.races ||
      data.predictions ||
      data.investments ||
      data.settings;

    return !!validStructure;
  }

  // インポートデータの正規化（古い形式から新しい形式への変換）
  private normalizeImportData(data: any): any {
    const normalizedData = { ...data };

    // 予想データの正規化
    if (normalizedData.predictions && Array.isArray(normalizedData.predictions)) {
      normalizedData.predictions = normalizedData.predictions.map((prediction: any) => ({
        ...prediction,
        // 新しいワークフロー関連フィールドを追加
        workflowStatus: prediction.workflowStatus || 
          (prediction.isResultEntered ? 'prediction_result_entered' : 'prediction_only'),
        relatedInvestmentIds: prediction.relatedInvestmentIds || [],
        // タイムスタンプを正規化
        timestamp: prediction.timestamp ? new Date(prediction.timestamp) : new Date(),
        // その他の互換性確保
        predictions: prediction.predictions || [],
        confidence: prediction.confidence || 0,
        accuracy: prediction.accuracy || null,
        actualRanking: prediction.actualRanking || null,
        isCorrect: prediction.isCorrect || false
      }));
    }

    // 投資データの正規化
    if (normalizedData.investments && Array.isArray(normalizedData.investments)) {
      normalizedData.investments = normalizedData.investments.map((investment: any) => ({
        ...investment,
        // 新しい結果確認関連フィールドを追加
        isResultConfirmed: investment.isResultConfirmed || false,
        resultEnteredAt: investment.resultEnteredAt ? new Date(investment.resultEnteredAt) : undefined,
        // タイムスタンプを正規化
        timestamp: investment.timestamp ? new Date(investment.timestamp) : new Date(),
        // その他の互換性確保
        betType: investment.betType || 'win',
        selections: investment.selections || [1],
        amount: investment.amount || 0,
        odds: investment.odds || 0,
        payout: investment.payout || 0,
        profit: investment.profit || 0
      }));
    }

    // レースデータの正規化
    if (normalizedData.races && Array.isArray(normalizedData.races)) {
      normalizedData.races = normalizedData.races.map((race: any) => ({
        ...race,
        // 作成・更新日時を正規化
        createdAt: race.createdAt ? new Date(race.createdAt) : new Date(),
        updatedAt: race.updatedAt ? new Date(race.updatedAt) : new Date(),
        // 日付フィールドを正規化
        date: race.date ? (typeof race.date === 'string' ? race.date : new Date(race.date).toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
        // その他の必須フィールドを確保
        venue: race.venue || '不明',
        raceNumber: race.raceNumber || 1,
        horses: race.horses || [],
        // レース詳細情報の必須フィールドを設定
        distance: race.distance || 1200, // デフォルト距離
        surface: race.surface || 'turf', // デフォルト芝
        condition: race.condition || 'good', // デフォルト良馬場
        grade: race.grade || undefined,
        prizeMoney: race.prizeMoney || undefined,
        weather: race.weather || undefined
      }));
    }

    // 設定データの正規化
    if (normalizedData.settings && Array.isArray(normalizedData.settings)) {
      normalizedData.settings = normalizedData.settings.map((setting: any) => ({
        ...setting,
        // 作成・更新日時を正規化
        createdAt: setting.createdAt ? new Date(setting.createdAt) : new Date(),
        updatedAt: setting.updatedAt ? new Date(setting.updatedAt) : new Date(),
        // デフォルト値を設定
        theme: setting.theme || 'auto',
        notifications: setting.notifications !== undefined ? setting.notifications : true,
        autoSync: setting.autoSync !== undefined ? setting.autoSync : true,
        defaultBetAmount: setting.defaultBetAmount || 1000,
        riskLevel: setting.riskLevel || 'moderate',
        predictionWeights: setting.predictionWeights || { speed: 0.4, recent: 0.4, odds: 0.2 },
        investmentLimits: setting.investmentLimits || {
          dailyLimit: 10000,
          weeklyLimit: 50000,
          monthlyLimit: 200000,
          maxBetAmount: 5000
        }
      }));
    }

    return normalizedData;
  }

  // ファイルダウンロードのヘルパー
  static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ファイル名の生成
  static generateFilename(type: string, format: string): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    
    return `keiba-${type}-${dateStr}-${timeStr}.${format}`;
  }
}

// シングルトンインスタンス
export const dataExportService = new DataExportService();