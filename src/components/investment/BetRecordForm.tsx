import React, { useState, useEffect } from 'react';
import { Plus, Calculator, AlertTriangle, Shield } from 'lucide-react';
import { Investment } from '@/types/investment';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { investmentLimitService, LimitCheckResult } from '@/services/investmentLimitService';

interface BetRecordFormProps {
  raceId: string;
  predictionId: string;
  venue?: string;
  raceNumber?: number;
  raceDate?: string;
  onSubmit: (investment: Omit<Investment, 'id' | 'timestamp'>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

interface BetFormData {
  betType: Investment['betType'];
  selections: number[];
  amount: number;
  odds: number;
}

const BET_TYPES = [
  { value: 'win' as const, label: '単勝', minSelections: 1, maxSelections: 1 },
  { value: 'place' as const, label: '複勝', minSelections: 1, maxSelections: 1 },
  { value: 'exacta' as const, label: '馬連', minSelections: 2, maxSelections: 2 },
  { value: 'quinella' as const, label: '馬単', minSelections: 2, maxSelections: 2 },
  { value: 'trio' as const, label: '3連複', minSelections: 3, maxSelections: 3 },
  { value: 'trifecta' as const, label: '3連単', minSelections: 3, maxSelections: 3 },
  { value: 'tierce' as const, label: 'ワイド', minSelections: 2, maxSelections: 2 }
];

export const BetRecordForm: React.FC<BetRecordFormProps> = ({
  raceId,
  predictionId,
  venue,
  raceNumber,
  raceDate,
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState<BetFormData>({
    betType: 'win',
    selections: [],
    amount: 100,
    odds: 1.0
  });

  const [selectionInput, setSelectionInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calculatedPayout, setCalculatedPayout] = useState(0);
  const [calculatedProfit, setCalculatedProfit] = useState(0);
  const [limitCheck, setLimitCheck] = useState<LimitCheckResult | null>(null);
  const [showLimitWarning, setShowLimitWarning] = useState(false);

  // 払戻額と損益の自動計算
  useEffect(() => {
    const payout = formData.amount * formData.odds;
    const profit = payout - formData.amount;
    setCalculatedPayout(payout);
    setCalculatedProfit(profit);
  }, [formData.amount, formData.odds]);

  // 投資制限チェック
  useEffect(() => {
    const checkLimits = async () => {
      if (formData.amount > 0) {
        try {
          const result = await investmentLimitService.checkInvestmentLimit(formData.amount);
          setLimitCheck(result);
          setShowLimitWarning(result.warningLevel !== 'none');
        } catch (error) {
          console.error('投資制限チェックエラー:', error);
        }
      } else {
        setLimitCheck(null);
        setShowLimitWarning(false);
      }
    };

    const timeoutId = setTimeout(checkLimits, 500); // デバウンス
    return () => clearTimeout(timeoutId);
  }, [formData.amount]);

  const selectedBetType = BET_TYPES.find(bt => bt.value === formData.betType);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 予想IDの必須チェック
    if (!predictionId || predictionId.trim() === '') {
      newErrors.prediction = '予想が選択されていません。予想を選択してから投資記録を作成してください。';
    }

    // 券種チェック
    if (!formData.betType) {
      newErrors.betType = '券種を選択してください';
    }

    // 買い目チェック
    if (formData.selections.length === 0) {
      newErrors.selections = '買い目を入力してください';
    } else if (selectedBetType) {
      if (formData.selections.length < selectedBetType.minSelections) {
        newErrors.selections = `${selectedBetType.label}は${selectedBetType.minSelections}頭以上選択してください`;
      }
      if (formData.selections.length > selectedBetType.maxSelections) {
        newErrors.selections = `${selectedBetType.label}は${selectedBetType.maxSelections}頭まで選択可能です`;
      }
    }

    // 投資額チェック
    if (formData.amount <= 0) {
      newErrors.amount = '投資額は1円以上で入力してください';
    }
    if (formData.amount > 1000000) {
      newErrors.amount = '投資額は100万円以下で入力してください';
    }

    // オッズチェック
    if (formData.odds <= 0) {
      newErrors.odds = 'オッズは0より大きい値で入力してください';
    }
    if (formData.odds > 9999) {
      newErrors.odds = 'オッズは9999倍以下で入力してください';
    }

    // 馬番の重複チェック
    const uniqueSelections = new Set(formData.selections);
    if (uniqueSelections.size !== formData.selections.length) {
      newErrors.selections = '同じ馬番を重複して選択することはできません';
    }

    // 馬番の範囲チェック（1-18番）
    const invalidNumbers = formData.selections.filter(num => num < 1 || num > 18);
    if (invalidNumbers.length > 0) {
      newErrors.selections = '馬番は1-18の範囲で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSelectionInputChange = (value: string) => {
    setSelectionInput(value);
    
    // 数字とハイフンのみ許可
    const cleanValue = value.replace(/[^0-9-]/g, '');
    
    if (cleanValue !== value) {
      setSelectionInput(cleanValue);
      return;
    }

    // ハイフン区切りで馬番を解析
    const numbers = cleanValue
      .split('-')
      .map(num => parseInt(num.trim()))
      .filter(num => !isNaN(num) && num > 0);

    setFormData(prev => ({
      ...prev,
      selections: numbers
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // 投資制限の最終チェック
    if (limitCheck && !limitCheck.allowed) {
      setErrors({ submit: limitCheck.reason || '投資制限により記録できません' });
      return;
    }

    // 警告レベルが高い場合は確認
    if (limitCheck && limitCheck.warningLevel === 'danger') {
      const confirmed = confirm(
        `投資制限に近づいています。\n` +
        `現在の投資額: ${formatCurrency(limitCheck.currentAmount)}\n` +
        `制限額: ${formatCurrency(limitCheck.limitAmount)}\n` +
        `続行しますか？`
      );
      if (!confirmed) {
        return;
      }
    }

    try {
      const investment: Omit<Investment, 'id' | 'timestamp'> = {
        raceId,
        predictionId,
        betType: formData.betType,
        selections: formData.selections,
        amount: formData.amount,
        odds: formData.odds,
        payout: 0, // 結果未確定時は払戻0
        profit: 0, // 結果未確定時は損益0（未確定状態）
        venue,
        raceNumber,
        raceDate
      };

      await onSubmit(investment);
    } catch (error) {
      console.error('投資記録エラー:', error);
      setErrors({ submit: '投資記録の保存に失敗しました' });
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          馬券購入記録
        </h2>
        <TouchOptimizedButton
          variant="secondary"
          size="sm"
          onClick={onCancel}
        >
          キャンセル
        </TouchOptimizedButton>
      </div>

      {/* 予想エラー表示 */}
      {errors.prediction && (
        <div className="flex items-center p-3 bg-red-50 rounded-lg border border-red-200 mb-4">
          <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
          <p className="text-sm text-red-600">{errors.prediction}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 券種選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            券種
          </label>
          <select
            value={formData.betType}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              betType: e.target.value as Investment['betType'],
              selections: [] // 券種変更時は買い目をリセット
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {BET_TYPES.map(betType => (
              <option key={betType.value} value={betType.value}>
                {betType.label}
              </option>
            ))}
          </select>
          {errors.betType && (
            <p className="mt-1 text-sm text-red-600">{errors.betType}</p>
          )}
        </div>

        {/* 買い目入力 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            買い目 ({selectedBetType?.label})
          </label>
          <input
            type="text"
            value={selectionInput}
            onChange={(e) => handleSelectionInputChange(e.target.value)}
            placeholder={selectedBetType ? 
              `例: ${selectedBetType.minSelections === 1 ? '1' : 
                   selectedBetType.minSelections === 2 ? '1-2' : '1-2-3'}` : 
              '馬番を入力'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            馬番をハイフン(-)で区切って入力してください
          </p>
          {formData.selections.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {formData.selections.map((num, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {num}番
                </span>
              ))}
            </div>
          )}
          {errors.selections && (
            <p className="mt-1 text-sm text-red-600">{errors.selections}</p>
          )}
        </div>

        {/* 投資額入力 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            投資額
          </label>
          <div className="relative">
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                amount: parseInt(e.target.value) || 0 
              }))}
              min="1"
              max="1000000"
              step="100"
              className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="absolute right-3 top-2 text-gray-500">円</span>
          </div>
          {errors.amount && (
            <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
          )}
        </div>

        {/* オッズ入力 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            オッズ
          </label>
          <div className="relative">
            <input
              type="number"
              value={formData.odds}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                odds: parseFloat(e.target.value) || 0 
              }))}
              min="0.1"
              max="9999"
              step="0.1"
              className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="absolute right-3 top-2 text-gray-500">倍</span>
          </div>
          {errors.odds && (
            <p className="mt-1 text-sm text-red-600">{errors.odds}</p>
          )}
        </div>

        {/* 投資制限チェック結果 */}
        {limitCheck && showLimitWarning && (
          <div className={`rounded-lg p-4 ${
            limitCheck.warningLevel === 'blocked' ? 'bg-red-50 border border-red-200' :
            limitCheck.warningLevel === 'danger' ? 'bg-orange-50 border border-orange-200' :
            'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-start">
              <Shield className={`w-4 h-4 mr-2 mt-0.5 ${
                limitCheck.warningLevel === 'blocked' ? 'text-red-600' :
                limitCheck.warningLevel === 'danger' ? 'text-orange-600' :
                'text-yellow-600'
              }`} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  limitCheck.warningLevel === 'blocked' ? 'text-red-800' :
                  limitCheck.warningLevel === 'danger' ? 'text-orange-800' :
                  'text-yellow-800'
                }`}>
                  {limitCheck.warningLevel === 'blocked' ? '投資制限' :
                   limitCheck.warningLevel === 'danger' ? '投資制限警告' :
                   '投資制限注意'}
                </p>
                {limitCheck.reason && (
                  <p className={`text-xs mt-1 ${
                    limitCheck.warningLevel === 'blocked' ? 'text-red-600' :
                    limitCheck.warningLevel === 'danger' ? 'text-orange-600' :
                    'text-yellow-600'
                  }`}>
                    {limitCheck.reason}
                  </p>
                )}
                <div className="text-xs mt-2 space-y-1">
                  <div>残り投資可能額: {formatCurrency(limitCheck.remainingAmount)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 計算結果表示 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Calculator className="w-4 h-4 mr-2 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">計算結果</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">払戻予定額:</span>
              <span className="font-medium">{formatCurrency(calculatedPayout)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">損益予定:</span>
              <span className={`font-medium ${calculatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {calculatedProfit >= 0 ? '+' : ''}{formatCurrency(calculatedProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* エラーメッセージ */}
        {errors.submit && (
          <div className="flex items-center p-3 bg-red-50 rounded-lg">
            <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* 送信ボタン */}
        <div className="flex space-x-3 pt-4">
          <TouchOptimizedButton
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting || (limitCheck && !limitCheck.allowed) || false}
            className="flex-1"
          >
            {isSubmitting ? '記録中...' : 
             limitCheck && !limitCheck.allowed ? '制限により記録不可' : 
             '記録する'}
          </TouchOptimizedButton>
        </div>
      </form>
    </div>
  );
};