import React from 'react';

interface HeaderProps {
  roomId: string;
  onCopyLink: () => void;
  onNewRoom: () => void;
  showCopied: boolean;
  isSaved: boolean;
  onToggleTheme: () => void;
  isDark: boolean;
  onToggleNotes: () => void;
  isNotesOpen: boolean;
  isConnected?: boolean;
  onlineCount?: number;
}

const Header: React.FC<HeaderProps> = ({ 
  roomId, 
  onCopyLink, 
  onNewRoom, 
  showCopied, 
  isSaved,
  onToggleTheme,
  isDark,
  onToggleNotes,
  isNotesOpen,
  isConnected = false,
  onlineCount = 0,
}) => {
  return (
    <header className="h-14 border-b border-gray-200 dark:border-[var(--border-muted)] flex items-center justify-between px-3 sm:px-4 bg-white dark:bg-[var(--bg-surface)] shrink-0 z-30 sticky top-0">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Logo - Compact on mobile */}
        <div 
          className="cursor-pointer flex items-center gap-2 group shrink-0" 
          onClick={onNewRoom}
          title="Go Home / New Pad"
        >
          <span className="text-xl sm:text-4xl tracking-tighter helvetica-bold text-black dark:text-[var(--text-primary)] group-hover:text-gray-600 transition-colors">
            {/* Show just 'n' logo on mobile to save space, full text on desktop */}
            <span className="sm:hidden">n.</span>
            <span className="hidden sm:inline">noteai</span>
          </span>
        </div>
        
        {/* Room Info */}
        <div className="flex items-center text-sm text-gray-400 gap-1.5 sm:gap-2 min-w-0 overflow-hidden">
          <span className="hidden sm:inline">/</span>
          <span className="font-mono text-gray-600 dark:text-gray-400 select-all truncate max-w-[80px] sm:max-w-none">{roomId}</span>
          
          {/* Connection & Users */}
          <div className="flex items-center gap-1.5 ml-1">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
            {onlineCount > 0 && (
              <span className="text-[10px] sm:text-xs font-medium text-gray-400">+{onlineCount}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Save Status (Desktop) */}
        <span className={`hidden sm:inline text-xs font-medium transition-colors duration-300 ${isSaved ? 'text-gray-300' : 'text-amber-500'}`}>
          {isSaved ? 'Saved' : 'Saving...'}
        </span>

        {/* NOTES TOGGLE - Text Only */}
        <button 
          onClick={onToggleNotes}
          className={`
            text-sm font-bold transition-colors
            ${isNotesOpen 
              ? 'text-[var(--accent)]' 
              : 'text-slate-500 dark:text-slate-400 hover:text-[var(--accent)]'}
          `}
          title={isNotesOpen ? "Hide notes" : "Show notes"}
        >
          {isNotesOpen ? "Close Notes" : "Notes"}
        </button>

        {/* Share - Text Only */}
        <button
          onClick={onCopyLink}
          className={`
            text-sm font-bold transition-colors
            ${showCopied ? 'text-green-500' : 'text-slate-500 dark:text-slate-400 hover:text-[var(--accent)]'}
          `}
          title="Copy Link"
        >
          {showCopied ? "Copied" : "Share"}
        </button>
        
        {/* Theme Toggle - Text Only */}
        <button 
          onClick={onToggleTheme}
          className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-[var(--accent)] transition-colors min-w-[36px] text-right"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? "Light" : "Dark"}
        </button>
      </div>
    </header>
  );
};

export default Header;
