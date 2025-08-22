import React from 'react';
import { TrendingUp, Clock, DollarSign, Award, ChevronRight } from 'lucide-react';
import { ResponsiveCard, FlexLayout } from '@/components/common/ResponsiveContainer';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { HorseAnalysis } from '@/types/prediction';

interface HorseScoreDetailProps {
  horse: HorseAnalysis;
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
  onShowPastRaces?: () => void;
}

export const HorseScoreDetail: React.FC<HorseScoreDetailProps> = ({
  horse,
  raceInfo,
  weights,
  onShowPastRaces
}) => {
  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600 bg-green-100';
    if (percentage >= 60) return 'text-blue-600 bg-blue-100';
    if (percentage >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceLevel = (totalScore: number) => {
    const maxPossible = weights.speed + weights.recent + weights.odds;
    const percentage = (totalScore / maxPossible) * 100;
    
    if (percentage >= 85) return { level: '非常に高い', color: 'text-green-600' };
    if (percentage >= 70) return { level: '高い', color: 'text-blue-600' };
    if (percentage >= 55) return { level: '中程度', color: 'text-yellow-600' };
    if (percentage >= 40) return { level: '低い', color: 'text-orange-600' };
    return { level: '非常に低い', color: 'text-red-600' };
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${minutes}:${secs.padStart(4, '0')}`;
  };

  const getSurfaceLabel = (surface: string) => {
    return surface === 'turf' ? '芝' : 'ダート';
  };

  const getConditionLabel = (condition: string) => {
    const labels: { [key: string]: string } = {
      'good': '良',
      'slightly_heavy': '稍重',
      'heavy': '重',
      'bad': '不良'
    };
    return labels[condition] || condition;
  };

  const confidence = getConfidenceLevel(horse.scores.total);

  return (
    <ResponsiveCard className="p-4">
      {/* デバッグ情報 */}
      <div className="mb-2 p-2 bg-green-100 text-green-800 text-xs rounded">
        HorseScoreDetail表示中: {horse.horse.name} (スコア: {horse.scores?.total || 'なし'})
      </div>
      
      {/* ヘッダー */}
      <FlexLayout direction="row" justify="between" align="center" className="mb-4">
        <div>
          <h3 className="text-responsive-lg font-bold">
            {horse.horse.number}. {horse.horse.name}
          </h3>
          <p className="text-responsive-sm text-gray-600">
            {horse.horse.jockey} • {horse.horse.popularity}番人気
            {horse.horse.odds && ` • ${horse.horse.odds}倍`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {horse.scores.total.toFixed(1)}
          </div>
          <div className={`text-sm font-medium ${confidence.color}`}>
            {confidence.level}
          </div>
        </div>
      </FlexLayout>

      {/* スコア詳細 */}
      <div className="space-y-3 mb-4">
        {/* スピード指数スコア */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="text-blue-600" size={16} />
            </div>
            <div>
              <div className="font-medium">スピード指数</div>
              <div className="text-sm text-gray-600">
                過去成績から算出した能力値
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`px-2 py-1 rounded text-sm font-medium ${getScoreColor(horse.scores.speed, weights.speed)}`}>
              {horse.scores.speed.toFixed(1)} / {weights.speed}
            </div>
          </div>
        </div>

        {/* 直近成績スコア */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="text-green-600" size={16} />
            </div>
            <div>
              <div className="font-medium">直近成績</div>
              <div className="text-sm text-gray-600">
                最新レースの着順評価
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`px-2 py-1 rounded text-sm font-medium ${getScoreColor(horse.scores.recent, weights.recent)}`}>
              {horse.scores.recent.toFixed(1)} / {weights.recent}
            </div>
          </div>
        </div>

        {/* オッズスコア */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="text-yellow-600" size={16} />
            </div>
            <div>
              <div className="font-medium">オッズ評価</div>
              <div className="text-sm text-gray-600">
                市場の期待値による評価
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`px-2 py-1 rounded text-sm font-medium ${getScoreColor(horse.scores.odds, weights.odds)}`}>
              {horse.scores.odds.toFixed(1)} / {weights.odds}
            </div>
          </div>
        </div>
      </div>

      {/* 予想根拠 */}
      <div className="mb-4">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Award size={16} />
          予想根拠
        </h4>
        <div className="space-y-2 text-sm">
          {/* スピード指数の根拠 */}
          <div className="p-2 bg-blue-50 rounded">
            <span className="font-medium text-blue-800">スピード面:</span>
            <span className="text-blue-700 ml-1">
              {horse.pastRaces.length > 0 ? (
                `過去${horse.pastRaces.length}走の平均タイムから算出。`
              ) : (
                'データ不足のため評価困難。'
              )}
              {raceInfo.distance && horse.pastRaces.some(r => Math.abs(r.distance - raceInfo.distance) <= 200) ? (
                '同距離での実績あり。'
              ) : (
                '距離適性は未知数。'
              )}
            </span>
          </div>

          {/* 直近成績の根拠 */}
          <div className="p-2 bg-green-50 rounded">
            <span className="font-medium text-green-800">調子面:</span>
            <span className="text-green-700 ml-1">
              {horse.pastRaces.length > 0 ? (
                `前走${horse.pastRaces[0].rank}着。`
              ) : (
                'データなし。'
              )}
              {horse.pastRaces.length > 0 && horse.pastRaces[0].rank <= 3 ? (
                '好調を維持している可能性。'
              ) : horse.pastRaces.length > 0 && horse.pastRaces[0].rank > 5 ? (
                '前走は不振、巻き返しに期待。'
              ) : (
                '平凡な成績。'
              )}
            </span>
          </div>

          {/* オッズの根拠 */}
          <div className="p-2 bg-yellow-50 rounded">
            <span className="font-medium text-yellow-800">市場評価:</span>
            <span className="text-yellow-700 ml-1">
              {horse.horse.popularity <= 3 ? (
                '上位人気で市場の期待が高い。'
              ) : horse.horse.popularity <= 6 ? (
                '中位人気で穴馬候補。'
              ) : (
                '下位人気だが大穴の可能性。'
              )}
              {horse.horse.odds && horse.horse.odds < 3.0 ? (
                'オッズも低く本命視されている。'
              ) : horse.horse.odds && horse.horse.odds > 10.0 ? (
                'オッズは高く配当妙味あり。'
              ) : (
                ''
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 過去成績サマリー */}
      {horse.pastRaces.length > 0 && (
        <div>
          <FlexLayout direction="row" justify="between" align="center" className="mb-2">
            <h4 className="font-medium">過去成績 (最新{horse.pastRaces.length}走)</h4>
            {onShowPastRaces && (
              <TouchOptimizedButton
                onClick={onShowPastRaces}
                variant="ghost"
                size="sm"
                icon={ChevronRight}
              >
                詳細
              </TouchOptimizedButton>
            )}
          </FlexLayout>
          
          <div className="grid grid-cols-1 gap-2">
            {horse.pastRaces.slice(0, 3).map((race, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded font-medium ${
                    race.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                    race.rank <= 3 ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {race.rank}着
                  </span>
                  <span>{getSurfaceLabel(race.surface)}{race.distance}m</span>
                </div>
                <div className="text-right">
                  <div>{formatTime(race.time)}</div>
                  <div className="text-xs text-gray-500">
                    {getConditionLabel(race.condition)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ResponsiveCard>
  );
};