import React, { useState } from 'react';
import { ChevronRight, Plus, Calendar, MapPin, Clock, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// データ自動抽出関数（詳細なデバッグログ付き）
const parseNetKeibaData = (text, addDebugLog) => {
  try {
    const horses = [];
    
    // 各馬のデータを区切る（枠番・馬番の行で区切る）
    const horseBlocks = text.split(/\n(?=\d+\s+\d+\s*\n)/);
    addDebugLog(`データブロック数: ${horseBlocks.length}`);
    
    horseBlocks.forEach((block, blockIndex) => {
      if (!block.trim()) return;
      
      const lines = block.split('\n').filter(line => line.trim());
      addDebugLog(`ブロック${blockIndex + 1}: ${lines.length}行`);
      addDebugLog(`ブロック${blockIndex + 1}の内容:`, lines.slice(0, 15)); // 最初の15行を表示
      
      if (lines.length < 10) {
        addDebugLog(`ブロック${blockIndex + 1}: データ不足のためスキップ`);
        return;
      }
      
      try {
        // 1. 枠番・馬番の抽出（1行目）
        const firstLine = lines[0].trim();
        const frameHorseMatch = firstLine.match(/^(\d+)\s+(\d+)/);
        if (!frameHorseMatch) {
          addDebugLog(`ブロック${blockIndex + 1}: 枠番・馬番が見つかりません`);
          return;
        }
        
        const frameNumber = parseInt(frameHorseMatch[1]);
        const horseNumber = parseInt(frameHorseMatch[2]);
        addDebugLog(`枠番: ${frameNumber}, 馬番: ${horseNumber}`);
        
        // 2. 馬名の抽出（通常4行目）
        let horseName = '';
        if (lines.length > 3) {
          horseName = lines[3].trim(); // マピュースが4行目
          addDebugLog(`馬名: ${horseName}`);
        }

        // 3. オッズ・人気の抽出（改良版：全行検索）
        let popularity = null;
        let odds = null;
        
        addDebugLog(`オッズ・人気抽出開始 - 検索範囲: 全行`);
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // メインパターン: "8.7 (5人気)" 形式
          const mainPattern = line.match(/^([\d.]+)\s*\(\s*(\d+)\s*人気\s*\)$/);
          if (mainPattern) {
            odds = parseFloat(mainPattern[1]);
            popularity = parseInt(mainPattern[2]);
            addDebugLog(`✅ オッズ・人気マッチ（行${i}）"${line}" - オッズ: ${odds}, 人気: ${popularity}番人気`);
            break;
          }
          
          // 緩いパターン: 行内に含まれる場合
          const loosePattern = line.match(/([\d.]+)\s*\(\s*(\d+)\s*人気\s*\)/);
          if (loosePattern) {
            odds = parseFloat(loosePattern[1]);
            popularity = parseInt(loosePattern[2]);
            addDebugLog(`✅ オッズ・人気マッチ（緩い、行${i}）"${line}" - オッズ: ${odds}, 人気: ${popularity}番人気`);
            break;
          }
        }
        
        // 人気のみでオッズがない場合の推定
        if (popularity && !odds) {
          const estimatedOdds = Math.max(1.5, 1.5 + (popularity - 1) * 1.2);
          odds = Math.round(estimatedOdds * 10) / 10;
          addDebugLog(`⚠️ オッズ推定: ${popularity}番人気 → 約${odds}倍`);
        }
        
        addDebugLog(`オッズ・人気最終結果 - オッズ: ${odds || '未設定'}, 人気: ${popularity || '未設定'}`);
        
        // 4. 騎手の抽出（改良版：斤量の直前行を検索）
        let jockey = '';
        
        addDebugLog(`騎手抽出開始`);
        
        // 斤量パターン（xx.x形式）を探してその直前行を騎手とする
        for (let i = 1; i < lines.length; i++) {
          const currentLine = lines[i].trim();
          
          // 斤量パターン（52.0のような数字.数字形式）
          if (currentLine.match(/^\d+\.?\d*$/) && parseFloat(currentLine) >= 48 && parseFloat(currentLine) <= 60) {
            // 前の行が騎手候補
            if (i > 0) {
              const prevLine = lines[i - 1].trim();
              
              // 騎手らしい条件：ひらがな・カタカナ・漢字で2-8文字
              if (prevLine.length >= 2 && prevLine.length <= 8 &&
                  prevLine.match(/^[ぁ-んァ-ヶー一-龯\s]+$/) &&
                  !prevLine.includes('人気') &&
                  !prevLine.includes('着') &&
                  !prevLine.includes('頭') &&
                  !prevLine.includes('休養') &&
                  !prevLine.includes('kg') &&
                  !prevLine.includes('牝') &&
                  !prevLine.includes('牡') &&
                  !prevLine.includes('美浦') &&
                  !prevLine.includes('栗東')) {
                
                jockey = prevLine;
                addDebugLog(`✅ 騎手発見（斤量前）行${i-1}: "${jockey}" (斤量: ${currentLine})`);
                break;
              }
            }
          }
        }
        
        addDebugLog(`騎手最終結果: "${jockey || '未設定'}"`);
        
        // 5. 過去成績の抽出
        const pastRaces = [];
        let raceStartIndex = -1;
        
        // レース開始位置を探す（YYYY.MM.DD形式）
        for (let i = 10; i < lines.length; i++) {
          if (lines[i].match(/^\d{4}\.\d{2}\.\d{2}/)) {
            raceStartIndex = i;
            break;
          }
        }
        
        if (raceStartIndex > 0) {
          let i = raceStartIndex;
          while (i < lines.length) {
            const line = lines[i];
            
            // レース日付の行を検出
            const dateMatch = line.match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\S+)\s+(\d+)/);
            if (dateMatch) {
              const raceDate = `${dateMatch[1]}.${dateMatch[2]}.${dateMatch[3]}`;
              const venue = dateMatch[4];
              const rank = parseInt(dateMatch[5]);
              
              addDebugLog(`レース検出: ${raceDate} ${venue} ${rank}着`);
              
              // 次の数行でレース詳細を探す
              let distance = null;
              let time = null;
              let surface = 'turf';
              let condition = 'good';
              
              for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
                const detailLine = lines[j];
                
                // 距離とタイムの行
                if (detailLine.match(/^(障|芝|ダ)/)) {
                  // 距離の抽出
                  const distanceMatch = detailLine.match(/(障|芝|ダ)(\d+)/);
                  if (distanceMatch) {
                    surface = distanceMatch[1] === 'ダ' ? 'dirt' : 'turf';
                    distance = parseInt(distanceMatch[2]);
                  }
                  
                  // タイムの抽出
                  const timeMatch = detailLine.match(/(\d+):(\d+)\.(\d+)/);
                  if (timeMatch) {
                    const minutes = parseInt(timeMatch[1]);
                    const seconds = parseInt(timeMatch[2]);
                    const decimal = parseInt(timeMatch[3]);
                    time = minutes * 60 + seconds + decimal / 10;
                  }
                  
                  // 馬場状態の抽出
                  if (detailLine.includes('良')) condition = 'good';
                  else if (detailLine.includes('稍重')) condition = 'slightly_heavy';
                  else if (detailLine.includes('重')) condition = 'heavy';
                  else if (detailLine.includes('不良')) condition = 'bad';
                  
                  addDebugLog(`  距離: ${distance}m, 馬場: ${surface}, タイム: ${time}秒, 状態: ${condition}`);
                }
                
                // 映像を見るで終了
                if (detailLine.includes('映像を見る')) {
                  i = j;
                  break;
                }
              }
              
              if (distance && time) {
                pastRaces.push({
                  rank,
                  time,
                  distance,
                  surface,
                  condition
                });
                addDebugLog(`  過去成績追加: ${rank}着 ${distance}m ${time}秒`);
              }
            }
            i++;
          }
        }
        
        // データが揃っている場合のみ追加
        if (horseName && horseNumber && popularity && pastRaces.length > 0) {
          const horseData = {
            name: horseName,
            number: horseNumber,
            jockey: jockey || '未設定',
            popularity: popularity,
            odds: odds || null, // オッズフィールドを追加
            pastRaces: pastRaces.slice(0, 3) // 最大3走
          };
          
          horses.push(horseData);
          addDebugLog(`✅ 馬データ追加完了: ${horseName}`);
        } else {
          addDebugLog(`❌ データ不足でスキップ: 馬名=${horseName}, 馬番=${horseNumber}, 人気=${popularity}, 成績数=${pastRaces.length}`);
        }
        
      } catch (error) {
        addDebugLog(`ブロック${blockIndex + 1}解析エラー: ${error.message}`);
      }
    });
    
    addDebugLog(`解析完了: ${horses.length}頭を抽出`);
    return horses;
    
  } catch (error) {
    addDebugLog(`全体解析エラー: ${error.message}`);
    return [];
  }
};

const useDataManager = () => {
  // 予想履歴の管理
  const [predictionHistory, setPredictionHistory] = useState([]);
  
  // 予想結果を履歴に保存
  const savePredictionResult = (raceData, predictions, confidenceLevel = null) => {
    const historyEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      race: {
        venue: raceData.venue,
        raceNumber: raceData.raceNumber,
        distance: raceData.distance,
        surface: raceData.surface,
        raceDate: raceData.date
      },
      predictions: predictions.slice(0, 5), // 上位5頭のみ保存
      horseCount: predictions.length,
      confidenceLevel: confidenceLevel, // 確信度情報を追加
      actualResults: null, // 実際の結果（後で入力）
      payoutData: null, // 配当情報（後で入力）
      isResultEntered: false // 結果入力済みフラグ
    };
    
    setPredictionHistory(prev => [historyEntry, ...prev.slice(0, 19)]); // 最大20件
    return historyEntry.id;
  };
  
  // 実際の結果を入力（配当情報付き）
  const saveActualResults = (predictionId, actualResults, payoutData = null) => {
    setPredictionHistory(prev => 
      prev.map(entry => 
        entry.id === predictionId 
          ? { 
              ...entry, 
              actualResults, 
              payoutData, // 配当情報を追加
              isResultEntered: true 
            }
          : entry
      )
    );
  };
  
  // 的中率統計の計算（収支情報付き）
  const calculateAccuracy = () => {
    if (predictionHistory.length === 0) return null;
    
    // 結果が入力されている予想のみで計算
    const completedPredictions = predictionHistory.filter(p => p.isResultEntered);
    
    if (completedPredictions.length === 0) {
      return {
        totalPredictions: predictionHistory.length,
        completedPredictions: 0,
        firstPlaceAccuracy: 0,
        top3Accuracy: 0,
        totalInvestment: 0,
        totalPayout: 0,
        totalProfit: 0,
        returnRate: 0
      };
    }
    
    // 1着的中率計算
    const firstPlaceHits = completedPredictions.filter(prediction => {
      const topPrediction = prediction.predictions[0]; // 予想1位
      const firstPlace = prediction.actualResults.find(result => result.rank === 1);
      return topPrediction && firstPlace && topPrediction.number === firstPlace.number;
    }).length;
    
    // 3着以内的中率計算（予想上位3頭のうち1頭でも3着以内に入れば的中）
    const top3Hits = completedPredictions.filter(prediction => {
      const top3Predictions = prediction.predictions.slice(0, 3);
      const top3Actual = prediction.actualResults.filter(result => result.rank <= 3);
      
      return top3Predictions.some(pred => 
        top3Actual.some(actual => pred.number === actual.number)
      );
    }).length;
    
    // 収支計算
    let totalInvestment = 0;
    let totalPayout = 0;
    
    completedPredictions.forEach(prediction => {
      if (prediction.payoutData) {
        totalInvestment += prediction.payoutData.investment || 0;
        totalPayout += prediction.payoutData.totalReturn || 0;
      }
    });
    
    const totalProfit = totalPayout - totalInvestment;
    const returnRate = totalInvestment > 0 ? Math.round((totalPayout / totalInvestment) * 100) : 0;
    
    return {
      totalPredictions: predictionHistory.length,
      completedPredictions: completedPredictions.length,
      firstPlaceAccuracy: Math.round((firstPlaceHits / completedPredictions.length) * 100),
      top3Accuracy: Math.round((top3Hits / completedPredictions.length) * 100),
      totalInvestment,
      totalPayout,
      totalProfit,
      returnRate
    };
  };
  
  return {
    predictionHistory,
    savePredictionResult,
    saveActualResults,
    calculateAccuracy,
    calculateTrendData: (period = 10) => {
      const completedPredictions = predictionHistory
        .filter(p => p.isResultEntered)
        .sort((a, b) => new Date(a.date) - new Date(b.date)) // 日付順にソート
        .slice(-period); // 期間指定
      
      if (completedPredictions.length === 0) return [];
      
      const trendData = [];
      let cumulativeFirstHits = 0;
      let cumulativeTop3Hits = 0;
      
      completedPredictions.forEach((prediction, index) => {
        // 1着的中チェック
        const topPrediction = prediction.predictions[0];
        const firstPlace = prediction.actualResults.find(r => r.rank === 1);
        const isFirstHit = topPrediction && firstPlace && topPrediction.number === firstPlace.number;
        
        // 3着以内的中チェック
        const top3Predictions = prediction.predictions.slice(0, 3);
        const top3Actual = prediction.actualResults.filter(r => r.rank <= 3);
        const isTop3Hit = top3Predictions.some(pred => 
          top3Actual.some(actual => pred.number === actual.number)
        );
        
        if (isFirstHit) cumulativeFirstHits++;
        if (isTop3Hit) cumulativeTop3Hits++;
        
        const firstAccuracy = Math.round((cumulativeFirstHits / (index + 1)) * 100);
        const top3Accuracy = Math.round((cumulativeTop3Hits / (index + 1)) * 100);
        
        trendData.push({
          race: `${prediction.race.venue}${prediction.race.raceNumber}R`,
          firstAccuracy: firstAccuracy,
          top3Accuracy: top3Accuracy,
          date: new Date(prediction.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
          isFirstHit: isFirstHit,
          isTop3Hit: isTop3Hit
        });
      });
      
      return trendData;
    },
    
    // 期間別統計の計算（収支情報付き）
    calculatePeriodStats: (period = 'all') => {
      const now = new Date();
      const completedPredictions = predictionHistory.filter(p => p.isResultEntered);
      
      let filteredPredictions = [];
      
      if (period === 'thisMonth') {
        filteredPredictions = completedPredictions.filter(p => {
          const predDate = new Date(p.date);
          return predDate.getMonth() === now.getMonth() && predDate.getFullYear() === now.getFullYear();
        });
      } else if (period === 'lastMonth') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        filteredPredictions = completedPredictions.filter(p => {
          const predDate = new Date(p.date);
          return predDate.getMonth() === lastMonth.getMonth() && predDate.getFullYear() === lastMonth.getFullYear();
        });
      } else {
        filteredPredictions = completedPredictions;
      }
      
      if (filteredPredictions.length === 0) return null;
      
      // 1着的中計算
      const firstHits = filteredPredictions.filter(prediction => {
        const topPrediction = prediction.predictions[0];
        const firstPlace = prediction.actualResults.find(r => r.rank === 1);
        return topPrediction && firstPlace && topPrediction.number === firstPlace.number;
      }).length;
      
      // 3着以内的中計算
      const top3Hits = filteredPredictions.filter(prediction => {
        const top3Predictions = prediction.predictions.slice(0, 3);
        const top3Actual = prediction.actualResults.filter(r => r.rank <= 3);
        return top3Predictions.some(pred => 
          top3Actual.some(actual => pred.number === actual.number)
        );
      }).length;
      
      // 収支計算
      let totalInvestment = 0;
      let totalPayout = 0;
      
      filteredPredictions.forEach(prediction => {
        if (prediction.payoutData) {
          totalInvestment += prediction.payoutData.investment || 0;
          totalPayout += prediction.payoutData.totalReturn || 0;
        }
      });
      
      const totalProfit = totalPayout - totalInvestment;
      const returnRate = totalInvestment > 0 ? Math.round((totalPayout / totalInvestment) * 100) : 0;
      
      return {
        total: filteredPredictions.length,
        firstAccuracy: Math.round((firstHits / filteredPredictions.length) * 100),
        top3Accuracy: Math.round((top3Hits / filteredPredictions.length) * 100),
        totalInvestment,
        totalPayout,
        totalProfit,
        returnRate
      };
    },
    
    // 条件別統計の計算
    calculateConditionStats: () => {
      const completedPredictions = predictionHistory.filter(p => p.isResultEntered);
      
      if (completedPredictions.length === 0) return {};
      
      // 距離別統計
      const distanceStats = {};
      // 馬場別統計
      const surfaceStats = {};
      // 競馬場別統計
      const venueStats = {};
      
      completedPredictions.forEach(prediction => {
        const distance = prediction.race.distance;
        const surface = prediction.race.surface;
        const venue = prediction.race.venue;
        
        // 1着的中チェック
        const topPrediction = prediction.predictions[0];
        const firstPlace = prediction.actualResults.find(r => r.rank === 1);
        const isFirstHit = topPrediction && firstPlace && topPrediction.number === firstPlace.number;
        
        // 3着以内的中チェック
        const top3Predictions = prediction.predictions.slice(0, 3);
        const top3Actual = prediction.actualResults.filter(r => r.rank <= 3);
        const isTop3Hit = top3Predictions.some(pred => 
          top3Actual.some(actual => pred.number === actual.number)
        );
        
        // 距離別
        if (!distanceStats[distance]) {
          distanceStats[distance] = { total: 0, firstHits: 0, top3Hits: 0 };
        }
        distanceStats[distance].total++;
        if (isFirstHit) distanceStats[distance].firstHits++;
        if (isTop3Hit) distanceStats[distance].top3Hits++;
        
        // 馬場別
        if (!surfaceStats[surface]) {
          surfaceStats[surface] = { total: 0, firstHits: 0, top3Hits: 0 };
        }
        surfaceStats[surface].total++;
        if (isFirstHit) surfaceStats[surface].firstHits++;
        if (isTop3Hit) surfaceStats[surface].top3Hits++;
        
        // 競馬場別
        if (!venueStats[venue]) {
          venueStats[venue] = { total: 0, firstHits: 0, top3Hits: 0 };
        }
        venueStats[venue].total++;
        if (isFirstHit) venueStats[venue].firstHits++;
        if (isTop3Hit) venueStats[venue].top3Hits++;
      });
      
      // パーセンテージ計算
      const calculatePercentages = (stats) => {
        const result = {};
        Object.keys(stats).forEach(key => {
          const stat = stats[key];
          result[key] = {
            total: stat.total,
            firstAccuracy: Math.round((stat.firstHits / stat.total) * 100),
            top3Accuracy: Math.round((stat.top3Hits / stat.total) * 100)
          };
        });
        return result;
      };
      
      return {
        distance: calculatePercentages(distanceStats),
        surface: calculatePercentages(surfaceStats),
        venue: calculatePercentages(venueStats)
      };
    }
  };
};

