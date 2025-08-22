import React, { useRef, useState, useCallback } from 'react';

interface SwipeableCardProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

interface TouchState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  onSwipeLeft,
  onSwipeRight,
  threshold = 100,
  disabled = false,
  className = '',
  children
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [touchState, setTouchState] = useState<TouchState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isDragging: false
  });
  const [transform, setTransform] = useState('translateX(0px)');
  const [opacity, setOpacity] = useState(1);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    
    const touch = e.touches[0];
    setTouchState({
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      isDragging: true
    });
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || !touchState.isDragging) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchState.startX;
    const deltaY = touch.clientY - touchState.startY;
    
    // 縦スクロールを優先（縦の移動が横より大きい場合はスワイプを無効化）
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }
    
    // 横スワイプの場合は縦スクロールを防ぐ
    e.preventDefault();
    
    setTouchState(prev => ({
      ...prev,
      currentX: touch.clientX,
      currentY: touch.clientY
    }));
    
    // カードの移動とフェード効果
    const maxDistance = window.innerWidth * 0.3; // 画面幅の30%まで
    const clampedDelta = Math.max(-maxDistance, Math.min(maxDistance, deltaX));
    const opacityValue = 1 - Math.abs(clampedDelta) / maxDistance * 0.3;
    
    setTransform(`translateX(${clampedDelta}px) rotate(${clampedDelta * 0.1}deg)`);
    setOpacity(opacityValue);
  }, [disabled, touchState.isDragging, touchState.startX, touchState.startY]);

  const handleTouchEnd = useCallback(() => {
    if (disabled || !touchState.isDragging) return;
    
    const deltaX = touchState.currentX - touchState.startX;
    const deltaY = touchState.currentY - touchState.startY;
    
    // 縦スクロールが優先された場合は何もしない
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      setTouchState(prev => ({ ...prev, isDragging: false }));
      setTransform('translateX(0px)');
      setOpacity(1);
      return;
    }
    
    // スワイプ判定
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    
    // 元の位置に戻す
    setTouchState(prev => ({ ...prev, isDragging: false }));
    setTransform('translateX(0px)');
    setOpacity(1);
  }, [disabled, touchState, threshold, onSwipeLeft, onSwipeRight]);

  // マウスイベント対応（デスクトップでのテスト用）
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    
    setTouchState({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      isDragging: true
    });
  }, [disabled]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (disabled || !touchState.isDragging) return;
    
    const deltaX = e.clientX - touchState.startX;
    const maxDistance = window.innerWidth * 0.3;
    const clampedDelta = Math.max(-maxDistance, Math.min(maxDistance, deltaX));
    const opacityValue = 1 - Math.abs(clampedDelta) / maxDistance * 0.3;
    
    setTransform(`translateX(${clampedDelta}px) rotate(${clampedDelta * 0.1}deg)`);
    setOpacity(opacityValue);
    
    setTouchState(prev => ({
      ...prev,
      currentX: e.clientX,
      currentY: e.clientY
    }));
  }, [disabled, touchState.isDragging, touchState.startX]);

  const handleMouseUp = useCallback(() => {
    if (disabled || !touchState.isDragging) return;
    
    const deltaX = touchState.currentX - touchState.startX;
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    
    setTouchState(prev => ({ ...prev, isDragging: false }));
    setTransform('translateX(0px)');
    setOpacity(1);
  }, [disabled, touchState, threshold, onSwipeLeft, onSwipeRight]);

  const baseClasses = `
    touch-manipulation select-none cursor-grab
    transition-all duration-200 ease-out
    ${touchState.isDragging ? 'cursor-grabbing' : ''}
    ${className}
  `;

  return (
    <div
      ref={cardRef}
      className={baseClasses}
      style={{
        transform: touchState.isDragging ? transform : 'translateX(0px)',
        opacity: touchState.isDragging ? opacity : 1
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {children}
      
      {/* スワイプヒント表示 */}
      {(onSwipeLeft || onSwipeRight) && !disabled && (
        <div className="absolute top-2 right-2 text-xs text-gray-400 pointer-events-none">
          {onSwipeLeft && onSwipeRight ? '← → スワイプ' : 
           onSwipeLeft ? '← スワイプ' : 
           '→ スワイプ'}
        </div>
      )}
    </div>
  );
};