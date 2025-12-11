import React, { useState, useEffect } from 'react';
import { generateRoomId } from '../services/storageService';

interface HomeViewProps {
  onJoinRoom: (id: string) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ onJoinRoom }) => {
  const [inputRoom, setInputRoom] = useState('');
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('padai_theme') === 'dark';
  });

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const target = inputRoom.trim() || generateRoomId();
    onJoinRoom(target);
  };

  useEffect(() => {
    const body = document.body;
    if (isDark) {
      body.classList.add('dark');
      localStorage.setItem('padai_theme', 'dark');
    } else {
      body.classList.remove('dark');
      localStorage.setItem('padai_theme', 'light');
    }
  }, [isDark]);

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f7f1e1] dark:bg-[var(--bg-page)] text-[#1f1b1a] dark:text-[var(--text-primary)] px-4">
      <div className="flex justify-end pt-4 pr-2">
        <button
          onClick={() => setIsDark(prev => !prev)}
          className="text-xs sm:text-sm font-bold text-[var(--accent)] hover:opacity-80 transition-colors px-2 py-1"
          title="Toggle light/dark"
        >
          {isDark ? 'Light' : 'Dark'}
        </button>
      </div>
      <div className="flex-1 w-full flex flex-col items-center justify-center pb-10 sm:pb-12">
        <div className="w-full max-w-3xl space-y-8 sm:space-y-10 text-center px-2 sm:px-0">
          <div className="space-y-3">
            <h1 className="text-6xl sm:text-8xl tracking-tighter font-extrabold" style={{ letterSpacing: '-0.08em' }}>
              noteai
            </h1>
            <p className="text-lg sm:text-2xl font-light text-[#3b342f] dark:text-[var(--text-secondary)]">
              Share AI chats + notes in one URL.
            </p>
          </div>

          <div className="flex flex-col gap-4 items-center font-mono w-full px-1 sm:px-0">
            <form
              onSubmit={handleSubmit}
              className="flex w-full max-w-3xl shadow-[0_8px_0_#000] border-2 border-[#1f1b1a] dark:border-[var(--border-muted)] rounded-lg overflow-hidden bg-[#fffaf0] dark:bg-[var(--bg-surface)]"
            >
              <span className="px-3 sm:px-5 py-4 text-sm sm:text-lg text-[#3b342f] dark:text-[var(--text-secondary)] bg-[#f0e7d8] dark:bg-[var(--bg-surface)] border-r-2 border-[#1f1b1a] dark:border-[var(--border-muted)] whitespace-nowrap">
                n0teai.vercel.app/
              </span>
              <input
                type="text"
                placeholder="room-name-or-make-one-up"
                className="flex-1 bg-transparent py-4 px-3 sm:px-5 text-base sm:text-lg text-[#1f1b1a] dark:text-[var(--text-primary)] focus:outline-none placeholder:text-[#8c8178] dark:placeholder:text-[var(--text-secondary)] min-w-0"
                value={inputRoom}
                onChange={(e) => setInputRoom(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              />
              <button
                type="submit"
                className="px-4 sm:px-8 py-4 text-base sm:text-lg font-bold text-white bg-[var(--accent)] hover:opacity-90 transition-colors whitespace-nowrap"
              >
                Go!
              </button>
            </form>
            <p className="text-sm sm:text-lg text-[#6b5d53] dark:text-[var(--text-secondary)]">No login required</p>
          </div>
        </div>
      </div>

      <div className="text-sm text-[#6b5d53] dark:text-[var(--text-secondary)] flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 py-6 px-4 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <button className="hover:text-[var(--accent)]" onClick={() => onJoinRoom('policy/privacy')}>Privacy Policy</button>
          <span className="hidden sm:inline">·</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="hover:text-[var(--accent)]" onClick={() => onJoinRoom('policy/cookie')}>Cookie Policy</button>
          <span className="hidden sm:inline">·</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="hover:text-[var(--accent)]" onClick={() => onJoinRoom('policy/content')}>Content Policy</button>
          <span className="hidden sm:inline">·</span>
        </div>
        <a className="hover:text-[var(--accent)]" href="https://sbatra.xyz" target="_blank" rel="noreferrer">© 2025 Sparsh</a>
      </div>
    </div>
  );
};

export default HomeView;
