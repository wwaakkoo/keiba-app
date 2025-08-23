import React, { useState } from 'react';
import { Calendar, MapPin, Plus, Upload, X, Edit } from 'lucide-react';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { ResponsiveContainer, ResponsiveCard, FlexLayout } from '@/components/common/ResponsiveContainer';
import { BackHeader } from '@/components/common/MobileHeader';
import { DataInputModal } from './DataInputModal';
import { ManualHorseEntry } from './ManualHorseEntry';
import { DistanceSelector } from './DistanceSelector';
import { RaceNumberSelector } from './RaceNumberSelector';

interface RaceCreationProps {
  onBack: () => void;
  onSaveRace: (raceData: any) => void;
  venues: string[];
  surfaces: Array<{ value: string; label: string }>;
  conditions: Array<{ value: string; label: string }>;
}

export const RaceCreation: React.FC<RaceCreationProps> = ({
  onBack,
  onSaveRace,
  venues,
  surfaces,
  conditions
}) => {
  const [raceData, setRaceData] = useState({
    date: new Date().toISOString().split('T')[0],
    venue: '',
    raceNumber: 1,
    distance: 1600,
    surface: 'turf',
    condition: 'good',
    horses: [] as any[]
  });

  const [showDataInput, setShowDataInput] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [editingHorse, setEditingHorse] = useState<{ index: number; horse: any } | null>(null);

  const handleInputChange = (field: string, value: any) => {
    setRaceData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDataParsed = (horses: any[], raceInfo?: any) => {
    // レース情報がある場合は自動設定
    if (raceInfo) {
      setRaceData(prev => ({
        ...prev,
        ...raceInfo,
        horses: [...prev.horses, ...horses]
      }));
    } else {
      setRaceData(prev => ({
        ...prev,
        horses: [...prev.horses, ...horses]
      }));
    }
    setShowDataInput(false);
  };

  const handleManualHorseSave = (horse: any) => {
    if (editingHorse) {
      // 編集モード
      const newHorses = [...raceData.horses];
      newHorses[editingHorse.index] = horse;
      setRaceData(prev => ({ ...prev, horses: newHorses }));
      setEditingHorse(null);
    } else {
      // 新規追加モード
      setRaceData(prev => ({
        ...prev,
        horses: [...prev.horses, horse]
      }));
    }
    setShowManualEntry(false);
  };

  const handleEditHorse = (index: number) => {
    setEditingHorse({ index, horse: raceData.horses[index] });
    setShowManualEntry(true);
  };

  const handleRemoveHorse = (index: number) => {
    const newHorses = raceData.horses.filter((_, i) => i !== index);
    setRaceData(prev => ({ ...prev, horses: newHorses }));
  };

  const getExistingHorseNumbers = () => {
    return raceData.horses.map((horse: any) => horse.number);
  };

  const handleSave = () => {
    // 基本情報のバリデーション
    if (!raceData.venue || !raceData.date) {
      alert('競馬場と開催日を入力してください');
      return;
    }
    
    // 出走馬のバリデーション
    if (!raceData.horses || raceData.horses.length === 0) {
      alert('出走馬データを入力してください。netkeiba データの貼り付けまたは手動入力で馬を追加してください。');
      return;
    }
    
    if (raceData.horses.length < 2) {
      alert('予想を行うには最低2頭の馬が必要です。');
      return;
    }
    
    // レースデータを保存
    console.log('レース作成完了:', {
      ...raceData,
      id: `${raceData.venue}_${raceData.date}_${raceData.raceNumber}`,
      createdAt: new Date().toISOString()
    });
    
    onSaveRace({
      ...raceData,
      id: `${raceData.venue}_${raceData.date}_${raceData.raceNumber}`,
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <BackHeader title="新規レース作成" onBack={onBack} />
      
      <ResponsiveContainer maxWidth="mobile" padding="md">
        {/* レース基本情報 */}
        <ResponsiveCard className="mb-6">
          <h3 className="text-responsive-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar size={20} />
            レース基本情報
          </h3>
          
          <div className="space-y-4">
            {/* 開催日 */}
            <div>
              <label className="block text-responsive-sm font-medium text-gray-700 mb-2">
                開催日 *
              </label>
              <input
                type="date"
                value={raceData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="w-full min-h-touch px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* 競馬場 */}
            <div>
              <label className="block text-responsive-sm font-medium text-gray-700 mb-2">
                競馬場 *
              </label>
              <select
                value={raceData.venue}
                onChange={(e) => handleInputChange('venue', e.target.value)}
                className="w-full min-h-touch px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">選択してください</option>
                {venues.map(venue => (
                  <option key={venue} value={venue}>{venue}</option>
                ))}
              </select>
            </div>
            
            <FlexLayout direction="row" gap="md">
              {/* レース番号選択 */}
              <div className="flex-1">
                <RaceNumberSelector
                  value={raceData.raceNumber}
                  onChange={(raceNumber) => handleInputChange('raceNumber', raceNumber)}
                />
              </div>
              
              {/* 距離選択 */}
              <div className="flex-1">
                <DistanceSelector
                  value={raceData.distance}
                  onChange={(distance) => handleInputChange('distance', distance)}
                />
              </div>
            </FlexLayout>
            
            <FlexLayout direction="row" gap="md">
              {/* 馬場 */}
              <div className="flex-1">
                <label className="block text-responsive-sm font-medium text-gray-700 mb-2">
                  馬場
                </label>
                <select
                  value={raceData.surface}
                  onChange={(e) => handleInputChange('surface', e.target.value)}
                  className="w-full min-h-touch px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {surfaces.map(surface => (
                    <option key={surface.value} value={surface.value}>
                      {surface.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* 馬場状態 */}
              <div className="flex-1">
                <label className="block text-responsive-sm font-medium text-gray-700 mb-2">
                  馬場状態
                </label>
                <select
                  value={raceData.condition}
                  onChange={(e) => handleInputChange('condition', e.target.value)}
                  className="w-full min-h-touch px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {conditions.map(condition => (
                    <option key={condition.value} value={condition.value}>
                      {condition.label}
                    </option>
                  ))}
                </select>
              </div>
            </FlexLayout>
          </div>
        </ResponsiveCard>

        {/* 出走馬データ入力 */}
        <ResponsiveCard className="mb-6">
          <h3 className="text-responsive-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin size={20} />
            出走馬データ
          </h3>
          
          <FlexLayout direction="col" gap="md">
            <TouchOptimizedButton
              onClick={() => setShowDataInput(true)}
              variant="primary"
              icon={Upload}
              fullWidth
            >
              netkeiba データを貼り付け
            </TouchOptimizedButton>
            
            <TouchOptimizedButton
              onClick={() => {
                setEditingHorse(null);
                setShowManualEntry(true);
              }}
              variant="secondary"
              icon={Plus}
              fullWidth
            >
              手動で馬を追加
            </TouchOptimizedButton>
          </FlexLayout>
          
          {/* 登録済み馬一覧 */}
          {raceData.horses.length > 0 && (
            <div className="mt-4">
              <h4 className="text-responsive-sm font-medium text-gray-700 mb-2">
                登録済み出走馬 ({raceData.horses.length}頭)
              </h4>
              <div className="space-y-2">
                {raceData.horses.map((horse: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{horse.number}. {horse.name}</span>
                        <span className="text-sm text-gray-500">({horse.jockey})</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {horse.popularity}番人気
                        {horse.odds && ` • ${horse.odds}倍`}
                        {horse.pastRaces && ` • 成績${horse.pastRaces.length}走`}
                      </div>
                    </div>
                    <FlexLayout direction="row" gap="sm">
                      <TouchOptimizedButton
                        onClick={() => handleEditHorse(index)}
                        variant="ghost"
                        size="sm"
                        icon={Edit}
                      >
                        <span className="sr-only">編集</span>
                      </TouchOptimizedButton>
                      <TouchOptimizedButton
                        onClick={() => handleRemoveHorse(index)}
                        variant="ghost"
                        size="sm"
                        icon={X}
                      >
                        <span className="sr-only">削除</span>
                      </TouchOptimizedButton>
                    </FlexLayout>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ResponsiveCard>

        {/* 保存ボタン */}
        <FlexLayout direction="row" gap="md">
          <TouchOptimizedButton
            onClick={onBack}
            variant="secondary"
            fullWidth
          >
            キャンセル
          </TouchOptimizedButton>
          
          <TouchOptimizedButton
            onClick={handleSave}
            variant="primary"
            fullWidth
            disabled={!raceData.venue || !raceData.date}
          >
            レースを作成して予想開始
          </TouchOptimizedButton>
        </FlexLayout>
      </ResponsiveContainer>

      {/* データ入力モーダル */}
      {showDataInput && (
        <DataInputModal
          onClose={() => setShowDataInput(false)}
          onDataParsed={handleDataParsed}
          existingHorseNumbers={getExistingHorseNumbers()}
        />
      )}

      {/* 手動馬入力モーダル */}
      {showManualEntry && (
        <ManualHorseEntry
          onSave={handleManualHorseSave}
          onCancel={() => {
            setShowManualEntry(false);
            setEditingHorse(null);
          }}
          existingHorseNumbers={getExistingHorseNumbers().filter((_, i) => 
            editingHorse ? i !== editingHorse.index : true
          )}
          initialData={editingHorse?.horse}
        />
      )}
    </div>
  );
};