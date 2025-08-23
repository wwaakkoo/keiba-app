// データ検証結果の型定義
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// 馬データの検証
export const validateHorseData = (horse: any): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 必須フィールドの検証
  if (!horse.name || typeof horse.name !== 'string' || horse.name.trim().length === 0) {
    errors.push('馬名が設定されていません');
  }

  if (!horse.number || typeof horse.number !== 'number' || horse.number < 1 || horse.number > 18) {
    errors.push('馬番が正しくありません（1-18の範囲で設定してください）');
  }

  if (!horse.popularity || typeof horse.popularity !== 'number' || horse.popularity < 1) {
    errors.push('人気が正しくありません');
  }

  // オッズの検証
  if (horse.odds !== null && horse.odds !== undefined) {
    if (typeof horse.odds !== 'number' || horse.odds < 1.0) {
      warnings.push('オッズが正しくない可能性があります');
    }
  }

  // 騎手の検証
  if (!horse.jockey || horse.jockey === '未設定') {
    warnings.push('騎手情報が設定されていません');
  }

  // 過去成績の検証（新馬の場合は免除）
  if (!horse.isDebutant && (!horse.pastRaces || !Array.isArray(horse.pastRaces) || horse.pastRaces.length === 0)) {
    errors.push('過去成績データがありません');
  } else if (horse.pastRaces && horse.pastRaces.length > 0) {
    horse.pastRaces.forEach((race: any, index: number) => {
      if (!race.rank || typeof race.rank !== 'number' || race.rank < 1) {
        warnings.push(`過去成績${index + 1}の着順が正しくありません`);
      }
      if (!race.distance || typeof race.distance !== 'number' || race.distance < 1000) {
        warnings.push(`過去成績${index + 1}の距離が正しくありません`);
      }
      if (!race.time || typeof race.time !== 'number' || race.time < 60) {
        warnings.push(`過去成績${index + 1}のタイムが正しくありません`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// レース情報の抽出（テキストから基本的なレース情報を抽出）
/**
 * netkeibaデータからレース情報を抽出
 * 注意: 現在のnetkeibaデータには対象レース自体の情報（競馬場・距離・馬場）は含まれていません
 * 含まれているのは各馬の過去成績の情報のみです
 * そのため、レース条件は全てユーザーが手動で設定する必要があります
 */
export const extractRaceInfo = (text: string): Partial<any> => {
  const raceInfo: any = {};

  // 現在のnetkeibaデータ形式では、対象レースの条件情報は含まれていない
  // 含まれているのは各馬の過去成績のみ
  // 
  // 例：
  // 2022.12.25 中山 1 芝1600 良 1:34.5  ← これは過去成績
  // 2022.11.27 東京 3 芝1400 良 1:21.2  ← これも過去成績
  //
  // 対象レースの情報（競馬場・距離・馬場・条件）は手動設定が必要

  console.log('🏁 extractRaceInfo - netkeibaデータからはレース条件を抽出しません');
  console.log('🏁 extractRaceInfo - 理由: 過去成績の情報と区別できないため');
  console.log('🏁 extractRaceInfo - 競馬場・距離・馬場・条件は手動で設定してください');

  return raceInfo;
};

// データ自動抽出関数（詳細なデバッグログ付き）
export const parseNetKeibaData = (text: string, addDebugLog?: (message: string, data?: any) => void) => {
  try {
    const horses: any[] = [];
    const parseErrors: string[] = [];
    const parseWarnings: string[] = [];
    
    // ログ関数のデフォルト実装
    const log = addDebugLog || (() => {});
    
    // 入力データの基本検証
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('入力データが空です');
    }

    // 各馬のデータを区切る（枠番・馬番の行で区切る）
    const horseBlocks = text.split(/\n(?=\d+\s+\d+\s*\n)/);
    log(`データブロック数: ${horseBlocks.length}`);
    
    if (horseBlocks.length === 0) {
      throw new Error('馬のデータブロックが見つかりません');
    }
    
    horseBlocks.forEach((block, blockIndex) => {
      if (!block.trim()) return;
      
      const lines = block.split('\n').filter(line => line.trim());
      log(`ブロック${blockIndex + 1}: ${lines.length}行`);
      log(`ブロック${blockIndex + 1}の内容:`, lines.slice(0, 15)); // 最初の15行を表示
      
      if (lines.length < 10) {
        const warning = `ブロック${blockIndex + 1}: データ不足のためスキップ（${lines.length}行）`;
        log(warning);
        parseWarnings.push(warning);
        return;
      }
      
      try {
        // 1. 枠番・馬番の抽出（1行目）
        const firstLine = lines[0].trim();
        const frameHorseMatch = firstLine.match(/^(\d+)\s+(\d+)/);
        if (!frameHorseMatch) {
          const error = `ブロック${blockIndex + 1}: 枠番・馬番が見つかりません`;
          log(error);
          parseErrors.push(error);
          return;
        }
        
        const frameNumber = parseInt(frameHorseMatch[1]);
        const horseNumber = parseInt(frameHorseMatch[2]);
        
        // 馬番の妥当性チェック
        if (horseNumber < 1 || horseNumber > 18) {
          const error = `ブロック${blockIndex + 1}: 馬番が範囲外です（${horseNumber}）`;
          log(error);
          parseErrors.push(error);
          return;
        }
        
        log(`枠番: ${frameNumber}, 馬番: ${horseNumber}`);
        
        // 2. 馬名の抽出（通常4行目）
        let horseName = '';
        if (lines.length > 3) {
          horseName = lines[3].trim();
          
          // 馬名の妥当性チェック
          if (!horseName || horseName.length < 2 || horseName.length > 20) {
            const warning = `ブロック${blockIndex + 1}: 馬名が不正な可能性があります（${horseName}）`;
            log(warning);
            parseWarnings.push(warning);
          }
          
          log(`馬名: ${horseName}`);
        } else {
          const error = `ブロック${blockIndex + 1}: 馬名が見つかりません`;
          log(error);
          parseErrors.push(error);
          return;
        }

        // 3. オッズ・人気の抽出（改良版：全行検索）
        let popularity: number | null = null;
        let odds: number | null = null;
        
        log(`オッズ・人気抽出開始 - 検索範囲: 全行`);
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // メインパターン: "8.7 (5人気)" 形式
          const mainPattern = line.match(/^([\d.]+)\s*\(\s*(\d+)\s*人気\s*\)$/);
          if (mainPattern) {
            odds = parseFloat(mainPattern[1]);
            popularity = parseInt(mainPattern[2]);
            
            // オッズと人気の妥当性チェック
            if (odds < 1.0 || odds > 999.9) {
              const warning = `ブロック${blockIndex + 1}: オッズが異常値です（${odds}）`;
              log(warning);
              parseWarnings.push(warning);
            }
            
            if (popularity < 1 || popularity > 18) {
              const warning = `ブロック${blockIndex + 1}: 人気が異常値です（${popularity}）`;
              log(warning);
              parseWarnings.push(warning);
            }
            
            log(`✅ オッズ・人気マッチ（行${i}）"${line}" - オッズ: ${odds}, 人気: ${popularity}番人気`);
            break;
          }
          
          // 緩いパターン: 行内に含まれる場合
          const loosePattern = line.match(/([\d.]+)\s*\(\s*(\d+)\s*人気\s*\)/);
          if (loosePattern) {
            odds = parseFloat(loosePattern[1]);
            popularity = parseInt(loosePattern[2]);
            
            // オッズと人気の妥当性チェック
            if (odds < 1.0 || odds > 999.9) {
              const warning = `ブロック${blockIndex + 1}: オッズが異常値です（${odds}）`;
              log(warning);
              parseWarnings.push(warning);
            }
            
            if (popularity < 1 || popularity > 18) {
              const warning = `ブロック${blockIndex + 1}: 人気が異常値です（${popularity}）`;
              log(warning);
              parseWarnings.push(warning);
            }
            
            log(`✅ オッズ・人気マッチ（緩い、行${i}）"${line}" - オッズ: ${odds}, 人気: ${popularity}番人気`);
            break;
          }
        }
        
        // 人気のみでオッズがない場合の推定
        if (popularity && !odds) {
          const estimatedOdds = Math.max(1.5, 1.5 + (popularity - 1) * 1.2);
          odds = Math.round(estimatedOdds * 10) / 10;
          log(`⚠️ オッズ推定: ${popularity}番人気 → 約${odds}倍`);
          parseWarnings.push(`ブロック${blockIndex + 1}: オッズを人気から推定しました（${odds}倍）`);
        }
        
        log(`オッズ・人気最終結果 - オッズ: ${odds || '未設定'}, 人気: ${popularity || '未設定'}`);
        
        // オッズ・人気が見つからない場合の警告
        if (!popularity) {
          const warning = `ブロック${blockIndex + 1}: 人気が見つかりませんでした`;
          log(warning);
          parseWarnings.push(warning);
        }
        
        // 4. 騎手の抽出（改良版：斤量の直前行を検索）
        let jockey = '';
        
        log(`騎手抽出開始`);
        
        // 斤量パターン（xx.x形式）を探してその直前行を騎手とする
        for (let i = 1; i < lines.length; i++) {
          const currentLine = lines[i].trim();
          
          // 斤量パターン（52.0のような数字.数字形式）
          if (currentLine.match(/^\d+\.?\d*$/) && parseFloat(currentLine) >= 48 && parseFloat(currentLine) <= 60) {
            // 前の行が騎手候補
            if (i > 0) {
              const prevLine = lines[i - 1].trim();
              
              // 騎手らしい条件：ひらがな・カタカナ・漢字で2-8文字（より広範囲の漢字を含む）
              if (prevLine.length >= 2 && prevLine.length <= 8 &&
                  prevLine.match(/^[ぁ-んァ-ヶー一-龯々\s]+$/) &&
                  !prevLine.includes('人気') &&
                  !prevLine.includes('着') &&
                  !prevLine.includes('頭') &&
                  !prevLine.includes('休養') &&
                  !prevLine.includes('kg') &&
                  !prevLine.includes('牝') &&
                  !prevLine.includes('牡') &&
                  !prevLine.includes('美浦') &&
                  !prevLine.includes('栗東') &&
                  !prevLine.includes('歳') &&
                  !prevLine.match(/^\d/)) {
                
                jockey = prevLine;
                log(`✅ 騎手発見（斤量前）行${i-1}: "${jockey}" (斤量: ${currentLine})`);
                break;
              }
            }
          }
        }
        
        log(`騎手最終結果: "${jockey || '未設定'}"`);
        
        // 騎手が見つからない場合の警告
        if (!jockey) {
          const warning = `ブロック${blockIndex + 1}: 騎手が見つかりませんでした`;
          log(warning);
          parseWarnings.push(warning);
        }
        
        // 5. 過去成績の抽出
        const pastRaces: any[] = [];
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
            
            // レース日付の行を検出（複数パターンに対応）
            let dateMatch = line.match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\S+)\s*(\d+)?/);
            let altDateMatch = line.match(/^(\d{4})\.(\d{2})\s+(\S+)(\d+)/);
            
            if (dateMatch || altDateMatch) {
              let raceDate, venue, raceNumber;
              
              if (altDateMatch) {
                // 2025.20 福島11 形式
                const year = altDateMatch[1];
                const monthDay = altDateMatch[2];
                const venueAndNumber = altDateMatch[3] + altDateMatch[4];
                
                // 福島11から競馬場名とレース番号を分離
                const venueMatch = venueAndNumber.match(/^(.+?)(\d+)$/);
                if (venueMatch) {
                  venue = venueMatch[1];
                  raceNumber = parseInt(venueMatch[2]);
                  // 月日の推定（通常は07.20のような形式になる）
                  raceDate = `${year}.07.${monthDay}`;
                }
              } else if (dateMatch) {
                // 2025.07.20 福島 11 形式
                raceDate = `${dateMatch[1]}.${dateMatch[2]}.${dateMatch[3]}`;
                venue = dateMatch[4];
                raceNumber = dateMatch[5] ? parseInt(dateMatch[5]) : null;
              }
              
              if (!raceDate || !venue) {
                i++;
                continue;
              }
              
              log(`レース検出: ${raceDate} ${venue}${raceNumber || ''}`);
              
              // 着順を探す（複数行を詳細に検索）
              let rank: number | null = null;
              for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
                const nextLine = lines[j];
                log(`  検索行${j}: "${nextLine}"`);
                
                // レース詳細行（着順含む）を検出
                const detailMatch = nextLine.match(/^(\d+)頭\s+(\d+)番\s+(\d+)人/);
                if (detailMatch) {
                  const horseCount = parseInt(detailMatch[1]);
                  const horseNumber = parseInt(detailMatch[2]);
                  const popularity = parseInt(detailMatch[3]);
                  log(`  ✅ 詳細発見: ${horseCount}頭 ${horseNumber}番 ${popularity}人気`);
                  
                  // この行以降で着順を探す
                  for (let k = j + 1; k < Math.min(j + 5, lines.length); k++) {
                    const positionLine = lines[k];
                    log(`    着順検索行${k}: "${positionLine}"`);
                    
                    // パターン1: 4つのポジション（11-11-11-11）
                    const fullPositionMatch = positionLine.match(/^(\d+)-(\d+)-(\d+)-(\d+)/);
                    if (fullPositionMatch) {
                      rank = parseInt(fullPositionMatch[4]);
                      log(`    ✅ 着順発見: ${rank}着 (4ポジション形式: ${positionLine})`);
                      break;
                    }
                    
                    // パターン2: 2つのポジション（14-13）
                    const shortPositionMatch = positionLine.match(/^(\d+)-(\d+)/);
                    if (shortPositionMatch) {
                      rank = parseInt(shortPositionMatch[2]);
                      log(`    ✅ 着順発見: ${rank}着 (2ポジション形式: ${positionLine})`);
                      break;
                    }
                    
                    // パターン3: 行の先頭が数字（単独着順）
                    const singleRankMatch = positionLine.match(/^(\d+)(?:\s|$)/);
                    if (singleRankMatch) {
                      const candidateRank = parseInt(singleRankMatch[1]);
                      // 1-18の範囲の数字のみ着順として認識
                      if (candidateRank >= 1 && candidateRank <= 18) {
                        rank = candidateRank;
                        log(`    ✅ 着順発見: ${rank}着 (単独数字形式: ${positionLine})`);
                        break;
                      }
                    }
                  }
                  
                  if (rank) break;
                }
                
                // 映像を見るで検索終了
                if (nextLine.includes('映像を見る')) {
                  log(`  検索終了: "映像を見る"を検出`);
                  break;
                }
              }
              
              // 着順の妥当性チェック
              if (rank && (rank < 1 || rank > 18)) {
                const warning = `ブロック${blockIndex + 1}: 異常な着順です（${rank}着）`;
                log(warning);
                parseWarnings.push(warning);
              }
              
              if (!rank) {
                log(`  着順が見つかりませんでした`);
                i++;
                continue;
              }
              
              // 距離・タイム・馬場状態を探す
              let distance: number | null = null;
              let time: number | null = null;
              let surface = 'turf';
              let condition = 'good';
              
              for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
                const detailLine = lines[j];
                
                // 距離とタイムの行を検出（複数パターンに対応）
                log(`    レース詳細検索: "${detailLine}"`);
                
                // パターン1: 芝1600(外) 1:36.8 良 形式
                let raceDetailMatch = detailLine.match(/^(障|芝|ダ)(\d+)(?:\([^)]+\))?\s+(\d+):(\d+)\.(\d+)\s+(.+)/);
                
                // パターン2: 芝2000 2:08.3 良 形式（従来）
                if (!raceDetailMatch) {
                  raceDetailMatch = detailLine.match(/^(障|芝|ダ)(\d+)\s+(\d+):(\d+)\.(\d+)\s+(.+)/);
                }
                
                if (raceDetailMatch) {
                  // 馬場種別
                  surface = raceDetailMatch[1] === 'ダ' ? 'dirt' : 'turf';
                  // 距離
                  distance = parseInt(raceDetailMatch[2]);
                  // タイム
                  const minutes = parseInt(raceDetailMatch[3]);
                  const seconds = parseInt(raceDetailMatch[4]);
                  const decimal = parseInt(raceDetailMatch[5]);
                  time = minutes * 60 + seconds + decimal / 10;
                  // 馬場状態
                  const conditionStr = raceDetailMatch[6];
                  if (conditionStr.includes('良')) condition = 'good';
                  else if (conditionStr.includes('稍重')) condition = 'slightly_heavy';
                  else if (conditionStr.includes('重')) condition = 'heavy';
                  else if (conditionStr.includes('不良')) condition = 'bad';
                  
                  log(`    ✅ レース詳細抽出成功: ${surface}${distance}m ${time}秒 ${condition}`);
                  break;
                } else {
                  log(`    ❌ レース詳細パターンマッチ失敗`);
                }
                
                // 映像を見るで終了
                if (detailLine.includes('映像を見る')) {
                  break;
                }
              }
              
              // 距離とタイムの妥当性チェック
              if (distance && (distance < 1000 || distance > 4000)) {
                const warning = `ブロック${blockIndex + 1}: 異常な距離です（${distance}m）`;
                log(warning);
                parseWarnings.push(warning);
              }
              
              if (time && (time < 60 || time > 600)) {
                const warning = `ブロック${blockIndex + 1}: 異常なタイムです（${time}秒）`;
                log(warning);
                parseWarnings.push(warning);
              }
              
              if (rank && distance && time) {
                pastRaces.push({
                  rank,
                  time,
                  distance,
                  surface,
                  condition
                });
                log(`  ✅ 過去成績追加: ${rank}着 ${surface}${distance}m ${time}秒 ${condition}`);
              } else {
                log(`  ❌ 過去成績スキップ: rank=${rank}, distance=${distance}, time=${time}`);
              }
            }
            i++;
          }
        }
        
        // 新馬戦判定：過去成績がない場合
        const isDebutant = pastRaces.length === 0;
        let trainerRating = 3; // デフォルト
        let jockeyRating = 3; // デフォルト
        let pedigreeRating = 3; // デフォルト
        
        if (isDebutant) {
          log(`新馬戦検出: ${horseName}`);
          
          // 新馬戦用の追加情報抽出
          const additionalInfo = extractDebutantInfo(lines, log);
          trainerRating = additionalInfo.trainerRating;
          jockeyRating = additionalInfo.jockeyRating;
          pedigreeRating = additionalInfo.pedigreeRating;
          
          log(`新馬戦評価 - 調教師:${trainerRating}, 騎手:${jockeyRating}, 血統:${pedigreeRating}`);
        }

        // データが揃っている場合のみ追加（新馬戦は過去成績なしでもOK）
        if (horseName && horseNumber && popularity && (pastRaces.length > 0 || isDebutant)) {
          const horseData = {
            name: horseName,
            number: horseNumber,
            jockey: jockey || '未設定',
            popularity: popularity,
            odds: odds || null,
            pastRaces: pastRaces.slice(0, 3), // 最大3走
            // 新馬戦用の追加フィールド
            isDebutant: isDebutant,
            trainerRating: trainerRating,
            jockeyRating: jockeyRating,
            pedigreeRating: pedigreeRating
          };
          
          // 馬データの検証
          const validation = validateHorseData(horseData);
          if (validation.warnings.length > 0) {
            parseWarnings.push(...validation.warnings.map(w => `${horseName}: ${w}`));
          }
          
          horses.push(horseData);
          log(`✅ 馬データ追加完了: ${horseName}`);
        } else {
          const error = `❌ データ不足でスキップ: 馬名=${horseName}, 馬番=${horseNumber}, 人気=${popularity}, 成績数=${pastRaces.length}`;
          log(error);
          parseErrors.push(error);
        }
        
      } catch (error) {
        const errorMsg = `ブロック${blockIndex + 1}解析エラー: ${error instanceof Error ? error.message : String(error)}`;
        console.log(errorMsg);
        parseErrors.push(errorMsg);
      }
    });
    
    log(`解析完了: ${horses.length}頭を抽出`);
    
    // 解析結果のサマリー
    const summary = {
      totalHorses: horses.length,
      errors: parseErrors,
      warnings: parseWarnings,
      success: horses.length > 0 && parseErrors.length === 0
    };
    
    // 重複馬番チェック
    const horseNumbers = horses.map(h => h.number);
    const duplicates = horseNumbers.filter((num, index) => horseNumbers.indexOf(num) !== index);
    if (duplicates.length > 0) {
      summary.errors.push(`重複した馬番があります: ${duplicates.join(', ')}`);
      summary.success = false;
    }
    
    return {
      horses,
      summary
    };
    
  } catch (error) {
    const errorMsg = `全体解析エラー: ${error instanceof Error ? error.message : String(error)}`;
    console.log(errorMsg);
    
    return {
      horses: [],
      summary: {
        totalHorses: 0,
        errors: [errorMsg],
        warnings: [],
        success: false
      }
    };
  }
};

