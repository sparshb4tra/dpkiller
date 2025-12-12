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

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Save Status (Desktop) */}
        <span className={`hidden sm:inline text-xs font-medium transition-colors duration-300 ${isSaved ? 'text-gray-300' : 'text-amber-500'}`}>
          {isSaved ? 'Saved' : 'Saving...'}
        </span>

        {/* NOTES TOGGLE - Primary Action */}
        <button 
          onClick={onToggleNotes}
          className={`
            h-8 px-3 rounded-full flex items-center gap-2 transition-all border shrink-0 text-sm font-medium
            ${isNotesOpen 
              ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm' 
              : 'bg-white dark:bg-[var(--bg-surface)] text-[var(--accent)] border-gray-200 dark:border-gray-700 hover:border-[var(--accent)]'}
          `}
          title={isNotesOpen ? "Hide notes" : "Show notes"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" />
            <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
          </svg>
          <span className="hidden sm:inline">{isNotesOpen ? "Close Notes" : "Notes"}</span>
        </button>

        {/* Share (Icon only on mobile) */}
        <button
          onClick={onCopyLink}
          className="h-8 w-8 sm:w-auto sm:px-3 rounded-full flex items-center justify-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Copy Link"
        >
          {showCopied ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
          )}
          <span className="hidden sm:inline">{showCopied ? "Copied" : "Share"}</span>
        </button>
        
        {/* Theme Toggle (Icon only) */}
        <button 
          onClick={onToggleTheme}
          className="h-8 w-8 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.061l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.061 1.06l1.06 1.06z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
