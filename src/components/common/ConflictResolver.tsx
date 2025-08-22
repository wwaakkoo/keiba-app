import React, { useState } from 'react';
import { AlertTriangle, Check, ArrowRight } from 'lucide-react';
import { DataConflict } from '@/services/syncService';

interface ConflictResolverProps {
  conflicts: DataConflict[];
  onResolve: (resolutions: ConflictResolution[]) => void;
  onCancel: () => void;
  className?: string;
}

interface ConflictResolution {
  conflictId: string;
  resolution: 'local' | 'remote' | 'merge';
  mergedData?: any;
}

export const ConflictResolver: React.FC<ConflictResolverProps> = ({
  conflicts,
  onResolve,
  onCancel,
  className = ''
}) => {
  const [resolutions, setResolutions] = useState<Map<string, ConflictResolution>>(new Map());
  const [selectedConflict, setSelectedConflict] = useState<string | null>(
    conflicts.length > 0 ? conflicts[0].id : null
  );

  // 解決方法を設定
  const setResolution = (conflictId: string, resolution: 'local' | 'remote' | 'merge', mergedData?: any) => {
    const newResolutions = new Map(resolutions);
    newResolutions.set(conflictId, {
      conflictId,
      resolution,
      mergedData
    });
    setResolutions(newResolutions);
  };

  // 全ての競合を解決
  const handleResolveAll = () => {
    const allResolutions: ConflictResolution[] = [];
    
    conflicts.forEach(conflict => {
      const resolution = resolutions.get(conflict.id);
      if (resolution) {
        allResolutions.push(resolution);
      } else {
        // デフォルトはローカルデータを優先
        allResolutions.push({
          conflictId: conflict.id,
          resolution: 'local'
        });
      }
    });

    onResolve(allResolutions);
  };

  // 全てローカルを選択
  const selectAllLocal = () => {
    const newResolutions = new Map<string, ConflictResolution>();
    conflicts.forEach(conflict => {
      newResolutions.set(conflict.id, {
        conflictId: conflict.id,
        resolution: 'local'
      });
    });
    setResolutions(newResolutions);
  };

  // 全てリモートを選択
  const selectAllRemote = () => {
    const newResolutions = new Map<string, ConflictResolution>();
    conflicts.forEach(conflict => {
      newResolutions.set(conflict.id, {
        conflictId: conflict.id,
        resolution: 'remote'
      });
    });
    setResolutions(newResolutions);
  };

  const selectedConflictData = conflicts.find(c => c.id === selectedConflict);
  const allResolved = conflicts.every(c => resolutions.has(c.id));

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white border border-amber-200 rounded-lg shadow-lg ${className}`}>
      {/* ヘッダー */}
      <div className="bg-amber-50 px-4 py-3 border-b border-amber-200">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-amber-800">
            データ競合の解決
          </h3>
        </div>
        <p className="text-sm text-amber-700 mt-1">
          {conflicts.length}件のデータ競合が検出されました。解決方法を選択してください。
        </p>
      </div>

      <div className="flex h-96">
        {/* 競合リスト */}
        <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
          <div className="p-3 border-b border-gray-200">
            <h4 className="font-medium text-gray-900">競合一覧</h4>
          </div>
          
          <div className="space-y-1 p-2">
            {conflicts.map((conflict) => {
              const resolution = resolutions.get(conflict.id);
              const isSelected = selectedConflict === conflict.id;
              
              return (
                <button
                  key={conflict.id}
                  onClick={() => setSelectedConflict(conflict.id)}
                  className={`w-full text-left p-2 rounded text-sm transition-colors ${
                    isSelected
                      ? 'bg-blue-100 border-blue-300'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{conflict.type}</div>
                      <div className="text-xs text-gray-500">
                        {conflict.conflictType}
                      </div>
                    </div>
                    
                    {resolution && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 競合詳細と解決オプション */}
        <div className="flex-1 flex flex-col">
          {selectedConflictData && (
            <>
              {/* 競合詳細 */}
              <div className="p-4 border-b border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">
                  {selectedConflictData.type} - {selectedConflictData.conflictType}
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  競合発生時刻: {selectedConflictData.timestamp.toLocaleString('ja-JP')}
                </p>
              </div>

              {/* データ比較 */}
              <div className="flex-1 flex">
                {/* ローカルデータ */}
                <div className="w-1/2 p-4 border-r border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900">ローカルデータ</h5>
                    <button
                      onClick={() => setResolution(selectedConflictData.id, 'local')}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        resolutions.get(selectedConflictData.id)?.resolution === 'local'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      選択
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 rounded p-3 text-sm">
                    <pre className="whitespace-pre-wrap text-xs">
                      {JSON.stringify(selectedConflictData.localData, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* リモートデータ */}
                <div className="w-1/2 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900">リモートデータ</h5>
                    <button
                      onClick={() => setResolution(selectedConflictData.id, 'remote')}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        resolutions.get(selectedConflictData.id)?.resolution === 'remote'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      選択
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 rounded p-3 text-sm">
                    <pre className="whitespace-pre-wrap text-xs">
                      {JSON.stringify(selectedConflictData.remoteData, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* フッター */}
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          {/* 一括選択ボタン */}
          <div className="flex space-x-2">
            <button
              onClick={selectAllLocal}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              全てローカル
            </button>
            <button
              onClick={selectAllRemote}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              全てリモート
            </button>
          </div>

          {/* アクションボタン */}
          <div className="flex space-x-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleResolveAll}
              disabled={!allResolved}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              <span>解決を適用</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 進捗表示 */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>解決済み: {resolutions.size} / {conflicts.length}</span>
            <span>{Math.round((resolutions.size / conflicts.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
            <div
              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
              style={{ width: `${(resolutions.size / conflicts.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};