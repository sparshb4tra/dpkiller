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
    <div className="flex flex-col h-full bg-white dark:bg-[var(--bg-surface)] text-[var(--text-primary)]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-[var(--text-secondary)] text-sm p-8 text-center opacity-70">
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
              <div className={`bubble ${bubbleClass} max-w-[92%] shadow-sm`}>
                 <div
                   className="bubble-content"
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

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-[var(--bg-surface)] border-t border-gray-200 dark:border-[var(--border-muted)] mobile-input-safe">
        <form onSubmit={handleSubmit} className="relative flex gap-2">
          <input
            ref={inputRef}
            type="text"
            className="flex-1 chat-input border-b border-gray-200 dark:border-[var(--border-muted)] focus:border-[var(--accent)] py-2 text-sm focus:outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-[var(--text-secondary)] font-sans"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            onFocus={handleFocus}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="text-[var(--accent)] font-bold text-sm disabled:opacity-30 hover:opacity-70 transition-opacity"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
