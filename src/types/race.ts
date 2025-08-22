// 過去レース情報の型定義
export interface PastRace {
  rank: number;
  time: number;
  distance: number;
  surface: 'turf' | 'dirt';
  condition: 'good' | 'slightly_heavy' | 'heavy' | 'bad';
}

// 馬の情報の型定義
export interface Horse {
  name: string;
  number: number;
  jockey: string;
  popularity: number;
  odds: number | null;
  pastRaces: PastRace[];
  age?: number;
  sex?: 'male' | 'female' | 'gelding';
  weight?: number;
  trainer?: string;
  owner?: string;
  breeding?: string;
  // 新馬戦用の追加フィールド
  isDebutant?: boolean; // 新馬フラグ
  trainerRating?: number; // 調教師評価（1-5）
  jockeyRating?: number; // 騎手評価（1-5）
  pedigreeRating?: number; // 血統評価（1-5）
}

// レース情報の型定義
export interface Race {
  id: string;
  date: string;
  venue: string;
  raceNumber: number;
  distance: number;
  surface: 'turf' | 'dirt';
  condition: 'good' | 'slightly_heavy' | 'heavy' | 'bad';
  horses: Horse[];
  grade?: 'G1' | 'G2' | 'G3' | 'Listed' | 'Open';
  prizeMoney?: number;
  weather?: string;
  createdAt: Date;
  updatedAt: Date;
}

// レース検索条件の型定義
export interface RaceSearchCriteria {
  venue?: string;
  surface?: 'turf' | 'dirt';
  distance?: number;
  dateFrom?: string;
  dateTo?: string;
  grade?: 'G1' | 'G2' | 'G3' | 'Listed' | 'Open';
}

// レース情報（予想計算用）の型定義
export interface RaceInfo {
  distance: number;
  surface: 'turf' | 'dirt';
  condition: 'good' | 'slightly_heavy' | 'heavy' | 'bad';
}