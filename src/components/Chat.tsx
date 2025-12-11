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
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
  }, [messages, isLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  const handleFocus = () => {
    // Attempt to ensure the input is visible when the mobile keyboard opens
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)] sm:bg-white dark:bg-[var(--bg-surface)] text-[var(--text-primary)] overflow-hidden">
      {/* Messages Area - iMessage style */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 pt-3 pb-2 space-y-2">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-[var(--text-secondary)] text-sm p-6 text-center opacity-70">
             <p>Ask AI about your notes.</p>
          </div>
        )}
        
        {messages.map((msg, index) => {
          const isUser = msg.role === MessageRole.USER;
          const isAI = msg.role === MessageRole.MODEL;
          const showLabel = index === 0 || messages[index - 1]?.role !== msg.role;
          
          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${showLabel ? 'mt-2' : ''}`}>
                {/* Label - only show on first message or role change */}
                {showLabel && (
                  <div className={`text-[10px] uppercase tracking-wide text-gray-400 mb-1 ${isUser ? 'text-right pr-1' : 'pl-1'}`}>
                    {isAI ? 'AI' : 'You'}
                  </div>
                )}
                {/* Bubble - iMessage style */}
                <div
                  className="px-3 py-2 text-[15px] leading-relaxed break-words rounded-2xl"
                  style={{
                    backgroundColor: isUser ? 'var(--accent)' : 'var(--bubble-ai-bg)',
                    color: isUser ? 'white' : 'var(--bubble-ai-text)',
                    borderBottomRightRadius: isUser ? '6px' : undefined,
                    borderBottomLeftRadius: !isUser ? '6px' : undefined,
                  }}
                >
                  <div
                    className="bubble-content"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
                  />
                </div>
              </div>
            </div>
          );
        })}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%]">
              <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - iMessage style */}
      <div className="shrink-0 px-2 sm:px-4 py-2 bg-[var(--bg-page)] sm:bg-white dark:bg-[var(--bg-surface)] border-t border-gray-200 dark:border-[var(--border-muted)] safe-area-bottom">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-white dark:bg-gray-800 rounded-full px-4 py-2 border border-gray-300 dark:border-gray-600 focus-within:border-[var(--accent)] transition-colors">
            <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-transparent text-[15px] focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-[var(--text-primary)] min-w-0"
              placeholder="iMessage"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              onFocus={handleFocus}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center disabled:opacity-30 hover:opacity-80 transition-opacity shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
