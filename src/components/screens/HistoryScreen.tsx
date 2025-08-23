import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, TrendingUp, AlertCircle, Target, Trash2 } from 'lucide-react';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';
import { ResponsiveContainer, ResponsiveCard, FlexLayout } from '@/components/common/ResponsiveContainer';
import { BackHeaderWithHome } from '@/components/common/MobileHeader';
import { predictionRepository } from '@/services/repositories/PredictionRepository';
import { investmentRepository } from '@/services/repositories/InvestmentRepository';
import { PredictionResult } from '@/types/prediction';
import { Investment } from '@/types/investment';

// 日付フォーマット関数（グローバルで使用可能にする）
const formatDate = (date: string | Date) => {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

interface HistoryScreenProps {
  onBack: () => void;
  onNavigateToHome?: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  onBack,
  onNavigateToHome = () => {}
}) => {
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionResult | null>(null);
  const [showResultInput, setShowResultInput] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [predictionToDelete, setPredictionToDelete] = useState<PredictionResult | null>(null);

  // 予想データを取得
  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      setIsLoading(true);
      const data = await predictionRepository.getHistory(50);
      setPredictions(data);
    } catch (error) {
      console.error('予想履歴取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleResultInput = (prediction: PredictionResult) => {
    setSelectedPrediction(prediction);
    setShowResultInput(true);
  };

  const handleResultSave = async (actualRanking: number[]) => {
    if (!selectedPrediction) return;

    try {
      // 精度計算（簡易版：1着的中かどうか）
      const topPrediction = selectedPrediction.predictions?.[0];
      const actualFirst = actualRanking[0];
      const isCorrect = topPrediction?.horse?.number === actualFirst;
      const accuracy = isCorrect ? 100 : 0;

      // 予想結果をDB更新
      await predictionRepository.updateResult(selectedPrediction.id, {
        actualRanking,
        accuracy,
        isCorrect
      });

      // 関連する投資記録も更新
      await updateInvestmentResults(selectedPrediction.id, actualRanking, isCorrect);

      // 状態更新
      setShowResultInput(false);
      setSelectedPrediction(null);
      
      // データ再読み込み
      await loadPredictions();
      
      alert(isCorrect ? '🎉 予想的中！投資記録も更新されました' : '📊 結果を保存しました');
    } catch (error) {
      console.error('結果保存エラー:', error);
      alert('結果の保存に失敗しました');
    }
  };

  // 投資記録の結果を更新する関数
  const updateInvestmentResults = async (predictionId: string, actualRanking: number[], _isCorrect: boolean) => {
    try {
      console.log('🔍 投資記録更新開始:', { predictionId, actualRanking, raceId: selectedPrediction?.raceId });
      
      // 該当予想に関連する投資記録を取得
      const investments = await investmentRepository.getByRaceId(selectedPrediction?.raceId || '');
      console.log('📊 取得した投資記録:', investments.length, '件');
      
      const relatedInvestments = investments.filter(inv => inv.predictionId === predictionId);
      console.log('🎯 関連投資記録:', relatedInvestments.length, '件', relatedInvestments);

      if (relatedInvestments.length === 0) {
        console.log('⚠️ 更新対象の投資記録が見つかりません');
        return;
      }

      // 各投資記録を更新
      for (const investment of relatedInvestments) {
        let actualPayout = 0;
        let actualProfit = 0;

        // 投資の的中判定と払戻額計算
        const investmentHit = checkInvestmentHit(investment, actualRanking);
        console.log('🎲 投資判定結果:', {
          investmentId: investment.id,
          betType: investment.betType,
          selections: investment.selections,
          actualRanking,
          isHit: investmentHit
        });
        
        if (investmentHit) {
          // 的中した場合、実際の払戻額を計算（オッズベース）
          actualPayout = investment.amount * investment.odds;
          actualProfit = actualPayout - investment.amount;
          console.log('✅ 的中:', { actualPayout, actualProfit });
        } else {
          // 外れた場合
          actualPayout = 0;
          actualProfit = -investment.amount;
          console.log('❌ 外れ:', { actualPayout, actualProfit });
        }

        // 投資記録を更新
        console.log('💾 投資記録更新:', investment.id, { payout: actualPayout, profit: actualProfit });
        await investmentRepository.update(investment.id, {
          payout: actualPayout,
          profit: actualProfit
        });
        console.log('✅ 更新完了:', investment.id);
      }
      
      console.log('🎉 全投資記録更新完了');
    } catch (error) {
      console.error('❌ 投資記録更新エラー:', error);
      // エラーが発生しても結果入力は成功扱いにする
    }
  };

  // 投資の的中判定
  const checkInvestmentHit = (investment: Investment, actualRanking: number[]): boolean => {
    const selections = investment.selections;
    const [first, second, third] = actualRanking.slice(0, 3);

    console.log('🔍 的中判定詳細:', {
      betType: investment.betType,
      selections,
      actualRanking: [first, second, third]
    });

    switch (investment.betType) {
      case 'win':
        const winHit = selections.includes(first);
        console.log('🏆 単勝判定:', { selections, first, isHit: winHit });
        return winHit;
      
      case 'place':
        const placeHit = selections.some(num => [first, second, third].includes(num));
        console.log('🥉 複勝判定:', { selections, topThree: [first, second, third], isHit: placeHit });
        return placeHit;
      
      case 'exacta':
        const exactaHit = selections.length >= 2 && selections.includes(first) && selections.includes(second);
        console.log('🎯 馬連判定:', { selections, first, second, isHit: exactaHit });
        return exactaHit;
      
      case 'quinella':
        const quinellaHit = selections.length >= 2 && selections.includes(first) && selections.includes(second);
        console.log('🎯 馬単判定:', { selections, first, second, isHit: quinellaHit });
        return quinellaHit;
      
      case 'trio':
        const trioHit = selections.length >= 3 && 
               selections.includes(first) && selections.includes(second) && selections.includes(third);
        console.log('🎯 3連複判定:', { selections, first, second, third, isHit: trioHit });
        return trioHit;
      
      case 'trifecta':
        const trifectaHit = selections.length >= 3 && 
               selections.includes(first) && selections.includes(second) && selections.includes(third);
        console.log('🎯 3連単判定:', { selections, first, second, third, isHit: trifectaHit });
        return trifectaHit;
      
      case 'tierce': // ワイド
        const tierceHit = selections.length >= 2 && 
               ((selections.includes(first) && (selections.includes(second) || selections.includes(third))) ||
                (selections.includes(second) && selections.includes(third)));
        console.log('🎯 ワイド判定:', { selections, first, second, third, isHit: tierceHit });
        return tierceHit;
      
      default:
        console.log('❓ 不明な券種:', investment.betType);
        return false;
    }
  };

  // 削除関連のハンドラー
  const handleDeleteClick = (prediction: PredictionResult) => {
    setPredictionToDelete(prediction);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!predictionToDelete) return;

    try {
      // DB から削除
      await predictionRepository.delete(predictionToDelete.id);
      
      // ローカル状態を更新
      setPredictions(prev => prev.filter(p => p.id !== predictionToDelete.id));
      
      // ダイアログを閉じる
      setShowDeleteConfirm(false);
      setPredictionToDelete(null);
      
      console.log('予想履歴を削除しました');
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setPredictionToDelete(null);
  };

  const getResultStatus = (prediction: PredictionResult) => {
    if (prediction.accuracy !== undefined) {
      return prediction.isCorrect ? 
        { text: '的中', color: 'text-green-600 bg-green-100' } :
        { text: '外れ', color: 'text-red-600 bg-red-100' };
    }
    return { text: '未入力', color: 'text-gray-600 bg-gray-100' };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <BackHeaderWithHome
        title="📈 成績履歴"
        onBack={onBack}
        onHome={onNavigateToHome}
      />

      <ResponsiveContainer maxWidth="mobile" padding="md">
        {isLoading ? (
          <ResponsiveCard className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">読み込み中...</p>
          </ResponsiveCard>
        ) : predictions.length === 0 ? (
          <ResponsiveCard>
            <div className="text-center py-12">
              <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-responsive-lg font-medium text-gray-600 mb-2">
                成績履歴がありません
              </h3>
              <p className="text-responsive-sm text-gray-500 mb-6">
                予想を実行して結果を入力すると、ここに履歴が表示されます
              </p>
              <TouchOptimizedButton
                onClick={onBack}
                variant="primary"
                icon={TrendingUp}
              >
                予想を始める
              </TouchOptimizedButton>
            </div>
          </ResponsiveCard>
        ) : (
          <div className="space-y-4">
            {predictions.map((prediction, _index) => {
              const status = getResultStatus(prediction);
              const topThree = prediction.predictions?.slice(0, 3) || [];
              
              return (
                <ResponsiveCard key={prediction.id} className="p-4">
                  <FlexLayout direction="row" justify="between" align="start" className="mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-responsive-sm font-medium">
                          {formatDate(prediction.timestamp)} {prediction.race?.venue} {prediction.race?.raceNumber}R
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.text}
                        </span>
                      </div>
                      <p className="text-responsive-xs text-gray-600">
                        {prediction.race?.surface === 'turf' ? '芝' : 'ダート'}{prediction.race?.distance}m
                      </p>
                    </div>
                    
                    <FlexLayout direction="row" gap="sm">
                      {prediction.accuracy === undefined && (
                        <TouchOptimizedButton
                          onClick={() => handleResultInput(prediction)}
                          variant="secondary"
                          size="sm"
                          icon={Target}
                        >
                          結果入力
                        </TouchOptimizedButton>
                      )}
                      <TouchOptimizedButton
                        onClick={() => handleDeleteClick(prediction)}
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <span className="sr-only">削除</span>
                      </TouchOptimizedButton>
                    </FlexLayout>
                  </FlexLayout>

                  {/* 予想上位3頭 */}
                  <div className="space-y-2">
                    <h4 className="text-responsive-sm font-medium text-gray-700">予想</h4>
                    <FlexLayout direction="row" gap="sm" wrap>
                      {topThree.map((horse, idx) => (
                        <div
                          key={horse.horse?.number || idx}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-50 rounded-lg"
                        >
                          <span className="text-responsive-xs font-medium text-blue-800">
                            {idx + 1}位
                          </span>
                          <span className="text-responsive-xs text-blue-600">
                            {horse.horse?.number}番 {horse.horse?.name}
                          </span>
                        </div>
                      ))}
                    </FlexLayout>
                  </div>

                  {/* 実際の結果（入力済みの場合） */}
                  {prediction.actualRanking && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <h4 className="text-responsive-sm font-medium text-gray-700 mb-2">実際の結果</h4>
                      <FlexLayout direction="row" gap="sm" wrap>
                        {prediction.actualRanking.slice(0, 3).map((horseNumber, idx) => {
                          // 馬番から馬名を取得
                          const horse = prediction.predictions?.find(p => 
                            (p.horse?.number === horseNumber)
                          );
                          
                          // デバッグログ（問題解決後に削除可）
                          if (!horse) {
                            console.log(`🔍 馬が見つかりません - 馬番:${horseNumber}`, {
                              predictions: prediction.predictions,
                              predictionsCount: prediction.predictions?.length,
                              firstPrediction: prediction.predictions?.[0]
                            });
                          }
                          
                          const horseName = horse?.horse?.name || '不明';
                          
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-1 px-3 py-1 bg-gray-50 rounded-lg"
                            >
                              <span className="text-responsive-xs font-medium text-gray-700">
                                {idx + 1}位
                              </span>
                              <span className="text-responsive-xs text-gray-600">
                                {horseNumber}番 {horseName}
                              </span>
                            </div>
                          );
                        })}
                      </FlexLayout>
                    </div>
                  )}
                </ResponsiveCard>
              );
            })}
          </div>
        )}
      </ResponsiveContainer>

      {/* 結果入力モーダル */}
      {showResultInput && selectedPrediction && (
        <ResultInputModal
          prediction={selectedPrediction}
          onSave={handleResultSave}
          onClose={() => {
            setShowResultInput(false);
            setSelectedPrediction(null);
          }}
        />
      )}

      {/* 削除確認ダイアログ */}
      {showDeleteConfirm && predictionToDelete && (
        <DeleteConfirmModal
          prediction={predictionToDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  );
};

// 結果入力モーダルコンポーネント
interface ResultInputModalProps {
  prediction: PredictionResult;
  onSave: (actualRanking: number[]) => void;
  onClose: () => void;
}

const ResultInputModal: React.FC<ResultInputModalProps> = ({
  prediction,
  onSave,
  onClose
}) => {
  const [ranking, setRanking] = useState<(number | null)[]>([null, null, null]);

  const handleRankingChange = (position: number, horseNumber: string) => {
    const num = horseNumber ? parseInt(horseNumber) : null;
    const newRanking = [...ranking];
    newRanking[position] = num;
    setRanking(newRanking);
  };

  const handleSave = () => {
    const validRanking = ranking.filter(num => num !== null) as number[];
    if (validRanking.length < 3) {
      alert('1着〜3着までを入力してください');
      return;
    }
    onSave(validRanking);
  };

  // デバッグ用ログ（必要に応じて）
  // console.log('ResultInputModal - prediction:', prediction);
  
  // 馬番の取得（複数のパターンに対応）
  const availableNumbers = React.useMemo(() => {
    if (!prediction.predictions || prediction.predictions.length === 0) {
      return [];
    }
    
    // 予想データから馬番を抽出（複数のパターンに対応）
    const numbers = prediction.predictions.map(p => {
      // パターン1: p.horse.number
      if (p.horse && p.horse.number) return p.horse.number;
      // パターン2: p.number
      if (p.horse?.number) return p.horse.number;
      // パターン3: pが直接馬データの場合 - これは使わない
      return null;
    }).filter(Boolean);
    
    // もし馬番が取得できない場合、1-18番をデフォルトで表示
    if (numbers.length === 0) {
      return Array.from({length: 18}, (_, i) => i + 1);
    }
    
    // 馬番を数字順にソート
    return numbers.sort((a, b) => (a || 0) - (b || 0));
  }, [prediction.predictions]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm">
        <h3 className="text-lg font-bold mb-4">レース結果入力</h3>
        
        <div className="space-y-4 mb-6">
          <div className="text-sm text-gray-600 mb-4">
            {prediction.race?.venue} {prediction.race?.raceNumber}R • {formatDate(prediction.timestamp)}
          </div>
          
          {[0, 1, 2].map((position) => (
            <div key={position}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {position + 1}着
              </label>
              <select
                value={ranking[position] || ''}
                onChange={(e) => handleRankingChange(position, e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">選択してください</option>
                {availableNumbers.map((num) => {
                  // 既に他の順位で選択されている馬番は無効化
                  const isDisabled = ranking.some((selectedNum, idx) => 
                    selectedNum === num && idx !== position
                  );
                  return (
                    <option key={num} value={num || ''} disabled={isDisabled}>
                      {num}番{isDisabled ? ' (選択済み)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          ))}
        </div>

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
          >
            保存
          </TouchOptimizedButton>
        </FlexLayout>
      </div>
    </div>
  );
};

// 削除確認モーダルコンポーネント
interface DeleteConfirmModalProps {
  prediction: PredictionResult;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  prediction,
  onConfirm,
  onCancel
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-2">予想履歴を削除</h3>
        
        <div className="mb-4">
          <p className="text-gray-600 mb-3">
            以下の予想履歴を削除してもよろしいですか？
          </p>
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-900">
              {formatDate(prediction.timestamp)} {prediction.race?.venue} {prediction.race?.raceNumber}R
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {prediction.race?.surface === 'turf' ? '芝' : 'ダート'}{prediction.race?.distance}m
            </div>
            {prediction.predictions && prediction.predictions.length > 0 && (
              <div className="text-xs text-gray-600 mt-1">
                予想: {prediction.predictions.slice(0, 3).map((p, i) => 
                  `${i + 1}位 ${p.horse?.number}番`
                ).join(', ')}
              </div>
            )}
          </div>
          
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-sm text-red-700">
                この操作は取り消せません。削除後はデータを復元できません。
              </p>
            </div>
          </div>
        </div>

        <FlexLayout direction="row" gap="md">
          <TouchOptimizedButton
            onClick={onCancel}
            variant="secondary"
            className="flex-1"
          >
            キャンセル
          </TouchOptimizedButton>
          <TouchOptimizedButton
            onClick={onConfirm}
            variant="primary"
            className="flex-1 bg-red-600 hover:bg-red-700 border-red-600"
          >
            削除する
          </TouchOptimizedButton>
        </FlexLayout>
      </div>
    </div>
  );
};