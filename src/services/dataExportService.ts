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
        const race = await raceRepository.findById(prediction.raceId);
        
        const row = [
          prediction.id,
          prediction.timestamp.toISOString(),
          prediction.raceId,
          prediction.predictions?.map(p => p.number).join('-') || '',
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
        importData = JSON.parse(fileContent);
      } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        // CSV形式の場合は投資記録として扱う
        return await this.importInvestmentsFromCSV(fileContent);
      } else {
        throw new Error('サポートされていないファイル形式です');
      }

      // データの検証
      if (!this.validateImportData(importData)) {
        throw new Error('無効なデータ形式です');
      }

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
                await raceRepository.create(raceData);
                result.importedItems.races++;
              }
            } catch (error) {
              result.errors.push(`レース ${raceData.id} のインポートに失敗: ${error}`);
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
                await predictionRepository.save(predictionData);
                result.importedItems.predictions++;
              }
            } catch (error) {
              result.errors.push(`予想 ${predictionData.id} のインポートに失敗: ${error}`);
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
                await investmentRepository.record(investmentData);
                result.importedItems.investments++;
              }
            } catch (error) {
              result.errors.push(`投資記録 ${investmentData.id} のインポートに失敗: ${error}`);
            }
          }
        }

        // 設定データのインポート
        if (importData.settings && Array.isArray(importData.settings)) {
          for (const settingData of importData.settings) {
            try {
              await db.settings.put(settingData);
              result.importedItems.settings++;
            } catch (error) {
              result.errors.push(`設定データのインポートに失敗: ${error}`);
            }
          }
        }
      });

      result.success = result.errors.length === 0;
      console.log('データインポート完了:', result);
      
      return result;
    } catch (error) {
      console.error('データインポートエラー:', error);
      result.errors.push(error instanceof Error ? error.message : '不明なエラー');
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
      reader.onerror = (e) => reject(new Error('ファイルの読み取りに失敗しました'));
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