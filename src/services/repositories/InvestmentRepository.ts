import { db } from '../database';
import { Investment, InvestmentStats, BetTypeStats } from '@/types/investment';
import { v4 as uuidv4 } from 'uuid';

export interface StatsCriteria {
  startDate?: Date;
  endDate?: Date;
  betType?: Investment['betType'];
  venue?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface InvestmentRepository {
  record(investment: Omit<Investment, 'id'>): Promise<string>;
  findById(id: string): Promise<Investment | null>;
  getByPeriod(start: Date, end: Date): Promise<Investment[]>;
  getByRaceId(raceId: string): Promise<Investment[]>;
  calculateStats(criteria?: StatsCriteria): Promise<InvestmentStats>;
  getBetTypeStats(criteria?: StatsCriteria): Promise<BetTypeStats[]>;
  export(format: 'csv' | 'json'): Promise<Blob>;
  delete(id: string): Promise<void>;
  update(id: string, updates: Partial<Investment>): Promise<Investment>;
  getRecentInvestments(limit?: number): Promise<Investment[]>;
  getTotalInvestmentToday(): Promise<number>;
  getTotalInvestmentThisWeek(): Promise<number>;
  getTotalInvestmentThisMonth(): Promise<number>;
}

export class InvestmentRepositoryImpl implements InvestmentRepository {
  async record(investmentData: Omit<Investment, 'id'>): Promise<string> {
    try {
      const investment: Investment = {
        ...investmentData,
        id: uuidv4(),
        timestamp: investmentData.timestamp || new Date()
      };

      await db.investments.add(investment);
      return investment.id;
    } catch (error) {
      console.error('投資記録エラー:', error);
      throw new Error('投資記録の保存に失敗しました');
    }
  }

  async findById(id: string): Promise<Investment | null> {
    try {
      const investment = await db.investments.get(id);
      return investment || null;
    } catch (error) {
      console.error('投資取得エラー:', error);
      return null;
    }
  }

  async getByPeriod(start: Date, end: Date): Promise<Investment[]> {
    try {
      return await db.investments
        .where('timestamp')
        .between(start, end)
        .reverse()
        .sortBy('timestamp');
    } catch (error) {
      console.error('期間別投資取得エラー:', error);
      return [];
    }
  }

  async getByRaceId(raceId: string): Promise<Investment[]> {
    try {
      return await db.investments
        .where('raceId')
        .equals(raceId)
        .reverse()
        .sortBy('timestamp');
    } catch (error) {
      console.error('レース別投資取得エラー:', error);
      return [];
    }
  }

  async calculateStats(criteria: StatsCriteria = {}): Promise<InvestmentStats> {
    try {
      let query = db.investments.toCollection();

      // フィルタ条件の適用
      if (criteria.startDate || criteria.endDate) {
        const start = criteria.startDate || new Date(0);
        const end = criteria.endDate || new Date();
        query = query.filter(inv => inv.timestamp >= start && inv.timestamp <= end);
      }

      if (criteria.betType) {
        query = query.filter(inv => inv.betType === criteria.betType);
      }

      if (criteria.venue) {
        query = query.filter(inv => inv.venue === criteria.venue);
      }

      if (criteria.minAmount !== undefined) {
        query = query.filter(inv => inv.amount >= criteria.minAmount!);
      }

      if (criteria.maxAmount !== undefined) {
        query = query.filter(inv => inv.amount <= criteria.maxAmount!);
      }

      const investments = await query.toArray();

      if (investments.length === 0) {
        return {
          totalInvestment: 0,
          totalPayout: 0,
          totalProfit: 0,
          returnRate: 0,
          winRate: 0,
          averageOdds: 0,
          bestWin: 0,
          worstLoss: 0,
          totalBets: 0,
          winningBets: 0,
          losingBets: 0
        };
      }

      const totalInvestment = investments.reduce((sum, inv) => sum + inv.amount, 0);
      const totalPayout = investments.reduce((sum, inv) => sum + inv.payout, 0);
      const totalProfit = investments.reduce((sum, inv) => sum + inv.profit, 0);
      const returnRate = totalInvestment > 0 ? (totalPayout / totalInvestment) * 100 : 0;
      
      const winningBets = investments.filter(inv => inv.profit > 0).length;
      const losingBets = investments.filter(inv => inv.profit < 0).length;
      const winRate = investments.length > 0 ? (winningBets / investments.length) * 100 : 0;
      
      const totalOdds = investments.reduce((sum, inv) => sum + inv.odds, 0);
      const averageOdds = investments.length > 0 ? totalOdds / investments.length : 0;
      
      const profits = investments.map(inv => inv.profit);
      const bestWin = profits.length > 0 ? Math.max(...profits) : 0;
      const worstLoss = profits.length > 0 ? Math.min(...profits) : 0;

      return {
        totalInvestment,
        totalPayout,
        totalProfit,
        returnRate,
        winRate,
        averageOdds,
        bestWin,
        worstLoss,
        totalBets: investments.length,
        winningBets,
        losingBets
      };
    } catch (error) {
      console.error('投資統計計算エラー:', error);
      throw new Error('投資統計の計算に失敗しました');
    }
  }