const calculateSpeedIndex = (pastRaces, targetDistance, targetSurface) => {
  if (!pastRaces || pastRaces.length === 0) return 0;
  
  // 同距離、同馬場のレースを優先
  const relevantRaces = pastRaces.filter(race => 
    Math.abs(race.distance - targetDistance) <= 400 && race.surface === targetSurface
  );
  
  const racesToUse = relevantRaces.length > 0 ? relevantRaces : pastRaces;
  
  // 基準タイム（暫定：距離に基づく概算）
  const getBaseTime = (distance, surface) => {
    if (surface === 'turf') {
      return distance * 0.06; // 芝の基準：1mあたり0.06秒
    } else {
      return distance * 0.062; // ダートの基準：1mあたり0.062秒  
    }
  };
  
  const baseTime = getBaseTime(targetDistance, targetSurface);
  
  // 距離補正したタイムの平均を計算
  const avgTime = racesToUse.reduce((sum, race) => {
    const distanceRatio = targetDistance / race.distance;
    const adjustedTime = race.time * distanceRatio;
    return sum + adjustedTime;
  }, 0) / racesToUse.length;
  
  // スピード指数計算（100を基準とし、早いほど高い数値）
  const speedIndex = (baseTime / avgTime) * 100;
  
  return Math.round(speedIndex * 10) / 10; // 小数点1桁まで
};

const calculateHorseScore = (horse, raceInfo, weights = { speed: 40, recent: 30, odds: 30 }) => {
  if (!horse.pastRaces || horse.pastRaces.length === 0) {
    return { speed: 0, recent: 0, odds: 0, total: 0 };
  }
  
  // 1. スピード指数スコア（重み調整対応）
  const speedIndex = calculateSpeedIndex(horse.pastRaces, raceInfo.distance, raceInfo.surface);
  const speedScore = Math.min(weights.speed, speedIndex * (weights.speed / 100));
  
  // 2. 直近成績スコア（重み調整対応）
  const lastRace = horse.pastRaces[0];
  let recentScore = 0;
  if (lastRace) {
    if (lastRace.rank === 1) recentScore = weights.recent;
    else if (lastRace.rank <= 3) recentScore = weights.recent * 0.67; // 30pt→20pt相当
    else if (lastRace.rank <= 5) recentScore = weights.recent * 0.33; // 30pt→10pt相当
    else recentScore = weights.recent * 0.17; // 30pt→5pt相当
  }
  
  // 3. オッズスコア（オッズ重視に変更、重み調整対応）
  let oddsScore = 0;
  if (horse.odds && parseFloat(horse.odds) > 0) {
    const odds = parseFloat(horse.odds);
    // オッズが低いほど高得点（1.0倍=満点、20.0倍以上=0点の対数カーブ）
    if (odds <= 1.0) {
      oddsScore = weights.odds;
    } else if (odds <= 20.0) {
      // 対数スケールで計算（1.0倍=100%, 2.0倍=77%, 5.0倍=52%, 10.0倍=32%, 20.0倍=0%）
      const logOdds = Math.log(odds);
      const maxLogOdds = Math.log(20.0);
      oddsScore = weights.odds * Math.max(0, (maxLogOdds - logOdds) / maxLogOdds);
    } else {
      oddsScore = 0;
    }
  } else if (horse.popularity && horse.popularity > 0) {
    // フォールバック：人気からオッズを推定（1番人気=2.0倍、2番人気=3.5倍、3番人気=5.0倍程度）
    const estimatedOdds = Math.max(1.5, horse.popularity * 1.5);
    if (estimatedOdds <= 20.0) {
      const logOdds = Math.log(estimatedOdds);
      const maxLogOdds = Math.log(20.0);
      oddsScore = weights.odds * Math.max(0, (maxLogOdds - logOdds) / maxLogOdds);
    }
  }
  
  const totalScore = speedScore + recentScore + oddsScore;
  
  return {
    speed: Math.round(speedScore * 10) / 10,
    recent: Math.round(recentScore * 10) / 10,
    odds: Math.round(oddsScore * 10) / 10,
    total: Math.round(totalScore * 10) / 10
  };
};

const calculateAllPredictions = (race, weights = { speed: 40, recent: 30, odds: 30 }) => {
  try {
    if (!race || !race.horses || race.horses.length === 0) {
      throw new Error('レースまたは出走馬データが不正です');
    }
    
    const horsesWithScores = race.horses.map(horse => {
      try {
        const scores = calculateHorseScore(horse, race, weights);
        return { ...horse, scores };
      } catch (error) {
        console.error(`馬 ${horse.name} のスコア計算エラー:`, error);
        // エラーの場合は0点で処理続行
        return { 
          ...horse, 
          scores: { speed: 0, recent: 0, odds: 0, total: 0 }
        };
      }
    });
    
    // 総合スコア順にソート
    return horsesWithScores.sort((a, b) => b.scores.total - a.scores.total);
  } catch (error) {
    console.error('予想計算全体エラー:', error);
    throw error;
  }
};

const VENUES = [
  '札幌', '函館', '福島', '新潟', '東京', '中山', '中京', '京都', '阪神', '小倉'
];

const SURFACES = [
  { value: 'turf', label: '芝' },
  { value: 'dirt', label: 'ダート' }
];

const CONDITIONS = [
  { value: 'good', label: '良' },
  { value: 'slightly_heavy', label: '稍重' },
  { value: 'heavy', label: '重' },
  { value: 'bad', label: '不良' }
];

// サンプルデータ
const sampleRaces = [
  {
    id: '1',
    date: '2024-03-15',
    venue: '阪神',
    raceNumber: 11,
    distance: 2000,
    surface: 'turf',
    condition: 'good',
    horses: []
  },
  {
    id: '2',
    date: '2024-03-14',
    venue: '中山',
    raceNumber: 10,
    distance: 1600,
    surface: 'turf',
    condition: 'slightly_heavy',
    horses: []
  }
];

