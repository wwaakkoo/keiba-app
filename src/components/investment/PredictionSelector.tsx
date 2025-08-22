import React, { useState, useEffect } from 'react';
import { Target, Calendar, ArrowRight, Plus, AlertCircle } from 'lucide-react';
import { PredictionResult } from '@/types/prediction';
import { predictionRepository } from '@/services/repositories/PredictionRepository';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { ResponsiveCard, FlexLayout } from '@/components/common/ResponsiveContainer';

interface PredictionSelectorProps {
  onSelectPrediction: (prediction: PredictionResult) => void;
  onCreateNewPrediction: () => void;
  onCancel: () => void;
}

export const PredictionSelector: React.FC<PredictionSelectorProps> = ({
  onSelectPrediction,
  onCreateNewPrediction,
  onCancel
}) => {
  const [pendingPredictions, setPendingPredictions] = useState<PredictionResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPredictionId, setSelectedPredictionId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingPredictions();
  }, []);

  const loadPendingPredictions = async () => {
    try {
      setIsLoading(true);
      const predictions = await predictionRepository.getPendingPredictions();
      setPendingPredictions(predictions);
    } catch (error) {
      console.error('予想一覧取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const getConfidenceLevel = (prediction: PredictionResult): { level: string; color: string } => {
    if (prediction.confidenceLevel) {
      const confidence = prediction.confidenceLevel.overall;
      if (confidence === 'high') return { level: 'S', color: 'text-green-600 bg-green-100' };
      if (confidence === 'medium') return { level: 'A', color: 'text-blue-600 bg-blue-100' };
      return { level: 'B', color: 'text-yellow-600 bg-yellow-100' };
    }
    return { level: 'C', color: 'text-gray-600 bg-gray-100' };
  };

  const handlePredictionSelect = () => {
    const selected = pendingPredictions.find(p => p.id === selectedPredictionId);
    if (selected) {
      onSelectPrediction(selected);
    }
  };

  if (isLoading) {
    return (
      <ResponsiveCard className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">予想一覧を読み込み中...</span>
        </div>
      </ResponsiveCard>
    );
  }

  return (
    <div className="space-y-4">
      <ResponsiveCard className="p-4">
        <FlexLayout direction="row" justify="between" align="center" className="mb-4">
          <div>
            <h2 className="text-responsive-lg font-bold flex items-center gap-2">
              <Target className="text-blue-600" size={20} />
              予想を選択
            </h2>
            <p className="text-responsive-sm text-gray-600">
              投資記録を作成する予想を選んでください
            </p>
          </div>
          <TouchOptimizedButton
            onClick={onCancel}
            variant="ghost"
            size="sm"
          >
            キャンセル
          </TouchOptimizedButton>
        </FlexLayout>

        {pendingPredictions.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-responsive-lg font-medium text-gray-600 mb-2">
              投資可能な予想がありません
            </h3>
            <p className="text-responsive-sm text-gray-500 mb-4">
              まずはレース予想を作成してから投資記録を追加しましょう
            </p>
            <TouchOptimizedButton
              onClick={onCreateNewPrediction}
              variant="primary"
              icon={Plus}
            >
              新しい予想を作成
            </TouchOptimizedButton>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {pendingPredictions.map((prediction) => {
                const confidence = getConfidenceLevel(prediction);
                const isSelected = selectedPredictionId === prediction.id;
                
                return (
                  <ResponsiveCard
                    key={prediction.id}
                    className={`transition-colors cursor-pointer ${
                      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedPredictionId(prediction.id)}
                  >
                    <FlexLayout direction="row" justify="between" align="center" className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          isSelected ? 'bg-blue-500' : 'bg-gray-300'
                        }`} />
                        
                        <div>
                          <div className="font-medium">
                            {prediction.race.venue} {prediction.race.raceNumber}R
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <Calendar size={14} />
                            {formatDate(prediction.race.raceDate)}
                            <span>•</span>
                            <span>{prediction.race.distance}m</span>
                            <span>•</span>
                            <span>{prediction.race.surface === 'turf' ? '芝' : 'ダート'}</span>
                          </div>
                          <div className="text-xs text-blue-600 mt-1">
                            {prediction.horseCount}頭立て • 1位予想: {prediction.predictions[0]?.horse.name}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-xs px-2 py-1 rounded ${confidence.color}`}>
                          {confidence.level}ランク
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(prediction.timestamp)}作成
                        </div>
                      </div>
                    </FlexLayout>
                  </ResponsiveCard>
                );
              })}
            </div>

            <FlexLayout direction="row" gap="md">
              <TouchOptimizedButton
                onClick={onCreateNewPrediction}
                variant="secondary"
                icon={Plus}
                fullWidth
              >
                新しい予想を作成
              </TouchOptimizedButton>
              
              <TouchOptimizedButton
                onClick={handlePredictionSelect}
                variant="primary"
                icon={ArrowRight}
                disabled={!selectedPredictionId}
                fullWidth
              >
                この予想で投資記録
              </TouchOptimizedButton>
            </FlexLayout>
          </>
        )}
      </ResponsiveCard>
    </div>
  );
};