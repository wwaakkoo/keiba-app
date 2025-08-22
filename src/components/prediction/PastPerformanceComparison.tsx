import React, { useState } from 'react';
import { BarChart, Calendar, MapPin, Clock, Award, TrendingUp, TrendingDown } from 'lucide-react';
import { ResponsiveCard, FlexLayout } from '@/components/common/ResponsiveContainer';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';

interface PastPerformanceComparisonProps {
  horse: {
    name: string;
    number: number;
    pastRaces: Array<{
      rank: number;
      distance: number;
      time: number;
      surface: 'turf' | 'dirt';
      condition: string;
      venue?: string;
      date?: string;
    }>;
    scores: {
      speed: number;
      recent: number;
      odds: number;
      total: number;
    };
  };
  currentRace: {
    distance: number;
    surface: 'turf' | 'dirt';
    condition: string;
    venue?: string;
  };
  averageStats?: {
    winRate: number;
    placeRate: number;
    averageRank: number;
    totalRaces: number;
  };
}

export const PastPerformanceComparison: React.FC<PastPerformanceComparisonProps> = ({
  horse,
  currentRace,
  averageStats
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'distance' | 'surface' | 'condition'>('all');

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

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (rank <= 3) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (rank <= 5) return 'bg-green-100 text-green-800 border-green-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getFilteredRaces = () => {
    return horse.pastRaces.filter(race => {
      switch (selectedFilter) {
        case 'distance':
          return Math.abs(race.distance - currentRace.distance) <= 200;
        case 'surface':
          return race.surface === currentRace.surface;
        case 'condition':
          return race.condition === currentRace.condition;
        default:
          return true;
      }
    });
  };

  const calculateStats = (races: any[]) => {
    if (races.length === 0) return null;
    
    const wins = races.filter(r => r.rank === 1).length;
    const places = races.filter(r => r.rank <= 3).length;
    const averageRank = races.reduce((sum, r) => sum + r.rank, 0) / races.length;
    const averageTime = races.reduce((sum, r) => sum + r.time, 0) / races.length;
    
    return {
      totalRaces: races.length,
      winRate: (wins / races.length) * 100,
      placeRate: (places / races.length) * 100,
      averageRank: averageRank,
      averageTime: averageTime
    };
  };

  const getCompatibilityScore = () => {
    const filteredRaces = getFilteredRaces();
    if (filteredRaces.length === 0) return null;
    
    const stats = calculateStats(filteredRaces);
    if (!stats) return null;
    
    // 適性スコア計算（勝率、連対率、平均着順から算出）
    const winScore = stats.winRate * 0.4;
    const placeScore = stats.placeRate * 0.3;
    const rankScore = Math.max(0, (10 - stats.averageRank) / 10) * 30;
    
    return Math.round(winScore + placeScore + rankScore);
  };

  const filteredRaces = getFilteredRaces();
  const stats = calculateStats(filteredRaces);
  const compatibilityScore = getCompatibilityScore();

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <ResponsiveCard className="p-4">
        <h3 className="text-responsive-lg font-bold mb-4 flex items-center gap-2">
          <BarChart className="text-blue-600" size={20} />
          {horse.name} の過去成績分析
        </h3>

        {/* フィルター */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">条件で絞り込み:</p>
          <div className="flex flex-wrap gap-2">
            <TouchOptimizedButton
              onClick={() => setSelectedFilter('all')}
              variant={selectedFilter === 'all' ? 'primary' : 'secondary'}
              size="sm"
            >
              全て ({horse.pastRaces.length}走)
            </TouchOptimizedButton>
            <TouchOptimizedButton
              onClick={() => setSelectedFilter('distance')}
              variant={selectedFilter === 'distance' ? 'primary' : 'secondary'}
              size="sm"
            >
              同距離 ({horse.pastRaces.filter(r => Math.abs(r.distance - currentRace.distance) <= 200).length}走)
            </TouchOptimizedButton>
            <TouchOptimizedButton
              onClick={() => setSelectedFilter('surface')}
              variant={selectedFilter === 'surface' ? 'primary' : 'secondary'}
              size="sm"
            >
              同馬場 ({horse.pastRaces.filter(r => r.surface === currentRace.surface).length}走)
            </TouchOptimizedButton>
            <TouchOptimizedButton
              onClick={() => setSelectedFilter('condition')}
              variant={selectedFilter === 'condition' ? 'primary' : 'secondary'}
              size="sm"
            >
              同状態 ({horse.pastRaces.filter(r => r.condition === currentRace.condition).length}走)
            </TouchOptimizedButton>
          </div>
        </div>

        {/* 今回レース条件 */}
        <div className="p-3 bg-blue-50 rounded-lg mb-4">
          <h4 className="font-medium text-blue-800 mb-2">今回レース条件</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-blue-600" />
              <span>{getSurfaceLabel(currentRace.surface)} {currentRace.distance}m</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-blue-600" />
              <span>{getConditionLabel(currentRace.condition)}</span>
            </div>
          </div>
        </div>
      </ResponsiveCard>

      {/* 統計サマリー */}
      {stats && (
        <ResponsiveCard className="p-4">
          <h4 className="font-medium mb-3">成績サマリー ({selectedFilter === 'all' ? '全成績' : '条件絞り込み'})</h4>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.totalRaces}</div>
              <div className="text-sm text-gray-600">出走回数</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.winRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">勝率</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.placeRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">連対率</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.averageRank.toFixed(1)}</div>
              <div className="text-sm text-gray-600">平均着順</div>
            </div>
          </div>

          {/* 適性スコア */}
          {compatibilityScore !== null && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <FlexLayout direction="row" justify="between" align="center">
                <div>
                  <h5 className="font-medium text-gray-800">今回条件での適性度</h5>
                  <p className="text-sm text-gray-600">過去成績から算出した適性スコア</p>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${
                    compatibilityScore >= 80 ? 'text-green-600' :
                    compatibilityScore >= 60 ? 'text-blue-600' :
                    compatibilityScore >= 40 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {compatibilityScore}
                  </div>
                  <div className="text-sm text-gray-600">/ 100</div>
                </div>
              </FlexLayout>
            </div>
          )}
        </ResponsiveCard>
      )}

      {/* 過去成績詳細 */}
      <ResponsiveCard className="p-4">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Clock size={16} />
          過去成績詳細 ({filteredRaces.length}走)
        </h4>
        
        {filteredRaces.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="mx-auto mb-2" size={32} />
            <p>該当する条件での成績がありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRaces.map((race, index) => (
              <div key={index} className="p-3 border border-gray-200 rounded-lg">
                <FlexLayout direction="row" justify="between" align="center" className="mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full border-2 font-bold ${getRankColor(race.rank)}`}>
                      {race.rank}着
                    </div>
                    <div>
                      <div className="font-medium">
                        {getSurfaceLabel(race.surface)} {race.distance}m
                      </div>
                      <div className="text-sm text-gray-600">
                        {getConditionLabel(race.condition)}
                        {race.venue && ` • ${race.venue}`}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium">{formatTime(race.time)}</div>
                    {race.date && (
                      <div className="text-sm text-gray-600">{race.date}</div>
                    )}
                  </div>
                </FlexLayout>
                
                {/* 今回との比較 */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    {Math.abs(race.distance - currentRace.distance) <= 200 ? (
                      <TrendingUp className="text-green-500" size={14} />
                    ) : (
                      <TrendingDown className="text-red-500" size={14} />
                    )}
                    <span className={Math.abs(race.distance - currentRace.distance) <= 200 ? 'text-green-600' : 'text-red-600'}>
                      距離適性
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {race.surface === currentRace.surface ? (
                      <TrendingUp className="text-green-500" size={14} />
                    ) : (
                      <TrendingDown className="text-red-500" size={14} />
                    )}
                    <span className={race.surface === currentRace.surface ? 'text-green-600' : 'text-red-600'}>
                      馬場適性
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {race.condition === currentRace.condition ? (
                      <TrendingUp className="text-green-500" size={14} />
                    ) : (
                      <TrendingDown className="text-orange-500" size={14} />
                    )}
                    <span className={race.condition === currentRace.condition ? 'text-green-600' : 'text-orange-600'}>
                      馬場状態
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ResponsiveCard>

      {/* 全体統計との比較 */}
      {averageStats && (
        <ResponsiveCard className="p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Award size={16} />
            全体平均との比較
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {stats ? stats.winRate.toFixed(1) : '0.0'}%
                </div>
                <div className="text-sm text-gray-600 mb-1">勝率</div>
                <div className={`text-xs ${
                  stats && stats.winRate > averageStats.winRate ? 'text-green-600' : 'text-red-600'
                }`}>
                  平均: {averageStats.winRate.toFixed(1)}%
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {stats ? stats.placeRate.toFixed(1) : '0.0'}%
                </div>
                <div className="text-sm text-gray-600 mb-1">連対率</div>
                <div className={`text-xs ${
                  stats && stats.placeRate > averageStats.placeRate ? 'text-green-600' : 'text-red-600'
                }`}>
                  平均: {averageStats.placeRate.toFixed(1)}%
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">
                  {stats ? stats.averageRank.toFixed(1) : '0.0'}
                </div>
                <div className="text-sm text-gray-600 mb-1">平均着順</div>
                <div className={`text-xs ${
                  stats && stats.averageRank < averageStats.averageRank ? 'text-green-600' : 'text-red-600'
                }`}>
                  平均: {averageStats.averageRank.toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        </ResponsiveCard>
      )}
    </div>
  );
};