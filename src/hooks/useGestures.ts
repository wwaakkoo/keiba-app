import { useRef, useCallback, useState } from 'react';

interface GestureState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  isActive: boolean;
}

interface SwipeGestureOptions {
  threshold?: number;
  timeThreshold?: number;
  preventScroll?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export const useSwipeGesture = (options: SwipeGestureOptions = {}) => {
  const {
    threshold = 50,
    timeThreshold = 300,
    preventScroll = false,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown
  } = options;

  const gestureState = useRef<GestureState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    startTime: 0,
    isActive: false
  });

  const handleTouchStart = useCallback((e: TouchEvent | React.TouchEvent) => {
    const touch = e.touches[0];
    gestureState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      startTime: Date.now(),
      isActive: true
    };
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent | React.TouchEvent) => {
    if (!gestureState.current.isActive) return;

    const touch = e.touches[0];
    gestureState.current.currentX = touch.clientX;
    gestureState.current.currentY = touch.clientY;

    if (preventScroll) {
      const deltaX = Math.abs(touch.clientX - gestureState.current.startX);
      const deltaY = Math.abs(touch.clientY - gestureState.current.startY);
      
      // 横スワイプが優勢な場合は縦スクロールを防ぐ
      if (deltaX > deltaY && deltaX > 10) {
        e.preventDefault();
      }
    }
  }, [preventScroll]);

  const handleTouchEnd = useCallback(() => {
    if (!gestureState.current.isActive) return;

    const { startX, startY, currentX, currentY, startTime } = gestureState.current;
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;
    const deltaTime = Date.now() - startTime;

    gestureState.current.isActive = false;

    // 時間制限チェック
    if (deltaTime > timeThreshold) return;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // スワイプ判定
    if (absDeltaX > threshold || absDeltaY > threshold) {
      if (absDeltaX > absDeltaY) {
        // 横スワイプ
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        // 縦スワイプ
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    }
  }, [threshold, timeThreshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
};

interface PinchGestureOptions {
  onPinchStart?: (scale: number) => void;
  onPinchMove?: (scale: number, delta: number) => void;
  onPinchEnd?: (scale: number) => void;
  minScale?: number;
  maxScale?: number;
}

export const usePinchGesture = (options: PinchGestureOptions = {}) => {
  const {
    onPinchStart,
    onPinchMove,
    onPinchEnd,
    minScale = 0.5,
    maxScale = 3
  } = options;

  const [isPinching, setIsPinching] = useState(false);
  const initialDistance = useRef<number>(0);
  const currentScale = useRef<number>(1);

  const getDistance = (touch1: Touch | React.Touch, touch2: Touch | React.Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: TouchEvent | React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsPinching(true);
      initialDistance.current = getDistance(e.touches[0], e.touches[1]);
      onPinchStart?.(currentScale.current);
    }
  }, [onPinchStart]);

  const handleTouchMove = useCallback((e: TouchEvent | React.TouchEvent) => {
    if (!isPinching || e.touches.length !== 2) return;

    e.preventDefault();
    
    const distance = getDistance(e.touches[0], e.touches[1]);
    const scale = Math.max(minScale, Math.min(maxScale, distance / initialDistance.current));
    const delta = scale - currentScale.current;
    
    currentScale.current = scale;
    onPinchMove?.(scale, delta);
  }, [isPinching, minScale, maxScale, onPinchMove]);

  const handleTouchEnd = useCallback(() => {
    if (isPinching) {
      setIsPinching(false);
      onPinchEnd?.(currentScale.current);
    }
  }, [isPinching, onPinchEnd]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    isPinching,
    currentScale: currentScale.current
  };
};

interface LongPressOptions {
  onLongPress: () => void;
  delay?: number;
  moveThreshold?: number;
}

export const useLongPress = (options: LongPressOptions) => {
  const { onLongPress, delay = 500, moveThreshold = 10 } = options;
  
  const timeoutRef = useRef<number>();
  const startPosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPressed, setIsPressed] = useState(false);

  const start = useCallback((e: TouchEvent | React.TouchEvent | MouseEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    startPosition.current = { x: clientX, y: clientY };
    setIsPressed(true);

    timeoutRef.current = window.setTimeout(() => {
      onLongPress();
      setIsPressed(false);
    }, delay);
  }, [onLongPress, delay]);

  const move = useCallback((e: TouchEvent | React.TouchEvent | MouseEvent | React.MouseEvent) => {
    if (!isPressed) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = Math.abs(clientX - startPosition.current.x);
    const deltaY = Math.abs(clientY - startPosition.current.y);

    if (deltaX > moveThreshold || deltaY > moveThreshold) {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      setIsPressed(false);
    }
  }, [isPressed, moveThreshold]);

  const end = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    setIsPressed(false);
  }, []);

  return {
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: end,
    onMouseDown: start,
    onMouseMove: move,
    onMouseUp: end,
    onMouseLeave: end,
    isPressed
  };
};