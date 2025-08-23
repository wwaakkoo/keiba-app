import React, { useState } from 'react';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { ResponsiveGrid, FlexLayout } from '@/components/common/ResponsiveContainer';

interface DistanceSelectorProps {
  value: number;
  onChange: (distance: number) => void;
  className?: string;
}

// 競馬で一般的な距離のプリセット
const COMMON_DISTANCES = [
  { value: 1000, label: '1000m' },
  { value: 1200, label: '1200m' },
  { value: 1400, label: '1400m' },
  { value: 1600, label: '1600m' },
  { value: 1800, label: '1800m' },
  { value: 2000, label: '2000m' },
  { value: 2200, label: '2200m' },
  { value: 2400, label: '2400m' },
  { value: 2500, label: '2500m' },
  { value: 3000, label: '3000m' },
  { value: 3200, label: '3200m' },
  { value: 3600, label: '3600m' }
];

export const DistanceSelector: React.FC<DistanceSelectorProps> = ({
  value,
  onChange,
  className = ''
}) => {
  const [inputMode, setInputMode] = useState(false);
  const [customValue, setCustomValue] = useState(value.toString());

  const handlePresetSelect = (distance: number) => {
    onChange(distance);
    setInputMode(false);
  };

  const handleCustomInput = () => {
    setCustomValue(value.toString());
    setInputMode(true);
  };

  const handleCustomSave = () => {
    const numValue = parseInt(customValue);
    if (numValue >= 1000 && numValue <= 4000) {
      onChange(numValue);
      setInputMode(false);
    }
  };

  const handleCustomCancel = () => {
    setCustomValue(value.toString());
    setInputMode(false);
  };

  if (inputMode) {
    return (
      <div className={className}>
        <label className="block text-responsive-sm font-medium text-gray-700 mb-2">
          距離 (m)
        </label>
        <div className="space-y-3">
          <input
            type="number"
            min="1000"
            max="4000"
            step="100"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            className="w-full min-h-touch px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="距離を入力 (1000-4000m)"
            autoFocus
          />
          <FlexLayout direction="row" gap="sm">
            <TouchOptimizedButton
              onClick={handleCustomSave}
              variant="primary"
              size="sm"
              disabled={!customValue || parseInt(customValue) < 1000 || parseInt(customValue) > 4000}
              className="flex-1"
            >
              保存
            </TouchOptimizedButton>
            <TouchOptimizedButton
              onClick={handleCustomCancel}
              variant="secondary"
              size="sm"
              className="flex-1"
            >
              キャンセル
            </TouchOptimizedButton>
          </FlexLayout>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="block text-responsive-sm font-medium text-gray-700 mb-2">
        距離 (m)
      </label>
      
      {/* 選択済み距離表示 */}
      <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-center">
          <span className="text-responsive-lg font-bold text-blue-600">{value}m</span>
          <div className="text-responsive-xs text-blue-600 mt-1">選択中</div>
        </div>
      </div>

      {/* プリセット距離選択 */}
      <ResponsiveGrid columns={{ mobile: 3, tablet: 4 }} gap="sm" className="mb-3">
        {COMMON_DISTANCES.map((distance) => (
          <TouchOptimizedButton
            key={distance.value}
            onClick={() => handlePresetSelect(distance.value)}
            variant={value === distance.value ? 'primary' : 'secondary'}
            size="sm"
            className="h-12"
          >
            {distance.label}
          </TouchOptimizedButton>
        ))}
      </ResponsiveGrid>

      {/* カスタム入力ボタン */}
      <TouchOptimizedButton
        onClick={handleCustomInput}
        variant="ghost"
        size="sm"
        fullWidth
        className="border border-dashed border-gray-400 text-gray-600"
      >
        その他の距離を入力
      </TouchOptimizedButton>
    </div>
  );
};