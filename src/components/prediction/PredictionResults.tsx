import React, { useState } from 'react';
import { Trophy, TrendingUp, Eye, Settings, BarChart3, DollarSign } from 'lucide-react';
import { ResponsiveCard, FlexLayout } from '@/components/common/ResponsiveContainer';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { HorseScoreDetail } from './HorseScoreDetail';

import { HorseAnalysis } from '@/types/prediction';

interface PredictionResultsProps {
  predictions: HorseAnalysis[];
  raceInfo: {
    distance: number;
    surface: 'turf' | 'dirt';
    condition: string;
  };
  weights: {
    speed: number;
    recent: number;
    odds: number;
  };
  onWeightChange?: (weights: { speed: number; recent: number; odds: number }) => void;
  onViewInvestment?: (predictionId?: string, raceData?: any) => void;
  predictionId?: string;
  race?: any;
}

export const PredictionResults: React.FC<PredictionResultsProps> = ({
  predictions,
  raceInfo,
  weights,
  onWeightChange,
  onViewInvestment,
  predictionId,
  race
}) => {
  const [selectedHorse, setSelectedHorse] = useState<number | null>(null);
  const [showWeightSettings, setShowWeightSettings] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  const getRankColor = (index: number) => {
    if (index === 0) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (index === 1) return 'bg-gray-100 text-gray-800 border-gray-200';
    if (index === 2) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-blue-50 text-blue-800 border-blue-100';
  };

  const getConfidenceLevel = (totalScore: number) => {
    const maxPossible = weights.speed + weights.recent + weights.odds;
    const percentage = (totalScore / maxPossible) * 100;
    
    if (percentage >= 85) return { level: 'S', color: 'text-green-600 bg-green-100' };
    if (percentage >= 70) return { level: 'A', color: 'text-blue-600 bg-blue-100' };
    if (percentage >= 55) return { level: 'B', color: 'text-yellow-600 bg-yellow-100' };
    if (percentage >= 40) return { level: 'C', color: 'text-orange-600 bg-orange-100' };
    return { level: 'D', color: 'text-red-600 bg-red-100' };
  };

  const getRecommendation = (index: number, horse: any) => {
    const confidence = getConfidenceLevel(horse.scores.total);
    
    if (index === 0 && confidence.level === 'S') {
      return { text: '本命', color: 'text-red-600 bg-red-100' };
    }
    if (index <= 2 && confidence.level >= 'A') {
      return { text: '対抗', color: 'text-blue-600 bg-blue-100' };
    }
    if (index <= 4 && confidence.level >= 'B') {
      return { text: '単穴', color: 'text-green-600 bg-green-100' };
    }
    if (horse.odds && horse.odds > 10.0 && confidence.level >= 'C') {
      return { text: '大穴', color: 'text-purple-600 bg-purple-100' };
    }
    return { text: '評価外', color: 'text-gray-600 bg-gray-100' };
  };

  if (predictions.length === 0) {
    return (
      <ResponsiveCard className="p-6 text-center">
        <BarChart3 className="mx-auto mb-4 text-gray-400" size={48} />
        <h3 className="text-responsive-lg font-medium text-gray-600 mb-2">
          予想結果がありません
        </h3>
        <p className="text-responsive-sm text-gray-500">
          レースデータを入力して予想を実行してください
        </p>
      </ResponsiveCard>
    );
  }

  // デバッグログは開発環境でのみ出力
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 PredictionResults受取データ構造確認:', predictions.slice(0, 2));
    console.log('🎯 スコア詳細確認:', predictions.slice(0, 2).map(p => ({
      name: p.horse?.name,
      scores: p.scores,
      speedIndex: p.speedIndex,
      recentForm: p.recentForm,
      confidence: p.confidence
    })));
    console.log('PredictionResults レンダリング:', {
      predictionsCount: predictions.length,
      selectedHorse,
      viewMode,
      firstHorse: predictions[0]?.horse?.name
    });
  }

  return (
    <div className="space-y-4">
      {/* デバッグ情報 */}
      <div className="p-2 bg-red-100 text-red-800 text-xs rounded mb-2">
        デバッグ: PredictionResults表示中 - {predictions.length}頭, 選択: {selectedHorse !== null ? `#${selectedHorse + 1}` : 'なし'}
      </div>
      
      {/* ヘッダー */}
      <ResponsiveCard className="p-4">
        <FlexLayout direction="row" justify="between" align="center" className="mb-4">
          <div>
            <h2 className="text-responsive-lg font-bold flex items-center gap-2">
              <Trophy className="text-yellow-600" size={20} />
              予想結果
            </h2>
            <p className="text-responsive-sm text-gray-600">
              {predictions.length}頭中の順位予想
            </p>
          </div>
          
          <FlexLayout direction="row" gap="sm">
            <TouchOptimizedButton
              onClick={() => setViewMode(viewMode === 'list' ? 'detail' : 'list')}
              variant="ghost"
              size="sm"
              icon={viewMode === 'list' ? Eye : BarChart3}
            >
              {viewMode === 'list' ? '詳細' : '一覧'}
            </TouchOptimizedButton>
            
            <TouchOptimizedButton
              onClick={() => setShowWeightSettings(!showWeightSettings)}
              variant="ghost"
              size="sm"
              icon={Settings}
            >
              重み設定
            </TouchOptimizedButton>
            
            {onViewInvestment && (
              <TouchOptimizedButton
                onClick={() => onViewInvestment(predictionId, race)}
                variant="primary"
                size="sm"
                icon={DollarSign}
              >
                投資記録
              </TouchOptimizedButton>
            )}
          </FlexLayout>
        </FlexLayout>

        {/* 重み設定 */}
        {showWeightSettings && onWeightChange && (
          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <h4 className="font-medium mb-3">予想重み設定</h4>
            <div className="space-y-3">
              <div>
                <FlexLayout direction="row" justify="between" align="center" className="mb-1">
                  <label className="text-sm font-medium">スピード指数</label>
                  <span className="text-sm text-gray-600">{weights.speed}%</span>
                </FlexLayout>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weights.speed}
                  onChange={(e) => onWeightChange({
                    ...weights,
                    speed: parseInt(e.target.value)
                  })}
                  className="w-full"
                />
              </div>
              
              <div>
                <FlexLayout direction="row" justify="between" align="center" className="mb-1">
                  <label className="text-sm font-medium">直近成績</label>
                  <span className="text-sm text-gray-600">{weights.recent}%</span>
                </FlexLayout>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weights.recent}
                  onChange={(e) => onWeightChange({
                    ...weights,
                    recent: parseInt(e.target.value)
                  })}
                  className="w-full"
                />
              </div>
              
              <div>
                <FlexLayout direction="row" justify="between" align="center" className="mb-1">
                  <label className="text-sm font-medium">オッズ評価</label>
                  <span className="text-sm text-gray-600">{weights.odds}%</span>
                </FlexLayout>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weights.odds}
                  onChange={(e) => onWeightChange({
                    ...weights,
                    odds: parseInt(e.target.value)
                  })}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* 上位3頭のサマリー */}
        <div className="grid grid-cols-3 gap-2">
          {predictions.slice(0, 3).map((horse, index) => {
            const confidence = getConfidenceLevel(horse.scores.total);
            const recommendation = getRecommendation(index, horse);
            
            return (
              <div key={horse.horse.number} className={`p-3 rounded-lg border-2 ${getRankColor(index)}`}>
                <div className="text-center">
                  <div className="text-lg font-bold">{index + 1}位</div>
                  <div className="text-sm font-medium">{horse.horse.number}. {horse.horse.name}</div>
                  <div className="text-xs mt-1">{horse.scores.total.toFixed(1)}pt</div>
                  <div className={`text-xs px-2 py-1 rounded mt-1 ${confidence.color}`}>
                    {confidence.level}ランク
                  </div>
                  <div className={`text-xs px-2 py-1 rounded mt-1 ${recommendation.color}`}>
                    {recommendation.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ResponsiveCard>

      {/* 詳細表示モード */}
      {viewMode === 'detail' && selectedHorse !== null && (
        <div data-horse-detail>
          <HorseScoreDetail
            horse={predictions[selectedHorse]}
            raceInfo={raceInfo}
            weights={weights}
            onShowPastRaces={() => {
              console.log('過去成績詳細表示:', predictions[selectedHorse].horse.name);
            }}
          />
        </div>
      )}

      {/* 選択された馬の詳細（一覧モードでも表示） */}
      {viewMode === 'list' && selectedHorse !== null && (
        <div data-horse-detail>
          <div className="mb-2 p-2 bg-blue-100 text-blue-800 text-sm rounded">
            デバッグ: 選択された馬 #{selectedHorse + 1} - {predictions[selectedHorse]?.horse?.name}
          </div>
          <HorseScoreDetail
            horse={predictions[selectedHorse]}
            raceInfo={raceInfo}
            weights={weights}
            onShowPastRaces={() => {
              console.log('過去成績詳細表示:', predictions[selectedHorse].horse.name);
            }}
          />
        </div>
      )}

      {/* 一覧表示 */}
      <div className="space-y-2">
        {predictions.map((horse, index) => {
          const confidence = getConfidenceLevel(horse.scores.total);
          const recommendation = getRecommendation(index, horse);
          
          return (
            <ResponsiveCard 
              key={horse.horse.number} 
              className={`transition-colors ${
                selectedHorse === index ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => {
                if (process.env.NODE_ENV === 'development') {
                  console.log('🐎 馬をクリック:', horse.horse.name, 'index:', index, '現在の選択:', selectedHorse);
                }
                setSelectedHorse(selectedHorse === index ? null : index);
              }}
            >
              <FlexLayout direction="row" justify="between" align="center" className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getRankColor(index)}`}>
                    {index + 1}
                  </div>
                  
                  <div>
                    <div className="font-medium">
                      {horse.horse.number}. {horse.horse.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {horse.horse.jockey} • {horse.horse.popularity}番人気
                      {horse.horse.odds && ` • ${horse.horse.odds}倍`}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      👆 クリックで詳細表示
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    {horse.scores.total.toFixed(1)}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs px-2 py-1 rounded ${confidence.color}`}>
                      {confidence.level}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${recommendation.color}`}>
                      {recommendation.text}
                    </span>
                  </div>
                </div>
              </FlexLayout>
              
              {/* スコア内訳（選択時のみ表示） */}
              {selectedHorse === index && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-blue-600 font-medium">スピード</div>
                      <div>{horse.scores.speed.toFixed(1)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-600 font-medium">直近</div>
                      <div>{horse.scores.recent.toFixed(1)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-yellow-600 font-medium">オッズ</div>
                      <div>{horse.scores.odds.toFixed(1)}</div>
                    </div>
                  </div>
                  
                  <TouchOptimizedButton
                    onClick={(e) => {
                      if (e) {
                        e.stopPropagation();
                      }
                      // 既に詳細が表示されているので、スクロールして詳細セクションに移動
                      const detailElement = document.querySelector('[data-horse-detail]');
                      if (detailElement) {
                        detailElement.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    variant="secondary"
                    size="sm"
                    fullWidth
                    className="mt-3"
                    icon={TrendingUp}
                  >
                    詳細分析を見る
                  </TouchOptimizedButton>
                </div>
              )}
            </ResponsiveCard>
          );
        })}
      </div>
    </div>
  );
};