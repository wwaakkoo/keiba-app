import React from 'react';
import { ArrowLeft, Settings, Bell, Shield, Download, Trash2 } from 'lucide-react';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { ResponsiveContainer, ResponsiveCard, FlexLayout } from '@/components/common/ResponsiveContainer';

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack
}) => {
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
                onClick={async () => {
                  try {
                    // データエクスポート機能の実装
                    const { db } = await import('@/services/database');
                    const stats = await db.getStats();
                    
                    const exportData = {
                      exportDate: new Date().toISOString(),
                      stats,
                      races: await db.races.toArray(),
                      predictions: await db.predictions.toArray(),
                      investments: await db.investments.toArray(),
                      settings: await db.settings.toArray()
                    };
                    
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                      type: 'application/json'
                    });
                    
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `keiba-data-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    alert('データをエクスポートしました');
                  } catch (error) {
                    console.error('エクスポートエラー:', error);
                    alert('エクスポートに失敗しました');
                  }
                }}
                variant="secondary"
                icon={Download}
                fullWidth
              >
                データをエクスポート
              </TouchOptimizedButton>
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
    </div>
  );
};