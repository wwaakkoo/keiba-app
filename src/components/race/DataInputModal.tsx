import React, { useState } from 'react';
import { Upload, X, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { FlexLayout } from '@/components/common/ResponsiveContainer';
import { parseNetKeibaData, extractRaceInfo } from '@/services/dataParsingService';

interface DataInputModalProps {
  onClose: () => void;
  onDataParsed: (horses: any[], raceInfo?: any) => void;
  existingHorseNumbers: number[];
}

interface ParseResult {
  horses: any[];
  summary: {
    totalHorses: number;
    errors: string[];
    warnings: string[];
    success: boolean;
  };
}

export const DataInputModal: React.FC<DataInputModalProps> = ({
  onClose,
  onDataParsed,
  existingHorseNumbers
}) => {
  const [inputData, setInputData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebugLogs, setShowDebugLogs] = useState(false);

  const addDebugLog = (message: string, data?: any) => {
    const logEntry = data ? `${message}: ${JSON.stringify(data)}` : message;
    setDebugLogs(prev => [...prev, logEntry]);
  };

  const handleParse = async () => {
    if (!inputData.trim()) {
      return;
    }

    setIsProcessing(true);
    setDebugLogs([]);
    setParseResult(null);

    try {
      // データ解析実行
      const result = parseNetKeibaData(inputData, addDebugLog);
      
      // 既存馬番との重複チェック
      const duplicateNumbers = result.horses
        .map(h => h.number)
        .filter(num => existingHorseNumbers.includes(num));
      
      if (duplicateNumbers.length > 0) {
        result.summary.errors.push(
          `既に登録済みの馬番があります: ${duplicateNumbers.join(', ')}`
        );
        result.summary.success = false;
      }

      setParseResult(result);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      setParseResult({
        horses: [],
        summary: {
          totalHorses: 0,
          errors: [errorMessage],
          warnings: [],
          success: false
        }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (parseResult && parseResult.horses.length > 0) {
      // レース情報も抽出して渡す
      const raceInfo = extractRaceInfo(inputData);
      onDataParsed(parseResult.horses, raceInfo);
    }
  };

  const handleSampleData = () => {
    const sampleData = `1 1

マピュース
武豊
54.0
3.5 (2人気)

2022.12.25 中山 1
芝1600 良 1:34.5
映像を見る

2022.11.27 東京 3
芝1400 良 1:21.2
映像を見る

2 2

ダノンベルーガ
C.ルメール
56.0
2.1 (1人気)

2022.12.11 阪神 1
芝1600 良 1:33.8
映像を見る

2022.11.13 京都 2
芝1400 稍重 1:22.1
映像を見る`;
    
    setInputData(sampleData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl flex flex-col">
        {/* 固定ヘッダー */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
          <FlexLayout direction="row" justify="between" align="center">
            <h3 className="text-responsive-lg font-semibold">netkeiba データ入力</h3>
            <TouchOptimizedButton
              onClick={onClose}
              variant="ghost"
              size="sm"
              icon={X}
            >
              <span className="sr-only">閉じる</span>
            </TouchOptimizedButton>
          </FlexLayout>
        </div>

        {/* スクロール可能なコンテンツエリア */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 入力エリア */}
            <div className="space-y-4">
              <div>
                <FlexLayout direction="row" justify="between" align="center" className="mb-2">
                  <label className="block text-responsive-sm font-medium text-gray-700">
                    netkeiba 出走表データ
                  </label>
                  <TouchOptimizedButton
                    onClick={handleSampleData}
                    variant="ghost"
                    size="sm"
                  >
                    サンプル
                  </TouchOptimizedButton>
                </FlexLayout>
                
                <textarea
                  value={inputData}
                  onChange={(e) => setInputData(e.target.value)}
                  placeholder="netkeiba の出走表ページから馬のデータをコピー＆ペーストしてください..."
                  className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm font-mono"
                />
                
                <p className="text-xs text-gray-500 mt-2">
                  ※ 枠番・馬番、馬名、騎手、オッズ・人気、過去成績が含まれるデータを貼り付けてください
                </p>
              </div>

              <FlexLayout direction="row" gap="md">
                <TouchOptimizedButton
                  onClick={handleParse}
                  variant="primary"
                  icon={Upload}
                  loading={isProcessing}
                  disabled={!inputData.trim() || isProcessing}
                  fullWidth
                >
                  {isProcessing ? '解析中...' : 'データを解析'}
                </TouchOptimizedButton>
              </FlexLayout>
            </div>

            {/* 結果エリア */}
            <div className="space-y-4">
              {parseResult && (
                <>
                  {/* 解析結果サマリー */}
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      {parseResult.summary.success ? (
                        <CheckCircle className="text-green-500" size={20} />
                      ) : (
                        <AlertCircle className="text-red-500" size={20} />
                      )}
                      解析結果
                    </h4>
                    
                    <div className="space-y-2 text-sm">
                      <p>抽出された馬数: <span className="font-medium">{parseResult.summary.totalHorses}頭</span></p>
                      
                      {parseResult.summary.errors.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1 text-red-600 font-medium">
                            <AlertCircle size={14} />
                            エラー ({parseResult.summary.errors.length}件)
                          </div>
                          <ul className="text-red-600 text-xs list-disc list-inside ml-4 mt-1">
                            {parseResult.summary.errors.slice(0, 3).map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                            {parseResult.summary.errors.length > 3 && (
                              <li>他 {parseResult.summary.errors.length - 3} 件...</li>
                            )}
                          </ul>
                        </div>
                      )}
                      
                      {parseResult.summary.warnings.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1 text-yellow-600 font-medium">
                            <AlertTriangle size={14} />
                            警告 ({parseResult.summary.warnings.length}件)
                          </div>
                          <ul className="text-yellow-600 text-xs list-disc list-inside ml-4 mt-1">
                            {parseResult.summary.warnings.slice(0, 3).map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                            {parseResult.summary.warnings.length > 3 && (
                              <li>他 {parseResult.summary.warnings.length - 3} 件...</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 抽出された馬一覧 */}
                  {parseResult.horses.length > 0 && (
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-3">抽出された馬 ({parseResult.horses.length}頭)</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {parseResult.horses.map((horse, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                            <div>
                              <span className="font-medium">{horse.number}. {horse.name}</span>
                              <span className="text-gray-500 ml-2">({horse.jockey})</span>
                            </div>
                            <div className="text-right">
                              <div>{horse.popularity}番人気</div>
                              {horse.odds && (
                                <div className="text-xs text-gray-500">{horse.odds}倍</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* デバッグログ */}
              {debugLogs.length > 0 && (
                <div className="p-4 rounded-lg border">
                  <FlexLayout direction="row" justify="between" align="center" className="mb-2">
                    <h4 className="font-medium">解析ログ</h4>
                    <TouchOptimizedButton
                      onClick={() => setShowDebugLogs(!showDebugLogs)}
                      variant="ghost"
                      size="sm"
                    >
                      {showDebugLogs ? '非表示' : '表示'}
                    </TouchOptimizedButton>
                  </FlexLayout>
                  
                  {showDebugLogs && (
                    <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-xs font-mono">
                      {debugLogs.map((log, index) => (
                        <div key={index} className="mb-1">{log}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 固定フッター（ボタンエリア） */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <FlexLayout direction="row" gap="md">
            <TouchOptimizedButton
              onClick={onClose}
              variant="secondary"
              fullWidth
            >
              キャンセル
            </TouchOptimizedButton>
            
            <TouchOptimizedButton
              onClick={handleConfirm}
              variant="primary"
              fullWidth
              disabled={!parseResult || !parseResult.summary.success || parseResult.horses.length === 0}
            >
              データを適用 ({parseResult?.horses.length || 0}頭)
            </TouchOptimizedButton>
          </FlexLayout>
        </div>
      </div>
    </div>
  );
};