// 新馬戦用の追加情報抽出関数
const extractDebutantInfo = (lines: string[], log: (message: string, data?: any) => void) => {
  let trainerRating = 3; // デフォルト評価
  let jockeyRating = 3;
  let pedigreeRating = 3;
  
  try {
    // 調教師情報の抽出（美浦・〇〇 または 栗東・〇〇 形式）
    let trainerInfo = '';
    let trainerLocation = '';
    
    for (const line of lines) {
      const trainerMatch = line.match(/(美浦|栗東)・(\S+)/);
      if (trainerMatch) {
        trainerLocation = trainerMatch[1];
        trainerInfo = trainerMatch[2];
        log(`調教師検出: ${trainerLocation}・${trainerInfo}`);
        break;
      }
    }
    
    // 調教師評価の簡易計算（名前ベース）
    if (trainerInfo) {
      // 有名調教師の簡易評価（実際のデータが必要な場合は別途実装）
      const topTrainers = ['藤沢', '友道', '安田', '国枝', '木村', '萩原', '堀', '音無', '池江', '矢作'];
      const goodTrainers = ['尾関', '松永', '萱野', '天間', '中舘', '牧', '金成', '勢司'];
      
      if (topTrainers.some(name => trainerInfo.includes(name))) {
        trainerRating = 5;
      } else if (goodTrainers.some(name => trainerInfo.includes(name))) {
        trainerRating = 4;
      } else {
        trainerRating = 3;
      }
      log(`調教師評価: ${trainerRating} (${trainerInfo})`);
    }
    
    // 騎手情報の抽出と評価
    let jockeyInfo = '';
    
    // 騎手名の検出（斤量の直前行）
    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i].trim();
      
      // 斤量パターン（52.0のような数字.数字形式）
      if (currentLine.match(/^\d+\.?\d*$/) && parseFloat(currentLine) >= 48 && parseFloat(currentLine) <= 60) {
        if (i > 0) {
          const prevLine = lines[i - 1].trim();
          
          // 騎手らしい条件（より広範囲の漢字を含む）
          if (prevLine.length >= 2 && prevLine.length <= 8 &&
              prevLine.match(/^[ぁ-んァ-ヶー一-龯々\s]+$/) &&
              !prevLine.includes('人気') && !prevLine.includes('着') &&
              !prevLine.includes('歳') && !prevLine.match(/^\d/)) {
            
            jockeyInfo = prevLine;
            log(`騎手検出: ${jockeyInfo}`);
            break;
          }
        }
      }
    }
    
    // 騎手評価の簡易計算（Sランク=5, Aランク=4, Bランク=3, Cランク=2）
    if (jockeyInfo) {
      const sRankJockeys = ['ルメール', '川田', '武豊'];
      const aRankJockeys = ['戸崎', '横山武', '松山', '坂井', '横山和', '池添'];
      const bRankJockeys = ['岩田康', '藤岡', '田辺', '三浦', '和田', '幸'];
      const cRankJockeys = ['菅原', '団野', '西村', '鮫島', '菱田', '岩田望', '津村', '大野', '北村'];
      
      if (sRankJockeys.some(name => jockeyInfo.includes(name))) {
        jockeyRating = 5;
      } else if (aRankJockeys.some(name => jockeyInfo.includes(name))) {
        jockeyRating = 4;
      } else if (bRankJockeys.some(name => jockeyInfo.includes(name))) {
        jockeyRating = 3;
      } else if (cRankJockeys.some(name => jockeyInfo.includes(name))) {
        jockeyRating = 2;
      } else {
        jockeyRating = 1; // 未分類騎手
      }
      log(`騎手評価: ${jockeyRating} (${jockeyInfo})`);
    }
    
    // 血統情報の抽出（父・母・母父の3行構成）
    let fatherName = '';
    let motherName = '';
    let maternalGrandfatherName = '';
    
    // 馬名の次の3行が血統情報
    let horseNameIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // 馬名らしい行を検出（カタカナ・ひらがな・アルファベットを含む2文字以上）
      if (line.length >= 2 && line.length <= 20 && 
          line.match(/[ァ-ヶーa-zA-Z]/) && 
          !line.includes('kg') && 
          !line.includes('人気') && 
          !line.includes('美浦') && 
          !line.includes('栗東') &&
          !line.match(/^\d/) &&
          !line.includes('--')) {
        horseNameIndex = i;
        break;
      }
    }
    
    if (horseNameIndex >= 0 && horseNameIndex + 3 < lines.length) {
      fatherName = lines[horseNameIndex + 1].trim();
      motherName = lines[horseNameIndex + 2].trim();
      maternalGrandfatherName = lines[horseNameIndex + 3].trim().replace(/[()]/g, '');
      
      log(`血統検出: 父=${fatherName}, 母=${motherName}, 母父=${maternalGrandfatherName}`);
      
      // 血統評価の簡易計算
      const topSires = ['キズナ', 'ディープインパクト', 'ロードカナロア', 'ハーツクライ', 'キンカメ', 
                       'ダイワメジャー', 'クロフネ', 'アグネスタキオン', 'ステイゴールド', 'ゼンノロブロイ'];
      const goodSires = ['キタサンブラック', 'ミッキーアイル', 'ビーチパトロール', 'シルバーステート', 'ルヴァンスレーヴ'];
      
      if (topSires.some(name => fatherName.includes(name))) {
        pedigreeRating = 5;
      } else if (goodSires.some(name => fatherName.includes(name))) {
        pedigreeRating = 4;
      } else {
        pedigreeRating = 3;
      }
      
      // 母系の実績も考慮（兄姉の戦績から）
      let familyBonus = 0;
      for (const line of lines) {
        if (line.includes('勝)') || line.includes('勝')) {
          // 勝利数を抽出
          const winMatch = line.match(/(\d+)勝/);
          if (winMatch) {
            const wins = parseInt(winMatch[1]);
            if (wins >= 3) familyBonus = 1;
            else if (wins >= 1) familyBonus = 0.5;
          }
        }
      }
      
      pedigreeRating = Math.min(5, pedigreeRating + familyBonus);
      log(`血統評価: ${pedigreeRating} (父=${fatherName}, 家族ボーナス=${familyBonus})`);
    }
    
  } catch (error) {
    log(`新馬戦情報抽出エラー: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return {
    trainerRating: Math.round(trainerRating),
    jockeyRating: Math.round(jockeyRating),
    pedigreeRating: Math.round(pedigreeRating)
  };
};