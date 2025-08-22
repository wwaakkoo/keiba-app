import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, X, Settings, TrendingDown, Calendar, Target } from 'lucide-react';
import { investmentLimitService, RiskAlert, LimitCheckResult } from '@/services/investmentLimitService';
import { TouchOptimizedButton } from '@/components/common/TouchOptimizedButton';

interface RiskAlertsProps {
  onOpenSettings?: () => void;
  className?: string;
}

interface LimitUsage {
  daily: { used: number; limit: number; percentage: number };
  weekly: { used: number; limit: number; percentage: number };
  monthly: { used: number; limit: number; percentage: number };
}

export const RiskAlerts: React.FC<RiskAlertsProps> = ({
  onOpenSettings,
  className = ''
}) => {
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [limitUsage, setLimitUsage] = useState<LimitUsage | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    // 定期的にアラートを更新（5分間隔）
    const interval = setInterval(loadAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      const [alertsData, usageData] = await Promise.all([
        investmentLimitService.getRiskAlerts(),
        investmentLimitService.getLimitUsage()
      ]);
      
      setAlerts(alertsData);
      setLimitUsage(usageData);
    } catch (error) {
      console.error('リスクアラート読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissAlert = (alertType: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertType]));
  };

  const getAlertIcon = (type: RiskAlert['type']) => {
    switch (type) {
      case 'daily_limit':
      case 'weekly_limit':
      case 'monthly_limit':
        return <Calendar className="w-5 h-5" />;
      case 'max_bet':
        return <Target className="w-5 h-5" />;
      case 'stop_loss':
        return <TrendingDown className="w-5 h-5" />;
      case 'consecutive_loss':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getAlertColor = (severity: RiskAlert['severity']) => {
    switch (severity) {
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'danger':
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  const getIconColor = (severity: RiskAlert['severity']) => {
    switch (severity) {
      case 'info':
        return 'text-blue-600';
      case 'warning':
        return 'text-yellow-600';
      case 'danger':
        return 'text-red-600';
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getUsageBarColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // 表示するアラートをフィルタリング
  const visibleAlerts = alerts.filter(alert => 
    !dismissedAlerts.has(alert.type) && alert.action !== 'continue'
  );

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600">チェック中...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* アクティブなアラート */}
      {visibleAlerts.length > 0 && (
        <div className="space-y-3">
          {visibleAlerts.map((alert, index) => (
            <div
              key={`${alert.type}-${index}`}
              className={`border rounded-lg p-4 ${getAlertColor(alert.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={getIconColor(alert.severity)}>
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <div className="mt-2 text-xs">
                      <span>現在: {formatCurrency(alert.currentValue)}</span>
                      <span className="mx-2">•</span>
                      <span>制限: {formatCurrency(alert.limitValue)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => dismissAlert(alert.type)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 制限使用状況 */}
      {limitUsage && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900 flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              投資制限使用状況
            </h3>
            {onOpenSettings && (
              <TouchOptimizedButton
                variant="secondary"
                size="sm"
                onClick={onOpenSettings}
              >
                <Settings className="w-3 h-3 mr-1" />
                設定
              </TouchOptimizedButton>
            )}
          </div>

          <div className="space-y-3">
            {/* 日次制限 */}
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>日次制限</span>
                <span>{formatCurrency(limitUsage.daily.used)} / {formatCurrency(limitUsage.daily.limit)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageBarColor(limitUsage.daily.percentage)}`}
                  style={{ width: `${Math.min(limitUsage.daily.percentage, 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {limitUsage.daily.percentage.toFixed(1)}% 使用
              </div>
            </div>

            {/* 週次制限 */}
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>週次制限</span>
                <span>{formatCurrency(limitUsage.weekly.used)} / {formatCurrency(limitUsage.weekly.limit)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageBarColor(limitUsage.weekly.percentage)}`}
                  style={{ width: `${Math.min(limitUsage.weekly.percentage, 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {limitUsage.weekly.percentage.toFixed(1)}% 使用
              </div>
            </div>

            {/* 月次制限 */}
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>月次制限</span>
                <span>{formatCurrency(limitUsage.monthly.used)} / {formatCurrency(limitUsage.monthly.limit)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageBarColor(limitUsage.monthly.percentage)}`}
                  style={{ width: `${Math.min(limitUsage.monthly.percentage, 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {limitUsage.monthly.percentage.toFixed(1)}% 使用
              </div>
            </div>
          </div>
        </div>
      )}

      {/* アラートがない場合 */}
      {visibleAlerts.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <Shield className="w-5 h-5 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-green-800">
                投資制限内で安全に運用中
              </p>
              <p className="text-xs text-green-600 mt-1">
                現在、リスクアラートはありません
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 投資前チェック用のコンポーネント
interface InvestmentCheckProps {
  amount: number;
  onResult: (result: LimitCheckResult) => void;
  children: React.ReactNode;
}

export const InvestmentCheck: React.FC<InvestmentCheckProps> = ({
  amount,
  onResult,
  children
}) => {
  const [isChecking, setIsChecking] = useState(false);

  const handleCheck = async () => {
    if (amount <= 0) {
      onResult({
        allowed: false,
        reason: '投資額を入力してください',
        currentAmount: 0,
        limitAmount: 0,
        remainingAmount: 0,
        warningLevel: 'blocked'
      });
      return;
    }

    try {
      setIsChecking(true);
      const result = await investmentLimitService.checkInvestmentLimit(amount);
      onResult(result);
    } catch (error) {
      console.error('投資制限チェックエラー:', error);
      onResult({
        allowed: false,
        reason: 'チェック中にエラーが発生しました',
        currentAmount: 0,
        limitAmount: 0,
        remainingAmount: 0,
        warningLevel: 'blocked'
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div onClick={handleCheck} className={isChecking ? 'opacity-50 pointer-events-none' : ''}>
      {children}
    </div>
  );
};