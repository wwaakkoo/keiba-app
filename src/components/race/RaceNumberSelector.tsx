import React from 'react';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { ResponsiveGrid } from '@/components/common/ResponsiveContainer';

interface RaceNumberSelectorProps {
  value: number;
  onChange: (raceNumber: number) => void;
  className?: string;
}

// 競馬の一般的なレース番号 1-12R
const RACE_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);

export const RaceNumberSelector: React.FC<RaceNumberSelectorProps> = ({
  value,
  onChange,
  className = ''
}) => {
  return (
    <div className={className}>
      <label className="block text-responsive-sm font-medium text-gray-700 mb-2">
        レース番号
      </label>
      
      {/* 選択済みレース番号表示 */}
      <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
        <div className="text-center">
          <span className="text-responsive-lg font-bold text-green-600">{value}R</span>
          <div className="text-responsive-xs text-green-600 mt-1">選択中</div>
        </div>
      </div>

      {/* レース番号選択グリッド */}
      <ResponsiveGrid columns={{ mobile: 4, tablet: 6 }} gap="sm">
        {RACE_NUMBERS.map((raceNumber) => (
          <TouchOptimizedButton
            key={raceNumber}
            onClick={() => onChange(raceNumber)}
            variant={value === raceNumber ? 'primary' : 'secondary'}
            size="sm"
            className="h-12 font-semibold"
          >
            {raceNumber}R
          </TouchOptimizedButton>
        ))}
      </ResponsiveGrid>
      
      {/* 説明文 */}
      <div className="mt-2 text-center">
        <p className="text-responsive-xs text-gray-500">
          通常の競馬開催は1R〜12Rです
        </p>
      </div>
    </div>
  );
};