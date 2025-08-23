import React, { useState, useEffect } from 'react';
import { FlexLayout, ResponsiveGrid } from '@/components/common/ResponsiveContainer';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { AlertCircle, CheckCircle, TrendingUp, Shield, Target, Zap } from 'lucide-react';
import { InvestmentStrategy } from './StrategyRecommendation';

interface EnhancedInvestmentModalProps {
  prediction: any;
  race: any;
  onClose: () => void;
  onSave: (investment: any) => void;
  savedPredictionId: string | null;
  onPredictionSave?: (predictionData: any) => Promise<string>;
  selectedStrategy?: InvestmentStrategy | null; // 推奨戦略
}

export const EnhancedInvestmentModal: React.FC<EnhancedInvestmentModalProps> = ({
  prediction,
  race,
  onClose,
  onSave,
  savedPredictionId,
  onPredictionSave,
  selectedStrategy
}) => {
  const [betType, setBetType] = useState<'win' | 'place' | 'exacta' | 'quinella' | 'trifecta' | 'wide'>('win');
  const [amount, setAmount] = useState(1000);
  const [selections, setSelections] = useState<number[]>([]);
  const [odds, setOdds] = useState(0);
  const [isSimulated, setIsSimulated] = useState(true);
  const [useStrategy, setUseStrategy] = useState(!!selectedStrategy);

  // 推奨戦略の初期化
  useEffect(() => {
    if (selectedStrategy && useStrategy) {
      setBetType(selectedStrategy.type as any);
      setAmount(selectedStrategy.recommendedAmount);
      setSelections(selectedStrategy.selections);
      setOdds(selectedStrategy.expectedOdds);
    } else if (prediction?.predictions && prediction.predictions.length > 0) {
      // デフォルト設定
      const topHorse = prediction.predictions[0];
      if (topHorse?.horse?.number) {
        setSelections([topHorse.horse.number]);
        setOdds(topHorse.horse.odds || 3.0);
      }
    }
  }, [selectedStrategy, useStrategy, prediction]);

  const handleBetTypeChange = (newBetType: typeof betType) => {
    setBetType(newBetType);
    
    // 推奨戦略を使用している場合は戦略の値を適用
    if (selectedStrategy && useStrategy && selectedStrategy.type === newBetType) {
      setSelections(selectedStrategy.selections);
      setOdds(selectedStrategy.expectedOdds);
      setAmount(selectedStrategy.recommendedAmount);
      return;
    }

    // 通常の券種変更処理
    if (prediction?.predictions) {
      switch (newBetType) {
        case 'win':
        case 'place':
          setSelections([prediction.predictions[0]?.horse?.number || 1]);
          break;
        case 'exacta':
        case 'quinella':
        case 'wide':
          setSelections([
            prediction.predictions[0]?.horse?.number || 1,
            prediction.predictions[1]?.horse?.number || 2
          ]);
          break;
        case 'trifecta':
          setSelections([
            prediction.predictions[0]?.horse?.number || 1,
            prediction.predictions[1]?.horse?.number || 2,
            prediction.predictions[2]?.horse?.number || 3
          ]);
          break;
      }
    }
  };

  const toggleStrategyUse = () => {
    setUseStrategy(!useStrategy);
    if (selectedStrategy && !useStrategy) {
      // 戦略を適用
      setBetType(selectedStrategy.type as any);
      setAmount(selectedStrategy.recommendedAmount);
      setSelections(selectedStrategy.selections);
      setOdds(selectedStrategy.expectedOdds);
    }
  };

  const handleSave = async () => {
    if (selections.length === 0) {
      alert('馬番を選択してください');
      return;
    }

    // 予想が保存されていない場合は先に保存する
    let currentPredictionId = savedPredictionId;
    if (!currentPredictionId && prediction && onPredictionSave) {
      try {
        const result = await onPredictionSave(prediction);
        if (typeof result === 'string') {
          currentPredictionId = result;
        }
      } catch (error) {
        console.error('❌ 予想自動保存エラー:', error);
        alert('予想の保存に失敗しました。');
        return;
      }
    }

    if (!currentPredictionId) {
      alert('予想IDが取得できません。');
      return;
    }

    const investment = {
      raceId: race.id || `${race.venue}_${race.date}_${race.raceNumber}`,
      predictionId: currentPredictionId,
      betType,
      selections,
      amount,
      odds,
      payout: 0,
      profit: 0,
      timestamp: new Date(),
      venue: race.venue,
      raceNumber: race.raceNumber,
      raceDate: race.date,
      isSimulated,
      // 戦略情報を追加
      ...(selectedStrategy && useStrategy && {
        strategyUsed: true,
        strategyType: selectedStrategy.type,
        strategyRiskLevel: selectedStrategy.riskLevel,
        strategyConfidence: selectedStrategy.confidence,
        strategyRationale: selectedStrategy.rationale,
        expectedReturn: selectedStrategy.expectedReturn
      })
    };

    onSave(investment);
  };

  const getBetTypeLabel = (type: string) => {
    const labels = {
      win: '単勝',
      place: '複勝',
      exacta: '馬連',
      quinella: '馬単',
      trifecta: '3連複',
      wide: 'ワイド'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'low': return <Shield className="w-4 h-4" />;
      case 'medium': return <Target className="w-4 h-4" />;
      case 'high': return <Zap className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">投資記録を作成</h3>
        
        {/* 推奨戦略情報 */}
        {selectedStrategy && (
          <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-purple-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                AI推奨戦略
              </h4>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useStrategy}
                  onChange={toggleStrategyUse}
                  className="rounded"
                />
                <span className="text-sm text-purple-700">適用</span>
              </label>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span>券種:</span>
                <span className="font-medium">{getBetTypeLabel(selectedStrategy.type)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>推奨額:</span>
                <span className="font-medium">{selectedStrategy.recommendedAmount.toLocaleString()}円</span>
              </div>
              <div className="flex justify-between items-center">
                <span>リスク:</span>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getRiskLevelColor(selectedStrategy.riskLevel)}`}>
                  {getRiskLevelIcon(selectedStrategy.riskLevel)}
                  <span>{selectedStrategy.riskLevel === 'low' ? '低' : selectedStrategy.riskLevel === 'medium' ? '中' : '高'}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>確信度:</span>
                <span className="font-medium text-purple-600">{selectedStrategy.confidence}%</span>
              </div>
            </div>
            
            <p className="mt-3 text-xs text-purple-700 italic">
              "{selectedStrategy.rationale}"
            </p>
          </div>
        )}

        {/* 予想情報の表示 */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">予想情報</h4>
          <p className="text-sm text-blue-700">
            {race.date} {race.venue} {race.raceNumber}R
          </p>
          <div className="text-sm text-blue-600 mt-2">
            予想: {prediction.predictions?.slice(0, 3).map((p: any, i: number) => 
              `${i + 1}位 ${p.horse?.number}番`
            ).join(', ')}
          </div>
        </div>

        {/* 券種選択 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            券種
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['win', 'place', 'exacta', 'quinella', 'wide', 'trifecta'] as const).map((type) => (
              <button
                key={type}
                onClick={() => handleBetTypeChange(type)}
                className={`p-2 rounded border text-sm font-medium transition-colors ${
                  betType === type
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                } ${selectedStrategy && useStrategy && selectedStrategy.type === type ? 'ring-2 ring-purple-300' : ''}`}
              >
                {getBetTypeLabel(type)}
              </button>
            ))}
          </div>
        </div>

        {/* 選択馬番 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            選択馬番
          </label>
          <div className="flex gap-2 flex-wrap">
            {selections.map((num, index) => (
              <input
                key={index}
                type="number"
                min="1"
                max="18"
                value={num}
                onChange={(e) => {
                  const newSelections = [...selections];
                  newSelections[index] = parseInt(e.target.value) || 1;
                  setSelections(newSelections);
                }}
                className="w-16 p-2 border border-gray-300 rounded text-center"
              />
            ))}
          </div>
        </div>

        {/* 投資額 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            投資額 (円)
          </label>
          <input
            type="number"
            min="100"
            step="100"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value) || 1000)}
            className={`w-full p-2 border border-gray-300 rounded ${
              selectedStrategy && useStrategy && amount === selectedStrategy.recommendedAmount 
                ? 'ring-2 ring-purple-300' : ''
            }`}
          />
          {selectedStrategy && useStrategy && (
            <p className="text-xs text-purple-600 mt-1">
              推奨額: {selectedStrategy.recommendedAmount.toLocaleString()}円
            </p>
          )}
        </div>

        {/* 予想オッズ */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            予想オッズ
          </label>
          <input
            type="number"
            min="1.0"
            step="0.1"
            value={odds}
            onChange={(e) => setOdds(parseFloat(e.target.value) || 1.0)}
            className={`w-full p-2 border border-gray-300 rounded ${
              selectedStrategy && useStrategy && Math.abs(odds - selectedStrategy.expectedOdds) < 0.1 
                ? 'ring-2 ring-purple-300' : ''
            }`}
          />
          {selectedStrategy && useStrategy && (
            <p className="text-xs text-purple-600 mt-1">
              推奨オッズ: {selectedStrategy.expectedOdds.toFixed(1)}倍
            </p>
          )}
        </div>

        {/* シミュレーション設定 */}
        <div className="mb-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isSimulated}
              onChange={(e) => setIsSimulated(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">
              シミュレーション投資（実際には購入していない）
            </span>
          </label>
        </div>

        {/* 収支予想 */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            収支予想
          </h4>
          <ResponsiveGrid columns={{ mobile: 2 }} gap="sm" className="text-sm">
            <div>
              <div className="text-gray-600">投資額</div>
              <div className="font-bold text-blue-600">{amount.toLocaleString()}円</div>
            </div>
            <div>
              <div className="text-gray-600">予想払戻</div>
              <div className="font-bold text-green-600">{(amount * odds).toLocaleString()}円</div>
            </div>
            <div className="col-span-2">
              <div className="text-gray-600">予想損益</div>
              <div className={`font-bold text-lg ${
                (amount * odds - amount) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {((amount * odds - amount) >= 0 ? '+' : '')}{(amount * odds - amount).toLocaleString()}円
              </div>
            </div>
          </ResponsiveGrid>

          {selectedStrategy && useStrategy && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">AI期待収益:</span>
                <span className={`font-medium ${
                  selectedStrategy.expectedReturn >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {selectedStrategy.expectedReturn >= 0 ? '+' : ''}{selectedStrategy.expectedReturn.toLocaleString()}円
                </span>
              </div>
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <FlexLayout direction="row" gap="md">
          <TouchOptimizedButton
            onClick={onClose}
            variant="secondary"
            className="flex-1"
          >
            キャンセル
          </TouchOptimizedButton>
          <TouchOptimizedButton
            onClick={handleSave}
            variant="primary"
            className="flex-1"
            icon={selectedStrategy && useStrategy ? CheckCircle : undefined}
          >
            {selectedStrategy && useStrategy ? 'AI戦略で作成' : '記録作成'}
          </TouchOptimizedButton>
        </FlexLayout>
      </div>
    </div>
  );
};