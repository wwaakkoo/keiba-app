import React, { useRef, useState, useCallback } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { usePinchGesture } from '@/hooks/useGestures';

interface ZoomableChartProps {
  data: any[];
  lines: Array<{
    dataKey: string;
    stroke: string;
    strokeWidth?: number;
    name?: string;
  }>;
  xAxisDataKey?: string;
  height?: number;
  className?: string;
}

export const ZoomableChart: React.FC<ZoomableChartProps> = ({
  data,
  lines,
  xAxisDataKey = 'name',
  height = 300,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  const handlePinchMove = useCallback((newScale: number) => {
    setScale(newScale);
  }, []);

  const handlePinchEnd = useCallback((finalScale: number) => {
    // スケールを適切な範囲に制限
    const clampedScale = Math.max(0.5, Math.min(3, finalScale));
    setScale(clampedScale);
  }, []);

  const pinchGesture = usePinchGesture({
    onPinchMove: handlePinchMove,
    onPinchEnd: handlePinchEnd,
    minScale: 0.5,
    maxScale: 3
  });

  // パン操作用の状態
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPoint = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handlePanStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (scale <= 1) return; // ズームしていない場合はパン無効
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setIsPanning(true);
    lastPanPoint.current = { x: clientX, y: clientY };
  }, [scale]);

  const handlePanMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isPanning || scale <= 1) return;
    
    e.preventDefault();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - lastPanPoint.current.x;
    const deltaY = clientY - lastPanPoint.current.y;
    
    setTranslateX(prev => prev + deltaX);
    setTranslateY(prev => prev + deltaY);
    
    lastPanPoint.current = { x: clientX, y: clientY };
  }, [isPanning, scale]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // リセット機能
  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  }, []);

  // ダブルタップでリセット
  const [lastTap, setLastTap] = useState(0);
  const handleDoubleTap = useCallback((_e: React.TouchEvent) => {
    const now = Date.now();
    const timeDiff = now - lastTap;
    
    if (timeDiff < 300 && timeDiff > 0) {
      resetZoom();
    }
    
    setLastTap(now);
  }, [lastTap, resetZoom]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* ズーム情報表示 */}
      {scale > 1 && (
        <div className="absolute top-2 right-2 z-10 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {Math.round(scale * 100)}%
        </div>
      )}
      
      {/* リセットボタン */}
      {scale > 1 && (
        <button
          onClick={resetZoom}
          className="absolute top-2 left-2 z-10 bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700 transition-colors"
        >
          リセット
        </button>
      )}

      {/* チャートコンテナ */}
      <div
        ref={containerRef}
        className="touch-manipulation select-none"
        style={{
          height: `${height}px`,
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.2s ease-out'
        }}
        {...pinchGesture}
        onTouchStart={(e) => {
          pinchGesture.onTouchStart(e);
          if (e.touches.length === 1) {
            handlePanStart(e);
            handleDoubleTap(e);
          }
        }}
        onTouchMove={(e) => {
          pinchGesture.onTouchMove(e);
          if (e.touches.length === 1) {
            handlePanMove(e);
          }
        }}
        onTouchEnd={(_e) => {
          pinchGesture.onTouchEnd();
          handlePanEnd();
        }}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey={xAxisDataKey} 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '12px'
              }}
            />
            {lines.map((line, index) => (
              <Line
                key={index}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.stroke}
                strokeWidth={line.strokeWidth || 2}
                name={line.name || line.dataKey}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 操作ヒント */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        {scale <= 1 ? (
          'ピンチでズーム、ダブルタップでリセット'
        ) : (
          'ドラッグで移動、ダブルタップでリセット'
        )}
      </div>
    </div>
  );
};