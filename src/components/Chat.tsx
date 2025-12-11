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
    <div className="flex flex-col h-full bg-white dark:bg-[var(--bg-surface)] text-[var(--text-primary)] overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 pb-2 space-y-4 sm:space-y-5">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-[var(--text-secondary)] text-sm p-6 sm:p-8 text-center opacity-70">
             <p>Ask AI about your notes.</p>
          </div>
        )}
        
        {messages.map((msg) => {
          const isMine = msg.senderId && msg.senderId === clientId;
          const isUser = msg.role === MessageRole.USER;
          const label = msg.senderLabel || (msg.role === MessageRole.MODEL ? 'AI' : isMine ? 'You' : 'Guest');
          const bubbleClass = isUser ? 'bubble-user' : msg.role === MessageRole.MODEL ? 'bubble-ai' : 'bubble-guest';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1`}
            >
              <span className="text-[10px] uppercase tracking-wide text-gray-400">
                {label}
              </span>
              <div className={`bubble ${bubbleClass} max-w-[88%] sm:max-w-[92%] shadow-sm`}>
                 <div
                   className="bubble-content break-words"
                   dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
                 />
              </div>
            </div>
          );
        })}
        
        {isLoading && (
          <div className="flex items-start">
             <div className="bg-white dark:bg-[var(--bg-surface)] border border-[var(--border-muted)] px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                <div className="flex gap-1 text-gray-500 dark:text-[var(--text-secondary)]">
                  <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-100"></div>
                  <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-200"></div>
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - tight to messages, safe area padding for iOS */}
      <div className="shrink-0 px-3 sm:px-4 pt-2 pb-3 bg-white dark:bg-[var(--bg-surface)] border-t border-gray-100 dark:border-[var(--border-muted)] safe-area-bottom">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-gray-50 dark:bg-[var(--bg-page)] rounded-full px-4 py-2 border border-gray-200 dark:border-[var(--border-muted)] focus-within:border-[var(--accent)] transition-colors">
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-400 dark:placeholder:text-[var(--text-secondary)] text-[var(--text-primary)] min-w-0"
            placeholder="Message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            onFocus={handleFocus}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="text-[var(--accent)] font-semibold text-sm disabled:opacity-30 hover:opacity-70 transition-opacity shrink-0"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