  async getBetTypeStats(criteria: StatsCriteria = {}): Promise<BetTypeStats[]> {
    try {
      let query = db.investments.toCollection();

      // 基本フィルタの適用（券種以外）
      if (criteria.startDate || criteria.endDate) {
        const start = criteria.startDate || new Date(0);
        const end = criteria.endDate || new Date();
        query = query.filter(inv => inv.timestamp >= start && inv.timestamp <= end);
      }

      if (criteria.venue) {
        query = query.filter(inv => inv.venue === criteria.venue);
      }

      const investments = await query.toArray();
      
      // 券種別にグループ化
      const betTypeMap = new Map<Investment['betType'], Investment[]>();
      investments.forEach(inv => {
        if (!betTypeMap.has(inv.betType)) {
          betTypeMap.set(inv.betType, []);
        }
        betTypeMap.get(inv.betType)!.push(inv);
      });

      const betTypeStats: BetTypeStats[] = [];
      
      for (const [betType, typeInvestments] of betTypeMap) {
        const count = typeInvestments.length;
        const totalInvestment = typeInvestments.reduce((sum, inv) => sum + inv.amount, 0);
        const totalPayout = typeInvestments.reduce((sum, inv) => sum + inv.payout, 0);
        const profit = typeInvestments.reduce((sum, inv) => sum + inv.profit, 0);
        const returnRate = totalInvestment > 0 ? (totalPayout / totalInvestment) * 100 : 0;
        const winningBets = typeInvestments.filter(inv => inv.profit > 0).length;
        const winRate = count > 0 ? (winningBets / count) * 100 : 0;
        const totalOdds = typeInvestments.reduce((sum, inv) => sum + inv.odds, 0);
        const averageOdds = count > 0 ? totalOdds / count : 0;

        betTypeStats.push({
          betType,
          count,
          totalInvestment,
          totalPayout,
          profit,
          returnRate,
          winRate,
          averageOdds
        });
      }

      return betTypeStats.sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('券種別統計取得エラー:', error);
      return [];
    }
  }

  async export(format: 'csv' | 'json'): Promise<Blob> {
    try {
      const investments = await db.investments.orderBy('timestamp').reverse().toArray();

      if (format === 'json') {
        const jsonData = JSON.stringify(investments, null, 2);
        return new Blob([jsonData], { type: 'application/json' });
      } else {
        // CSV形式
        const headers = [
          'ID', '日時', 'レースID', '予想ID', '券種', '買い目', 
          '投資額', 'オッズ', '払戻', '損益', '競馬場', 'レース番号', 'レース日'
        ];
        
        const csvRows = [headers.join(',')];
        
        investments.forEach(inv => {
          const row = [
            inv.id,
            inv.timestamp.toISOString(),
            inv.raceId,
            inv.predictionId,
            inv.betType,
            inv.selections.join('-'),
            inv.amount,
            inv.odds,
            inv.payout,
            inv.profit,
            inv.venue || '',
            inv.raceNumber || '',
            inv.raceDate || ''
          ];
          csvRows.push(row.join(','));
        });

        const csvData = csvRows.join('\n');
        return new Blob([csvData], { type: 'text/csv;charset=utf-8' });
      }
    } catch (error) {
      console.error('データエクスポートエラー:', error);
      throw new Error('データのエクスポートに失敗しました');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const deleteCount = await db.investments.delete(id);
      if (deleteCount === 0) {
        throw new Error('削除対象の投資記録が見つかりません');
      }
    } catch (error) {
      console.error('投資記録削除エラー:', error);
      throw new Error('投資記録の削除に失敗しました');
    }
  }

  async update(id: string, updates: Partial<Investment>): Promise<Investment> {
    try {
      const existingInvestment = await this.findById(id);
      if (!existingInvestment) {
        throw new Error('更新対象の投資記録が見つかりません');
      }

      const updatedInvestment: Investment = {
        ...existingInvestment,
        ...updates,
        id // IDは変更不可
      };

      await db.investments.put(updatedInvestment);
      return updatedInvestment;
    } catch (error) {
      console.error('投資記録更新エラー:', error);
      throw new Error('投資記録の更新に失敗しました');
    }
  }

  async getRecentInvestments(limit: number = 20): Promise<Investment[]> {
    try {
      return await db.investments
        .orderBy('timestamp')
        .reverse()
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('最近の投資取得エラー:', error);
      return [];
    }
  }

  async getTotalInvestmentToday(): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayInvestments = await this.getByPeriod(today, tomorrow);
      return todayInvestments.reduce((sum, inv) => sum + inv.amount, 0);
    } catch (error) {
      console.error('今日の投資額取得エラー:', error);
      return 0;
    }
  }

  async getTotalInvestmentThisWeek(): Promise<number> {
    try {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const weekInvestments = await this.getByPeriod(startOfWeek, now);
      return weekInvestments.reduce((sum, inv) => sum + inv.amount, 0);
    } catch (error) {
      console.error('今週の投資額取得エラー:', error);
      return 0;
    }
  }

  async getTotalInvestmentThisMonth(): Promise<number> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const monthInvestments = await this.getByPeriod(startOfMonth, now);
      return monthInvestments.reduce((sum, inv) => sum + inv.amount, 0);
    } catch (error) {
      console.error('今月の投資額取得エラー:', error);
      return 0;
    }
  }

  // バッチ操作
  async recordMany(investments: Omit<Investment, 'id'>[]): Promise<string[]> {
    try {
      const investmentsWithIds: Investment[] = investments.map(investment => ({
        ...investment,
        id: uuidv4(),
        timestamp: investment.timestamp || new Date()
      }));

      await db.investments.bulkAdd(investmentsWithIds);
      return investmentsWithIds.map(inv => inv.id);
    } catch (error) {
      console.error('投資一括記録エラー:', error);
      throw new Error('投資の一括記録に失敗しました');
    }
  }

  async deleteMany(ids: string[]): Promise<void> {
    try {
      await db.investments.bulkDelete(ids);
    } catch (error) {
      console.error('投資一括削除エラー:', error);
      throw new Error('投資の一括削除に失敗しました');
    }
  }
}

// シングルトンインスタンス
export const investmentRepository = new InvestmentRepositoryImpl();