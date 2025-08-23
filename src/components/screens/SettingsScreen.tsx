import React, { useState } from 'react';
import { ArrowLeft, Settings, Bell, Shield, Trash2, Database, Wrench, CheckCircle } from 'lucide-react';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { ResponsiveContainer, ResponsiveCard, FlexLayout } from '@/components/common/ResponsiveContainer';
import { DataExportImport } from '@/components/common/DataExportImport';
import { dataMigrationService } from '@/services/dataMigration';

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack
}) => {
  const [showDataManager, setShowDataManager] = useState(false);
  const [isFixingData, setIsFixingData] = useState(false);
  const [fixResult, setFixResult] = useState<string | null>(null);
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <FlexLayout direction="row" align="center" gap="md">
          <TouchOptimizedButton
            onClick={onBack}
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
          >
            <span className="sr-only">戻る</span>
          </TouchOptimizedButton>
          <h1 className="text-responsive-lg font-bold">⚙️ 設定</h1>
        </FlexLayout>
      </div>

      <ResponsiveContainer maxWidth="mobile" padding="md">
        <div className="space-y-4">
          {/* 通知設定 */}
          <ResponsiveCard>
            <h3 className="text-responsive-md font-bold mb-4 flex items-center gap-2">
              <Bell className="text-blue-600" size={18} />
              通知設定
            </h3>
            <div className="space-y-3">
              <FlexLayout direction="row" justify="between" align="center">
                <span className="text-sm">予想結果通知</span>
                <input type="checkbox" className="toggle" />
              </FlexLayout>
              <FlexLayout direction="row" justify="between" align="center">
                <span className="text-sm">投資上限アラート</span>
                <input type="checkbox" className="toggle" />
              </FlexLayout>
            </div>
          </ResponsiveCard>

          {/* データ管理 */}
          <ResponsiveCard>
            <h3 className="text-responsive-md font-bold mb-4 flex items-center gap-2">
              <Shield className="text-green-600" size={18} />
              データ管理
            </h3>
            <div className="space-y-3">
              <TouchOptimizedButton
                onClick={() => setShowDataManager(true)}
                variant="primary"
                icon={Database}
                fullWidth
              >
                データのエクスポート・インポート
              </TouchOptimizedButton>
              
              <TouchOptimizedButton
                onClick={async () => {
                  if (confirm('競馬場データの修正を実行しますか？\n\n既存の予想・投資記録で競馬場が正しく表示されていない問題を修正します。')) {
                    setIsFixingData(true);
                    setFixResult(null);
                    try {
                      const result = await dataMigrationService.runFullMigration();
                      setFixResult(result.summary);
                      alert('データ修正が完了しました！\n\n' + result.summary);
                    } catch (error) {
                      console.error('データ修正エラー:', error);
                      alert('データ修正に失敗しました。\n\nエラー: ' + (error as Error).message);
                    } finally {
                      setIsFixingData(false);
                    }
                  }
                }}
                variant="secondary"
                icon={isFixingData ? undefined : Wrench}
                fullWidth
                disabled={isFixingData}
              >
                {isFixingData ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>競馬場データを修正中...</span>
                  </div>
                ) : (
                  '競馬場データを修正'
                )}
              </TouchOptimizedButton>
              
              {fixResult && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="text-green-600" size={16} />
                    <span className="text-sm font-medium text-green-800">修正完了</span>
                  </div>
                  <pre className="text-xs text-green-700 whitespace-pre-wrap">{fixResult}</pre>
                </div>
              )}
              <TouchOptimizedButton
                onClick={async () => {
                  if (confirm('全てのデータを削除しますか？この操作は取り消せません。')) {
                    try {
                      const { db } = await import('@/services/database');
                      await db.clearAllData();
                      alert('全データを削除しました');
                      window.location.reload();
                    } catch (error) {
                      console.error('削除エラー:', error);
                      alert('削除に失敗しました');
                    }
                  }
                }}
                variant="danger"
                icon={Trash2}
                fullWidth
              >
                全データを削除
              </TouchOptimizedButton>
            </div>
          </ResponsiveCard>

          {/* アプリ情報 */}
          <ResponsiveCard>
            <h3 className="text-responsive-md font-bold mb-4 flex items-center gap-2">
              <Settings className="text-gray-600" size={18} />
              アプリ情報
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <FlexLayout direction="row" justify="between">
                <span>バージョン</span>
                <span>1.0.0</span>
              </FlexLayout>
              <FlexLayout direction="row" justify="between">
                <span>ビルド</span>
                <span>MVP-2024</span>
              </FlexLayout>
              <FlexLayout direction="row" justify="between">
                <span>開発者</span>
                <span>Keiba App Team</span>
              </FlexLayout>
            </div>
          </ResponsiveCard>
        </div>
      </ResponsiveContainer>

      {/* データ管理モーダル */}
      {showDataManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <DataExportImport onClose={() => setShowDataManager(false)} />
          </div>
        </div>
      )}
    </div>
  );
};