function KeibaApp() {
  const [currentView, setCurrentView] = useState('home');
  const [races, setRaces] = useState(sampleRaces);
  const [selectedRace, setSelectedRace] = useState(null);
  const [editingHorse, setEditingHorse] = useState(null); // 編集中の馬データ
  const [debugLog, setDebugLog] = useState([]); // デバッグログ用
  const [showDebug, setShowDebug] = useState(false); // デバッグ表示切替
  const [confirmDialog, setConfirmDialog] = useState(null); // 確認ダイアログ用
  
  // デバッグログ追加関数
  const addDebugLog = (message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      time: timestamp,
      message,
      data: data ? JSON.stringify(data, null, 2) : null
    };
    setDebugLog(prev => [logEntry, ...prev.slice(0, 19)]); // 最新20件保持
  };
  
  // データ管理フックを使用
  const { 
    predictionHistory, 
    savePredictionResult, 
    saveActualResults, 
    calculateAccuracy, 
    calculateTrendData,
    calculatePeriodStats,
    calculateConditionStats
  } = useDataManager();

  // ホーム画面
  const HomeScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-6">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🏇 競馬予想アプリ
          </h1>
          <p className="text-gray-600">MVP版 - シンプル予想システム</p>
        </div>

        {/* 新規レース作成ボタン */}
        <div className="mb-6">
          <button
            onClick={() => setCurrentView('createRace')}
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={24} />
            新規レース作成
          </button>
        </div>

        {/* 統計情報 */}
        {predictionHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              📊 予想統計
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {predictionHistory.length}
                </div>
                <div className="text-xs text-gray-600">総予想回数</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">
                  {calculateAccuracy()?.firstPlaceAccuracy || 0}%
                </div>
                <div className="text-xs text-gray-600">1着的中率</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-600">
                  {calculateAccuracy()?.top3Accuracy || 0}%
                </div>
                <div className="text-xs text-gray-600">3着以内的中率</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-600">
                  {calculateAccuracy()?.completedPredictions || 0}
                </div>
                <div className="text-xs text-gray-600">結果入力済み</div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                <div className="text-lg font-bold text-yellow-600">
                  {calculateAccuracy()?.returnRate || 0}%
                </div>
                <div className="text-xs text-gray-600">💰 回収率</div>
              </div>
              <div className={`border rounded-lg p-2 ${
                (calculateAccuracy()?.totalProfit || 0) >= 0 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className={`text-lg font-bold ${
                  (calculateAccuracy()?.totalProfit || 0) >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {(calculateAccuracy()?.totalProfit || 0) >= 0 ? '+' : ''}{calculateAccuracy()?.totalProfit || 0}円
                </div>
                <div className="text-xs text-gray-600">📈 収支</div>
              </div>
            </div>
            
            {/* 収支詳細 */}
            {calculateAccuracy()?.totalInvestment > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-700 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <span className="font-medium">投資額:</span>
                    <span className="ml-1 text-blue-600">{calculateAccuracy().totalInvestment.toLocaleString()}円</span>
                  </div>
                  <div>
                    <span className="font-medium">払戻額:</span>
                    <span className="ml-1 text-green-600">{calculateAccuracy().totalPayout.toLocaleString()}円</span>
                  </div>
                  <div>
                    <span className="font-medium">回収率:</span>
                    <span className={`ml-1 font-bold ${
                      calculateAccuracy().returnRate >= 100 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {calculateAccuracy().returnRate}%
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* ミニグラフプレビュー */}
            {calculateTrendData(5).length >= 2 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">📈 直近の調子</span>
                  <span className="text-xs text-gray-500">直近5戦</span>
                </div>
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={calculateTrendData(5)}>
                      <Line 
                        type="monotone" 
                        dataKey="firstAccuracy" 
                        stroke="#eab308" 
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="top3Accuracy" 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {/* 結果未入力の予想がある場合の注意表示 */}
            {calculateAccuracy()?.completedPredictions < predictionHistory.length && (
              <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                💡 {predictionHistory.length - calculateAccuracy()?.completedPredictions}件の予想結果が未入力です
              </div>
            )}
            <button
              onClick={() => setCurrentView('history')}
              className="w-full mt-3 text-sm text-blue-600 hover:text-blue-800"
            >
              予想履歴を見る →
            </button>
          </div>
        )}

        {/* 最近のレース一覧 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gray-100 px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Calendar size={20} />
              最近のレース
            </h2>
          </div>
          
          {races.length > 0 ? (
            <div className="divide-y">
              {races.map((race) => (
                <div
                  key={race.id}
                  onClick={() => {
                    setSelectedRace(race);
                    setCurrentView('raceDetail');
                  }}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {race.venue} {race.raceNumber}R
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {race.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {race.distance}m・{SURFACES.find(s => s.value === race.surface)?.label}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {race.horses.length}頭
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
              <p>まだレースが登録されていません</p>
              <p className="text-sm">「新規レース作成」から始めましょう</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // レース作成画面
  const CreateRaceScreen = () => {
    const [raceForm, setRaceForm] = useState({
      date: new Date().toISOString().split('T')[0],
      venue: '',
      raceNumber: '',
      distance: '',
      surface: 'turf',
      condition: 'good',
      horseCount: 8 // 馬の頭数を追加（デフォルト8頭）
    });

    const handleSubmit = () => {
      if (!raceForm.venue || !raceForm.raceNumber || !raceForm.distance || !raceForm.horseCount) {
        alert('すべての項目を入力してください');
        return;
      }

      const newRace = {
        id: Date.now().toString(),
        ...raceForm,
        horses: []
      };

      setRaces([newRace, ...races]);
      setSelectedRace(newRace);
      setCurrentView('raceDetail');
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <div className="container mx-auto px-4 py-6">
          {/* ヘッダー */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => setCurrentView('home')}
              className="mr-4 p-2 text-gray-600 hover:text-gray-800"
            >
              ←
            </button>
            <h1 className="text-2xl font-bold text-gray-800">新規レース作成</h1>
          </div>

          {/* フォーム */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-6">
              {/* 日付 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  レース日
                </label>
                <input
                  type="date"
                  value={raceForm.date}
                  onChange={(e) => setRaceForm({...raceForm, date: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 競馬場 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  競馬場
                </label>
                <select
                  value={raceForm.venue}
                  onChange={(e) => setRaceForm({...raceForm, venue: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選択してください</option>
                  {VENUES.map((venue) => (
                    <option key={venue} value={venue}>{venue}</option>
                  ))}
                </select>
              </div>

              {/* レース番号と距離 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    レース番号
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={raceForm.raceNumber}
                    onChange={(e) => setRaceForm({...raceForm, raceNumber: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="11"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    距離（m）
                  </label>
                  <input
                    type="number"
                    value={raceForm.distance}
                    onChange={(e) => setRaceForm({...raceForm, distance: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2000"
                  />
                </div>
              </div>

              {/* 馬の頭数 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  馬の頭数
                </label>
                <input
                  type="number"
                  min="2"
                  max="18"
                  value={raceForm.horseCount}
                  onChange={(e) => setRaceForm({...raceForm, horseCount: parseInt(e.target.value) || 8})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="8"
                />
                <p className="text-sm text-gray-600 mt-1">
                  2〜18頭まで設定できます
                </p>
              </div>

              {/* 馬場 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  馬場
                </label>
                <div className="flex gap-4">
                  {SURFACES.map((surface) => (
                    <label key={surface.value} className="flex items-center">
                      <input
                        type="radio"
                        name="surface"
                        value={surface.value}
                        checked={raceForm.surface === surface.value}
                        onChange={(e) => setRaceForm({...raceForm, surface: e.target.value})}
                        className="mr-2"
                      />
                      {surface.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* 馬場状態 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  馬場状態
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CONDITIONS.map((condition) => (
                    <label key={condition.value} className="flex items-center">
                      <input
                        type="radio"
                        name="condition"
                        value={condition.value}
                        checked={raceForm.condition === condition.value}
                        onChange={(e) => setRaceForm({...raceForm, condition: e.target.value})}
                        className="mr-2"
                      />
                      {condition.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* 送信ボタン */}
              <button
                onClick={handleSubmit}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-green-700 transition-colors"
              >
                レース作成
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // レース詳細画面（出走馬管理）
  const RaceDetailScreen = () => {
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [importText, setImportText] = useState('');

    if (!selectedRace) return null;

    // 一括インポート解析＆登録処理（既存の空カードに情報を反映）
    const handleAnalyzeAndImport = () => {
      addDebugLog(`一括登録開始: ${importText.length}文字`);
      
      if (!importText.trim()) {
        alert('テキストを入力してください');
        return;
      }

      try {
        const parsed = parseNetKeibaData(importText, addDebugLog);
        addDebugLog(`解析結果: ${parsed.length}頭`);
        addDebugLog(`解析されたデータ詳細:`, parsed);
        
        if (parsed && parsed.length > 0) {
          let updatedCount = 0;
          let skippedCount = 0;
          
          const updatedRaces = races.map(race => {
            if (race.id === selectedRace.id) {
              const updatedHorses = [...race.horses];
              
              parsed.forEach(newHorse => {
                // 馬番が設定された頭数を超える場合はスキップ
                if (newHorse.number > race.horseCount) {
                  addDebugLog(`馬番${newHorse.number}は設定頭数(${race.horseCount})を超えるためスキップ`);
                  skippedCount++;
                  return;
                }
                
                // 既に同じ馬番のデータがあるかチェック
                const existingIndex = updatedHorses.findIndex(h => h.number === newHorse.number);
                
                if (existingIndex >= 0) {
                  // 既存データを上書き
                  updatedHorses[existingIndex] = {
                    ...newHorse,
                    id: updatedHorses[existingIndex].id || `${Date.now()}_${newHorse.number}`,
                    scores: null
                  };
                  addDebugLog(`${newHorse.number}番の既存データを上書きしました: ${newHorse.name}`);
                } else {
                  // 新規追加
                  updatedHorses.push({
                    ...newHorse,
                    id: `${Date.now()}_${newHorse.number}`,
                    scores: null
                  });
                  addDebugLog(`${newHorse.number}番に新規データを追加しました: ${newHorse.name}`);
                }
                updatedCount++;
              });
              
              return { ...race, horses: updatedHorses };
            }
            return race;
          });

          setRaces(updatedRaces);
          setSelectedRace(updatedRaces.find(r => r.id === selectedRace.id));

          // 一括入力エリアを閉じる
          setImportText('');
          setShowBulkImport(false);

          addDebugLog(`${updatedCount}頭のデータを反映完了、${skippedCount}頭をスキップ`);
          
          let message = `${updatedCount}頭のデータを既存のカードに反映しました`;
          if (skippedCount > 0) {
            message += `\n（${skippedCount}頭は設定頭数を超えるためスキップしました）`;
          }
          alert(message);
        } else {
          addDebugLog('解析結果が空でした');
          alert('馬データを解析できませんでした');
        }
      } catch (error) {
        addDebugLog(`エラー発生: ${error.message}`);
        console.error('解析エラー:', error);
        alert('解析エラー: ' + error.message);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <div className="container mx-auto px-4 py-6">
          {/* ヘッダー */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => setCurrentView('home')}
              className="mr-4 p-2 text-gray-600 hover:text-gray-800"
            >
              ←
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {selectedRace.venue} {selectedRace.raceNumber}R
              </h1>
              <p className="text-gray-600 text-sm">
                {selectedRace.date} | {selectedRace.distance}m・
                {SURFACES.find(s => s.value === selectedRace.surface)?.label}・
                {CONDITIONS.find(c => c.value === selectedRace.condition)?.label}
              </p>
            </div>
          </div>

          {/* 一括入力セクション */}
          {showBulkImport && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">📋 一括データ入力</h3>
                <button
                  onClick={() => {
                    setShowBulkImport(false);
                    setImportText('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    競馬データを貼り付け
                  </label>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    rows={8}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ここにテキストを入力またはペースト"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    入力文字数: {importText.length}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleAnalyzeAndImport}
                    disabled={!importText.trim()}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                  >
                    データを解析して登録
                  </button>
                  <button
                    onClick={() => {
                      setImportText('');
                      addDebugLog('入力テキストをクリアしました');
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    クリア
                  </button>
                </div>

                <p className="text-sm text-gray-600">
                  💡 データを貼り付けて「データを解析して登録」ボタンを押すと、馬番に対応する空のカードに自動的に情報が反映されます
                </p>
              </div>
            </div>
          )}

          {/* 出走馬一覧 */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <div className="bg-gray-100 px-4 py-3 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Users size={20} />
                出走馬一覧 ({selectedRace.horseCount}頭)
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentView('addHorse')}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
                >
                  <Plus size={16} />
                  馬を追加
                </button>
                <button
                  onClick={() => setShowBulkImport(!showBulkImport)}
                  className={`px-3 py-1 rounded text-sm transition-colors flex items-center gap-1 ${
                    showBulkImport 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  📋 {showBulkImport ? '一括入力を閉じる' : '一括入力'}
                </button>
              </div>
            </div>
            
            <div className="divide-y">
              {/* 設定された頭数分のカードを表示 */}
              {Array.from({ length: selectedRace.horseCount }, (_, index) => {
                const horseNumber = index + 1;
                const existingHorse = selectedRace.horses.find(h => h.number === horseNumber);
                
                if (existingHorse) {
                  // 既存の馬データがある場合
                  return (
                    <div key={existingHorse.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="bg-blue-100 text-blue-800 text-sm font-bold px-2 py-1 rounded">
                              {existingHorse.number}
                            </div>
                            <div className="font-medium text-gray-900">
                              {existingHorse.name}
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-4 flex-wrap">
                            <span>{existingHorse.jockey}</span>
                            <span>{existingHorse.popularity}番人気</span>
                            {existingHorse.odds && (
                              <span className="text-orange-600 font-medium">{existingHorse.odds}倍</span>
                            )}
                            <span>{existingHorse.pastRaces.length}走分のデータ</span>
                          </div>
                          
                          {/* 過去成績の簡易表示 */}
                          {existingHorse.pastRaces.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs text-gray-500 mb-1">直近成績:</div>
                              <div className="flex gap-2 flex-wrap">
                                {existingHorse.pastRaces.slice(0, 3).map((race, idx) => (
                                  <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                    {race.rank}着 {race.time}秒
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end ml-4 flex-shrink-0">
                          <div className="text-center mb-2">
                            <div className="text-sm text-gray-500">スコア</div>
                            <div className="font-bold text-lg text-blue-600">
                              {existingHorse.scores?.total?.toFixed(1) || '-'}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                addDebugLog('編集ボタンがクリックされました', { horseName: existingHorse.name });
                                setEditingHorse(existingHorse);
                                setCurrentView('editHorse');
                              }}
                              className="bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-800 px-3 py-1 rounded text-xs font-medium transition-colors min-w-[50px]"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => {
                                addDebugLog('削除ボタンがクリックされました', { horseName: existingHorse.name, horseId: existingHorse.id });
                                
                                // カスタム確認ダイアログを表示
                                setConfirmDialog({
                                  title: '削除確認',
                                  message: `${existingHorse.name}を削除しますか？`,
                                  onConfirm: () => {
                                    addDebugLog('削除が確認されました');
                                    
                                    const beforeCount = selectedRace.horses.length;
                                    const updatedRaces = races.map(race => {
                                      if (race.id === selectedRace.id) {
                                        const filteredHorses = race.horses.filter(h => h.id !== existingHorse.id);
                                        addDebugLog(`馬数変化: ${beforeCount} → ${filteredHorses.length}`);
                                        return { ...race, horses: filteredHorses };
                                      }
                                      return race;
                                    });
                                    
                                    setRaces(updatedRaces);
                                    
                                    const updatedSelectedRace = updatedRaces.find(r => r.id === selectedRace.id);
                                    setSelectedRace(updatedSelectedRace);
                                    
                                    addDebugLog(`${existingHorse.name}が削除されました`, { 
                                      remainingHorses: updatedSelectedRace.horses.length 
                                    });
                                    
                                    setConfirmDialog(null);
                                  },
                                  onCancel: () => {
                                    addDebugLog('削除がキャンセルされました');
                                    setConfirmDialog(null);
                                  }
                                });
                              }}
                              className="bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-800 px-3 py-1 rounded text-xs font-medium transition-colors min-w-[50px]"
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // 空のカードを表示
                  return (
                    <div key={`empty-${horseNumber}`} className="p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-300 text-gray-600 text-sm font-bold px-2 py-1 rounded">
                            {horseNumber}
                          </div>
                          <div className="text-gray-500">
                            馬データ未入力
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            // 新規追加画面に馬番を渡す
                            setEditingHorse({ number: horseNumber });
                            setCurrentView('addHorse');
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          データ入力
                        </button>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>

          {/* アクションボタン */}
          {selectedRace.horses.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => setCurrentView('prediction')}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Clock size={20} />
                予想を実行
              </button>
              
              {/* デバッグボタン */}
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              >
                🐛 デバッグログ {showDebug ? '非表示' : '表示'} ({debugLog.length})
              </button>
            </div>
          )}

          {/* デバッグログ表示 */}
          {showDebug && (
            <div className="mt-4 bg-black text-green-400 rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white">🐛 デバッグログ</h3>
                <button
                  onClick={() => setDebugLog([])}
                  className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                >
                  クリア
                </button>
              </div>
              
              {debugLog.length > 0 ? (
                <div className="space-y-2">
                  {debugLog.map((log, index) => (
                    <div key={index} className="border-b border-gray-700 pb-2">
                      <div className="text-xs text-gray-400">[{log.time}]</div>
                      <div className="text-sm">{log.message}</div>
                      {log.data && (
                        <pre className="text-xs text-yellow-400 mt-1 overflow-x-auto">
                          {log.data}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-4">
                  ログはまだありません
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 出走馬追加画面
  const AddHorseScreen = () => {
    const [horseForm, setHorseForm] = useState({
      name: '',
      number: editingHorse?.number?.toString() || '', // 指定された馬番があれば使用
      jockey: '',
      popularity: '',
      odds: '', // オッズを追加
      pastRaces: [
        { rank: '', time: '', distance: '', surface: 'turf', condition: 'good' },
        { rank: '', time: '', distance: '', surface: 'turf', condition: 'good' },
        { rank: '', time: '', distance: '', surface: 'turf', condition: 'good' }
      ]
    });

    const [errors, setErrors] = useState({});

    const validateForm = () => {
      const newErrors = {};
      
      // 必須項目のチェックを削除
      // 馬番の重複チェックのみ残す
      if (horseForm.number && selectedRace.horses.some(h => h.number === parseInt(horseForm.number))) {
        newErrors.number = 'この馬番は既に使用されています';
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
      if (!validateForm()) return;

      const         newHorse = {
        id: Date.now().toString(),
        name: horseForm.name.trim() || '未設定',
        number: parseInt(horseForm.number) || 1,
        jockey: horseForm.jockey.trim() || '未設定',
        popularity: parseInt(horseForm.popularity) || 1,
        odds: parseFloat(horseForm.odds) || null, // オッズを追加
        pastRaces: horseForm.pastRaces.filter(race => 
          race.rank && race.time && race.distance
        ).map(race => ({
          ...race,
          rank: parseInt(race.rank),
          time: parseFloat(race.time),
          distance: parseInt(race.distance)
        })),
        scores: null // 後で計算
      };

      // レースに馬を追加
      const updatedRaces = races.map(race => 
        race.id === selectedRace.id 
          ? { ...race, horses: [...race.horses, newHorse] }
          : race
      );
      setRaces(updatedRaces);
      
      // selectedRaceも更新
      const updatedSelectedRace = updatedRaces.find(r => r.id === selectedRace.id);
      setSelectedRace(updatedSelectedRace);

      // editingHorseをクリア
      setEditingHorse(null);

      alert(`${newHorse.name}を追加しました`);
      setCurrentView('raceDetail');
    };

    const updatePastRace = (index, field, value) => {
      const newPastRaces = [...horseForm.pastRaces];
      newPastRaces[index] = { ...newPastRaces[index], [field]: value };
      setHorseForm({ ...horseForm, pastRaces: newPastRaces });
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <div className="container mx-auto px-4 py-6">
          {/* ヘッダー */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => setCurrentView('raceDetail')}
              className="mr-4 p-2 text-gray-600 hover:text-gray-800"
            >
              ←
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">出走馬追加</h1>
              <p className="text-gray-600 text-sm">
                {selectedRace.venue} {selectedRace.raceNumber}R
              </p>
            </div>
          </div>

          {/* フォーム */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-6">
              {/* 基本情報 */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">基本情報</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 馬名 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      馬名
                    </label>
                    <input
                      type="text"
                      value={horseForm.name}
                      onChange={(e) => setHorseForm({...horseForm, name: e.target.value})}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="馬名を入力"
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                  </div>

                  {/* 馬番 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      馬番
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="18"
                      value={horseForm.number}
                      onChange={(e) => setHorseForm({...horseForm, number: e.target.value})}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.number ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="1"
                    />
                    {errors.number && <p className="text-red-500 text-sm mt-1">{errors.number}</p>}
                  </div>

                  {/* 人気とオッズ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      人気
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="18"
                      value={horseForm.popularity}
                      onChange={(e) => setHorseForm({...horseForm, popularity: e.target.value})}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.popularity ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="3"
                    />
                    {errors.popularity && <p className="text-red-500 text-sm mt-1">{errors.popularity}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      オッズ
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      value={horseForm.odds}
                      onChange={(e) => setHorseForm({...horseForm, odds: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="2.5"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      単勝オッズ（例：2.5倍）
                    </p>
                  </div>

                  {/* 騎手 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      騎手
                    </label>
                    <input
                      type="text"
                      value={horseForm.jockey}
                      onChange={(e) => setHorseForm({...horseForm, jockey: e.target.value})}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.jockey ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="騎手名を入力"
                    />
                    {errors.jockey && <p className="text-red-500 text-sm mt-1">{errors.jockey}</p>}
                  </div>
                </div>
              </div>

              {/* 過去成績 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  過去成績（直近3走）
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    ※任意入力
                  </span>
                </h3>
                {errors.pastRaces && <p className="text-red-500 text-sm mb-4">{errors.pastRaces}</p>}
                
                <div className="space-y-4">
                  {horseForm.pastRaces.map((race, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 mb-3">
                        {index + 1}走前
                      </h4>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* 着順 */}
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">着順</label>
                          <input
                            type="number"
                            min="1"
                            max="18"
                            value={race.rank}
                            onChange={(e) => updatePastRace(index, 'rank', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="1"
                          />
                        </div>

                        {/* タイム */}
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">タイム(秒)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={race.time}
                            onChange={(e) => updatePastRace(index, 'time', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="121.5"
                          />
                        </div>

                        {/* 距離 */}
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">距離(m)</label>
                          <input
                            type="number"
                            value={race.distance}
                            onChange={(e) => updatePastRace(index, 'distance', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="2000"
                          />
                        </div>

                        {/* 馬場 */}
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">馬場</label>
                          <select
                            value={race.surface}
                            onChange={(e) => updatePastRace(index, 'surface', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {SURFACES.map((surface) => (
                              <option key={surface.value} value={surface.value}>
                                {surface.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 馬場状態 */}
                      <div className="mt-3">
                        <label className="block text-xs text-gray-600 mb-2">馬場状態</label>
                        <div className="flex gap-2 flex-wrap">
                          {CONDITIONS.map((condition) => (
                            <label key={condition.value} className="flex items-center text-sm">
                              <input
                                type="radio"
                                name={`condition-${index}`}
                                value={condition.value}
                                checked={race.condition === condition.value}
                                onChange={(e) => updatePastRace(index, 'condition', e.target.value)}
                                className="mr-1"
                              />
                              {condition.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 送信ボタン */}
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentView('raceDetail')}
                  className="flex-1 bg-gray-500 text-white py-3 px-6 rounded-md font-semibold hover:bg-gray-600 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-blue-700 transition-colors"
                >
                  馬を追加
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 予想結果画面
  const PredictionScreen = () => {
    const [predictions, setPredictions] = useState([]);
    const [isCalculating, setIsCalculating] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    
    // スコア重み調整用の状態
    const [showWeightAdjustment, setShowWeightAdjustment] = useState(false);
    const [weights, setWeights] = useState({ speed: 40, recent: 30, odds: 30 });
    const [defaultWeights] = useState({ speed: 40, recent: 30, odds: 30 });
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationResult, setOptimizationResult] = useState(null);

    // 予想信頼度を計算（Phase 1: 基本版）
    const calculateConfidenceLevel = (predictions) => {
      if (!predictions || predictions.length < 2) {
        return { level: 'C', label: '判定不可', description: 'データ不足' };
      }

      const firstScore = predictions[0]?.scores?.total || 0;
      const secondScore = predictions[1]?.scores?.total || 0;
      const scoreDiff = firstScore - secondScore;
      
      // スコア差による確信度判定
      if (scoreDiff >= 15) {
        return { 
          level: 'A', 
          label: '高確信', 
          description: '1位が大きくリード',
          color: 'green',
          stars: '🌟🌟🌟'
        };
      } else if (scoreDiff >= 8) {
        return { 
          level: 'B', 
          label: '中確信', 
          description: '1位がやや優勢',
          color: 'yellow',
          stars: '🌟🌟'
        };
      } else {
        return { 
          level: 'C', 
          label: '低確信', 
          description: '混戦模様・要注意',
          color: 'red',
          stars: '🌟'
        };
      }
    };

    // 現在の予想の確信度を計算
    const confidenceLevel = React.useMemo(() => {
      return calculateConfidenceLevel(predictions);
    }, [predictions]);

    // 予想計算実行（重み調整対応版）
    const executePrediction = (customWeights = null) => {
      setIsCalculating(true);
      
      // 計算処理をシミュレート（実際の処理時間を表現）
      setTimeout(() => {
        try {
          const weightsToUse = customWeights || weights;
          const results = calculateAllPredictions(selectedRace, weightsToUse);
          setPredictions(results);
          
          // 元のレースデータも更新
          const updatedRaces = races.map(race => 
            race.id === selectedRace.id 
              ? { ...race, horses: results }
              : race
          );
          setRaces(updatedRaces);
          setSelectedRace({ ...selectedRace, horses: results });
          
        } catch (error) {
          console.error('予想計算エラー:', error);
          alert('予想計算中にエラーが発生しました');
        } finally {
          setIsCalculating(false);
        }
      }, 800);
    };

    // 重み調整（自動実行を削除）
    const handleWeightChange = (type, value) => {
      const newWeights = { ...weights, [type]: value };
      setWeights(newWeights);
      // 自動実行を削除：手動で「予想を再計算」ボタンを押すまで実行されない
    };

    // デフォルト重みに戻す
    const resetToDefault = () => {
      setWeights(defaultWeights);
      // 自動実行を削除
    };

    // 過去データから最適重みを計算
    const optimizeWeights = () => {
      setIsOptimizing(true);
      setOptimizationResult(null);
      
      setTimeout(() => {
        try {
          // 結果が入力済みの予想履歴を取得
          const completedPredictions = predictionHistory.filter(p => p.isResultEntered && p.actualResults);
          
          if (completedPredictions.length < 3) {
            alert('最適化には3件以上の結果入力済み予想が必要です');
            setIsOptimizing(false);
            return;
          }

          // テストする重みパターン
          const testPatterns = [
            { name: 'バランス型', weights: { speed: 40, recent: 30, odds: 30 } },
            { name: 'スピード重視', weights: { speed: 60, recent: 20, odds: 20 } },
            { name: '直近成績重視', weights: { speed: 20, recent: 60, odds: 20 } },
            { name: 'オッズ重視', weights: { speed: 20, recent: 20, odds: 60 } },
            { name: 'スピード・直近重視', weights: { speed: 50, recent: 40, odds: 10 } },
            { name: 'スピード・オッズ重視', weights: { speed: 50, recent: 10, odds: 40 } },
            { name: '直近・オッズ重視', weights: { speed: 10, recent: 50, odds: 40 } },
            { name: '超スピード重視', weights: { speed: 70, recent: 15, odds: 15 } },
          ];

          // 各パターンの成績を計算
          const results = testPatterns.map(pattern => {
            let firstHits = 0;
            let top3Hits = 0;
            let totalReturn = 0;
            let totalInvestment = 0;

            completedPredictions.forEach(prediction => {
              try {
                // この重みでの予想結果を再計算
                const recalculatedHorses = prediction.predictions.map(horse => {
                  const scores = calculateHorseScore(horse, prediction.race, pattern.weights);
                  return { ...horse, scores };
                });
                
                // スコア順にソート
                const sortedPrediction = recalculatedHorses.sort((a, b) => b.scores.total - a.scores.total);
                
                // 1着的中チェック
                const topPrediction = sortedPrediction[0];
                const firstPlace = prediction.actualResults.find(r => r.rank === 1);
                if (topPrediction && firstPlace && topPrediction.number === firstPlace.number) {
                  firstHits++;
                }
                
                // 3着以内的中チェック
                const top3Predictions = sortedPrediction.slice(0, 3);
                const top3Actual = prediction.actualResults.filter(r => r.rank <= 3);
                const isTop3Hit = top3Predictions.some(pred => 
                  top3Actual.some(actual => pred.number === actual.number)
                );
                if (isTop3Hit) {
                  top3Hits++;
                }
                
                // 収支計算
                if (prediction.payoutData) {
                  totalInvestment += prediction.payoutData.investment || 0;
                  totalReturn += prediction.payoutData.totalReturn || 0;
                }
              } catch (error) {
                console.error('重み最適化計算エラー:', error);
              }
            });

            const firstAccuracy = Math.round((firstHits / completedPredictions.length) * 100);
            const top3Accuracy = Math.round((top3Hits / completedPredictions.length) * 100);
            const returnRate = totalInvestment > 0 ? Math.round((totalReturn / totalInvestment) * 100) : 0;
            const profit = totalReturn - totalInvestment;

            return {
              ...pattern,
              firstAccuracy,
              top3Accuracy,
              returnRate,
              profit,
              score: (firstAccuracy * 2) + top3Accuracy + (returnRate >= 100 ? returnRate - 100 : 0) // 総合スコア
            };
          });

          // 総合スコア順にソート
          results.sort((a, b) => b.score - a.score);
          
          setOptimizationResult({
            tested: completedPredictions.length,
            results: results,
            recommended: results[0]
          });

        } catch (error) {
          console.error('最適化エラー:', error);
          alert('最適化中にエラーが発生しました');
        } finally {
          setIsOptimizing(false);
        }
      }, 2000); // 計算時間をシミュレート
    };

    // 推奨重みを適用
    const applyRecommendedWeights = () => {
      if (optimizationResult && optimizationResult.recommended) {
        setWeights(optimizationResult.recommended.weights);
        alert(`${optimizationResult.recommended.name}の重み設定を適用しました`);
      }
    };

    // 初回レンダリング時に自動実行（一度だけ）
    React.useEffect(() => {
      if (!isInitialized && selectedRace && selectedRace.horses.length > 0) {
        setIsInitialized(true);
        
        // 既にスコアが計算済みかチェック
        const hasScores = selectedRace.horses.some(horse => horse.scores && horse.scores.total > 0);
        
        if (hasScores) {
          // 既に計算済みの場合はそのまま表示
          const sortedHorses = [...selectedRace.horses].sort((a, b) => 
            (b.scores?.total || 0) - (a.scores?.total || 0)
          );
          setPredictions(sortedHorses);
        } else {
          // 未計算の場合は計算実行
          executePrediction();
        }
      }
    }, [isInitialized]); // isInitializedのみを依存配列に

    if (!selectedRace) return null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <div className="container mx-auto px-4 py-6">
          {/* ヘッダー */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => setCurrentView('raceDetail')}
              className="mr-4 p-2 text-gray-600 hover:text-gray-800"
            >
              ←
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">予想結果</h1>
              <p className="text-gray-600 text-sm">
                {selectedRace.venue} {selectedRace.raceNumber}R - {selectedRace.distance}m・
                {SURFACES.find(s => s.value === selectedRace.surface)?.label}
              </p>
            </div>
          </div>

          {/* 計算中表示 */}
          {(isCalculating || isOptimizing) && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center mb-6">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {isOptimizing ? '最適重みを計算中...' : '予想計算中...'}
              </h3>
              <p className="text-gray-600">
                {isOptimizing ? '過去の実績データから最適な重み設定を分析しています' : 'スピード指数と総合スコアを算出しています'}
              </p>
            </div>
          )}

          {/* スコア重み調整パネル */}
          {predictions.length > 0 && !isCalculating && (
            <div className="bg-white rounded-lg shadow-md mb-6">
              <div className="bg-gray-100 px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  ⚖️ スコア重み調整
                </h3>
                <button
                  onClick={() => setShowWeightAdjustment(!showWeightAdjustment)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {showWeightAdjustment ? '調整パネルを閉じる' : '重みを調整する'}
                </button>
              </div>

              {showWeightAdjustment && (
                <div className="p-4">
                  {/* 現在の重み表示 */}
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm font-medium text-blue-800 mb-2">現在の重み設定</div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-purple-600">{weights.speed}</div>
                        <div className="text-xs text-gray-600">スピード指数</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">{weights.recent}</div>
                        <div className="text-xs text-gray-600">直近成績</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-orange-600">{weights.odds}</div>
                        <div className="text-xs text-gray-600">オッズ信頼度</div>
                      </div>
                    </div>
                  </div>

                  {/* 最適化機能 */}
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-green-800">🎯 AI最適化</h4>
                        <p className="text-sm text-green-700">過去の実績から最適な重み設定を提案します</p>
                      </div>
                      <button
                        onClick={optimizeWeights}
                        disabled={isOptimizing || predictionHistory.filter(p => p.isResultEntered).length < 3}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          predictionHistory.filter(p => p.isResultEntered).length < 3
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {isOptimizing ? '分析中...' : '最適重みを分析'}
                      </button>
                    </div>

                    {predictionHistory.filter(p => p.isResultEntered).length < 3 && (
                      <p className="text-xs text-green-600">
                        💡 3件以上の結果入力済み予想が必要です（現在: {predictionHistory.filter(p => p.isResultEntered).length}件）
                      </p>
                    )}

                    {/* 最適化結果表示 */}
                    {optimizationResult && (
                      <div className="mt-3 p-3 bg-white border border-green-300 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-semibold text-green-800">
                            📊 分析結果（{optimizationResult.tested}レース分析）
                          </h5>
                          <button
                            onClick={applyRecommendedWeights}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                          >
                            推奨設定を適用
                          </button>
                        </div>

                        <div className="space-y-2">
                          {optimizationResult.results.slice(0, 3).map((result, index) => (
                            <div key={index} className={`p-2 rounded text-sm ${
                              index === 0 ? 'bg-yellow-100 border border-yellow-300' : 'bg-gray-50'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="font-medium">
                                  {index === 0 && '🏆 '}
                                  {result.name} ({result.weights.speed}-{result.weights.recent}-{result.weights.odds})
                                </div>
                                <div className="text-xs space-x-2">
                                  <span className="text-yellow-600">🥇{result.firstAccuracy}%</span>
                                  <span className="text-purple-600">🎯{result.top3Accuracy}%</span>
                                  <span className={result.returnRate >= 100 ? 'text-green-600' : 'text-red-600'}>
                                    💰{result.returnRate}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* スライダー調整 */}
                  <div className="space-y-4">
                    {/* スピード指数重み */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">
                          🏃 スピード指数重み
                        </label>
                        <span className="text-sm text-purple-600 font-bold">{weights.speed}pt</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="70"
                        value={weights.speed}
                        onChange={(e) => handleWeightChange('speed', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${(weights.speed/70)*100}%, #e5e7eb ${(weights.speed/70)*100}%, #e5e7eb 100%)`
                        }}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0pt (無視)</span>
                        <span>35pt (標準)</span>
                        <span>70pt (最重視)</span>
                      </div>
                    </div>

                    {/* 直近成績重み */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">
                          📈 直近成績重み
                        </label>
                        <span className="text-sm text-green-600 font-bold">{weights.recent}pt</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="70"
                        value={weights.recent}
                        onChange={(e) => handleWeightChange('recent', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #22c55e 0%, #22c55e ${(weights.recent/70)*100}%, #e5e7eb ${(weights.recent/70)*100}%, #e5e7eb 100%)`
                        }}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0pt (無視)</span>
                        <span>35pt (標準)</span>
                        <span>70pt (最重視)</span>
                      </div>
                    </div>

                    {/* オッズ重み */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">
                          💰 オッズ信頼度重み
                        </label>
                        <span className="text-sm text-orange-600 font-bold">{weights.odds}pt</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="70"
                        value={weights.odds}
                        onChange={(e) => handleWeightChange('odds', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #f97316 0%, #f97316 ${(weights.odds/70)*100}%, #e5e7eb ${(weights.odds/70)*100}%, #e5e7eb 100%)`
                        }}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0pt (無視)</span>
                        <span>35pt (標準)</span>
                        <span>70pt (最重視)</span>
                      </div>
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={resetToDefault}
                      className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-600 transition-colors"
                    >
                      🔄 デフォルト設定
                    </button>
                    <button
                      onClick={() => executePrediction()}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors font-medium"
                    >
                      🎯 この設定で予想実行
                    </button>
                  </div>

                  {/* 重み調整のヒント */}
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 mb-2">💡 重み調整のコツ</h4>
                    <div className="text-sm text-yellow-700 space-y-1">
                      <p><strong>スピード指数重視</strong>: 能力重視の本格派予想（安定感UP）</p>
                      <p><strong>直近成績重視</strong>: 調子・コンディション重視（波乱対応）</p>
                      <p><strong>オッズ重視</strong>: 人気・信頼度重視（手堅い予想）</p>
                      <p className="text-xs text-yellow-600 mt-2">
                        ⚡ 設定変更後は「この設定で予想実行」ボタンを押してください
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 予想結果表示 */}
          {predictions.length > 0 && !isCalculating && (
            <>
              {/* サマリー */}
              <div className="bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">🏆 予想ランキング</h2>
                  
                  {/* 確信度表示 */}
                  <div className={`px-4 py-2 rounded-lg font-bold text-sm ${
                    confidenceLevel.color === 'green' ? 'bg-green-600' :
                    confidenceLevel.color === 'yellow' ? 'bg-yellow-600' :
                    'bg-red-600'
                  } text-white border-2 border-white`}>
                    <div className="flex items-center gap-2">
                      <span>{confidenceLevel.stars}</span>
                      <div>
                        <div className="text-xs">予想信頼度</div>
                        <div className="font-bold">{confidenceLevel.level}級 {confidenceLevel.label}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">1位</div>
                    <div className="text-sm">{predictions[0]?.name}</div>
                    <div className="text-xs">{predictions[0]?.scores.total}pt</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold">2位</div>
                    <div className="text-sm">{predictions[1]?.name}</div>
                    <div className="text-xs">{predictions[1]?.scores.total}pt</div>
                  </div>
                  <div>
                    <div className="text-lg font-medium">3位</div>
                    <div className="text-sm">{predictions[2]?.name}</div>
                    <div className="text-xs">{predictions[2]?.scores.total}pt</div>
                  </div>
                </div>
                
                {/* 確信度の説明 */}
                <div className="mt-4 p-3 bg-white bg-opacity-20 rounded-lg">
                  <div className="text-sm">
                    <strong>📊 判定理由:</strong> {confidenceLevel.description}
                    {predictions.length >= 2 && (
                      <span className="ml-2">
                        (スコア差: {Math.round(((predictions[0]?.scores?.total || 0) - (predictions[1]?.scores?.total || 0)) * 10) / 10}pt)
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-1 opacity-90">
                    {confidenceLevel.level === 'A' && '💡 投資推奨：このレースは予想に自信があります'}
                    {confidenceLevel.level === 'B' && '⚠️ 投資注意：慎重な投資を推奨します'}
                    {confidenceLevel.level === 'C' && '🚫 投資回避：混戦のため見送りを推奨します'}
                  </div>
                </div>
              </div>

              {/* 詳細ランキング */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
                <div className="bg-gray-100 px-4 py-3 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">詳細ランキング</h3>
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showDetails ? 'スコア詳細を隠す' : 'スコア詳細を表示'}
                  </button>
                </div>

                <div className="divide-y">
                  {predictions.map((horse, index) => (
                    <div key={horse.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* 順位 */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-amber-600' :
                            'bg-gray-300'
                          }`}>
                            {index + 1}
                          </div>
                          
                          {/* 馬情報 */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">
                                {horse.number}
                              </span>
                              <span className="font-medium text-gray-900">{horse.name}</span>
                              {horse.odds && (
                                <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-1 rounded">
                                  {horse.odds}倍
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {horse.jockey} | {horse.popularity}番人気
                            </div>
                          </div>
                        </div>

                        {/* 総合スコア */}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {horse.scores.total}
                          </div>
                          <div className="text-xs text-gray-500">ポイント</div>
                        </div>
                      </div>

                      {/* スコア詳細 */}
                      {showDetails && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                              <div className="text-xs text-gray-500 mb-1">スピード指数</div>
                              <div className="font-semibold text-purple-600">
                                {horse.scores.speed}pt
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-500 mb-1">直近成績</div>
                              <div className="font-semibold text-green-600">
                                {horse.scores.recent}pt
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-500 mb-1">オッズ信頼度</div>
                              <div className="font-semibold text-orange-600">
                                {horse.scores.odds}pt
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* アクションボタン */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setIsInitialized(false); // 初期化フラグをリセット
                    setPredictions([]); // 既存の予想結果をクリア
                    executePrediction();
                  }}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  🔄 予想を再計算
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCurrentView('raceDetail')}
                    className="bg-gray-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                  >
                    馬データ編集
                  </button>
                  <button
                    onClick={() => {
                      // 結果保存（確信度情報も含める）
                      const savedId = savePredictionResult(selectedRace, predictions, confidenceLevel);
                      alert(`予想結果を保存しました（ID: ${savedId.slice(-6)}）`);
                    }}
                    className="bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    結果を保存
                  </button>
                </div>
              </div>

              {/* 計算方法の説明（更新版） */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">📊 スコア計算方法（確信度システム付き）</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>スピード指数</strong>: 過去成績から距離・馬場を考慮した能力値（最大{weights.speed}pt）</p>
                  <p><strong>直近成績</strong>: 前走の着順による評価（1着:{weights.recent}pt, 2-3着:{Math.round(weights.recent*0.67)}pt, 4-5着:{Math.round(weights.recent*0.33)}pt）</p>
                  <p><strong>オッズ信頼度</strong>: オッズによる市場評価（低オッズほど高得点、最大{weights.odds}pt）</p>
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                    <p><strong>🎯 予想信頼度システム</strong>:</p>
                    <p className="text-xs">• A級(15pt差以上): 高確信 - 投資推奨</p>
                    <p className="text-xs">• B級(8-14pt差): 中確信 - 慎重投資</p>
                    <p className="text-xs">• C級(7pt差以下): 低確信 - 見送り推奨</p>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    💡 確信度が低いレースは「避けるべきレース」として投資を控えることを推奨
                  </p>
                </div>
              </div>
            </>
          )}

          {/* データ不足の場合 */}
          {predictions.length === 0 && !isCalculating && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                予想データが不足しています
              </h3>
              <p className="text-gray-600 mb-6">
                出走馬の過去成績データを入力してから予想を実行してください
              </p>
              <button
                onClick={() => setCurrentView('raceDetail')}
                className="bg-blue-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                馬データを入力
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 出走馬編集画面
  const EditHorseScreen = () => {
    if (!editingHorse) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">編集する馬が選択されていません</p>
            <button
              onClick={() => setCurrentView('raceDetail')}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg"
            >
              レース詳細に戻る
            </button>
          </div>
        </div>
      );
    }

    const [horseForm, setHorseForm] = useState({
      name: editingHorse.name || '',
      number: editingHorse.number?.toString() || '',
      jockey: editingHorse.jockey || '',
      popularity: editingHorse.popularity?.toString() || '',
      odds: editingHorse.odds?.toString() || '', // オッズを追加
      pastRaces: editingHorse.pastRaces?.length > 0 ? 
        editingHorse.pastRaces.map(race => ({
          rank: race.rank?.toString() || '',
          time: race.time?.toString() || '',
          distance: race.distance?.toString() || '',
          surface: race.surface || 'turf',
          condition: race.condition || 'good'
        })) :
        [
          { rank: '', time: '', distance: '', surface: 'turf', condition: 'good' },
          { rank: '', time: '', distance: '', surface: 'turf', condition: 'good' },
          { rank: '', time: '', distance: '', surface: 'turf', condition: 'good' }
        ]
    });

    const [errors, setErrors] = useState({});

    const validateForm = () => {
      const newErrors = {};
      
      // 馬番の重複チェック（自分以外）のみ残す
      if (horseForm.number && selectedRace.horses.some(h => 
        h.number === parseInt(horseForm.number) && h.id !== editingHorse.id
      )) {
        newErrors.number = 'この馬番は既に使用されています';
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
      addDebugLog('編集フォーム送信開始', { horseName: horseForm.name });
      
      if (!validateForm()) {
        addDebugLog('バリデーションエラー', errors);
        return;
      }

      const updatedHorse = {
        ...editingHorse, // 既存のIDなどを保持
        name: horseForm.name.trim() || '未設定',
        number: parseInt(horseForm.number) || editingHorse.number || 1,
        jockey: horseForm.jockey.trim() || '未設定',
        popularity: parseInt(horseForm.popularity) || 1,
        odds: parseFloat(horseForm.odds) || null, // オッズを追加
        pastRaces: horseForm.pastRaces.filter(race => 
          race.rank && race.time && race.distance
        ).map(race => ({
          ...race,
          rank: parseInt(race.rank),
          time: parseFloat(race.time),
          distance: parseInt(race.distance)
        })),
        scores: null // 再計算が必要
      };

      addDebugLog('馬データ更新実行', { 
        before: editingHorse.name, 
        after: updatedHorse.name 
      });

      // レースの馬データを更新
      const updatedRaces = races.map(race => 
        race.id === selectedRace.id 
          ? { 
              ...race, 
              horses: race.horses.map(horse => 
                horse.id === editingHorse.id ? updatedHorse : horse
              )
            }
          : race
      );
      
      setRaces(updatedRaces);
      
      // selectedRaceも更新
      const updatedSelectedRace = updatedRaces.find(r => r.id === selectedRace.id);
      setSelectedRace(updatedSelectedRace);

      // 編集状態をクリア
      setEditingHorse(null);
      
      addDebugLog('編集完了', { updatedHorseName: updatedHorse.name });
      alert(`${updatedHorse.name}の情報を更新しました`);
      setCurrentView('raceDetail');
    };

    const updatePastRace = (index, field, value) => {
      const newPastRaces = [...horseForm.pastRaces];
      newPastRaces[index] = { ...newPastRaces[index], [field]: value };
      setHorseForm({ ...horseForm, pastRaces: newPastRaces });
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <div className="container mx-auto px-4 py-6">
          {/* ヘッダー */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => {
                setEditingHorse(null);
                setCurrentView('raceDetail');
              }}
              className="mr-4 p-2 text-gray-600 hover:text-gray-800"
            >
              ←
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">出走馬編集</h1>
              <p className="text-gray-600 text-sm">
                {selectedRace.venue} {selectedRace.raceNumber}R - {editingHorse.name}
              </p>
            </div>
          </div>

          {/* フォーム（AddHorseScreenと同じ構造） */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-6">
              {/* 基本情報 */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">基本情報</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 馬名 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      馬名
                    </label>
                    <input
                      type="text"
                      value={horseForm.name}
                      onChange={(e) => setHorseForm({...horseForm, name: e.target.value})}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="馬名を入力"
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                  </div>

                  {/* 馬番 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      馬番
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="18"
                      value={horseForm.number}
                      onChange={(e) => setHorseForm({...horseForm, number: e.target.value})}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.number ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="1"
                    />
                    {errors.number && <p className="text-red-500 text-sm mt-1">{errors.number}</p>}
                  </div>

                  {/* 人気とオッズ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      人気
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="18"
                      value={horseForm.popularity}
                      onChange={(e) => setHorseForm({...horseForm, popularity: e.target.value})}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.popularity ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="3"
                    />
                    {errors.popularity && <p className="text-red-500 text-sm mt-1">{errors.popularity}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      オッズ
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      value={horseForm.odds}
                      onChange={(e) => setHorseForm({...horseForm, odds: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="2.5"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      単勝オッズ（例：2.5倍）
                    </p>
                  </div>

                  {/* 騎手 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      騎手
                    </label>
                    <input
                      type="text"
                      value={horseForm.jockey}
                      onChange={(e) => setHorseForm({...horseForm, jockey: e.target.value})}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.jockey ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="騎手名を入力"
                    />
                    {errors.jockey && <p className="text-red-500 text-sm mt-1">{errors.jockey}</p>}
                  </div>
                </div>
              </div>

              {/* 過去成績（AddHorseScreenと同じ構造） */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  過去成績（直近3走）
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    ※最低1走分は必須
                  </span>
                </h3>
                {errors.pastRaces && <p className="text-red-500 text-sm mb-4">{errors.pastRaces}</p>}
                
                <div className="space-y-4">
                  {horseForm.pastRaces.map((race, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 mb-3">
                        {index + 1}走前
                      </h4>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* 着順 */}
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">着順</label>
                          <input
                            type="number"
                            min="1"
                            max="18"
                            value={race.rank}
                            onChange={(e) => updatePastRace(index, 'rank', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="1"
                          />
                        </div>

                        {/* タイム */}
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">タイム(秒)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={race.time}
                            onChange={(e) => updatePastRace(index, 'time', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="121.5"
                          />
                        </div>

                        {/* 距離 */}
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">距離(m)</label>
                          <input
                            type="number"
                            value={race.distance}
                            onChange={(e) => updatePastRace(index, 'distance', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="2000"
                          />
                        </div>

                        {/* 馬場 */}
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">馬場</label>
                          <select
                            value={race.surface}
                            onChange={(e) => updatePastRace(index, 'surface', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {SURFACES.map((surface) => (
                              <option key={surface.value} value={surface.value}>
                                {surface.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 馬場状態 */}
                      <div className="mt-3">
                        <label className="block text-xs text-gray-600 mb-2">馬場状態</label>
                        <div className="flex gap-2 flex-wrap">
                          {CONDITIONS.map((condition) => (
                            <label key={condition.value} className="flex items-center text-sm">
                              <input
                                type="radio"
                                name={`edit-condition-${index}`}
                                value={condition.value}
                                checked={race.condition === condition.value}
                                onChange={(e) => updatePastRace(index, 'condition', e.target.value)}
                                className="mr-1"
                              />
                              {condition.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 送信ボタン */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditingHorse(null);
                    setCurrentView('raceDetail');
                  }}
                  className="flex-1 bg-gray-500 text-white py-3 px-6 rounded-md font-semibold hover:bg-gray-600 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-green-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-green-700 transition-colors"
                >
                  更新
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 予想履歴画面
  const HistoryScreen = () => {
    const [selectedPrediction, setSelectedPrediction] = useState(null);
    const [graphPeriod, setGraphPeriod] = useState(10); // グラフ表示期間
    const [activeTab, setActiveTab] = useState('overview'); // overview, period, condition
    const [editingResultId, setEditingResultId] = useState(null); // 結果編集中のID
    const [tempResults, setTempResults] = useState({}); // 一時的な結果データ
    const [tempPayoutData, setTempPayoutData] = useState({}); // 一時的な配当データ

    // 結果入力フォームの初期化
    const initializeResultForm = (prediction) => {
      const initialResults = {};
      prediction.predictions.forEach(horse => {
        const existingResult = prediction.actualResults?.find(r => r.number === horse.number);
        initialResults[horse.number] = existingResult?.rank || '';
      });
      setTempResults(initialResults);
      
      // 配当データの初期化（デフォルト1000円投資）
      const existingPayout = prediction.payoutData || {};
      setTempPayoutData({
        investment: existingPayout.investment || '1000', // デフォルト1000円
        tanwin: existingPayout.tanwin || '',
        fukusho: existingPayout.fukusho || '',
        umaren: existingPayout.umaren || '',
        umatan: existingPayout.umatan || '',
        wide: existingPayout.wide || '',
        sanrenpuku: existingPayout.sanrenpuku || '',
        sanrentan: existingPayout.sanrentan || '',
        totalReturn: existingPayout.totalReturn || 0
      });
    };

    // 結果入力開始
    const startEditingResult = (predictionId) => {
      const prediction = predictionHistory.find(p => p.id === predictionId);
      if (prediction) {
        initializeResultForm(prediction);
        setEditingResultId(predictionId);
      }
    };

    // 結果入力キャンセル
    const cancelEditingResult = () => {
      setEditingResultId(null);
      setTempResults({});
      setTempPayoutData({});
    };

    // 配当の自動計算（デフォルト1000円投資対応）
    const calculateTotalReturn = (payoutData, investment) => {
      const investmentAmount = parseFloat(investment) || 1000; // デフォルト1000円
      if (investmentAmount === 0) return 0;
      
      // 各配当から最大払戻を計算（100円あたりの配当 × 投資額 / 100）
      const returns = [
        (parseFloat(payoutData.tanwin) || 0) * investmentAmount / 100,
        (parseFloat(payoutData.fukusho) || 0) * investmentAmount / 100,
        (parseFloat(payoutData.umaren) || 0) * investmentAmount / 100,
        (parseFloat(payoutData.umatan) || 0) * investmentAmount / 100,
        (parseFloat(payoutData.wide) || 0) * investmentAmount / 100,
        (parseFloat(payoutData.sanrenpuku) || 0) * investmentAmount / 100,
        (parseFloat(payoutData.sanrentan) || 0) * investmentAmount / 100
      ];
      
      // 的中した券種の最大払戻を返す（複数的中の場合は最も高配当のもの）
      return Math.max(0, ...returns);
    };

    // 結果保存
    const saveResultForm = (predictionId) => {
      const prediction = predictionHistory.find(p => p.id === predictionId);
      if (!prediction) return;

      // 結果データを構築
      const actualResults = prediction.predictions.map(horse => ({
        number: horse.number,
        name: horse.name,
        rank: parseInt(tempResults[horse.number]) || null
      })).filter(result => result.rank !== null);

      // 入力チェック
      if (actualResults.length === 0) {
        alert('最低1頭の着順を入力してください');
        return;
      }

      // 重複チェック
      const ranks = actualResults.map(r => r.rank);
      const uniqueRanks = [...new Set(ranks)];
      if (ranks.length !== uniqueRanks.length) {
        alert('着順に重複があります');
        return;
      }

      // 配当データの構築（デフォルト1000円投資）
      const payoutData = {
        investment: parseFloat(tempPayoutData.investment) || 1000, // デフォルト1000円
        tanwin: parseFloat(tempPayoutData.tanwin) || 0,
        fukusho: parseFloat(tempPayoutData.fukusho) || 0,
        umaren: parseFloat(tempPayoutData.umaren) || 0,
        umatan: parseFloat(tempPayoutData.umatan) || 0,
        wide: parseFloat(tempPayoutData.wide) || 0,
        sanrenpuku: parseFloat(tempPayoutData.sanrenpuku) || 0,
        sanrentan: parseFloat(tempPayoutData.sanrentan) || 0,
        totalReturn: calculateTotalReturn(tempPayoutData, tempPayoutData.investment || '1000')
      };

      // 保存実行
      saveActualResults(predictionId, actualResults, payoutData);
      setEditingResultId(null);
      setTempResults({});
      setTempPayoutData({});
      
      // 成功メッセージ
      const successDiv = document.createElement('div');
      successDiv.textContent = '✅ 結果と配当を保存しました！';
      successDiv.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:green;color:white;padding:10px;border-radius:5px;z-index:1000;';
      document.body.appendChild(successDiv);
      setTimeout(() => {
        if (document.body.contains(successDiv)) {
          document.body.removeChild(successDiv);
        }
      }, 2000);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <div className="container mx-auto px-4 py-6">
          {/* ヘッダー */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => setCurrentView('home')}
              className="mr-4 p-2 text-gray-600 hover:text-gray-800"
            >
              ←
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">予想履歴</h1>
              <p className="text-gray-600 text-sm">
                過去の予想結果と実績を確認できます
              </p>
            </div>
          </div>

          {/* 統計サマリー */}
          {calculateAccuracy() && (
            <>
              <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">📊 総合成績</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-xl font-bold text-blue-600">
                      {calculateAccuracy().totalPredictions}
                    </div>
                    <div className="text-xs text-gray-600">総予想回数</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-600">
                      {calculateAccuracy().completedPredictions}
                    </div>
                    <div className="text-xs text-gray-600">結果入力済み</div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                    <div className="text-xl font-bold text-yellow-600">
                      {calculateAccuracy().firstPlaceAccuracy}%
                    </div>
                    <div className="text-xs text-gray-600">🥇 1着的中率</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                    <div className="text-xl font-bold text-purple-600">
                      {calculateAccuracy().top3Accuracy}%
                    </div>
                    <div className="text-xs text-gray-600">🎯 3着以内的中率</div>
                  </div>
                </div>
                
                {/* 収支情報 */}
                {calculateAccuracy().totalInvestment > 0 && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border">
                    <h4 className="font-semibold text-gray-800 mb-3 text-center">💰 収支サマリー</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          {calculateAccuracy().totalInvestment.toLocaleString()}円
                        </div>
                        <div className="text-xs text-gray-600">総投資額</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          {calculateAccuracy().totalPayout.toLocaleString()}円
                        </div>
                        <div className="text-xs text-gray-600">総払戻額</div>
                      </div>
                      <div className={`p-2 rounded-lg ${
                        calculateAccuracy().totalProfit >= 0 
                          ? 'bg-green-100 border border-green-300' 
                          : 'bg-red-100 border border-red-300'
                      }`}>
                        <div className={`text-lg font-bold ${
                          calculateAccuracy().totalProfit >= 0 
                            ? 'text-green-700' 
                            : 'text-red-700'
                        }`}>
                          {calculateAccuracy().totalProfit >= 0 ? '+' : ''}{calculateAccuracy().totalProfit.toLocaleString()}円
                        </div>
                        <div className="text-xs text-gray-600">📈 総収支</div>
                      </div>
                      <div className={`p-2 rounded-lg ${
                        calculateAccuracy().returnRate >= 100 
                          ? 'bg-green-100 border border-green-300' 
                          : 'bg-red-100 border border-red-300'
                      }`}>
                        <div className={`text-lg font-bold ${
                          calculateAccuracy().returnRate >= 100 
                            ? 'text-green-700' 
                            : 'text-red-700'
                        }`}>
                          {calculateAccuracy().returnRate}%
                        </div>
                        <div className="text-xs text-gray-600">🎲 回収率</div>
                      </div>
                    </div>
                    
                    {/* 収支評価 */}
                    <div className="mt-3 text-center">
                      <div className="text-sm font-medium">
                        {calculateAccuracy().returnRate >= 120 && (
                          <span className="text-green-700">🌟 優秀な収益性です！</span>
                        )}
                        {calculateAccuracy().returnRate >= 100 && calculateAccuracy().returnRate < 120 && (
                          <span className="text-blue-700">👍 プラス収支を維持しています</span>
                        )}
                        {calculateAccuracy().returnRate >= 80 && calculateAccuracy().returnRate < 100 && (
                          <span className="text-orange-700">📊 回収率改善の余地があります</span>
                        )}
                        {calculateAccuracy().returnRate < 80 && calculateAccuracy().completedPredictions > 0 && (
                          <span className="text-red-700">🔧 予想手法の見直しをおすすめします</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 結果未入力の予想がある場合の注意表示 */}
                {calculateAccuracy().completedPredictions < predictionHistory.length && (
                  <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                    💡 {predictionHistory.length - calculateAccuracy().completedPredictions}件の予想結果が未入力です<br/>
                    <strong>入力方法:</strong> 結果入力時は投資額1000円固定で、予想が的中していた場合のみ該当配当を入力してください
                  </div>
                )}
                <button
                  onClick={() => setCurrentView('history')}
                  className="w-full mt-3 text-sm text-blue-600 hover:text-blue-800"
                >
                  予想履歴・結果入力を見る →
                </button>
              </div>

              {/* 統計タブナビゲーション */}
              <div className="bg-white rounded-lg shadow-md mb-6">
                <div className="border-b border-gray-200">
                  <nav className="flex">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'overview'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      📈 推移グラフ
                    </button>
                    <button
                      onClick={() => setActiveTab('period')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'period'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      📅 期間別統計
                    </button>
                    <button
                      onClick={() => setActiveTab('condition')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'condition'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      🎯 条件別統計
                    </button>
                  </nav>
                </div>

                <div className="p-4">
                  {/* 推移グラフタブ */}
                  {activeTab === 'overview' && calculateTrendData(graphPeriod).length >= 2 && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-800">📈 的中率の推移</h4>
                        
                        {/* 期間選択ボタン */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setGraphPeriod(5)}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                              graphPeriod === 5 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            直近5戦
                          </button>
                          <button
                            onClick={() => setGraphPeriod(10)}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                              graphPeriod === 10 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            直近10戦
                          </button>
                          <button
                            onClick={() => setGraphPeriod(999)}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                              graphPeriod === 999 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            全期間
                          </button>
                        </div>
                      </div>
                      
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={calculateTrendData(graphPeriod)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontSize: 12 }}
                              stroke="#666"
                            />
                            <YAxis 
                              domain={[0, 100]}
                              tick={{ fontSize: 12 }}
                              stroke="#666"
                              label={{ value: '的中率(%)', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip 
                              formatter={(value, name) => [
                                `${value}%`, 
                                name === 'firstAccuracy' ? '🥇 1着的中率' : '🎯 3着以内的中率'
                              ]}
                              labelFormatter={(label) => `日付: ${label}`}
                              contentStyle={{ 
                                backgroundColor: '#fff', 
                                border: '1px solid #ccc',
                                borderRadius: '4px'
                              }}
                            />
                            
                            {/* 1着的中率の線 */}
                            <Line 
                              type="monotone" 
                              dataKey="firstAccuracy" 
                              stroke="#eab308" 
                              strokeWidth={3}
                              dot={{ fill: '#eab308', strokeWidth: 2, r: 4 }}
                              activeDot={{ r: 6, stroke: '#eab308', strokeWidth: 2 }}
                              name="firstAccuracy"
                            />
                            
                            {/* 3着以内的中率の線 */}
                            <Line 
                              type="monotone" 
                              dataKey="top3Accuracy" 
                              stroke="#8b5cf6" 
                              strokeWidth={3}
                              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                              activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
                              name="top3Accuracy"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* 凡例 */}
                      <div className="flex items-center justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-0.5 bg-yellow-500"></div>
                          <span className="text-sm text-gray-600">🥇 1着的中率</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-0.5 bg-purple-500"></div>
                          <span className="text-sm text-gray-600">🎯 3着以内的中率</span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-600 mt-2 text-center">
                        💡 {graphPeriod === 999 ? '全期間' : `直近${graphPeriod}戦`}の累積的中率を表示（2レース以上で表示）
                      </div>
                    </div>
                  )}

                  {/* 期間別統計タブ */}
                  {activeTab === 'period' && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-4">📅 期間別成績</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 今月 */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h5 className="font-medium text-blue-800 mb-2">今月</h5>
                          {calculatePeriodStats('thisMonth') ? (
                            <div className="space-y-2">
                              <div className="text-sm">
                                <span className="text-gray-600">予想回数:</span>
                                <span className="font-bold ml-2">{calculatePeriodStats('thisMonth').total}回</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">🥇 1着的中率:</span>
                                <span className="font-bold ml-2 text-yellow-600">{calculatePeriodStats('thisMonth').firstAccuracy}%</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">🎯 3着以内:</span>
                                <span className="font-bold ml-2 text-purple-600">{calculatePeriodStats('thisMonth').top3Accuracy}%</span>
                              </div>
                              {calculatePeriodStats('thisMonth').totalInvestment > 0 && (
                                <>
                                  <div className="text-sm border-t pt-2">
                                    <span className="text-gray-600">💰 回収率:</span>
                                    <span className={`font-bold ml-2 ${
                                      calculatePeriodStats('thisMonth').returnRate >= 100 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {calculatePeriodStats('thisMonth').returnRate}%
                                    </span>
                                  </div>
                                  <div className="text-sm">
                                    <span className="text-gray-600">📈 収支:</span>
                                    <span className={`font-bold ml-2 ${
                                      calculatePeriodStats('thisMonth').totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {calculatePeriodStats('thisMonth').totalProfit >= 0 ? '+' : ''}{calculatePeriodStats('thisMonth').totalProfit.toLocaleString()}円
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">データなし</p>
                          )}
                        </div>

                        {/* 先月 */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h5 className="font-medium text-green-800 mb-2">先月</h5>
                          {calculatePeriodStats('lastMonth') ? (
                            <div className="space-y-2">
                              <div className="text-sm">
                                <span className="text-gray-600">予想回数:</span>
                                <span className="font-bold ml-2">{calculatePeriodStats('lastMonth').total}回</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">🥇 1着的中率:</span>
                                <span className="font-bold ml-2 text-yellow-600">{calculatePeriodStats('lastMonth').firstAccuracy}%</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">🎯 3着以内:</span>
                                <span className="font-bold ml-2 text-purple-600">{calculatePeriodStats('lastMonth').top3Accuracy}%</span>
                              </div>
                              {calculatePeriodStats('lastMonth').totalInvestment > 0 && (
                                <>
                                  <div className="text-sm border-t pt-2">
                                    <span className="text-gray-600">💰 回収率:</span>
                                    <span className={`font-bold ml-2 ${
                                      calculatePeriodStats('lastMonth').returnRate >= 100 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {calculatePeriodStats('lastMonth').returnRate}%
                                    </span>
                                  </div>
                                  <div className="text-sm">
                                    <span className="text-gray-600">📈 収支:</span>
                                    <span className={`font-bold ml-2 ${
                                      calculatePeriodStats('lastMonth').totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {calculatePeriodStats('lastMonth').totalProfit >= 0 ? '+' : ''}{calculatePeriodStats('lastMonth').totalProfit.toLocaleString()}円
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">データなし</p>
                          )}
                        </div>

                        {/* 全期間 */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h5 className="font-medium text-gray-800 mb-2">全期間</h5>
                          {calculatePeriodStats('all') && (
                            <div className="space-y-2">
                              <div className="text-sm">
                                <span className="text-gray-600">予想回数:</span>
                                <span className="font-bold ml-2">{calculatePeriodStats('all').total}回</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">🥇 1着的中率:</span>
                                <span className="font-bold ml-2 text-yellow-600">{calculatePeriodStats('all').firstAccuracy}%</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">🎯 3着以内:</span>
                                <span className="font-bold ml-2 text-purple-600">{calculatePeriodStats('all').top3Accuracy}%</span>
                              </div>
                              {calculatePeriodStats('all').totalInvestment > 0 && (
                                <>
                                  <div className="text-sm border-t pt-2">
                                    <span className="text-gray-600">💰 回収率:</span>
                                    <span className={`font-bold ml-2 ${
                                      calculatePeriodStats('all').returnRate >= 100 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {calculatePeriodStats('all').returnRate}%
                                    </span>
                                  </div>
                                  <div className="text-sm">
                                    <span className="text-gray-600">📈 収支:</span>
                                    <span className={`font-bold ml-2 ${
                                      calculatePeriodStats('all').totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {calculatePeriodStats('all').totalProfit >= 0 ? '+' : ''}{calculatePeriodStats('all').totalProfit.toLocaleString()}円
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 条件別統計タブ */}
                  {activeTab === 'condition' && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-4">🎯 条件別成績</h4>
                      {Object.keys(calculateConditionStats()).length > 0 ? (
                        <div className="space-y-6">
                          {/* 馬場別統計 */}
                          <div>
                            <h5 className="font-medium text-gray-700 mb-3">🏇 馬場別成績</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {Object.entries(calculateConditionStats().surface || {}).map(([surface, stats]) => (
                                <div key={surface} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                  <h6 className="font-medium text-gray-800">
                                    {surface === 'turf' ? '🌱 芝' : '🏔️ ダート'}
                                  </h6>
                                  <div className="text-sm mt-2 space-y-1">
                                    <div>回数: <span className="font-bold">{stats.total}回</span></div>
                                    <div>🥇: <span className="font-bold text-yellow-600">{stats.firstAccuracy}%</span></div>
                                    <div>🎯: <span className="font-bold text-purple-600">{stats.top3Accuracy}%</span></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 距離別統計 */}
                          <div>
                            <h5 className="font-medium text-gray-700 mb-3">📏 距離別成績</h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {Object.entries(calculateConditionStats().distance || {}).map(([distance, stats]) => (
                                <div key={distance} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                  <h6 className="font-medium text-gray-800">{distance}m</h6>
                                  <div className="text-xs mt-2 space-y-1">
                                    <div>{stats.total}回</div>
                                    <div>🥇 {stats.firstAccuracy}%</div>
                                    <div>🎯 {stats.top3Accuracy}%</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 競馬場別統計 */}
                          <div>
                            <h5 className="font-medium text-gray-700 mb-3">🏟️ 競馬場別成績</h5>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                              {Object.entries(calculateConditionStats().venue || {}).map(([venue, stats]) => (
                                <div key={venue} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                  <h6 className="font-medium text-gray-800">{venue}</h6>
                                  <div className="text-xs mt-2 space-y-1">
                                    <div>{stats.total}回</div>
                                    <div>🥇 {stats.firstAccuracy}%</div>
                                    <div>🎯 {stats.top3Accuracy}%</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">
                          まだ十分なデータがありません<br/>
                          <span className="text-sm">予想と結果入力を続けると、詳細な分析が表示されます</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* データ不足の場合 */}
                  {activeTab === 'overview' && calculateTrendData(graphPeriod).length < 2 && (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">📊</div>
                      <p className="text-gray-500 mb-2">グラフ表示には2レース以上の結果が必要です</p>
                      <p className="text-sm text-gray-400">予想と結果入力を続けてください</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 予想履歴一覧 */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gray-100 px-4 py-3 border-b">
              <h2 className="font-semibold text-gray-800">予想履歴一覧</h2>
            </div>

            {predictionHistory.length > 0 ? (
              <div className="space-y-4">
                {predictionHistory.map((prediction) => (
                  <div key={prediction.id} className="bg-gray-50 border border-gray-200 rounded-lg">
                    {/* レース基本情報 */}
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="font-semibold text-lg text-gray-900">
                              {prediction.race.venue} {prediction.race.raceNumber}R
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              prediction.isResultEntered 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {prediction.isResultEntered ? '結果入力済み' : '結果未入力'}
                            </div>
                            
                            {/* 確信度表示 */}
                            {prediction.confidenceLevel && (
                              <div className={`px-2 py-1 rounded text-xs font-medium ${
                                prediction.confidenceLevel.level === 'A' ? 'bg-green-100 text-green-800' :
                                prediction.confidenceLevel.level === 'B' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {prediction.confidenceLevel.stars} {prediction.confidenceLevel.level}級
                              </div>
                            )}
                            
                            {/* 的中状況表示 */}
                            {prediction.isResultEntered && prediction.actualResults && (
                              <div className="flex gap-1">
                                {(() => {
                                  // 1着的中チェック
                                  const firstPlacePrediction = prediction.predictions[0];
                                  const firstPlaceActual = prediction.actualResults.find(r => r.rank === 1);
                                  const isFirstPlaceHit = firstPlacePrediction && firstPlaceActual && firstPlacePrediction.number === firstPlaceActual.number;
                                  
                                  // 3着以内的中チェック
                                  const top3Predictions = prediction.predictions.slice(0, 3);
                                  const top3Actual = prediction.actualResults.filter(r => r.rank <= 3);
                                  const isTop3Hit = top3Predictions.some(pred => 
                                    top3Actual.some(actual => pred.number === actual.number)
                                  );
                                  
                                  return (
                                    <>
                                      <span className={`text-xs px-2 py-1 rounded ${
                                        isFirstPlaceHit ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-500'
                                      }`}>
                                        🥇{isFirstPlaceHit ? '的中' : '×'}
                                      </span>
                                      <span className={`text-xs px-2 py-1 rounded ${
                                        isTop3Hit ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-500'
                                      }`}>
                                        🎯{isTop3Hit ? '的中' : '×'}
                                      </span>
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {prediction.race.raceDate} | {prediction.race.distance}m・
                            {SURFACES.find(s => s.value === prediction.race.surface)?.label} | 
                            {prediction.horseCount}頭立て
                          </div>
                        </div>
                        
                        {/* アクションボタン */}
                        <div className="flex gap-2">
                          {editingResultId === prediction.id ? (
                            <>
                              <button
                                onClick={() => saveResultForm(prediction.id)}
                                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                              >
                                保存
                              </button>
                              <button
                                onClick={cancelEditingResult}
                                className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition-colors"
                              >
                                キャンセル
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startEditingResult(prediction.id)}
                              className={`px-3 py-1 rounded text-sm transition-colors ${
                                prediction.isResultEntered
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-orange-600 text-white hover:bg-orange-700'
                              }`}
                            >
                              {prediction.isResultEntered ? '結果を編集' : '結果を入力'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 予想と結果の詳細 */}
                    <div className="p-4">
                      {/* 配当情報セクション（編集時または入力済み時に表示） */}
                      {(editingResultId === prediction.id || prediction.payoutData) && (
                        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h4 className="font-semibold text-gray-800 mb-3">💰 配当・投資情報</h4>
                          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                            <strong>💡 使い方ガイド:</strong><br/>
                            • デフォルト1000円投資として計算されます<br/>
                            • 予想が的中していたら該当する配当金額（100円あたり）を入力<br/>
                            • 全く的中しなかった場合は配当欄は空のままでOK（投資額1000円、払戻0円として計算）
                          </div>
                          
                          {editingResultId === prediction.id ? (
                            /* 編集モード：入力フィールド */
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">投資額(円)</label>
                                <input
                                  type="number"
                                  value={tempPayoutData.investment || '1000'}
                                  onChange={(e) => setTempPayoutData(prev => ({
                                    ...prev,
                                    investment: e.target.value
                                  }))}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-100"
                                  placeholder="1000"
                                  readOnly
                                />
                                <div className="text-xs text-gray-500 mt-1">※固定値（変更不可）</div>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">単勝配当(円)</label>
                                <input
                                  type="number"
                                  value={tempPayoutData.tanwin || ''}
                                  onChange={(e) => setTempPayoutData(prev => ({
                                    ...prev,
                                    tanwin: e.target.value
                                  }))}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="280"
                                />
                                <div className="text-xs text-gray-500 mt-1">100円あたり</div>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">複勝配当(円)</label>
                                <input
                                  type="number"
                                  value={tempPayoutData.fukusho || ''}
                                  onChange={(e) => setTempPayoutData(prev => ({
                                    ...prev,
                                    fukusho: e.target.value
                                  }))}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="150"
                                />
                                <div className="text-xs text-gray-500 mt-1">100円あたり</div>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">馬連配当(円)</label>
                                <input
                                  type="number"
                                  value={tempPayoutData.umaren || ''}
                                  onChange={(e) => setTempPayoutData(prev => ({
                                    ...prev,
                                    umaren: e.target.value
                                  }))}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="1200"
                                />
                                <div className="text-xs text-gray-500 mt-1">100円あたり</div>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">馬単配当(円)</label>
                                <input
                                  type="number"
                                  value={tempPayoutData.umatan || ''}
                                  onChange={(e) => setTempPayoutData(prev => ({
                                    ...prev,
                                    umatan: e.target.value
                                  }))}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="2400"
                                />
                                <div className="text-xs text-gray-500 mt-1">100円あたり</div>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">ワイド配当(円)</label>
                                <input
                                  type="number"
                                  value={tempPayoutData.wide || ''}
                                  onChange={(e) => setTempPayoutData(prev => ({
                                    ...prev,
                                    wide: e.target.value
                                  }))}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="680"
                                />
                                <div className="text-xs text-gray-500 mt-1">100円あたり</div>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">3連複配当(円)</label>
                                <input
                                  type="number"
                                  value={tempPayoutData.sanrenpuku || ''}
                                  onChange={(e) => setTempPayoutData(prev => ({
                                    ...prev,
                                    sanrenpuku: e.target.value
                                  }))}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="4800"
                                />
                                <div className="text-xs text-gray-500 mt-1">100円あたり</div>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">3連単配当(円)</label>
                                <input
                                  type="number"
                                  value={tempPayoutData.sanrentan || ''}
                                  onChange={(e) => setTempPayoutData(prev => ({
                                    ...prev,
                                    sanrentan: e.target.value
                                  }))}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="15600"
                                />
                                <div className="text-xs text-gray-500 mt-1">100円あたり</div>
                              </div>
                            </div>
                          ) : (
                            /* 表示モード：配当情報表示 */
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div className="text-center">
                                <div className="text-xs text-gray-600">投資額</div>
                                <div className="font-bold text-blue-600">
                                  1,000円
                                </div>
                                <div className="text-xs text-gray-500">(固定)</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-600">払戻額</div>
                                <div className="font-bold text-green-600">
                                  {prediction.payoutData?.totalReturn?.toLocaleString() || 0}円
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-600">収支</div>
                                <div className={`font-bold ${
                                  (prediction.payoutData?.totalReturn || 0) - (prediction.payoutData?.investment || 0) >= 0 
                                    ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {((prediction.payoutData?.totalReturn || 0) - (prediction.payoutData?.investment || 0)) >= 0 ? '+' : ''}
                                  {((prediction.payoutData?.totalReturn || 0) - (prediction.payoutData?.investment || 0)).toLocaleString()}円
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-600">回収率</div>
                                <div className={`font-bold ${
                                  prediction.payoutData?.investment > 0 && 
                                  (prediction.payoutData.totalReturn / prediction.payoutData.investment * 100) >= 100 
                                    ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {prediction.payoutData?.investment > 0 
                                    ? Math.round((prediction.payoutData.totalReturn / prediction.payoutData.investment) * 100)
                                    : 0}%
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* 配当詳細（表示モード時のみ） */}
                          {!editingResultId && prediction.payoutData && (
                            <div className="mt-3 pt-3 border-t border-yellow-300">
                              <div className="text-xs text-gray-600 mb-2">配当詳細 (100円あたり)</div>
                              <div className="grid grid-cols-4 md:grid-cols-7 gap-2 text-xs">
                                {prediction.payoutData.tanwin > 0 && (
                                  <div className="text-center">
                                    <div className="text-gray-500">単勝</div>
                                    <div className="font-medium">{prediction.payoutData.tanwin}円</div>
                                  </div>
                                )}
                                {prediction.payoutData.fukusho > 0 && (
                                  <div className="text-center">
                                    <div className="text-gray-500">複勝</div>
                                    <div className="font-medium">{prediction.payoutData.fukusho}円</div>
                                  </div>
                                )}
                                {prediction.payoutData.umaren > 0 && (
                                  <div className="text-center">
                                    <div className="text-gray-500">馬連</div>
                                    <div className="font-medium">{prediction.payoutData.umaren}円</div>
                                  </div>
                                )}
                                {prediction.payoutData.umatan > 0 && (
                                  <div className="text-center">
                                    <div className="text-gray-500">馬単</div>
                                    <div className="font-medium">{prediction.payoutData.umatan}円</div>
                                  </div>
                                )}
                                {prediction.payoutData.wide > 0 && (
                                  <div className="text-center">
                                    <div className="text-gray-500">ワイド</div>
                                    <div className="font-medium">{prediction.payoutData.wide}円</div>
                                  </div>
                                )}
                                {prediction.payoutData.sanrenpuku > 0 && (
                                  <div className="text-center">
                                    <div className="text-gray-500">3連複</div>
                                    <div className="font-medium">{prediction.payoutData.sanrenpuku}円</div>
                                  </div>
                                )}
                                {prediction.payoutData.sanrentan > 0 && (
                                  <div className="text-center">
                                    <div className="text-gray-500">3連単</div>
                                    <div className="font-medium">{prediction.payoutData.sanrentan}円</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* 馬別結果入力エリア */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {prediction.predictions.slice(0, 5).map((horse, index) => {
                          const actualResult = prediction.actualResults?.find(r => r.number === horse.number);
                          const isEditing = editingResultId === prediction.id;
                          
                          return (
                            <div key={horse.number} className="bg-white border border-gray-200 rounded-lg p-3">
                              {/* 馬情報 */}
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                  index === 0 ? 'bg-yellow-500' :
                                  index === 1 ? 'bg-gray-400' :
                                  index === 2 ? 'bg-amber-600' :
                                  'bg-blue-500'
                                }`}>
                                  {index + 1}
                                </div>
                                <div className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">
                                  {horse.number}番
                                </div>
                                <div className="font-medium text-sm text-gray-900 truncate">
                                  {horse.name}
                                </div>
                              </div>
                              
                              {/* 結果入力・表示 */}
                              <div className="mt-2">
                                {isEditing ? (
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">実際の着順</label>
                                    <select
                                      value={tempResults[horse.number] || ''}
                                      onChange={(e) => setTempResults(prev => ({
                                        ...prev,
                                        [horse.number]: e.target.value
                                      }))}
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                      <option value="">選択</option>
                                      {Array.from({ length: 18 }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>
                                          {i + 1}着
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500 mb-1">実際の着順</div>
                                    <div className={`text-lg font-bold ${
                                      actualResult?.rank === 1 ? 'text-yellow-600' :
                                      actualResult?.rank <= 3 ? 'text-green-600' :
                                      actualResult?.rank ? 'text-gray-600' :
                                      'text-gray-400'
                                    }`}>
                                      {actualResult?.rank ? `${actualResult.rank}着` : '未入力'}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                <p>まだ予想履歴がありません</p>
                <p className="text-sm">レースを作成して予想を実行してみましょう</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 一括インポート画面（デバッグ版）
  const BulkImportScreen = () => {
    const [importText, setImportText] = useState('');
    const [previewData, setPreviewData] = useState([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [debugMessages, setDebugMessages] = useState([]); // デバッグメッセージ

    // デバッグメッセージを追加
    const addDebugMessage = (msg) => {
      setDebugMessages(prev => [...prev, msg]);
      console.log(msg); // コンソールにも出力
    };

    // 解析処理
    const handleAnalyze = () => {
      // デバッグメッセージをクリア
      setDebugMessages([]);
      
      addDebugMessage(`解析開始: ${importText.length}文字`);
      
      if (!importText) {
        alert('テキストを入力してください');
        return;
      }

      try {
        addDebugMessage('parseNetKeibaData呼び出し開始');
        
        // parseNetKeibaDataを呼び出し
        const parsed = parseNetKeibaData(importText, addDebugLog);
        
        addDebugMessage(`解析結果: ${parsed.length}頭`);
        addDebugMessage(`結果の詳細: ${JSON.stringify(parsed.slice(0, 2))}`); // 最初の2頭だけ表示
        
        setPreviewData(parsed);
        
        if (parsed.length > 0) {
          addDebugMessage('確認画面を表示します');
          setShowConfirm(true);
        } else {
          addDebugMessage('解析結果が0頭でした');
          alert('馬データを解析できませんでした');
        }
      } catch (error) {
        addDebugMessage(`エラー発生: ${error.message}`);
        addDebugMessage(`エラースタック: ${error.stack}`);
        alert('解析エラー: ' + error.message);
      }
    };

    // 登録処理
    const handleImport = () => {
      const newHorses = previewData.map((horse, index) => ({
        ...horse,
        id: `${Date.now()}_${index}`,
        scores: null
      }));

      const updatedRaces = races.map(race => {
        if (race.id === selectedRace.id) {
          return { ...race, horses: [...race.horses, ...newHorses] };
        }
        return race;
      });

      setRaces(updatedRaces);
      setSelectedRace(updatedRaces.find(r => r.id === selectedRace.id));

      alert(`${newHorses.length}頭を登録しました`);
      setCurrentView('raceDetail');
    };

    return (
      <div style={{ padding: '20px' }}>
        <h1>一括データ入力</h1>
        <p>{selectedRace.venue} {selectedRace.raceNumber}R</p>
        
        <div style={{ marginBottom: '20px' }}>
          <p>入力文字数: {importText.length}</p>
        </div>

        {/* デバッグメッセージ表示 */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '10px', 
          backgroundColor: '#fffacd',
          border: '1px solid #ddd',
          maxHeight: '150px',
          overflow: 'auto'
        }}>
          <strong>デバッグ情報:</strong>
          {debugMessages.map((msg, i) => (
            <div key={i} style={{ fontSize: '12px' }}>{msg}</div>
          ))}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={15}
            style={{ width: '100%', padding: '10px', fontSize: '14px' }}
            placeholder="ここにテキストを入力またはペースト"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <button onClick={handleAnalyze} style={{ marginRight: '10px', padding: '10px' }}>
            データを解析
          </button>
          <button onClick={() => setCurrentView('raceDetail')} style={{ padding: '10px' }}>
            戻る
          </button>
        </div>

        {/* 解析結果表示 */}
        {previewData.length > 0 && !showConfirm && (
          <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px' }}>
            <h3>解析結果: {previewData.length}頭</h3>
            {previewData.map((horse, i) => (
              <div key={i} style={{ padding: '5px' }}>
                {horse.number}番 {horse.name} ({horse.popularity}番人気)
              </div>
            ))}
          </div>
        )}

        {/* 確認モーダル */}
        {showConfirm && previewData.length > 0 && (
          <div style={{ 
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '20px',
            border: '2px solid #333',
            borderRadius: '10px',
            maxWidth: '500px',
            maxHeight: '70vh',
            overflow: 'auto',
            zIndex: 1000
          }}>
            <h2>登録確認</h2>
            <p>以下の{previewData.length}頭を登録しますか？</p>
            
            {previewData.map((horse, index) => (
              <div key={index} style={{ 
                border: '1px solid #ddd',
                padding: '10px',
                marginBottom: '10px'
              }}>
                <strong>{horse.number}番 {horse.name}</strong>
                <p>人気: {horse.popularity}番人気 / 騎手: {horse.jockey}</p>
                <p>過去成績: {horse.pastRaces.map(r => `${r.rank}着`).join(', ')}</p>
              </div>
            ))}
            
            <div style={{ marginTop: '20px' }}>
              <button 
                onClick={() => {
                  setShowConfirm(false);
                  addDebugMessage('確認画面を閉じました');
                }}
                style={{ marginRight: '10px', padding: '10px' }}
              >
                キャンセル
              </button>
              <button 
                onClick={handleImport}
                style={{ padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none' }}
              >
                登録する
              </button>
            </div>
          </div>
        )}

        {/* 背景オーバーレイ */}
        {showConfirm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 999
          }} />
        )}
      </div>
    );
  };

  // 画面ルーティング（一括インポートを追加）
  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return <HomeScreen />;
      case 'createRace':
        return <CreateRaceScreen />;
      case 'raceDetail':
        return <RaceDetailScreen />;
      case 'addHorse':
        return <AddHorseScreen />;
      case 'editHorse':
        return <EditHorseScreen />;
      case 'bulkImport':
        return <BulkImportScreen />;
      case 'prediction':
        return <PredictionScreen />;
      case 'history':
        return <HistoryScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="relative">
      {renderCurrentView()}

      {/* カスタム確認ダイアログ */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {confirmDialog.title}
              </h3>
              <p className="text-gray-600 mb-6">
                {confirmDialog.message}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmDialog.onCancel}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KeibaApp;