import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, TrendingUp, AlertCircle, Target, Trash2, Eye, Edit } from 'lucide-react';
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
  const [showPredictionDetail, setShowPredictionDetail] = useState(false);
  const [selectedPredictionForDetail, setSelectedPredictionForDetail] = useState<PredictionResult | null>(null);

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
      // ユーザーにエラーを表示する場合は、ここでsetErrorStateなどを呼ぶ
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
      alert('結果の保存に失敗しました。もう一度お試しください。');
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
      alert('削除に失敗しました。もう一度お試しください。');
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setPredictionToDelete(null);
  };

  // 予想詳細表示のハンドラー
  const handleViewDetail = (prediction: PredictionResult) => {
    setSelectedPredictionForDetail(prediction);
    setShowPredictionDetail(true);
  };

  const handleCloseDetail = () => {
    setShowPredictionDetail(false);
    setSelectedPredictionForDetail(null);
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
                      <TouchOptimizedButton
                        onClick={() => handleViewDetail(prediction)}
                        variant="ghost"
                        size="sm"
                        icon={Eye}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        詳細
                      </TouchOptimizedButton>
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
                          
                          // デバッグログは削除（本番環境最適化）
                          
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

      {/* 予想詳細モーダル */}
      {showPredictionDetail && selectedPredictionForDetail && (
        <PredictionDetailModal
          prediction={selectedPredictionForDetail}
          onClose={handleCloseDetail}
          onUpdate={async (updatedPrediction) => {
            // 予想データを更新
            await predictionRepository.update(updatedPrediction.id, updatedPrediction);
            // データを再読み込み
            await loadPredictions();
            handleCloseDetail();
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

  // デバッグ用ログは削除済み
  
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

// 予想詳細表示・編集モーダルコンポーネント
interface PredictionDetailModalProps {
  prediction: PredictionResult;
  onClose: () => void;
  onUpdate: (updatedPrediction: PredictionResult) => Promise<void>;
}

const PredictionDetailModal: React.FC<PredictionDetailModalProps> = ({
  prediction,
  onClose,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrediction, setEditedPrediction] = useState<PredictionResult>(prediction);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(editedPrediction);
      setIsEditing(false);
    } catch (error) {
      console.error('予想更新エラー:', error);
      alert('予想の更新に失敗しました。もう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedPrediction(prediction);
    setIsEditing(false);
  };

  const handleRaceInfoChange = (field: string, value: any) => {
    setEditedPrediction(prev => ({
      ...prev,
      race: {
        ...prev.race,
        [field]: value
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-200">
          <FlexLayout direction="row" justify="between" align="center">
            <h3 className="text-xl font-bold text-gray-900">予想詳細</h3>
            <FlexLayout direction="row" gap="sm">
              {!isEditing ? (
                <TouchOptimizedButton
                  onClick={() => setIsEditing(true)}
                  variant="secondary"
                  size="sm"
                  icon={Edit}
                >
                  編集
                </TouchOptimizedButton>
              ) : (
                <>
                  <TouchOptimizedButton
                    onClick={handleCancel}
                    variant="ghost"
                    size="sm"
                    disabled={isSaving}
                  >
                    キャンセル
                  </TouchOptimizedButton>
                  <TouchOptimizedButton
                    onClick={handleSave}
                    variant="primary"
                    size="sm"
                    disabled={isSaving}
                  >
                    {isSaving ? '保存中...' : '保存'}
                  </TouchOptimizedButton>
                </>
              )}
            </FlexLayout>
          </FlexLayout>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-6">
          {/* レース情報 */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">レース情報</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  競馬場
                </label>
                {isEditing ? (
                  <select
                    value={editedPrediction.race?.venue || ''}
                    onChange={(e) => handleRaceInfoChange('venue', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">選択してください</option>
                    {['札幌', '函館', '福島', '新潟', '東京', '中山', '中京', '京都', '阪神', '小倉'].map(venue => (
                      <option key={venue} value={venue}>{venue}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900">{editedPrediction.race?.venue || '未設定'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  レース番号
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={editedPrediction.race?.raceNumber || ''}
                    onChange={(e) => handleRaceInfoChange('raceNumber', parseInt(e.target.value) || 1)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{editedPrediction.race?.raceNumber || '未設定'}R</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  距離
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    min="1000"
                    max="4000"
                    step="100"
                    value={editedPrediction.race?.distance || ''}
                    onChange={(e) => handleRaceInfoChange('distance', parseInt(e.target.value) || 1600)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{editedPrediction.race?.distance || '未設定'}m</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  コース
                </label>
                {isEditing ? (
                  <select
                    value={editedPrediction.race?.surface || 'turf'}
                    onChange={(e) => handleRaceInfoChange('surface', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="turf">芝</option>
                    <option value="dirt">ダート</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{editedPrediction.race?.surface === 'turf' ? '芝' : 'ダート'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開催日
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedPrediction.race?.raceDate || ''}
                    onChange={(e) => handleRaceInfoChange('raceDate', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{editedPrediction.race?.raceDate || '未設定'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  予想作成日時
                </label>
                <p className="text-gray-900">
                  {new Date(editedPrediction.timestamp).toLocaleString('ja-JP')}
                </p>
              </div>
            </div>
          </div>

          {/* 予想結果 */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">予想結果</h4>
            <div className="space-y-3">
              {editedPrediction.predictions?.map((horse, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <FlexLayout direction="row" justify="between" align="center">
                    <div>
                      <div className="font-medium text-gray-900">
                        {index + 1}位: {horse.horse?.number}番 {horse.horse?.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        騎手: {horse.horse?.jockey} | 人気: {horse.horse?.popularity}番人気 | オッズ: {horse.horse?.odds}倍
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">総合スコア</div>
                      <div className="font-bold text-blue-600">{horse.scores?.total || 0}点</div>
                    </div>
                  </FlexLayout>
                  
                  {/* スコア詳細 */}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-2 bg-white rounded">
                      <div className="font-medium">スピード</div>
                      <div className="text-blue-600">{horse.scores?.speed || 0}点</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <div className="font-medium">調子</div>
                      <div className="text-green-600">{horse.scores?.recent || 0}点</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <div className="font-medium">オッズ</div>
                      <div className="text-yellow-600">{horse.scores?.odds || 0}点</div>
                    </div>
                  </div>
                </div>
              )) || (
                <p className="text-gray-500 text-center py-4">予想データがありません</p>
              )}
            </div>
          </div>

          {/* 実際の結果（入力済みの場合） */}
          {editedPrediction.actualRanking && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">実際の結果</h4>
              <div className="p-4 bg-green-50 rounded-lg">
                <FlexLayout direction="row" gap="md" wrap>
                  {editedPrediction.actualRanking.slice(0, 3).map((horseNumber, idx) => {
                    const horse = editedPrediction.predictions?.find(p => 
                      p.horse?.number === horseNumber
                    );
                    const horseName = horse?.horse?.name || '不明';
                    
                    return (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg">
                        <span className="font-medium text-green-800">
                          {idx + 1}位
                        </span>
                        <span className="text-green-700">
                          {horseNumber}番 {horseName}
                        </span>
                      </div>
                    );
                  })}
                </FlexLayout>
                
                <div className="mt-3 text-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    editedPrediction.isCorrect 
                      ? 'text-green-800 bg-green-100' 
                      : 'text-red-800 bg-red-100'
                  }`}>
                    {editedPrediction.isCorrect ? '🎉 予想的中' : '📊 予想外れ'}
                  </span>
                  <div className="text-sm text-gray-600 mt-1">
                    精度: {editedPrediction.accuracy}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-6 border-t border-gray-200">
          <TouchOptimizedButton
            onClick={onClose}
            variant="secondary"
            className="w-full"
          >
            閉じる
          </TouchOptimizedButton>
        </div>
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