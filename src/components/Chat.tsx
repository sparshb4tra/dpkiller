import React, { useState, useRef, useEffect, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ChatMessage, MessageRole } from '../types';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  clientId: string;
}

const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, isLoading, clientId }) => {
  const [input, setInput] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const renderMarkdown = useMemo(() => {
    marked.setOptions({ breaks: true });
    return (text: string) => {
      const raw = marked.parse(text || '');
      return DOMPurify.sanitize(raw);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, keyboardHeight]);

  // ROBUST MOBILE KEYBOARD HANDLING
  useEffect(() => {
    if (!window.visualViewport) return;

    const handleResize = () => {
      const viewport = window.visualViewport!;
      const windowHeight = window.innerHeight;
      const viewportHeight = viewport.height;
      
      // Calculate keyboard height
      const diff = windowHeight - viewportHeight;
      const isKeyboardOpen = diff > 150; // Threshold for keyboard
      
      setKeyboardHeight(isKeyboardOpen ? diff : 0);
      
      if (isKeyboardOpen) {
        setTimeout(scrollToBottom, 100);
      }
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  // Global key listener for auto-focus (desktop only)
  useEffect(() => {
    // Only on desktop/tablet (don't trigger virtual keyboard on mobile unexpectedly)
    if (window.innerWidth < 640) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere if user is typing in an input/textarea
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA' ||
          document.activeElement?.isContentEditable) {
        return;
      }

      // Ignore modifiers keys, function keys, etc.
      // We only want to capture actual typing characters
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      // Focus the input
      inputRef.current?.focus();
      // The character will be typed naturally because we don't preventDefault()
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input on mount (desktop only)
  useEffect(() => {
    if (window.innerWidth >= 640) {
    inputRef.current?.focus();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] sm:bg-white dark:bg-[var(--bg-surface)] text-[var(--text-primary)] relative">
      
      {/* Messages Scroll Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-4 space-y-4"
        style={{
          // Only add bottom padding for the input area, header is handled by parent margin
          paddingBottom: keyboardHeight > 0 ? '80px' : '80px', 
        }}
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-sm p-8 text-center opacity-80">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
             <p className="font-medium">Start a new chat</p>
             <p className="text-xs mt-1">AI has context of your notes</p>
          </div>
        )}
        
        {messages.map((msg, index) => {
          const isUser = msg.role === MessageRole.USER;
          const isAI = msg.role === MessageRole.MODEL;
          const showLabel = index === 0 || messages[index - 1]?.role !== msg.role;
          
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in duration-300 slide-in-from-bottom-2`}
            >
              {/* Label */}
                {showLabel && (
                <div className={`text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 px-1 uppercase ${isUser ? 'text-right' : 'text-left'}`}>
                  {isAI ? 'AI Assistant' : 'You'}
                  </div>
                )}
              
              {/* Bubble */}
                <div
                className={`
                  px-4 py-3 text-[15px] leading-relaxed break-words max-w-[85%] sm:max-w-[80%] shadow-sm
                  ${isUser 
                    ? 'bg-[var(--accent)] text-white rounded-2xl rounded-tr-sm' 
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm'}
                `}
                >
                  <div
                  className="bubble-content markdown-body"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
                  />
              </div>
              
              {/* Timestamp (optional, maybe on hover?) */}
            </div>
          );
        })}
        
        {isLoading && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* ROBUST INPUT AREA - Fixed to bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[var(--bg-surface)] border-t border-gray-100 dark:border-[var(--border-muted)] z-20"
        style={{
          // Use fixed positioning relative to visual viewport when keyboard is open
          position: keyboardHeight > 0 ? 'fixed' : 'absolute',
          bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0',
          paddingBottom: keyboardHeight > 0 ? '12px' : 'max(16px, env(safe-area-inset-bottom))',
          paddingTop: '12px',
          paddingLeft: '16px',
          paddingRight: '16px',
          width: '100%',
        }}
      >
        <form onSubmit={handleSubmit} className="flex items-end gap-2 max-w-4xl mx-auto">
          <div className="flex-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-transparent focus-within:border-[var(--accent)] focus-within:bg-white dark:focus-within:bg-slate-800 transition-all duration-200">
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent px-4 py-3 text-[16px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none min-h-[44px]"
              placeholder="Message AI..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              style={{ fontSize: '16px' }} // Prevents iOS zoom
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-[44px] h-[44px] rounded-full bg-[var(--accent)] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all shadow-sm shrink-0 mb-[1px]"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
