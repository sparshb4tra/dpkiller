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
        <div 
          className="cursor-pointer flex items-center gap-2 group shrink-0" 
          onClick={onNewRoom}
          title="Go Home / New Pad"
        >
          <span className="text-2xl sm:text-4xl tracking-tighter helvetica-bold text-black dark:text-[var(--text-primary)] group-hover:text-gray-600 transition-colors">
            noteai
          </span>
        </div>
        
        <div className="hidden sm:flex items-center text-sm text-gray-400 gap-2">
          <span>/</span>
          <span className="font-mono text-gray-600 dark:text-gray-400 select-all">{roomId}</span>
          
          {/* Connection indicator */}
          <span className={`ml-2 w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} 
                title={isConnected ? 'Connected' : 'Connecting...'} />
          
          {/* Online count */}
          {onlineCount > 0 && (
            <span className="text-xs text-gray-500" title={`${onlineCount} other user(s) online`}>
              +{onlineCount}
            </span>
          )}
        </div>

        {/* Mobile indicators */}
        <div className="sm:hidden flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
          {onlineCount > 0 && (
            <span className="text-[10px] text-gray-500">+{onlineCount}</span>
          )}
          <span className={`text-[10px] font-medium transition-colors duration-300 ${isSaved ? 'text-gray-300' : 'text-amber-500'}`}>
            {isSaved ? '✓' : '...'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
        {/* Desktop save indicator */}
        <span className={`hidden sm:inline text-xs font-medium transition-colors duration-300 ${isSaved ? 'text-gray-300' : 'text-amber-500'}`}>
          {isSaved ? 'Saved' : 'Saving...'}
        </span>

        {/* Notes button - BEFORE share on mobile for easier access */}
        <button 
          onClick={onToggleNotes}
          className={`
            w-8 h-8 rounded-full flex items-center justify-center transition-all border shrink-0
            ${isNotesOpen 
              ? 'bg-[var(--accent)] text-white border-[var(--accent)]' 
              : 'bg-white dark:bg-[var(--bg-surface)] text-[var(--accent)] border-[var(--border-muted)] hover:border-[var(--accent)]'}
          `}
          title={isNotesOpen ? "Hide notes" : "Show notes"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M5 4.75A.75.75 0 015.75 4h12.5a.75.75 0 01.75.75v14.5a.75.75 0 01-.75.75H5.75A.75.75 0 015 19.25V4.75zm1.5.75v13h11v-13h-11zM8 7.5h6a.75.75 0 000-1.5H8a.75.75 0 000 1.5zm0 3h6a.75.75 0 000-1.5H8a.75.75 0 000 1.5zm0 3h3a.75.75 0 000-1.5H8a.75.75 0 000 1.5z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Share button */}
        <button
          onClick={onCopyLink}
          className="text-xs sm:text-sm font-bold text-[var(--accent)] hover:opacity-80 transition-colors px-2 whitespace-nowrap"
        >
          {showCopied ? "Copied!" : "Share"}
        </button>
        
        {/* Theme toggle */}
        <button 
          onClick={onToggleTheme}
          className="hidden sm:block text-xs sm:text-sm font-bold transition-colors px-2"
          style={{ color: 'var(--accent)' }}
          title="Toggle light/dark"
        >
          {isDark ? "Light" : "Dark"}
        </button>

        {/* Mobile theme toggle - icon only */}
        <button 
          onClick={onToggleTheme}
          className="sm:hidden w-8 h-8 rounded-full flex items-center justify-center transition-all border border-[var(--border-muted)] bg-white dark:bg-[var(--bg-surface)] text-[var(--accent)] hover:border-[var(--accent)]"
          title="Toggle light/dark"
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
