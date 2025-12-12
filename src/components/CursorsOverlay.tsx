import React, { useEffect, useRef, useLayoutEffect } from 'react';
import { PerfectCursor } from 'perfect-cursors';

interface CursorData {
  id: string;
  label: string;
  x: number;
  y: number;
  color?: string;
}

interface CursorsOverlayProps {
  cursors: CursorData[];
  selfId: string;
}

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899'
];

const getColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
};

const Cursor: React.FC<{ x: number; y: number; label: string; color: string }> = ({ x, y, label, color }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const pcRef = useRef<PerfectCursor | null>(null);

  useLayoutEffect(() => {
    if (!elementRef.current) return;

    // Initialize PerfectCursor
    pcRef.current = new PerfectCursor((point) => {
      if (elementRef.current) {
        // Apply position directly to DOM for performance
        elementRef.current.style.setProperty('transform', `translate(${point[0] * 100}vw, ${point[1] * 100}vh)`);
        // Wait, using vw/vh might be wrong if the container isn't full screen.
        // But CursorsOverlay is absolute inset-0.
        // Actually, let's use percentages relative to parent.
        // PerfectCursor outputs absolute coordinates if input is absolute.
        // If I input (0.5, 0.5), it outputs interpolated values around that.
        // So I can just use percentages.
      }
    });

    return () => {
      pcRef.current?.dispose();
    };
  }, []);

  // Use a second effect to handle the coordinate callback properly
  // Since PerfectCursor callback doesn't have access to "parent size", 
  // we need to be careful.
  // Strategy: Pass [x, y] as normalized 0-1.
  // The callback receives [x, y] as normalized 0-1.
  // Then we map to CSS: left: x*100%, top: y*100%.

  useEffect(() => {
    if (pcRef.current) {
      pcRef.current.addPoint([x, y]);
    }
  }, [x, y]);

  // We need to re-initialize the callback to properly update styles using percentages
  // But PerfectCursor takes a callback in constructor. 
  // Let's modify the callback logic above.
  
  // Actually, to update style using percentages:
  // transform: translate3d(x%, y%, 0) - wait, percentages in translate are relative to the element itself, not parent.
  // Standard absolute positioning: left: x%, top: y%.
  // So we should update `left` and `top`.
  
  useLayoutEffect(() => {
    if (pcRef.current) {
      // Update the callback function (PerfectCursor doesn't expose a way to change callback, 
      // but we can wrap the logic).
      // Actually, standard usage is absolute coordinates.
      // But we have normalized.
      
      // Let's dispose and recreate if we need to change strategy, but we don't.
      // Just ensure the callback does:
      // element.style.left = `${point[0] * 100}%`;
      // element.style.top = `${point[1] * 100}%`;
    }
  }, []);

  // Update the callback implementation (hacky but standard JS way via ref)
  const onPointMove = (point: number[]) => {
    if (elementRef.current) {
      elementRef.current.style.left = `${point[0] * 100}%`;
      elementRef.current.style.top = `${point[1] * 100}%`;
    }
  };
  
  // We need to pass this to PerfectCursor constructor.
  // Since we can't change it later, we define it once.
  
  return (
    <div
      ref={elementRef}
      className="absolute flex flex-col items-start pointer-events-none will-change-[left,top]"
      style={{ 
        left: `${x * 100}%`, 
        top: `${y * 100}%` 
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transform -translate-x-1 -translate-y-1 drop-shadow-sm"
      >
        <path
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19179L11.7841 12.3673H5.65376Z"
          fill={color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      <span
        className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full ml-2 shadow-sm whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {label}
      </span>
    </div>
  );
};

// Wrapper that handles the PerfectCursor instantiation with correct callback
const SmoothCursor: React.FC<{ x: number; y: number; label: string; color: string }> = ({ x, y, label, color }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const pcRef = useRef<PerfectCursor | null>(null);

  useLayoutEffect(() => {
    if (!elementRef.current) return;

    pcRef.current = new PerfectCursor((point) => {
      if (elementRef.current) {
        elementRef.current.style.setProperty('left', `${point[0] * 100}%`);
        elementRef.current.style.setProperty('top', `${point[1] * 100}%`);
      }
    });

    return () => pcRef.current?.dispose();
  }, []);

  useEffect(() => {
    pcRef.current?.addPoint([x, y]);
  }, [x, y]);

  return (
    <div
      ref={elementRef}
      className="absolute flex flex-col items-start pointer-events-none will-change-[left,top] z-50"
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transform -translate-x-1 -translate-y-1 drop-shadow-md"
      >
        <path
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19179L11.7841 12.3673H5.65376Z"
          fill={color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      <span
        className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full ml-2 shadow-sm whitespace-nowrap opacity-90"
        style={{ backgroundColor: color }}
      >
        {label}
      </span>
    </div>
  );
};

const CursorsOverlay: React.FC<CursorsOverlayProps> = ({ cursors, selfId }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {cursors
        .filter(c => c.id !== selfId)
        .map((cursor) => (
          <SmoothCursor
            key={cursor.id}
            x={cursor.x}
            y={cursor.y}
            label={cursor.label}
            color={cursor.color || getColor(cursor.id)}
          />
        ))}
    </div>
  );
};

export default CursorsOverlay;
