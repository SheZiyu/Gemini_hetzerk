'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Switch } from '@/components/ui/switch';

export interface PAESelection {
  startResidue: number;
  endResidue: number;
  alignedStart: number;
  alignedEnd: number;
}

interface PAEHeatmapProps {
  paeData: number[][];
  chainBoundaries?: number[];
  size?: number;
  onResidueHover?: (residue1: number | null, residue2: number | null) => void;
  onResidueClick?: (residue1: number, residue2: number) => void;
  onSelectionChange?: (selection: PAESelection | null) => void;
  selectedRange?: PAESelection | null;
}

const PAE_COLORS = [
  '#0a5e1a', '#1a7a2e', '#2d9642', '#4ab058', '#6bc96e',
  '#8ede84', '#b3f09c', '#d9f7b6', '#f0fce0', '#ffffff'
];

const PAEHeatmap: React.FC<PAEHeatmapProps> = ({
  paeData,
  chainBoundaries = [],
  size = 280,
  onResidueHover,
  onResidueClick,
  onSelectionChange,
  selectedRange = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showChainBorders, setShowChainBorders] = useState(true);

  // Selection state - coordinates are in canvas space (0 to size)
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);

  const numResidues = paeData.length;

  const getColor = useCallback((value: number): string => {
    const normalizedValue = Math.min(30, Math.max(0, value)) / 30;
    const colorIndex = Math.min(Math.floor(normalizedValue * PAE_COLORS.length), PAE_COLORS.length - 1);
    return PAE_COLORS[colorIndex];
  }, []);

  const imageData = useMemo(() => {
    if (numResidues === 0 || typeof window === 'undefined') return null;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = numResidues;
      canvas.height = numResidues;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const imgData = ctx.createImageData(numResidues, numResidues);

      for (let i = 0; i < numResidues; i++) {
        for (let j = 0; j < numResidues; j++) {
          const value = paeData[i]?.[j] ?? 0;
          const color = getColor(value);
          const idx = (i * numResidues + j) * 4;

          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);

          imgData.data[idx] = r;
          imgData.data[idx + 1] = g;
          imgData.data[idx + 2] = b;
          imgData.data[idx + 3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);
      return canvas;
    } catch (e) {
      console.error('Error creating PAE image data:', e);
      return null;
    }
  }, [paeData, numResidues, getColor]);

  // Get current selection bounds (normalized)
  const getSelectionBounds = useCallback(() => {
    if (!selectionStart || !selectionEnd) return null;

    const minX = Math.min(selectionStart.x, selectionEnd.x);
    const maxX = Math.max(selectionStart.x, selectionEnd.x);
    const minY = Math.min(selectionStart.y, selectionEnd.y);
    const maxY = Math.max(selectionStart.y, selectionEnd.y);

    return { minX, maxX, minY, maxY };
  }, [selectionStart, selectionEnd]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(imageData, 0, 0, size, size);

    // Draw chain borders
    if (showChainBorders && chainBoundaries.length > 0) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.lineWidth = 1;

      chainBoundaries.forEach(boundary => {
        const pos = (boundary / numResidues) * size;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(size, pos);
        ctx.stroke();
      });
    }

    // Draw selection rectangle (during drag or from selectedRange prop)
    const bounds = getSelectionBounds();
    const displayBounds = bounds || (selectedRange ? {
      minX: (selectedRange.startResidue - 1) / numResidues * size,
      maxX: selectedRange.endResidue / numResidues * size,
      minY: (selectedRange.alignedStart - 1) / numResidues * size,
      maxY: selectedRange.alignedEnd / numResidues * size,
    } : null);

    if (displayBounds) {
      const { minX, maxX, minY, maxY } = displayBounds;

      // Semi-transparent overlay outside selection
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      // Top
      ctx.fillRect(0, 0, size, minY);
      // Bottom
      ctx.fillRect(0, maxY, size, size - maxY);
      // Left
      ctx.fillRect(0, minY, minX, maxY - minY);
      // Right
      ctx.fillRect(maxX, minY, size - maxX, maxY - minY);

      // Selection border
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

      // Corner handles
      ctx.fillStyle = '#3b82f6';
      const handleSize = 6;
      ctx.fillRect(minX - handleSize/2, minY - handleSize/2, handleSize, handleSize);
      ctx.fillRect(maxX - handleSize/2, minY - handleSize/2, handleSize, handleSize);
      ctx.fillRect(minX - handleSize/2, maxY - handleSize/2, handleSize, handleSize);
      ctx.fillRect(maxX - handleSize/2, maxY - handleSize/2, handleSize, handleSize);
    }
  }, [imageData, size, showChainBorders, chainBoundaries, numResidues, getSelectionBounds, selectedRange]);

  // Convert mouse event to canvas coordinates (0 to size) and residue indices
  const getPositionFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || numResidues === 0) return null;

    const rect = canvas.getBoundingClientRect();
    const pixelX = e.clientX - rect.left;
    const pixelY = e.clientY - rect.top;

    // Convert to canvas coordinate space (0 to size)
    const canvasX = (pixelX / rect.width) * size;
    const canvasY = (pixelY / rect.height) * size;

    // Calculate residue indices
    const residueX = Math.floor((canvasX / size) * numResidues);
    const residueY = Math.floor((canvasY / size) * numResidues);

    if (residueX >= 0 && residueX < numResidues && residueY >= 0 && residueY < numResidues) {
      return { canvasX, canvasY, residueX, residueY };
    }
    return null;
  }, [numResidues, size]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPositionFromEvent(e);
    if (!pos) return;

    setIsSelecting(true);
    // Store canvas-space coordinates
    setSelectionStart({ x: pos.canvasX, y: pos.canvasY });
    setSelectionEnd({ x: pos.canvasX, y: pos.canvasY });
  }, [getPositionFromEvent]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPositionFromEvent(e);

    if (isSelecting && pos) {
      // Update selection end with canvas-space coordinates
      setSelectionEnd({ x: pos.canvasX, y: pos.canvasY });
    }

    if (pos && !isSelecting) {
      onResidueHover?.(pos.residueX + 1, pos.residueY + 1);
    }
  }, [isSelecting, getPositionFromEvent, onResidueHover]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !selectionStart) return;

    const pos = getPositionFromEvent(e);
    setIsSelecting(false);

    if (pos) {
      const startCanvasX = selectionStart.x;
      const startCanvasY = selectionStart.y;
      const endCanvasX = pos.canvasX;
      const endCanvasY = pos.canvasY;

      // Check if it's a click (not a drag) - use canvas coordinates
      const dragDistance = Math.sqrt(
        Math.pow(endCanvasX - startCanvasX, 2) + Math.pow(endCanvasY - startCanvasY, 2)
      );

      if (dragDistance < 5) {
        // It's a click - clear selection
        setSelectionStart(null);
        setSelectionEnd(null);
        onSelectionChange?.(null);
        onResidueClick?.(pos.residueX + 1, pos.residueY + 1);
      } else {
        // It's a drag - create selection using canvas coordinates
        const minCanvasX = Math.min(startCanvasX, endCanvasX);
        const maxCanvasX = Math.max(startCanvasX, endCanvasX);
        const minCanvasY = Math.min(startCanvasY, endCanvasY);
        const maxCanvasY = Math.max(startCanvasY, endCanvasY);

        // Convert canvas coordinates to residue numbers
        const startResidue = Math.floor((minCanvasX / size) * numResidues) + 1;
        const endResidue = Math.ceil((maxCanvasX / size) * numResidues);
        const alignedStart = Math.floor((minCanvasY / size) * numResidues) + 1;
        const alignedEnd = Math.ceil((maxCanvasY / size) * numResidues);

        const selection: PAESelection = {
          startResidue: Math.max(1, startResidue),
          endResidue: Math.min(numResidues, endResidue),
          alignedStart: Math.max(1, alignedStart),
          alignedEnd: Math.min(numResidues, alignedEnd),
        };

        onSelectionChange?.(selection);
      }
    }
  }, [isSelecting, selectionStart, getPositionFromEvent, size, numResidues, onSelectionChange, onResidueClick]);

  const handleMouseLeave = useCallback(() => {
    onResidueHover?.(null, null);

    if (isSelecting) {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  }, [onResidueHover, isSelecting]);

  const handleClearSelection = useCallback(() => {
    setSelectionStart(null);
    setSelectionEnd(null);
    onSelectionChange?.(null);
  }, [onSelectionChange]);

  if (numResidues === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-400">
        No PAE data available
      </div>
    );
  }

  // 生成坐标轴刻度
  const generateTicks = (max: number, count: number = 5): number[] => {
    const ticks: number[] = [1];
    const step = Math.ceil(max / count);
    for (let i = 1; i <= count; i++) {
      const tick = Math.min(step * i, max);
      if (tick !== ticks[ticks.length - 1]) {
        ticks.push(tick);
      }
    }
    return ticks;
  };

  const yTicks = generateTicks(numResidues, 5);
  const xTicks = generateTicks(numResidues, 5);

  return (
    <div className="flex flex-col gap-2">
      {/* PAE 热图主体 */}
      <div className="flex">
        {/* Y 轴标签 */}
        <div className="flex items-center justify-center w-5 shrink-0">
          <span
            className="text-[9px] text-gray-500 whitespace-nowrap font-medium"
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
            }}
          >
            Aligned Residue
          </span>
        </div>

        {/* Y 轴刻度 */}
        <div className="flex flex-col justify-between shrink-0 pr-1" style={{ height: size }}>
          {yTicks.map((tick) => (
            <span key={tick} className="text-[8px] text-gray-400 font-mono text-right w-6">
              {tick}
            </span>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex flex-col">
          <canvas
            ref={canvasRef}
            width={size}
            height={size}
            className="cursor-crosshair border border-gray-300 rounded select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          />

          {/* X 轴刻度 */}
          <div className="flex justify-between mt-1" style={{ width: size }}>
            {xTicks.map((tick) => (
              <span key={tick} className="text-[8px] text-gray-400 font-mono">
                {tick}
              </span>
            ))}
          </div>

          {/* X 轴标签 */}
          <div className="text-[9px] text-gray-500 text-center mt-0.5 font-medium" style={{ width: size }}>
            Scored Residue
          </div>
        </div>
      </div>

      {/* 控制栏 */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Switch
            checked={showChainBorders}
            onCheckedChange={setShowChainBorders}
            className="scale-75"
          />
          <span className="text-gray-600 text-[10px]">Chain Borders</span>
        </div>

        {(selectedRange || selectionStart) && (
          <button
            onClick={handleClearSelection}
            className="text-blue-600 hover:text-blue-800 text-[10px] underline"
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* 颜色图例 */}
      <div>
        <div className="h-2.5 rounded-sm flex overflow-hidden">
          {PAE_COLORS.map((color, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: color }} />
          ))}
        </div>
        <div className="flex justify-between text-[8px] text-gray-400 mt-0.5 px-0.5">
          <span>0</span>
          <span>5</span>
          <span>10</span>
          <span>15</span>
          <span>20</span>
          <span>25</span>
          <span>30</span>
        </div>
        <div className="text-[8px] text-gray-400 text-center">
          Expected Position Error (Å)
        </div>
      </div>
    </div>
  );
};

export default PAEHeatmap;
