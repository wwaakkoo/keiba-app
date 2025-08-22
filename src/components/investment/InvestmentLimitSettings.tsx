import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Settings, Save, RotateCcw, Info } from 'lucide-react';
import { InvestmentLimits } from '@/types/investment';
import { investmentLimitService } from '@/services/investmentLimitService';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';

interface InvestmentLimitSettingsProps {
  onBack?: () => void;
  onSave?: (limits: InvestmentLimits) => void;
}

export const InvestmentLimitSettings: React.FC<InvestmentLimitSettingsProps> = ({
  onBack,
  onSave
}) => {
  const [limits, setLimits] = useState<InvestmentLimits>(investmentLimitService.getLimits());
  const [originalLimits, setOriginalLimits] = useState<InvestmentLimits>(limits);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const currentLimits = investmentLimitService.getLimits();
    setLimits(currentLimits);
    setOriginalLimits(currentLimits);
  }, []);

  useEffect(() => {
    const changed = JSON.stringify(limits) !== JSON.stringify(originalLimits);
    setHasChanges(changed);
  }, [limits, originalLimits]);

  const validateLimits = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 日次制限
    if (limits.dailyLimit <= 0) {
      newErrors.dailyLimit = '日次制限は1円以上で設定してください';
    }
    if (limits.dailyLimit > 1000000) {
      newErrors.dailyLimit = '日次制限は100万円以下で設定してください';
    }

    // 週次制限
    if (limits.weeklyLimit <= 0) {
      newErrors.weeklyLimit = '週次制限は1円以上で設定してください';
    }
    if (limits.weeklyLimit < limits.dailyLimit) {
      newErrors.weeklyLimit = '週次制限は日次制限以上で設定してください';
    }

    // 月次制限
    if (limits.monthlyLimit <= 0) {
      newErrors.monthlyLimit = '月次制限は1円以上で設定してください';
    }
    if (limits.monthlyLimit < limits.weeklyLimit) {
      newErrors.monthlyLimit = '月次制限は週次制限以上で設定してください';
    }

    // 最大投資額
    if (limits.maxBetAmount <= 0) {
      newErrors.maxBetAmount = '最大投資額は1円以上で設定してください';
    }
    if (limits.maxBetAmount > limits.dailyLimit) {
      newErrors.maxBetAmount = '最大投資額は日次制限以下で設定してください';
    }

    // 損失制限
    if (limits.autoStop && limits.stopLossAmount <= 0) {
      newErrors.stopLossAmount = '損失制限は1円以上で設定してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateLimits()) {
      return;
    }

    try {
      setIsSaving(true);
      investmentLimitService.saveLimits(limits);
      setOriginalLimits(limits);
      onSave?.(limits);
      
      // 成功メッセージを表示（簡易実装）
      alert('投資制限設定を保存しました');
    } catch (error) {
      console.error('設定保存エラー:', error);
      alert('設定の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('設定をリセットしますか？')) {
      investmentLimitService.resetLimits();
      const defaultLimits = investmentLimitService.getLimits();
      setLimits(defaultLimits);
      setOriginalLimits(defaultLimits);
    }
  };

  const handleRiskLevelChange = (riskLevel: InvestmentLimits['riskLevel']) => {
    const recommended = investmentLimitService.getRecommendedLimits(riskLevel);
    setLimits(prev => ({
      ...prev,
      riskLevel,
      ...recommended
    }));
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          投資制限設定
        </h2>
        {onBack && (
          <TouchOptimizedButton variant="secondary" size="sm" onClick={onBack}>
            戻る
          </TouchOptimizedButton>
        )}
      </div>

      {/* 説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">投資制限について</p>
            <p>
              適切な投資制限を設定することで、リスクを管理し、計画的な投資を行うことができます。
              設定した制限を超える投資は自動的に制限されます。
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* リスクレベル設定 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">リスクレベル</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                level: 'conservative' as const,
                title: '保守的',
                description: '低リスク・安定志向',
                color: 'green'
              },
              {
                level: 'moderate' as const,
                title: '標準',
                description: 'バランス重視',
                color: 'blue'
              },
              {
                level: 'aggressive' as const,
                title: '積極的',
                description: '高リターン志向',
                color: 'red'
              }
            ].map(option => (
              <div
                key={option.level}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                  limits.riskLevel === option.level
                    ? `border-${option.color}-500 bg-${option.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleRiskLevelChange(option.level)}
              >
                <div className="text-center">
                  <h4 className="font-medium text-gray-900">{option.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 投資制限設定 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">投資制限</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 日次制限 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                日次投資上限額
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={limits.dailyLimit}
                  onChange={(e) => setLimits(prev => ({ 
                    ...prev, 
                    dailyLimit: parseInt(e.target.value) || 0 
                  }))}
                  min="1"
                  max="1000000"
                  step="1000"
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-3 top-2 text-gray-500">円</span>
              </div>
              {errors.dailyLimit && (
                <p className="mt-1 text-sm text-red-600">{errors.dailyLimit}</p>
              )}
            </div>

            {/* 週次制限 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                週次投資上限額
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={limits.weeklyLimit}
                  onChange={(e) => setLimits(prev => ({ 
                    ...prev, 
                    weeklyLimit: parseInt(e.target.value) || 0 
                  }))}
                  min="1"
                  max="5000000"
                  step="5000"
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-3 top-2 text-gray-500">円</span>
              </div>
              {errors.weeklyLimit && (
                <p className="mt-1 text-sm text-red-600">{errors.weeklyLimit}</p>
              )}
            </div>

            {/* 月次制限 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                月次投資上限額
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={limits.monthlyLimit}
                  onChange={(e) => setLimits(prev => ({ 
                    ...prev, 
                    monthlyLimit: parseInt(e.target.value) || 0 
                  }))}
                  min="1"
                  max="10000000"
                  step="10000"
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-3 top-2 text-gray-500">円</span>
              </div>
              {errors.monthlyLimit && (
                <p className="mt-1 text-sm text-red-600">{errors.monthlyLimit}</p>
              )}
            </div>

            {/* 最大投資額 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                1回の最大投資額
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={limits.maxBetAmount}
                  onChange={(e) => setLimits(prev => ({ 
                    ...prev, 
                    maxBetAmount: parseInt(e.target.value) || 0 
                  }))}
                  min="1"
                  max="100000"
                  step="500"
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-3 top-2 text-gray-500">円</span>
              </div>
              {errors.maxBetAmount && (
                <p className="mt-1 text-sm text-red-600">{errors.maxBetAmount}</p>
              )}
            </div>
          </div>
        </div>

        {/* 自動停止設定 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">自動停止機能</h3>
          
          <div className="space-y-4">
            {/* 自動停止有効/無効 */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">損失制限による自動停止</h4>
                <p className="text-sm text-gray-600">
                  設定した損失額に達した場合、自動的に投資を停止します
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={limits.autoStop}
                  onChange={(e) => setLimits(prev => ({ 
                    ...prev, 
                    autoStop: e.target.checked 
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* 損失制限額 */}
            {limits.autoStop && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  損失制限額
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={limits.stopLossAmount}
                    onChange={(e) => setLimits(prev => ({ 
                      ...prev, 
                      stopLossAmount: parseInt(e.target.value) || 0 
                    }))}
                    min="1"
                    max="1000000"
                    step="5000"
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">円</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  この金額の損失が発生した場合、新規投資が制限されます
                </p>
                {errors.stopLossAmount && (
                  <p className="mt-1 text-sm text-red-600">{errors.stopLossAmount}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 設定プレビュー */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">設定プレビュー</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">日次上限:</span>
              <div className="font-medium">{formatCurrency(limits.dailyLimit)}</div>
            </div>
            <div>
              <span className="text-gray-600">週次上限:</span>
              <div className="font-medium">{formatCurrency(limits.weeklyLimit)}</div>
            </div>
            <div>
              <span className="text-gray-600">月次上限:</span>
              <div className="font-medium">{formatCurrency(limits.monthlyLimit)}</div>
            </div>
            <div>
              <span className="text-gray-600">最大投資:</span>
              <div className="font-medium">{formatCurrency(limits.maxBetAmount)}</div>
            </div>
          </div>
          
          {limits.autoStop && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center text-sm">
                <AlertTriangle className="w-4 h-4 text-orange-500 mr-2" />
                <span className="text-gray-600">
                  損失制限: {formatCurrency(limits.stopLossAmount)}で自動停止
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 操作ボタン */}
        <div className="flex space-x-4">
          <TouchOptimizedButton
            variant="primary"
            size="lg"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? '保存中...' : '設定を保存'}
          </TouchOptimizedButton>
          
          <TouchOptimizedButton
            variant="secondary"
            size="lg"
            onClick={handleReset}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            リセット
          </TouchOptimizedButton>
        </div>
      </div>
    </div>
  );
};