import React, { useState, useRef } from 'react';
import { Download, Upload, FileText, Database, Settings, Calendar, CheckCircle, AlertCircle, X } from 'lucide-react';
import { dataExportService, ExportOptions, ImportResult } from '@/services/dataExportService';

interface DataExportImportProps {
  onClose?: () => void;
  className?: string;
}

type ExportType = 'predictions' | 'investments' | 'settings' | 'all';

export const DataExportImport: React.FC<DataExportImportProps> = ({
  onClose,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportType, setExportType] = useState<ExportType>('predictions');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [dateRange, setDateRange] = useState({
    enabled: false,
    start: '',
    end: ''
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // エクスポート実行
  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportStatus(null);

      let blob: Blob;
      let filename: string;

      const options: ExportOptions = {
        format: exportFormat,
        dateRange: dateRange.enabled ? {
          start: new Date(dateRange.start),
          end: new Date(dateRange.end)
        } : undefined
      };

      switch (exportType) {
        case 'predictions':
          blob = await dataExportService.exportPredictionsToCSV(options.dateRange ? { dateRange: options.dateRange } : undefined);
          filename = dataExportService.constructor.generateFilename('predictions', 'csv');
          break;
          
        case 'investments':
          blob = await dataExportService.exportInvestmentsToCSV(options.dateRange ? { dateRange: options.dateRange } : undefined);
          filename = dataExportService.constructor.generateFilename('investments', 'csv');
          break;
          
        case 'settings':
          blob = await dataExportService.exportSettingsToJSON();
          filename = dataExportService.constructor.generateFilename('settings', 'json');
          break;
          
        case 'all':
          options.includeRaces = true;
          options.includePredictions = true;
          options.includeInvestments = true;
          options.includeSettings = true;
          blob = await dataExportService.exportAllData(options);
          filename = dataExportService.constructor.generateFilename('all-data', exportFormat);
          break;
          
        default:
          throw new Error('無効なエクスポートタイプです');
      }

      // ファイルダウンロード
      dataExportService.constructor.downloadBlob(blob, filename);
      setExportStatus('エクスポートが完了しました');
      
    } catch (error) {
      console.error('エクスポートエラー:', error);
      setExportStatus(`エクスポートに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // インポート実行
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setImportResult(null);

      const result = await dataExportService.importData(file);
      setImportResult(result);
      
    } catch (error) {
      console.error('インポートエラー:', error);
      setImportResult({
        success: false,
        importedItems: { races: 0, predictions: 0, investments: 0, settings: 0 },
        errors: [error instanceof Error ? error.message : '不明なエラー'],
        warnings: []
      });
    } finally {
      setIsImporting(false);
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">データ管理</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* タブ */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'export'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Download className="h-4 w-4 inline mr-2" />
          エクスポート
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'import'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Upload className="h-4 w-4 inline mr-2" />
          インポート
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'export' ? (
          <div className="space-y-4">
            {/* エクスポートタイプ選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                エクスポートするデータ
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setExportType('predictions')}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    exportType === 'predictions'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FileText className="h-5 w-5 mb-1" />
                  <div className="text-sm font-medium">予想履歴</div>
                  <div className="text-xs text-gray-500">予想データとその結果</div>
                </button>
                
                <button
                  onClick={() => setExportType('investments')}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    exportType === 'investments'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Database className="h-5 w-5 mb-1" />
                  <div className="text-sm font-medium">投資記録</div>
                  <div className="text-xs text-gray-500">馬券購入と収支データ</div>
                </button>
                
                <button
                  onClick={() => setExportType('settings')}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    exportType === 'settings'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Settings className="h-5 w-5 mb-1" />
                  <div className="text-sm font-medium">設定データ</div>
                  <div className="text-xs text-gray-500">アプリの設定と環境設定</div>
                </button>
                
                <button
                  onClick={() => setExportType('all')}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    exportType === 'all'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Database className="h-5 w-5 mb-1" />
                  <div className="text-sm font-medium">全データ</div>
                  <div className="text-xs text-gray-500">すべてのデータを一括</div>
                </button>
              </div>
            </div>

            {/* フォーマット選択 */}
            {exportType !== 'settings' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ファイル形式
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setExportFormat('csv')}
                    className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      exportFormat === 'csv'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => setExportFormat('json')}
                    className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      exportFormat === 'json'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    JSON
                  </button>
                </div>
              </div>
            )}

            {/* 日付範囲選択 */}
            {exportType !== 'settings' && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    id="dateRange"
                    checked={dateRange.enabled}
                    onChange={(e) => setDateRange(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="dateRange" className="text-sm font-medium text-gray-700">
                    日付範囲を指定
                  </label>
                </div>
                
                {dateRange.enabled && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">開始日</label>
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">終了日</label>
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* エクスポートボタン */}
            <button
              onClick={handleExport}
              disabled={isExporting || (dateRange.enabled && (!dateRange.start || !dateRange.end))}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>エクスポート中...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>エクスポート</span>
                </>
              )}
            </button>

            {/* エクスポート状態 */}
            {exportStatus && (
              <div className={`p-3 rounded-lg text-sm ${
                exportStatus.includes('完了') 
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {exportStatus}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* インポート説明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h3 className="text-sm font-medium text-blue-800 mb-1">
                インポートについて
              </h3>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• JSON形式: 全データまたは設定データ</li>
                <li>• CSV形式: 投資記録データ</li>
                <li>• 既存データと重複する場合はスキップされます</li>
              </ul>
            </div>

            {/* ファイル選択 */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                onChange={handleImport}
                className="hidden"
              />
              
              <button
                onClick={triggerFileInput}
                disabled={isImporting}
                className="w-full flex items-center justify-center space-x-2 px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                    <span>インポート中...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6" />
                    <span>ファイルを選択またはドラッグ&ドロップ</span>
                  </>
                )}
              </button>
            </div>

            {/* インポート結果 */}
            {importResult && (
              <div className={`p-4 rounded-lg border ${
                importResult.success 
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <h3 className={`font-medium ${
                    importResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {importResult.success ? 'インポート完了' : 'インポート失敗'}
                  </h3>
                </div>

                {/* インポート統計 */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                  <div>レース: {importResult.importedItems.races}件</div>
                  <div>予想: {importResult.importedItems.predictions}件</div>
                  <div>投資: {importResult.importedItems.investments}件</div>
                  <div>設定: {importResult.importedItems.settings}件</div>
                </div>

                {/* 警告 */}
                {importResult.warnings.length > 0 && (
                  <div className="mb-2">
                    <h4 className="text-sm font-medium text-amber-800 mb-1">警告:</h4>
                    <ul className="text-xs text-amber-700 space-y-1">
                      {importResult.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* エラー */}
                {importResult.errors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-800 mb-1">エラー:</h4>
                    <ul className="text-xs text-red-700 space-y-1">
                      {importResult.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};