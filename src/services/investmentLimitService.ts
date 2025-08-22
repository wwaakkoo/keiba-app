import { InvestmentLimits } from '@/types/investment';
import { investmentRepository } from './repositories/InvestmentRepository';

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  currentAmount: number;
  limitAmount: number;
  remainingAmount: number;
  warningLevel: 'none' | 'warning' | 'danger' | 'blocked';
}

export interface RiskAlert {
  type: 'daily_limit' | 'weekly_limit' | 'monthly_limit' | 'max_bet' | 'stop_loss' | 'consecutive_loss';
  severity: 'info' | 'warning' | 'danger';
  message: string;
  currentValue: number;
  limitValue: number;
  action: 'continue' | 'warning' | 'block';
}

const DEFAULT_LIMITS: InvestmentLimits = {
  dailyLimit: 10000,
  weeklyLimit: 50000,
  monthlyLimit: 200000,
  maxBetAmount: 5000,
  riskLevel: 'moderate',
  autoStop: false,
  stopLossAmount: 50000
};

export class InvestmentLimitService {
  private static readonly STORAGE_KEY = 'investment_limits';

  /**
   * 投資制限設定を取得
   */
  static getLimits(): InvestmentLimits {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const limits = JSON.parse(stored);
        return { ...DEFAULT_LIMITS, ...limits };
      }
    } catch (error) {
      console.error('投資制限設定読み込みエラー:', error);
    }
    return DEFAULT_LIMITS;
  }

  /**
   * 投資制限設定を保存
   */
  static saveLimits(limits: InvestmentLimits): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(limits));
    } catch (error) {
      console.error('投資制限設定保存エラー:', error);
      throw new Error('投資制限設定の保存に失敗しました');
    }
  }

  /**
   * 投資可能かチェック
   */
  static async checkInvestmentLimit(amount: number): Promise<LimitCheckResult> {
    const limits = this.getLimits();
    
    // 単発投資額チェック
    if (amount > limits.maxBetAmount) {
      return {
        allowed: false,
        reason: `1回の投資上限額（${this.formatCurrency(limits.maxBetAmount)}）を超えています`,
        currentAmount: amount,
        limitAmount: limits.maxBetAmount,
        remainingAmount: 0,
        warningLevel: 'blocked'
      };
    }

    // 日次制限チェック
    const todayTotal = await investmentRepository.getTotalInvestmentToday();
    const dailyRemaining = limits.dailyLimit - todayTotal;
    
    if (todayTotal + amount > limits.dailyLimit) {
      return {
        allowed: false,
        reason: `日次投資上限額（${this.formatCurrency(limits.dailyLimit)}）を超えます`,
        currentAmount: todayTotal + amount,
        limitAmount: limits.dailyLimit,
        remainingAmount: Math.max(0, dailyRemaining),
        warningLevel: 'blocked'
      };
    }

    // 週次制限チェック
    const weekTotal = await investmentRepository.getTotalInvestmentThisWeek();
    const weeklyRemaining = limits.weeklyLimit - weekTotal;
    
    if (weekTotal + amount > limits.weeklyLimit) {
      return {
        allowed: false,
        reason: `週次投資上限額（${this.formatCurrency(limits.weeklyLimit)}）を超えます`,
        currentAmount: weekTotal + amount,
        limitAmount: limits.weeklyLimit,
        remainingAmount: Math.max(0, weeklyRemaining),
        warningLevel: 'blocked'
      };
    }

    // 月次制限チェック
    const monthTotal = await investmentRepository.getTotalInvestmentThisMonth();
    const monthlyRemaining = limits.monthlyLimit - monthTotal;
    
    if (monthTotal + amount > limits.monthlyLimit) {
      return {
        allowed: false,
        reason: `月次投資上限額（${this.formatCurrency(limits.monthlyLimit)}）を超えます`,
        currentAmount: monthTotal + amount,
        limitAmount: limits.monthlyLimit,
        remainingAmount: Math.max(0, monthlyRemaining),
        warningLevel: 'blocked'
      };
    }

    // 警告レベルの判定
    let warningLevel: LimitCheckResult['warningLevel'] = 'none';
    const dailyUsageRate = (todayTotal + amount) / limits.dailyLimit;
    const weeklyUsageRate = (weekTotal + amount) / limits.weeklyLimit;
    const monthlyUsageRate = (monthTotal + amount) / limits.monthlyLimit;

    if (dailyUsageRate >= 0.9 || weeklyUsageRate >= 0.9 || monthlyUsageRate >= 0.9) {
      warningLevel = 'danger';
    } else if (dailyUsageRate >= 0.7 || weeklyUsageRate >= 0.7 || monthlyUsageRate >= 0.7) {
      warningLevel = 'warning';
    }

    return {
      allowed: true,
      currentAmount: Math.max(todayTotal + amount, weekTotal + amount, monthTotal + amount),
      limitAmount: Math.min(limits.dailyLimit, limits.weeklyLimit, limits.monthlyLimit),
      remainingAmount: Math.min(dailyRemaining, weeklyRemaining, monthlyRemaining),
      warningLevel
    };
  }

  /**
   * リスクアラートを取得
   */
  static async getRiskAlerts(): Promise<RiskAlert[]> {
    const limits = this.getLimits();
    const alerts: RiskAlert[] = [];

    try {
      // 現在の投資状況を取得
      const todayTotal = await investmentRepository.getTotalInvestmentToday();
      const weekTotal = await investmentRepository.getTotalInvestmentThisWeek();
      const monthTotal = await investmentRepository.getTotalInvestmentThisMonth();

      // 日次制限アラート
      const dailyUsageRate = todayTotal / limits.dailyLimit;
      if (dailyUsageRate >= 0.8) {
        alerts.push({
          type: 'daily_limit',
          severity: dailyUsageRate >= 0.95 ? 'danger' : 'warning',
          message: `本日の投資額が上限の${(dailyUsageRate * 100).toFixed(0)}%に達しています`,
          currentValue: todayTotal,
          limitValue: limits.dailyLimit,
          action: dailyUsageRate >= 0.95 ? 'block' : 'warning'
        });
      }

      // 週次制限アラート
      const weeklyUsageRate = weekTotal / limits.weeklyLimit;
      if (weeklyUsageRate >= 0.8) {
        alerts.push({
          type: 'weekly_limit',
          severity: weeklyUsageRate >= 0.95 ? 'danger' : 'warning',
          message: `今週の投資額が上限の${(weeklyUsageRate * 100).toFixed(0)}%に達しています`,
          currentValue: weekTotal,
          limitValue: limits.weeklyLimit,
          action: weeklyUsageRate >= 0.95 ? 'block' : 'warning'
        });
      }

      // 月次制限アラート
      const monthlyUsageRate = monthTotal / limits.monthlyLimit;
      if (monthlyUsageRate >= 0.8) {
        alerts.push({
          type: 'monthly_limit',
          severity: monthlyUsageRate >= 0.95 ? 'danger' : 'warning',
          message: `今月の投資額が上限の${(monthlyUsageRate * 100).toFixed(0)}%に達しています`,
          currentValue: monthTotal,
          limitValue: limits.monthlyLimit,
          action: monthlyUsageRate >= 0.95 ? 'block' : 'warning'
        });
      }

      // 損失制限アラート（自動停止が有効な場合）
      if (limits.autoStop) {
        const stats = await investmentRepository.calculateStats();
        if (Math.abs(stats.totalProfit) >= limits.stopLossAmount && stats.totalProfit < 0) {
          alerts.push({
            type: 'stop_loss',
            severity: 'danger',
            message: `損失額が設定した上限（${this.formatCurrency(limits.stopLossAmount)}）に達しました`,
            currentValue: Math.abs(stats.totalProfit),
            limitValue: limits.stopLossAmount,
            action: 'block'
          });
        }
      }

      // 連続損失アラート
      const recentInvestments = await investmentRepository.getRecentInvestments(10);
      const consecutiveLosses = this.getConsecutiveLosses(recentInvestments);
      
      if (consecutiveLosses >= 5) {
        alerts.push({
          type: 'consecutive_loss',
          severity: consecutiveLosses >= 8 ? 'danger' : 'warning',
          message: `${consecutiveLosses}回連続で損失が発生しています`,
          currentValue: consecutiveLosses,
          limitValue: 5,
          action: consecutiveLosses >= 8 ? 'block' : 'warning'
        });
      }

    } catch (error) {
      console.error('リスクアラート取得エラー:', error);
    }

    return alerts;
  }

  /**
   * リスクレベルに基づく推奨設定を取得
   */
  static getRecommendedLimits(riskLevel: InvestmentLimits['riskLevel']): Partial<InvestmentLimits> {
    switch (riskLevel) {
      case 'conservative':
        return {
          dailyLimit: 5000,
          weeklyLimit: 25000,
          monthlyLimit: 100000,
          maxBetAmount: 2000,
          autoStop: true,
          stopLossAmount: 20000
        };
      case 'moderate':
        return {
          dailyLimit: 10000,
          weeklyLimit: 50000,
          monthlyLimit: 200000,
          maxBetAmount: 5000,
          autoStop: true,
          stopLossAmount: 50000
        };
      case 'aggressive':
        return {
          dailyLimit: 20000,
          weeklyLimit: 100000,
          monthlyLimit: 400000,
          maxBetAmount: 10000,
          autoStop: false,
          stopLossAmount: 100000
        };
      default:
        return DEFAULT_LIMITS;
    }
  }

  /**
   * 投資制限をリセット
   */
  static resetLimits(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('投資制限設定リセットエラー:', error);
    }
  }

  /**
   * 制限使用状況を取得
   */
  static async getLimitUsage(): Promise<{
    daily: { used: number; limit: number; percentage: number };
    weekly: { used: number; limit: number; percentage: number };
    monthly: { used: number; limit: number; percentage: number };
  }> {
    const limits = this.getLimits();
    
    const todayTotal = await investmentRepository.getTotalInvestmentToday();
    const weekTotal = await investmentRepository.getTotalInvestmentThisWeek();
    const monthTotal = await investmentRepository.getTotalInvestmentThisMonth();

    return {
      daily: {
        used: todayTotal,
        limit: limits.dailyLimit,
        percentage: (todayTotal / limits.dailyLimit) * 100
      },
      weekly: {
        used: weekTotal,
        limit: limits.weeklyLimit,
        percentage: (weekTotal / limits.weeklyLimit) * 100
      },
      monthly: {
        used: monthTotal,
        limit: limits.monthlyLimit,
        percentage: (monthTotal / limits.monthlyLimit) * 100
      }
    };
  }

  /**
   * 連続損失回数を計算
   */
  private static getConsecutiveLosses(investments: any[]): number {
    let count = 0;
    for (const investment of investments) {
      if (investment.profit < 0) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  /**
   * 通貨フォーマット
   */
  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(amount);
  }
}

export const investmentLimitService = InvestmentLimitService;