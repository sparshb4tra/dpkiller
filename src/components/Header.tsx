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
}) => {
  return (
    <header className="h-14 border-b border-gray-200 dark:border-[var(--border-muted)] flex items-center justify-between px-4 bg-white dark:bg-[var(--bg-surface)] shrink-0 z-20">
      <div className="flex items-center gap-4">
        <div 
          className="cursor-pointer flex items-center gap-2 group" 
          onClick={onNewRoom}
          title="Go Home / New Pad"
        >
          <span className="text-3xl sm:text-4xl tracking-tighter helvetica-bold text-black dark:text-[var(--text-primary)] group-hover:text-gray-600 transition-colors">
            noteai
          </span>
        </div>
        
        <div className="hidden sm:flex items-center text-sm text-gray-400 gap-2">
          <span>/</span>
          <span className="font-mono text-gray-600 select-all">{roomId}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={`text-xs font-medium transition-colors duration-300 ${isSaved ? 'text-gray-300' : 'text-amber-500'}`}>
          {isSaved ? 'Saved' : 'Unsaved'}
        </span>

        <button
          onClick={onCopyLink}
          className="text-xs sm:text-sm font-bold text-[var(--accent)] hover:opacity-80 transition-colors px-2"
        >
          {showCopied ? "Link Copied" : "Share"}
        </button>
        
        <button 
          onClick={onToggleTheme}
          className="text-xs sm:text-sm font-bold text-gray-900 transition-colors px-2"
          style={{ color: 'var(--accent)' }}
          title="Toggle light/dark"
        >
          {isDark ? "Light" : "Dark"}
        </button>

        <button 
          onClick={onToggleNotes}
          className={`
            ml-1 w-8 h-8 rounded-full flex items-center justify-center transition-all border
            ${isNotesOpen 
              ? 'bg-[var(--accent)] text-white border-[var(--accent)]' 
              : 'bg-white text-[var(--accent)] border-[var(--border-muted)] hover:border-[var(--accent)]'}
          `}
          title={isNotesOpen ? "Hide notes" : "Show notes"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M5 4.75A.75.75 0 015.75 4h12.5a.75.75 0 01.75.75v14.5a.75.75 0 01-.75.75H5.75A.75.75 0 015 19.25V4.75zm1.5.75v13h11v-13h-11zM8 7.5h6a.75.75 0 000-1.5H8a.75.75 0 000 1.5zm0 3h6a.75.75 0 000-1.5H8a.75.75 0 000 1.5zm0 3h3a.75.75 0 000-1.5H8a.75.75 0 000 1.5z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;
