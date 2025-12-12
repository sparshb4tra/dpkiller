import React from 'react';

interface Cursor {
  id: string;
  label: string;
  x: number;
  y: number;
}

interface CursorsOverlayProps {
  cursors: Cursor[];
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

const CursorsOverlay: React.FC<CursorsOverlayProps> = ({ cursors, selfId }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {cursors.filter(c => c.id !== selfId).map((cursor) => {
        const color = getColor(cursor.id);
        return (
          <div
            key={cursor.id}
            className="absolute transition-all duration-100 ease-linear flex flex-col items-start"
            style={{
              left: `${cursor.x * 100}%`,
              top: `${cursor.y * 100}%`,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="transform -translate-x-1 -translate-y-1"
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
              {cursor.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default CursorsOverlay;

