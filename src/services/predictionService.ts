// スピード指数計算関数
export const calculateSpeedIndex = (pastRaces: any[], targetDistance: number, targetSurface: string): number => {
  if (!pastRaces || pastRaces.length === 0) return 0;
  
  // 同距離、同馬場のレースを優先
  const relevantRaces = pastRaces.filter(race => 
    Math.abs(race.distance - targetDistance) <= 400 && race.surface === targetSurface
  );
  
  const racesToUse = relevantRaces.length > 0 ? relevantRaces : pastRaces;
  
  // 基準タイム（暫定：距離に基づく概算）
  const getBaseTime = (distance: number, surface: string): number => {
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

// 新馬戦用スコア計算関数
export const calculateDebutantScore = (horse: any, raceInfo: any, weights = { speed: 40, recent: 30, odds: 30 }) => {
  console.log(`🌟 新馬戦スコア詳細計算: ${horse.name}`, {
    trainerRating: horse.trainerRating || 3,
    jockeyRating: horse.jockeyRating || 3,
    pedigreeRating: horse.pedigreeRating || 3,
    weights
  });
  
  // 1. 調教師評価スコア（speedの代替）
  const trainerScore = ((horse.trainerRating || 3) / 5) * weights.speed;
  console.log(`調教師スコア: (${horse.trainerRating || 3} / 5) * ${weights.speed} = ${trainerScore}`);
  
  // 2. 騎手評価スコア（recentの代替）
  const jockeyScore = ((horse.jockeyRating || 3) / 5) * weights.recent;
  console.log(`騎手スコア: (${horse.jockeyRating || 3} / 5) * ${weights.recent} = ${jockeyScore}`);
  
  // 3. オッズスコア（通常と同じロジック）
  let oddsScore = 0;
  if (horse.odds && parseFloat(horse.odds) > 0) {
    const odds = parseFloat(horse.odds);
    if (odds <= 1.0) {
      oddsScore = weights.odds;
    } else if (odds <= 20.0) {
      const logOdds = Math.log(odds);
      const maxLogOdds = Math.log(20.0);
      oddsScore = weights.odds * Math.max(0, (maxLogOdds - logOdds) / maxLogOdds);
    } else {
      oddsScore = 0;
    }
  } else if (horse.popularity && horse.popularity > 0) {
    // フォールバック：人気からオッズを推定
    const estimatedOdds = Math.max(1.5, horse.popularity * 1.5);
    if (estimatedOdds <= 20.0) {
      const logOdds = Math.log(estimatedOdds);
      const maxLogOdds = Math.log(20.0);
      oddsScore = weights.odds * Math.max(0, (maxLogOdds - logOdds) / maxLogOdds);
    }
  }
  
  // 4. 血統ボーナス（全体スコアの10%まで）
  const pedigreeBonus = ((horse.pedigreeRating || 3) / 5) * (weights.speed + weights.recent + weights.odds) * 0.1;
  console.log(`血統ボーナス: (${horse.pedigreeRating || 3} / 5) * ${weights.speed + weights.recent + weights.odds} * 0.1 = ${pedigreeBonus}`);
  
  const totalScore = trainerScore + jockeyScore + oddsScore + pedigreeBonus;
  console.log(`オッズスコア: ${oddsScore}`);
  console.log(`総合スコア: ${trainerScore} + ${jockeyScore} + ${oddsScore} + ${pedigreeBonus} = ${totalScore}`);
  
  const result = {
    speed: Math.round((trainerScore + pedigreeBonus * 0.5) * 10) / 10, // 調教師評価+血統ボーナスの半分
    recent: Math.round((jockeyScore + pedigreeBonus * 0.5) * 10) / 10, // 騎手評価+血統ボーナスの半分
    odds: Math.round(oddsScore * 10) / 10,
    total: Math.round(totalScore * 10) / 10
  };
  
  console.log(`🎯 新馬戦最終スコア: ${horse.name}`, result);
  return result;
};

// 馬のスコア計算関数
export const calculateHorseScore = (horse: any, raceInfo: any, weights = { speed: 40, recent: 30, odds: 30 }) => {
  console.log(`🐎 スコア計算開始: ${horse.name || '不明'}`, {
    isDebutant: horse.isDebutant,
    pastRacesLength: horse.pastRaces?.length || 0,
    trainerRating: horse.trainerRating,
    jockeyRating: horse.jockeyRating,
    pedigreeRating: horse.pedigreeRating,
    odds: horse.odds,
    popularity: horse.popularity
  });
  
  // 新馬戦対応：過去成績がない場合の処理
  if (!horse.pastRaces || horse.pastRaces.length === 0) {
    if (horse.isDebutant) {
      console.log(`✨ 新馬戦スコア計算: ${horse.name}`);
      const debutantScore = calculateDebutantScore(horse, raceInfo, weights);
      console.log(`✅ 新馬戦スコア結果: ${horse.name}`, debutantScore);
      return debutantScore;
    } else {
      console.log(`❌ 過去成績なし&新馬フラグなし: ${horse.name}`);
      return { speed: 0, recent: 0, odds: 0, total: 0 };
    }
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
  
  const result = {
    speed: Math.round(speedScore * 10) / 10,
    recent: Math.round(recentScore * 10) / 10,
    odds: Math.round(oddsScore * 10) / 10,
    total: Math.round(totalScore * 10) / 10
  };
  
  console.log(`🏁 通常馬最終スコア: ${horse.name}`, result);
  return result;
};

// 予想確信度の計算
export const calculateConfidenceLevel = (predictions: any[], weights: any) => {
  if (!predictions || predictions.length === 0) {
    return { level: 0, description: 'データ不足', factors: [] };
  }

  const factors = [];
  let confidenceScore = 0;

  // 1. データ品質による確信度
  const dataQualityScore = predictions.reduce((sum, horse) => {
    let horseDataScore = 0;
    
    // 新馬戦の場合
    if (horse.isDebutant) {
      // 新馬戦用の評価項目
      if (horse.trainerRating >= 4) horseDataScore += 20;
      else if (horse.trainerRating >= 3) horseDataScore += 15;
      
      if (horse.jockeyRating >= 4) horseDataScore += 15;
      else if (horse.jockeyRating >= 3) horseDataScore += 10;
      
      if (horse.pedigreeRating >= 4) horseDataScore += 15;
      else if (horse.pedigreeRating >= 3) horseDataScore += 10;
    } else {
      // 通常馬の過去成績の充実度
      if (horse.pastRaces && horse.pastRaces.length >= 3) {
        horseDataScore += 25;
      } else if (horse.pastRaces && horse.pastRaces.length >= 1) {
        horseDataScore += 15;
      }
    }
    
    // オッズ情報の有無
    if (horse.odds && horse.odds > 0) {
      horseDataScore += 15;
    }
    
    // 騎手情報の有無
    if (horse.jockey && horse.jockey !== '未設定') {
      horseDataScore += 10;
    }
    
    return sum + horseDataScore;
  }, 0) / predictions.length;
  
  confidenceScore += dataQualityScore * 0.3;
  factors.push({
    name: 'データ品質',
    score: dataQualityScore,
    description: `平均データ充実度: ${dataQualityScore.toFixed(1)}%`
  });

  // 2. スコア分散による確信度（上位と下位の差が大きいほど確信度が高い）
  const scores = predictions.map(p => p.scores.total).sort((a, b) => b - a);
  const topScore = scores[0] || 0;
  const medianScore = scores[Math.floor(scores.length / 2)] || 0;
  const scoreSpread = topScore - medianScore;
  const maxPossible = weights.speed + weights.recent + weights.odds;
  const spreadRatio = (scoreSpread / maxPossible) * 100;
  
  confidenceScore += Math.min(spreadRatio * 2, 40);
  factors.push({
    name: 'スコア分散',
    score: Math.min(spreadRatio * 2, 40),
    description: `上位と中位の差: ${scoreSpread.toFixed(1)}pt`
  });

  // 3. 条件適性による確信度
  const conditionScore = predictions.reduce((sum, horse) => {
    if (!horse.pastRaces || horse.pastRaces.length === 0) return sum;
    
    // 同距離・同馬場での実績があるかチェック
    const relevantRaces = horse.pastRaces.filter(race => 
      Math.abs(race.distance - (race.targetDistance || 1600)) <= 200 &&
      race.surface === (race.targetSurface || 'turf')
    );
    
    return sum + (relevantRaces.length > 0 ? 20 : 0);
  }, 0) / predictions.length;
  
  confidenceScore += conditionScore * 0.3;
  factors.push({
    name: '条件適性',
    score: conditionScore * 0.3,
    description: `条件適性のある馬の割合: ${(conditionScore * 5).toFixed(0)}%`
  });

  // 4. 重み設定のバランス
  const weightTotal = weights.speed + weights.recent + weights.odds;
  const weightBalance = 100 - Math.abs(33.3 - (weights.speed / weightTotal * 100)) - 
                       Math.abs(33.3 - (weights.recent / weightTotal * 100)) - 
                       Math.abs(33.3 - (weights.odds / weightTotal * 100));
  
  confidenceScore += weightBalance * 0.2;
  factors.push({
    name: '重み設定',
    score: weightBalance * 0.2,
    description: `重みバランス: ${weightBalance.toFixed(1)}%`
  });

  // 確信度レベルの決定
  let level: number;
  let description: string;
  
  if (confidenceScore >= 85) {
    level = 5;
    description = '非常に高い';
  } else if (confidenceScore >= 70) {
    level = 4;
    description = '高い';
  } else if (confidenceScore >= 55) {
    level = 3;
    description = '中程度';
  } else if (confidenceScore >= 40) {
    level = 2;
    description = '低い';
  } else {
    level = 1;
    description = '非常に低い';
  }

  return {
    level,
    score: Math.round(confidenceScore),
    description,
    factors
  };
};

// 最適化された馬のスコア計算関数
export const calculateOptimizedHorseScore = (horse: any, raceInfo: any, weights = { speed: 40, recent: 30, odds: 30 }) => {
  console.log(`🎯 最適化スコア計算開始: ${horse.name || '不明'}`, {
    isDebutant: horse.isDebutant,
    pastRacesLength: horse.pastRaces?.length || 0,
    trainerRating: horse.trainerRating,
    jockeyRating: horse.jockeyRating,
    pedigreeRating: horse.pedigreeRating
  });
  
  // 新馬戦対応：過去成績がない場合の処理
  if (!horse.pastRaces || horse.pastRaces.length === 0) {
    if (horse.isDebutant) {
      console.log(`🌟 最適化版：新馬戦スコア計算: ${horse.name}`);
      const debutantScore = calculateDebutantScore(horse, raceInfo, weights);
      return {
        speed: debutantScore.speed,
        recent: debutantScore.recent,
        odds: debutantScore.odds,
        total: debutantScore.total,
        confidence: 60, // 新馬戦の基本確信度
        factors: [
          { name: '調教師評価', total: debutantScore.speed },
          { name: '騎手評価', total: debutantScore.recent },
          { name: '血統評価', total: debutantScore.odds }
        ]
      };
    } else {
      console.log(`❌ 最適化版：過去成績なし&新馬フラグなし: ${horse.name}`);
      return { 
        speed: 0, 
        recent: 0, 
        odds: 0, 
        total: 0,
        confidence: 0,
        factors: []
      };
    }
  }
  
  const factors = [];
  
  // 1. 改良されたスピード指数スコア
  const speedIndex = calculateSpeedIndex(horse.pastRaces, raceInfo.distance, raceInfo.surface);
  let speedScore = Math.min(weights.speed, speedIndex * (weights.speed / 100));
  
  // 距離適性ボーナス
  const distanceBonus = horse.pastRaces.some(race => 
    Math.abs(race.distance - raceInfo.distance) <= 200
  ) ? speedScore * 0.1 : 0;
  
  speedScore += distanceBonus;
  factors.push({
    name: 'スピード指数',
    base: speedIndex,
    bonus: distanceBonus,
    total: speedScore
  });
  
  // 2. 改良された直近成績スコア（複数走を考慮）
  let recentScore = 0;
  const recentRaces = horse.pastRaces.slice(0, 3); // 最新3走
  
  recentRaces.forEach((race, index) => {
    const weight = [0.5, 0.3, 0.2][index] || 0; // 新しいレースほど重視
    let raceScore = 0;
    
    if (race.rank === 1) raceScore = weights.recent;
    else if (race.rank <= 3) raceScore = weights.recent * 0.67;
    else if (race.rank <= 5) raceScore = weights.recent * 0.33;
    else raceScore = weights.recent * 0.17;
    
    recentScore += raceScore * weight;
  });
  
  factors.push({
    name: '直近成績',
    races: recentRaces.length,
    total: recentScore
  });
  
  // 3. 改良されたオッズスコア（市場の信頼度を考慮）
  let oddsScore = 0;
  if (horse.odds && parseFloat(horse.odds) > 0) {
    const odds = parseFloat(horse.odds);
    
    // 基本オッズスコア
    if (odds <= 1.0) {
      oddsScore = weights.odds;
    } else if (odds <= 20.0) {
      const logOdds = Math.log(odds);
      const maxLogOdds = Math.log(20.0);
      oddsScore = weights.odds * Math.max(0, (maxLogOdds - logOdds) / maxLogOdds);
    }
    
    // 人気とオッズの整合性チェック
    const expectedOdds = Math.max(1.5, horse.popularity * 1.5);
    const consistency = 1 - Math.abs(odds - expectedOdds) / expectedOdds;
    oddsScore *= Math.max(0.7, consistency); // 整合性が低い場合は減点
    
  } else if (horse.popularity && horse.popularity > 0) {
    // フォールバック：人気からオッズを推定
    const estimatedOdds = Math.max(1.5, horse.popularity * 1.5);
    if (estimatedOdds <= 20.0) {
      const logOdds = Math.log(estimatedOdds);
      const maxLogOdds = Math.log(20.0);
      oddsScore = weights.odds * Math.max(0, (maxLogOdds - logOdds) / maxLogOdds) * 0.8; // 推定値なので減点
    }
  }
  
  factors.push({
    name: 'オッズ評価',
    odds: horse.odds,
    popularity: horse.popularity,
    total: oddsScore
  });
  
  const totalScore = speedScore + recentScore + oddsScore;
  
  // 個別馬の確信度計算
  const horseConfidence = Math.min(100, 
    (horse.pastRaces.length >= 3 ? 30 : horse.pastRaces.length * 10) +
    (horse.odds ? 25 : 0) +
    (horse.jockey && horse.jockey !== '未設定' ? 15 : 0) +
    (totalScore / (weights.speed + weights.recent + weights.odds) * 30)
  );
  
  return {
    speed: Math.round(speedScore * 10) / 10,
    recent: Math.round(recentScore * 10) / 10,
    odds: Math.round(oddsScore * 10) / 10,
    total: Math.round(totalScore * 10) / 10,
    confidence: Math.round(horseConfidence),
    factors
  };
};

// 全予想計算関数（改良版）
export const calculateAllPredictions = (race: any, weights = { speed: 40, recent: 30, odds: 30 }) => {
  try {
    if (!race || !race.horses || race.horses.length === 0) {
      throw new Error('レースまたは出走馬データが不正です');
    }
    
    const horsesWithScores = race.horses.map((horse: any) => {
      try {
        const scores = calculateOptimizedHorseScore(horse, race, weights);
        return { ...horse, scores };
      } catch (error) {
        console.error(`馬 ${horse.name} のスコア計算エラー:`, error);
        // エラーの場合は0点で処理続行
        return { 
          ...horse, 
          scores: { speed: 0, recent: 0, odds: 0, total: 0, confidence: 0, factors: [] }
        };
      }
    });
    
    // 総合スコア順にソート
    const sortedHorses = horsesWithScores.sort((a: any, b: any) => b.scores.total - a.scores.total);
    
    // 全体の確信度を計算
    const overallConfidence = calculateConfidenceLevel(sortedHorses, weights);
    
    return {
      predictions: sortedHorses,
      confidence: overallConfidence
    };
  } catch (error) {
    console.error('予想計算全体エラー:', error);
    throw error;
  }
};