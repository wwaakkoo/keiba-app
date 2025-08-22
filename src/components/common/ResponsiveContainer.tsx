import React from 'react';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'mobile' | 'tablet' | 'desktop' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  maxWidth = 'mobile',
  padding = 'md'
}) => {
  const maxWidthClasses = {
    mobile: 'max-w-mobile',
    tablet: 'max-w-2xl',
    desktop: 'max-w-6xl',
    full: 'max-w-full'
  };

  const paddingClasses = {
    none: '',
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4'
  };

  return (
    <div className={`
      mx-auto w-full
      ${maxWidthClasses[maxWidth]}
      ${paddingClasses[padding]}
      ${className}
    `}>
      {children}
    </div>
  );
};

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
  className = ''
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };

  const getGridCols = () => {
    const { mobile = 1, tablet = 2, desktop = 3 } = columns;
    return `grid-cols-${mobile} md:grid-cols-${tablet} lg:grid-cols-${desktop}`;
  };

  return (
    <div className={`
      grid ${getGridCols()} ${gapClasses[gap]}
      ${className}
    `}>
      {children}
    </div>
  );
};

interface FlexLayoutProps {
  children: React.ReactNode;
  direction?: 'row' | 'col';
  responsive?: boolean;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  gap?: 'sm' | 'md' | 'lg';
  wrap?: boolean;
  className?: string;
}

export const FlexLayout: React.FC<FlexLayoutProps> = ({
  children,
  direction = 'row',
  responsive = false,
  align = 'start',
  justify = 'start',
  gap = 'md',
  wrap = false,
  className = ''
}) => {
  const directionClasses = responsive 
    ? `flex-col ${direction === 'row' ? 'md:flex-row' : 'md:flex-col'}`
    : `flex-${direction}`;

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch'
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around'
  };

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };

  return (
    <div className={`
      flex ${directionClasses}
      ${alignClasses[align]}
      ${justifyClasses[justify]}
      ${gapClasses[gap]}
      ${wrap ? 'flex-wrap' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
};

// カード用レスポンシブコンテナ
interface ResponsiveCardProps {
  children: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: boolean;
  border?: boolean;
  className?: string;
  onClick?: () => void;
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  padding = 'md',
  shadow = true,
  border = true,
  className = '',
  onClick
}) => {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4 md:p-6',
    lg: 'p-6 md:p-8'
  };

  return (
    <div 
      className={`
        bg-white rounded-lg
        ${paddingClasses[padding]}
        ${shadow ? 'shadow-sm md:shadow-md' : ''}
        ${border ? 'border border-gray-200' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};