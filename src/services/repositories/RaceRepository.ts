import { db } from '../database';
import { Race, RaceSearchCriteria } from '@/types/race';
import { v4 as uuidv4 } from 'uuid';

export interface RaceRepository {
  create(race: Omit<Race, 'id' | 'createdAt' | 'updatedAt'>): Promise<Race>;
  findById(id: string): Promise<Race | null>;
  findByDate(date: string): Promise<Race[]>;
  findByVenue(venue: string): Promise<Race[]>;
  update(id: string, updates: Partial<Race>): Promise<Race>;
  delete(id: string): Promise<void>;
  search(criteria: RaceSearchCriteria): Promise<Race[]>;
  getAll(): Promise<Race[]>;
  getRecent(limit?: number): Promise<Race[]>;
  exists(id: string): Promise<boolean>;
  count(): Promise<number>;
}

export class RaceRepositoryImpl implements RaceRepository {
  async create(raceData: Omit<Race, 'id' | 'createdAt' | 'updatedAt'>): Promise<Race> {
    try {
      const race: Race = {
        ...raceData,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.races.add(race);
      return race;
    } catch (error) {
      console.error('レース作成エラー:', error);
      throw new Error('レースの作成に失敗しました');
    }
  }

  async findById(id: string): Promise<Race | null> {
    try {
      const race = await db.races.get(id);
      return race || null;
    } catch (error) {
      console.error('レース取得エラー:', error);
      return null;
    }
  }

  async findByDate(date: string): Promise<Race[]> {
    try {
      return await db.races
        .where('date')
        .equals(date)
        .sortBy('raceNumber');
    } catch (error) {
      console.error('日付別レース取得エラー:', error);
      return [];
    }
  }

  async findByVenue(venue: string): Promise<Race[]> {
    try {
      return await db.races
        .where('venue')
        .equals(venue)
        .reverse()
        .sortBy('date');
    } catch (error) {
      console.error('競馬場別レース取得エラー:', error);
      return [];
    }
  }

  async update(id: string, updates: Partial<Race>): Promise<Race> {
    try {
      const existingRace = await this.findById(id);
      if (!existingRace) {
        throw new Error('更新対象のレースが見つかりません');
      }

      const updatedRace: Race = {
        ...existingRace,
        ...updates,
        id, // IDは変更不可
        updatedAt: new Date()
      };

      await db.races.put(updatedRace);
      return updatedRace;
    } catch (error) {
      console.error('レース更新エラー:', error);
      throw new Error('レースの更新に失敗しました');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await db.races.delete(id);
      // 削除の確認
      const exists = await db.races.get(id);
      if (exists) {
        throw new Error('削除対象のレースが見つかりません');
      }
    } catch (error) {
      console.error('レース削除エラー:', error);
      throw new Error('レースの削除に失敗しました');
    }
  }

  async search(criteria: RaceSearchCriteria): Promise<Race[]> {
    try {
      let query = db.races.toCollection();

      // 競馬場でフィルタ
      if (criteria.venue) {
        query = query.filter(race => race.venue === criteria.venue);
      }

      // 馬場でフィルタ
      if (criteria.surface) {
        query = query.filter(race => race.surface === criteria.surface);
      }

      // 距離でフィルタ
      if (criteria.distance) {
        query = query.filter(race => race.distance === criteria.distance);
      }

      // グレードでフィルタ
      if (criteria.grade) {
        query = query.filter(race => race.grade === criteria.grade);
      }

      // 日付範囲でフィルタ
      if (criteria.dateFrom || criteria.dateTo) {
        query = query.filter(race => {
          const raceDate = race.date;
          if (criteria.dateFrom && raceDate < criteria.dateFrom) return false;
          if (criteria.dateTo && raceDate > criteria.dateTo) return false;
          return true;
        });
      }

      const results = await query.reverse().sortBy('date');
      return results;
    } catch (error) {
      console.error('レース検索エラー:', error);
      return [];
    }
  }

  async getAll(): Promise<Race[]> {
    try {
      return await db.races.orderBy('date').reverse().toArray();
    } catch (error) {
      console.error('全レース取得エラー:', error);
      return [];
    }
  }

  async getRecent(limit: number = 10): Promise<Race[]> {
    try {
      return await db.races
        .orderBy('createdAt')
        .reverse()
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('最近のレース取得エラー:', error);
      return [];
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const race = await db.races.get(id);
      return !!race;
    } catch (error) {
      console.error('レース存在確認エラー:', error);
      return false;
    }
  }

  async count(): Promise<number> {
    try {
      return await db.races.count();
    } catch (error) {
      console.error('レース数取得エラー:', error);
      return 0;
    }
  }

  // バッチ操作
  async createMany(races: Omit<Race, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Race[]> {
    try {
      const racesWithIds: Race[] = races.map(race => ({
        ...race,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await db.races.bulkAdd(racesWithIds);
      return racesWithIds;
    } catch (error) {
      console.error('レース一括作成エラー:', error);
      throw new Error('レースの一括作成に失敗しました');
    }
  }

  async deleteMany(ids: string[]): Promise<void> {
    try {
      await db.races.bulkDelete(ids);
    } catch (error) {
      console.error('レース一括削除エラー:', error);
      throw new Error('レースの一括削除に失敗しました');
    }
  }

  // 統計情報
  async getVenueStats(): Promise<Array<{ venue: string; count: number }>> {
    try {
      const races = await db.races.toArray();
      const venueMap = new Map<string, number>();
      
      races.forEach(race => {
        const count = venueMap.get(race.venue) || 0;
        venueMap.set(race.venue, count + 1);
      });

      return Array.from(venueMap.entries()).map(([venue, count]) => ({
        venue,
        count
      })).sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('競馬場統計取得エラー:', error);
      return [];
    }
  }
}

// シングルトンインスタンス
export const raceRepository = new RaceRepositoryImpl();