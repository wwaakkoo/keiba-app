/**
 * パフォーマンス最適化ユーティリティ
 */
import { memo, useMemo, useCallback, useRef, useEffect, useState } from 'react';

/**
 * 深い比較を行うmemo用の比較関数
 */
export const deepCompare = (prevProps: any, nextProps: any): boolean => {
  return JSON.stringify(prevProps) === JSON.stringify(nextProps);
};

/**
 * 浅い比較を行うmemo用の比較関数
 */
export const shallowCompare = (prevProps: any, nextProps: any): boolean => {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);
  
  if (prevKeys.length !== nextKeys.length) {
    return false;
  }
  
  for (const key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }
  
  return true;
};

/**
 * 配列の比較関数
 */
export const arrayCompare = (prevArray: any[], nextArray: any[]): boolean => {
  if (prevArray.length !== nextArray.length) {
    return false;
  }
  
  return prevArray.every((item, index) => item === nextArray[index]);
};

/**
 * デバウンス処理のカスタムフック
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * スロットル処理のカスタムフック
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [callback, delay]
  );
};

/**
 * メモ化されたコンポーネント作成ヘルパー
 */
export const createMemoizedComponent = <P extends object>(
  Component: React.ComponentType<P>,
  compareFunction?: (prevProps: P, nextProps: P) => boolean
) => {
  return memo(Component, compareFunction);
};

/**
 * 重い計算処理のメモ化ヘルパー
 */
export const useMemoizedCalculation = <T>(
  calculation: () => T,
  dependencies: React.DependencyList
): T => {
  return useMemo(calculation, dependencies);
};

/**
 * コールバック関数のメモ化ヘルパー
 */
export const useMemoizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  dependencies: React.DependencyList
): T => {
  return useCallback(callback, dependencies);
};

/**
 * パフォーマンス測定ユーティリティ
 */
export const measurePerformance = (name: string, fn: () => void): void => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`${name}: ${end - start}ms`);
};

/**
 * レンダリング回数をカウントするフック（開発用）
 */
export const useRenderCount = (componentName: string): void => {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    console.log(`${componentName} rendered ${renderCount.current} times`);
  });
};