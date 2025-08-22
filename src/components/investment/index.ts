// 投資管理コンポーネントのエクスポート
export { InvestmentManager } from './InvestmentManager';
export { BetRecordForm } from './BetRecordForm';
export { InvestmentList } from './InvestmentList';
export { ProfitLossReport } from './ProfitLossReport';
export { PerformanceMetricsComponent } from './PerformanceMetrics';
export { InvestmentLimitSettings } from './InvestmentLimitSettings';
export { RiskAlerts, InvestmentCheck } from './RiskAlerts';

// 投資管理関連のサービスとタイプ
export { investmentLimitService } from '@/services/investmentLimitService';
export { investmentPerformanceService } from '@/services/investmentPerformanceService';
export { investmentRepository } from '@/services/repositories/InvestmentRepository';

export type { 
  Investment, 
  InvestmentStats, 
  InvestmentLimits,
  InvestmentPerformance,
  BetTypeStats 
} from '@/types/investment';

export type { 
  LimitCheckResult, 
  RiskAlert 
} from '@/services/investmentLimitService';

export type { 
  PerformanceMetrics 
} from '@/services/investmentPerformanceService';