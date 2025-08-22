import React, { useState, useRef, useEffect } from 'react';
import { useLongPress } from '@/hooks/useGestures';

interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  items,
  children,
  disabled = false,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const showMenu = () => {
    if (disabled) return;
    
    // ハプティックフィードバック
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    setIsVisible(true);
  };

  const hideMenu = () => {
    setIsVisible(false);
  };

  const longPress = useLongPress({
    onLongPress: showMenu,
    delay: 500,
    moveThreshold: 10
  });

  // メニュー位置の調整
  useEffect(() => {
    if (isVisible && triggerRef.current && menuRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x = triggerRect.left + triggerRect.width / 2;
      let y = triggerRect.bottom + 8;

      // 右端からはみ出る場合は左に調整
      if (x + menuRect.width / 2 > viewportWidth - 16) {
        x = viewportWidth - menuRect.width / 2 - 16;
      }
      
      // 左端からはみ出る場合は右に調整
      if (x - menuRect.width / 2 < 16) {
        x = menuRect.width / 2 + 16;
      }

      // 下端からはみ出る場合は上に表示
      if (y + menuRect.height > viewportHeight - 16) {
        y = triggerRect.top - menuRect.height - 8;
      }

      setPosition({ x, y });
    }
  }, [isVisible]);

  // 外部クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        hideMenu();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isVisible]);

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return;
    
    item.action();
    hideMenu();
  };

  return (
    <>
      {/* トリガー要素 */}
      <div
        ref={triggerRef}
        className={`${className} ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
        {...longPress}
      >
        {children}
      </div>

      {/* コンテキストメニュー */}
      {isVisible && (
        <>
          {/* オーバーレイ */}
          <div 
            className="fixed inset-0 z-40 bg-black/20"
            onClick={hideMenu}
          />
          
          {/* メニュー本体 */}
          <div
            ref={menuRef}
            className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[160px] animate-fade-in"
            style={{
              left: position.x - 80, // メニュー幅の半分で中央揃え
              top: position.y,
              transformOrigin: 'top center'
            }}
          >
            {items.map((item, index) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                className={`
                  w-full px-4 py-3 text-left flex items-center gap-3 text-sm
                  transition-colors duration-150 min-h-touch
                  ${item.disabled 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : item.destructive
                      ? 'text-red-600 hover:bg-red-50 active:bg-red-100'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }
                  ${index === 0 ? 'rounded-t-lg' : ''}
                  ${index === items.length - 1 ? 'rounded-b-lg' : ''}
                `}
              >
                {item.icon && (
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    {item.icon}
                  </span>
                )}
                <span className="flex-1">{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
};

// プリセットコンテキストメニュー
interface QuickActionsMenuProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onCopy?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const QuickActionsMenu: React.FC<QuickActionsMenuProps> = ({
  onEdit,
  onDelete,
  onShare,
  onCopy,
  children,
  className = ''
}) => {
  const items: ContextMenuItem[] = [
    ...(onEdit ? [{
      id: 'edit',
      label: '編集',
      icon: <span>✏️</span>,
      action: onEdit
    }] : []),
    ...(onCopy ? [{
      id: 'copy',
      label: 'コピー',
      icon: <span>📋</span>,
      action: onCopy
    }] : []),
    ...(onShare ? [{
      id: 'share',
      label: '共有',
      icon: <span>📤</span>,
      action: onShare
    }] : []),
    ...(onDelete ? [{
      id: 'delete',
      label: '削除',
      icon: <span>🗑️</span>,
      action: onDelete,
      destructive: true
    }] : [])
  ];

  if (items.length === 0) {
    return <>{children}</>;
  }

  return (
    <ContextMenu items={items} className={className}>
      {children}
    </ContextMenu>
  );
};