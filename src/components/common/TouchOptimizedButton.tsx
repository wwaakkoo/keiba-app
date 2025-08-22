import React from 'react';
import { LucideIcon } from 'lucide-react';

interface TouchOptimizedButtonProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  haptic?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children: React.ReactNode;
  onClick?: (e?: React.MouseEvent) => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const TouchOptimizedButton: React.FC<TouchOptimizedButtonProps> = ({
  size = 'md',
  variant = 'primary',
  haptic = false,
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  onClick,
  className = '',
  type = 'button'
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (disabled || loading) return;
    
    // ハプティックフィードバック（対応デバイスのみ）
    if (haptic && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    // onClickが提供されている場合のみ実行
    if (onClick) {
      onClick(e);
    }
  };

  // サイズ設定（最小44pxタッチターゲット）
  const sizeClasses = {
    sm: 'min-h-[44px] px-4 py-2 text-sm',
    md: 'min-h-[48px] px-6 py-3 text-base',
    lg: 'min-h-[52px] px-8 py-4 text-lg'
  };

  // バリアント設定
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 active:bg-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-md',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200'
  };

  const baseClasses = `
    inline-flex items-center justify-center gap-2 
    font-medium rounded-lg transition-all duration-150 
    touch-manipulation select-none
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-95
    ${fullWidth ? 'w-full' : ''}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${disabled || loading ? 'pointer-events-none' : ''}
    ${className}
  `;

  return (
    <button
      className={baseClasses}
      onClick={handleClick}
      disabled={disabled || loading}
      type={type}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
          読み込み中...
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />}
          {children}
          {Icon && iconPosition === 'right' && <Icon size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />}
        </>
      )}
    </button>
  );
};