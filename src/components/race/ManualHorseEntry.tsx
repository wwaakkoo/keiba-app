import React, { useState } from 'react';
import { Plus, X, Save, AlertCircle } from 'lucide-react';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { ResponsiveCard, FlexLayout } from '@/components/common/ResponsiveContainer';
import { validateHorseData, ValidationResult } from '@/services/dataParsingService';

interface HorseFormData {
  name: string;
  number: number;
  jockey: string;
  popularity: number;
  odds: number | null;
  pastRaces: Array<{
    rank: number;
    distance: number;
    time: number;
    surface: 'turf' | 'dirt';
    condition: 'good' | 'slightly_heavy' | 'heavy' | 'bad';
  }>;
  // 新馬戦用の追加データ
  isDebutant?: boolean; // 新馬フラグ
  trainerRating?: number; // 調教師評価（1-5）
  jockeyRating?: number; // 騎手評価（1-5）
  pedigreeRating?: number; // 血統評価（1-5）
}

interface ManualHorseEntryProps {
  onSave: (horse: HorseFormData) => void;
  onCancel: () => void;
  existingHorseNumbers: number[];
  initialData?: Partial<HorseFormData>;
}

export const ManualHorseEntry: React.FC<ManualHorseEntryProps> = ({
  onSave,
  onCancel,
  existingHorseNumbers,
  initialData
}) => {
  const [formData, setFormData] = useState<HorseFormData>({
    name: initialData?.name || '',
    number: initialData?.number || 1,
    jockey: initialData?.jockey || '',
    popularity: initialData?.popularity || 1,
    odds: initialData?.odds || null,
    pastRaces: initialData?.pastRaces || [],
    isDebutant: initialData?.isDebutant || false,
    trainerRating: initialData?.trainerRating || 3,
    jockeyRating: initialData?.jockeyRating || 3,
    pedigreeRating: initialData?.pedigreeRating || 3
  });

  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, errors: [], warnings: [] });
  const [showValidation, setShowValidation] = useState(false);

  const handleInputChange = (field: keyof HorseFormData, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    
    // リアルタイム検証
    const validationResult = validateHorseData(newData);
    
    // 馬番の重複チェック
    if (field === 'number' && existingHorseNumbers.includes(value)) {
      validationResult.errors.push('この馬番は既に使用されています');
      validationResult.isValid = false;
    }
    
    setValidation(validationResult);
  };

  const handlePastRaceChange = (index: number, field: string, value: any) => {
    const newPastRaces = [...formData.pastRaces];
    newPastRaces[index] = { ...newPastRaces[index], [field]: value };
    handleInputChange('pastRaces', newPastRaces);
  };

  const addPastRace = () => {
    if (formData.pastRaces.length < 5) {
      const newRace = {
        rank: 1,
        distance: 1600,
        time: 96.0,
        surface: 'turf' as const,
        condition: 'good' as const
      };
      handleInputChange('pastRaces', [...formData.pastRaces, newRace]);
    }
  };

  const removePastRace = (index: number) => {
    // 新馬の場合は0件でも許可、通常の馬は最低1件必要
    const minimumRaces = formData.isDebutant ? 0 : 1;
    if (formData.pastRaces.length > minimumRaces) {
      const newPastRaces = formData.pastRaces.filter((_, i) => i !== index);
      handleInputChange('pastRaces', newPastRaces);
    }
  };

  const handleSave = () => {
    setShowValidation(true);
    
    if (validation.isValid && !existingHorseNumbers.includes(formData.number)) {
      onSave(formData);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${minutes}:${secs.padStart(4, '0')}`;
  };

  const parseTime = (timeStr: string): number => {
    const match = timeStr.match(/^(\d+):(\d+\.?\d*)$/);
    if (match) {
      return parseInt(match[1]) * 60 + parseFloat(match[2]);
    }
    return parseFloat(timeStr) || 0;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <ResponsiveCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <FlexLayout direction="row" justify="between" align="center" className="mb-6">
          <h3 className="text-responsive-lg font-semibold">手動で馬を追加</h3>
          <TouchOptimizedButton
            onClick={onCancel}
            variant="ghost"
            size="sm"
            icon={X}
          >
            <span className="sr-only">閉じる</span>
          </TouchOptimizedButton>
        </FlexLayout>

        {/* 検証結果表示 */}
        {showValidation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="mb-4 p-3 rounded-lg border">
            {validation.errors.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-2 text-red-600 font-medium mb-1">
                  <AlertCircle size={16} />
                  エラー
                </div>
                <ul className="text-sm text-red-600 list-disc list-inside">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {validation.warnings.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-yellow-600 font-medium mb-1">
                  <AlertCircle size={16} />
                  警告
                </div>
                <ul className="text-sm text-yellow-600 list-disc list-inside">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="space-y-6">
          {/* 基本情報 */}
          <div>
            <h4 className="text-responsive-md font-medium mb-4">基本情報</h4>
            <div className="space-y-4">
              <FlexLayout direction="row" gap="md">
                <div className="flex-1">
                  <label className="block text-responsive-sm font-medium text-gray-700 mb-2">
                    馬番 *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="18"
                    value={formData.number}
                    onChange={(e) => handleInputChange('number', parseInt(e.target.value) || 1)}
                    className={`w-full min-h-touch px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      showValidation && existingHorseNumbers.includes(formData.number) 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                  />
                </div>
                
                <div className="flex-1">
                  <label className="block text-responsive-sm font-medium text-gray-700 mb-2">
                    人気 *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="18"
                    value={formData.popularity}
                    onChange={(e) => handleInputChange('popularity', parseInt(e.target.value) || 1)}
                    className="w-full min-h-touch px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </FlexLayout>

              <div>
                <label className="block text-responsive-sm font-medium text-gray-700 mb-2">
                  馬名 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="馬名を入力してください"
                  className={`w-full min-h-touch px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    showValidation && !formData.name.trim() 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                />
              </div>

              <FlexLayout direction="row" gap="md">
                <div className="flex-1">
                  <label className="block text-responsive-sm font-medium text-gray-700 mb-2">
                    騎手
                  </label>
                  <input
                    type="text"
                    value={formData.jockey}
                    onChange={(e) => handleInputChange('jockey', e.target.value)}
                    placeholder="騎手名"
                    className="w-full min-h-touch px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex-1">
                  <label className="block text-responsive-sm font-medium text-gray-700 mb-2">
                    オッズ
                  </label>
                  <input
                    type="number"
                    min="1.0"
                    step="0.1"
                    value={formData.odds || ''}
                    onChange={(e) => handleInputChange('odds', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="例: 3.5"
                    className="w-full min-h-touch px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </FlexLayout>
            </div>
          </div>

          {/* 新馬戦設定 */}
          <div>
            <h4 className="text-responsive-md font-medium mb-4">馬のタイプ</h4>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isDebutant}
                    onChange={(e) => {
                      handleInputChange('isDebutant', e.target.checked);
                      // 新馬になった場合、過去成績をクリア
                      if (e.target.checked) {
                        handleInputChange('pastRaces', []);
                      } else if (formData.pastRaces.length === 0) {
                        // 新馬フラグを外した場合、デフォルトの過去成績を1つ追加
                        handleInputChange('pastRaces', [
                          { rank: 1, distance: 1600, time: 96.0, surface: 'turf', condition: 'good' }
                        ]);
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-responsive-sm text-gray-700">
                    新馬戦（過去レース未出走）
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  新馬戦の場合、過去成績の代わりに調教師・騎手・血統の評価で予想します
                </p>
              </div>

              {/* 新馬戦用評価項目 */}
              {formData.isDebutant && (
                <div className="pl-6 space-y-4 border-l-2 border-blue-200">
                  <div>
                    <label className="block text-responsive-sm font-medium text-gray-700 mb-2">
                      調教師評価 (1-5)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={formData.trainerRating}
                      onChange={(e) => handleInputChange('trainerRating', parseInt(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>低い</span>
                      <span className="font-medium">評価: {formData.trainerRating}</span>
                      <span>高い</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-responsive-sm font-medium text-gray-700 mb-2">
                      騎手評価 (1-5)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={formData.jockeyRating}
                      onChange={(e) => handleInputChange('jockeyRating', parseInt(e.target.value))}
                      className="w-full accent-green-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>低い</span>
                      <span className="font-medium">評価: {formData.jockeyRating}</span>
                      <span>高い</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-responsive-sm font-medium text-gray-700 mb-2">
                      血統評価 (1-5)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={formData.pedigreeRating}
                      onChange={(e) => handleInputChange('pedigreeRating', parseInt(e.target.value))}
                      className="w-full accent-purple-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>低い</span>
                      <span className="font-medium">評価: {formData.pedigreeRating}</span>
                      <span>高い</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 過去成績 */}
          {!formData.isDebutant && (
            <div>
              <FlexLayout direction="row" justify="between" align="center" className="mb-4">
                <h4 className="text-responsive-md font-medium">過去成績</h4>
                <TouchOptimizedButton
                  onClick={addPastRace}
                  variant="secondary"
                  size="sm"
                  icon={Plus}
                  disabled={formData.pastRaces.length >= 5}
                >
                  追加
                </TouchOptimizedButton>
              </FlexLayout>

              <div className="space-y-4">
                {formData.pastRaces.map((race, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <FlexLayout direction="row" justify="between" align="center" className="mb-3">
                      <span className="text-responsive-sm font-medium">成績 {index + 1}</span>
                      {formData.pastRaces.length > (formData.isDebutant ? 0 : 1) && (
                        <TouchOptimizedButton
                          onClick={() => removePastRace(index)}
                          variant="ghost"
                          size="sm"
                          icon={X}
                        >
                          <span className="sr-only">削除</span>
                        </TouchOptimizedButton>
                      )}
                    </FlexLayout>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          着順
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="18"
                          value={race.rank}
                          onChange={(e) => handlePastRaceChange(index, 'rank', parseInt(e.target.value) || 1)}
                          className="w-full min-h-touch px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          距離 (m)
                        </label>
                        <input
                          type="number"
                          min="1000"
                          max="4000"
                          step="100"
                          value={race.distance}
                          onChange={(e) => handlePastRaceChange(index, 'distance', parseInt(e.target.value) || 1600)}
                          className="w-full min-h-touch px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          タイム (分:秒)
                        </label>
                        <input
                          type="text"
                          value={formatTime(race.time)}
                          onChange={(e) => handlePastRaceChange(index, 'time', parseTime(e.target.value))}
                          placeholder="1:36.0"
                          className="w-full min-h-touch px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          馬場
                        </label>
                        <select
                          value={race.surface}
                          onChange={(e) => handlePastRaceChange(index, 'surface', e.target.value)}
                          className="w-full min-h-touch px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="turf">芝</option>
                          <option value="dirt">ダート</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          馬場状態
                        </label>
                        <select
                          value={race.condition}
                          onChange={(e) => handlePastRaceChange(index, 'condition', e.target.value)}
                          className="w-full min-h-touch px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="good">良</option>
                          <option value="slightly_heavy">稍重</option>
                          <option value="heavy">重</option>
                          <option value="bad">不良</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 保存ボタン */}
        <FlexLayout direction="row" gap="md" className="mt-6">
          <TouchOptimizedButton
            onClick={onCancel}
            variant="secondary"
            fullWidth
          >
            キャンセル
          </TouchOptimizedButton>
          
          <TouchOptimizedButton
            onClick={handleSave}
            variant="primary"
            fullWidth
            icon={Save}
            disabled={showValidation && !validation.isValid}
          >
            保存
          </TouchOptimizedButton>
        </FlexLayout>
      </ResponsiveCard>
    </div>
  );
};