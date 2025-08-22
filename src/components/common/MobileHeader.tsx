import React from 'react';
import { ArrowLeft, Menu, MoreVertical } from 'lucide-react';
import { TouchOptimizedButton } from './TouchOptimizedButton';

interface MobileHeaderProps {
  title: string;
  showBackButton?: boolean;
  showMenuButton?: boolean;
  showMoreButton?: boolean;
  onBack?: () => void;
  onMenu?: () => void;
  onMore?: () => void;
  rightContent?: React.ReactNode;
  className?: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  showBackButton = false,
  showMenuButton = false,
  showMoreButton = false,
  onBack,
  onMenu,
  onMore,
  rightContent,
  className = ''
}) => {
  return (
    <header className={`
      sticky top-0 z-50 bg-white border-b border-gray-200 
      shadow-sm backdrop-blur-sm bg-white/95
      ${className}
    `}>
      <div className="flex items-center justify-between px-4 py-3 min-h-[56px]">
        {/* 左側：戻るボタンまたはメニューボタン */}
        <div className="flex items-center">
          {showBackButton && onBack && (
            <TouchOptimizedButton
              size="sm"
              variant="ghost"
              icon={ArrowLeft}
              onClick={onBack}
              className="mr-2 p-2 min-w-[44px]"
              haptic
            >
              <span className="sr-only">戻る</span>
            </TouchOptimizedButton>
          )}
          
          {showMenuButton && onMenu && !showBackButton && (
            <TouchOptimizedButton
              size="sm"
              variant="ghost"
              icon={Menu}
              onClick={onMenu}
              className="mr-2 p-2 min-w-[44px]"
              haptic
            >
              <span className="sr-only">メニュー</span>
            </TouchOptimizedButton>
          )}
        </div>

        {/* 中央：タイトル */}
        <div className="flex-1 text-center">
          <h1 className="text-lg font-semibold text-gray-900 truncate px-4">
            {title}
          </h1>
        </div>

        {/* 右側：カスタムコンテンツまたはMoreボタン */}
        <div className="flex items-center">
          {rightContent}
          
          {showMoreButton && onMore && !rightContent && (
            <TouchOptimizedButton
              size="sm"
              variant="ghost"
              icon={MoreVertical}
              onClick={onMore}
              className="ml-2 p-2 min-w-[44px]"
              haptic
            >
              <span className="sr-only">その他</span>
            </TouchOptimizedButton>
          )}
        </div>
      </div>
    </header>
  );
};

// プリセットヘッダーコンポーネント
export const HomeHeader: React.FC<{
  onMenu?: () => void;
  rightContent?: React.ReactNode;
}> = ({ onMenu, rightContent }) => (
  <MobileHeader
    title="🏇 競馬予想アプリ"
    showMenuButton={!!onMenu}
    onMenu={onMenu}
    rightContent={rightContent}
  />
);

export const BackHeader: React.FC<{
  title: string;
  onBack: () => void;
  rightContent?: React.ReactNode;
}> = ({ title, onBack, rightContent }) => (
  <MobileHeader
    title={title}
    showBackButton
    onBack={onBack}
    rightContent={rightContent}
  />
);

export const DetailHeader: React.FC<{
  title: string;
  onBack: () => void;
  onMore?: () => void;
}> = ({ title, onBack, onMore }) => (
  <MobileHeader
    title={title}
    showBackButton
    showMoreButton={!!onMore}
    onBack={onBack}
    onMore={onMore}
  />
);