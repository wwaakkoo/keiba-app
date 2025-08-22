import React, { useState } from 'react';
import { Target, Clock, MapPin, Zap, Calendar } from 'lucide-react';
import { ResponsiveCard, ResponsiveGrid, FlexLayout } from '@/components/common/ResponsiveContainer';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { ZoomableChart } from '@/components/common/ZoomableChart';
import { HitPattern } from '@/services/performanceAnalysisService';

interface HitPatternAnalysisProps {
  hitPattern: HitPattern;
}

type PatternTab = 'favorite' | 'distance' | 'surface' | 'venue' | 'time';

export const HitPatternAnalysis: React.FC<HitPatternAnalysisProps> = ({
  hitPattern
}) => {
  const [activeTab, setActiveTab] = useState<PatternTab>('favorite');

  const tabs = [
    { id: 'favorite' as PatternTab, label: '人気', icon: Target },
    { id: 'distance' as PatternTab, label: '距離', icon: Zap },
    { id: 'surface' as PatternTab, label: '馬場', icon: MapPin },
    { id: 'venue' as PatternTab, label: '競馬場', icon: MapPin },
    { id: 'time' as PatternTab, label: '時間', icon: Clock }
  ];

  const renderFavoritePattern = () => (
    <div className="space-y-6">
      <ResponsiveCard>
        <h3 className="text-responsive-lg font-semibold mb-4 flex items-center gap-2">
          <Target size={20} />
          人気別パフォーマンス
        </h3>
        
        <ResponsiveGrid columns={{ mobile: 2, tablet: 4 }} gap="md">
          {Object.entries(hitPattern.favoritePerformance).map(([rank, data]) => (
            <div key={rank} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-responsive-base font-semibold mb-2">
                {rank === 'rank1' ? '1番人気' :
                 rank === 'rank2' ? '2番人気' :
                 rank === 'rank3' ? '3番人気' : '4番人気以下'}
              </div>
              
              <div className="space-y-2">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {data.hitRate.toFixed(1)}%
                  </div>
                  <div className="text-responsive-xs text-gray-600">的中率</div>
                </div>
                
                <div>
                  <div className={`text-responsive-base font-semibold ${
                    data.roi >= 0 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {data.roi >= 0 ? '+' : ''}{data.roi.toFixed(1)}%
                  </div>
                  <div className="text-responsive-xs text-gray-600">ROI</div>
                </div>
                
                <div className="text-responsive-xs text-gray-500">
                  ({data.count}回)
                </div>
              </div>
            </div>
          ))}
        </ResponsiveGrid>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-responsive-base font-semibold mb-2">分析結果</h4>
          <div className="text-responsive-sm text-gray-700">
            {(() => {
              const bestRank = Object.entries(hitPattern.favoritePerformance)
                .sort(([,a], [,b]) => b.roi - a.roi)[0];
              
              if (bestRank) {
                const rankName = bestRank[0] === 'rank1' ? '1番人気' :
                               bestRank[0] === 'rank2' ? '2番人気' :
                               bestRank[0] === 'rank3' ? '3番人気' : '4番人気以下';
                return `${rankName}で最も良いROI（${bestRank[1].roi.toFixed(1)}%）を記録しています。`;
              }
              return '十分なデータがありません。';
            })()}
          </div>
        </div>
      </ResponsiveCard>
    </div>
  );

  const renderDistancePattern = () => (
    <div className="space-y-6">
      <ResponsiveCard>
        <h3 className="text-responsive-lg font-semibold mb-4 flex items-center gap-2">
          <Zap size={20} />
          距離別パフォーマンス
        </h3>
        
        {Object.keys(hitPattern.distancePerformance).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Zap size={48} className="mx-auto mb-2 opacity-50" />
            <p>距離別データがありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(hitPattern.distancePerformance)
              .sort(([,a], [,b]) => b.roi - a.roi)
              .map(([distance, data]) => (
                <div key={distance} className="p-4 bg-gray-50 rounded-lg">
                  <FlexLayout direction="row" justify="between" align="center" className="mb-3">
                    <span className="text-responsive-base font-semibold">{distance}m</span>
                    <span className={`text-responsive-base font-bold ${
                      data.roi >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {data.roi >= 0 ? '+' : ''}{data.roi.toFixed(1)}%
                    </span>
                  </FlexLayout>
                  
                  <div className="grid grid-cols-3 gap-4 text-responsive-sm">
                    <div>
                      <div className="text-gray-600">的中率</div>
                      <div className="font-semibold">{data.hitRate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-gray-600">回数</div>
                      <div className="font-semibold">{data.count}回</div>
                    </div>
                    <div>
                      <div className="text-gray-600">得意オッズ</div>
                      <div className="font-semibold">{data.bestOddsRange}</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </ResponsiveCard>
    </div>
  );

  const renderSurfacePattern = () => (
    <div className="space-y-6">
      <ResponsiveCard>
        <h3 className="text-responsive-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin size={20} />
          馬場別パフォーマンス
        </h3>
        
        <ResponsiveGrid columns={{ mobile: 2 }} gap="md">
          <div className="text-center p-6 bg-green-50 rounded-lg">
            <div className="text-responsive-lg font-semibold mb-3">芝</div>
            
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {hitPattern.surfacePerformance.turf.hitRate.toFixed(1)}%
                </div>
                <div className="text-responsive-xs text-gray-600">的中率</div>
              </div>
              
              <div>
                <div className={`text-responsive-base font-semibold ${
                  hitPattern.surfacePerformance.turf.roi >= 0 ? 'text-blue-600' : 'text-red-600'
                }`}>
                  {hitPattern.surfacePerformance.turf.roi >= 0 ? '+' : ''}
                  {hitPattern.surfacePerformance.turf.roi.toFixed(1)}%
                </div>
                <div className="text-responsive-xs text-gray-600">ROI</div>
              </div>
              
              <div className="text-responsive-xs text-gray-500">
                ({hitPattern.surfacePerformance.turf.count}回)
              </div>
            </div>
          </div>
          
          <div className="text-center p-6 bg-orange-50 rounded-lg">
            <div className="text-responsive-lg font-semibold mb-3">ダート</div>
            
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {hitPattern.surfacePerformance.dirt.hitRate.toFixed(1)}%
                </div>
                <div className="text-responsive-xs text-gray-600">的中率</div>
              </div>
              
              <div>
                <div className={`text-responsive-base font-semibold ${
                  hitPattern.surfacePerformance.dirt.roi >= 0 ? 'text-blue-600' : 'text-red-600'
                }`}>
                  {hitPattern.surfacePerformance.dirt.roi >= 0 ? '+' : ''}
                  {hitPattern.surfacePerformance.dirt.roi.toFixed(1)}%
                </div>
                <div className="text-responsive-xs text-gray-600">ROI</div>
              </div>
              
              <div className="text-responsive-xs text-gray-500">
                ({hitPattern.surfacePerformance.dirt.count}回)
              </div>
            </div>
          </div>
        </ResponsiveGrid>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-responsive-base font-semibold mb-2">馬場適性分析</h4>
          <div className="text-responsive-sm text-gray-700">
            {(() => {
              const turfROI = hitPattern.surfacePerformance.turf.roi;
              const dirtROI = hitPattern.surfacePerformance.dirt.roi;
              
              if (turfROI > dirtROI + 5) {
                return '芝コースでより良いパフォーマンスを発揮しています。芝レースへの投資を重視することをお勧めします。';
              } else if (dirtROI > turfROI + 5) {
                return 'ダートコースでより良いパフォーマンスを発揮しています。ダートレースへの投資を重視することをお勧めします。';
              } else {
                return '芝・ダート両方で安定したパフォーマンスを発揮しています。';
              }
            })()}
          </div>
        </div>
      </ResponsiveCard>
    </div>
  );

  const renderVenuePattern = () => (
    <div className="space-y-6">
      <ResponsiveCard>
        <h3 className="text-responsive-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin size={20} />
          競馬場別パフォーマンス
        </h3>
        
        {Object.keys(hitPattern.venuePerformance).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MapPin size={48} className="mx-auto mb-2 opacity-50" />
            <p>競馬場別データがありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(hitPattern.venuePerformance)
              .sort(([,a], [,b]) => b.roi - a.roi)
              .slice(0, 10) // 上位10競馬場のみ表示
              .map(([venue, data]) => (
                <div key={venue} className="p-4 bg-gray-50 rounded-lg">
                  <FlexLayout direction="row" justify="between" align="center" className="mb-3">
                    <span className="text-responsive-base font-semibold">{venue}</span>
                    <span className={`text-responsive-base font-bold ${
                      data.roi >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {data.roi >= 0 ? '+' : ''}{data.roi.toFixed(1)}%
                    </span>
                  </FlexLayout>
                  
                  <div className="grid grid-cols-3 gap-4 text-responsive-sm">
                    <div>
                      <div className="text-gray-600">的中率</div>
                      <div className="font-semibold">{data.hitRate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-gray-600">回数</div>
                      <div className="font-semibold">{data.count}回</div>
                    </div>
                    <div>
                      <div className="text-gray-600">得意距離</div>
                      <div className="font-semibold">{data.bestDistance}</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </ResponsiveCard>
    </div>
  );

  const renderTimePattern = () => (
    <div className="space-y-6">
      {/* 時間帯別 */}
      <ResponsiveCard>
        <h3 className="text-responsive-lg font-semibold mb-4 flex items-center gap-2">
          <Clock size={20} />
          時間帯別パフォーマンス
        </h3>
        
        {Object.keys(hitPattern.timePatterns.hourly).length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <p>時間帯別データがありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(hitPattern.timePatterns.hourly)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([hour, data]) => (
                <div key={hour} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-responsive-sm font-semibold mb-1">{hour}時台</div>
                  <div className="text-responsive-sm text-green-600 font-semibold">
                    {data.hitRate.toFixed(1)}%
                  </div>
                  <div className={`text-responsive-xs ${
                    data.roi >= 0 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    ROI: {data.roi >= 0 ? '+' : ''}{data.roi.toFixed(1)}%
                  </div>
                  <div className="text-responsive-xs text-gray-500">({data.count}回)</div>
                </div>
              ))}
          </div>
        )}
      </ResponsiveCard>

      {/* 曜日別 */}
      <ResponsiveCard>
        <h3 className="text-responsive-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar size={20} />
          曜日別パフォーマンス
        </h3>
        
        {Object.keys(hitPattern.timePatterns.dayOfWeek).length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <p>曜日別データがありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['日', '月', '火', '水', '木', '金', '土'].map(day => {
              const data = hitPattern.timePatterns.dayOfWeek[day];
              if (!data) return null;
              
              return (
                <div key={day} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-responsive-sm font-semibold mb-1">{day}曜日</div>
                  <div className="text-responsive-sm text-green-600 font-semibold">
                    {data.hitRate.toFixed(1)}%
                  </div>
                  <div className={`text-responsive-xs ${
                    data.roi >= 0 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    ROI: {data.roi >= 0 ? '+' : ''}{data.roi.toFixed(1)}%
                  </div>
                  <div className="text-responsive-xs text-gray-500">({data.count}回)</div>
                </div>
              );
            })}
          </div>
        )}
      </ResponsiveCard>

      {/* 月別 */}
      <ResponsiveCard>
        <h3 className="text-responsive-lg font-semibold mb-4">月別パフォーマンス</h3>
        
        {Object.keys(hitPattern.timePatterns.monthly).length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <p>月別データがありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {Array.from({length: 12}, (_, i) => i + 1).map(month => {
              const data = hitPattern.timePatterns.monthly[month.toString()];
              if (!data) return null;
              
              return (
                <div key={month} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-responsive-sm font-semibold mb-1">{month}月</div>
                  <div className="text-responsive-sm text-green-600 font-semibold">
                    {data.hitRate.toFixed(1)}%
                  </div>
                  <div className={`text-responsive-xs ${
                    data.roi >= 0 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    ROI: {data.roi >= 0 ? '+' : ''}{data.roi.toFixed(1)}%
                  </div>
                  <div className="text-responsive-xs text-gray-500">({data.count}回)</div>
                </div>
              );
            })}
          </div>
        )}
      </ResponsiveCard>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'favorite': return renderFavoritePattern();
      case 'distance': return renderDistancePattern();
      case 'surface': return renderSurfacePattern();
      case 'venue': return renderVenuePattern();
      case 'time': return renderTimePattern();
      default: return renderFavoritePattern();
    }
  };

  return (
    <div className="space-y-6">
      {/* タブナビゲーション */}
      <ResponsiveCard>
        <FlexLayout direction="row" gap="sm" className="overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <TouchOptimizedButton
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                variant={activeTab === tab.id ? 'primary' : 'ghost'}
                size="sm"
                icon={Icon}
                className="whitespace-nowrap"
              >
                {tab.label}
              </TouchOptimizedButton>
            );
          })}
        </FlexLayout>
      </ResponsiveCard>

      {/* コンテンツ */}
      {renderContent()}
    </div>
  );
};