import React from 'react';

interface OnlineUser {
  id: string;
  label: string;
  isTyping: boolean;
}

interface EditorProps {
  content: string;
  onChange: (value: string) => void;
  lastEditor?: { id: string; label: string } | null;
  onlineUsers?: OnlineUser[];
  clientId?: string;
}

const Editor: React.FC<EditorProps> = ({ 
  content, 
  onChange, 
  lastEditor, 
  onlineUsers = [],
  clientId 
}) => {
  // Find users who are typing (excluding self)
  const typingUsers = onlineUsers.filter(u => u.isTyping && u.id !== clientId);
  
  // Determine the display text for the meta info
  const getMetaText = () => {
    if (typingUsers.length > 0) {
      const names = typingUsers.map(u => u.label).join(', ');
      return (
        <span className="flex items-center gap-2 text-[var(--accent)] font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
          </span>
          {names} is typing...
        </span>
      );
    }
    
    if (lastEditor) {
      const isMe = lastEditor.id === clientId;
      return (
        <span className="text-slate-400 dark:text-slate-500 text-xs transition-opacity duration-300">
          Last edit by <span className="font-medium text-slate-600 dark:text-slate-300">{isMe ? 'you' : lastEditor.label}</span>
        </span>
      );
    }
    
    return <span className="text-slate-300 dark:text-slate-600 text-xs">Ready to write</span>;
  };

  return (
    <div className="h-full w-full flex flex-col editor-surface relative">
      <textarea
        className="editor-textarea flex-1 w-full h-full p-5 sm:p-8 resize-none outline-none text-lg leading-relaxed font-sans"
        style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
        placeholder="Start typing your notes here..."
        value={content}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoFocus
      />
      
      {/* Meta info - shows typing status or last editor */}
      <div className="editor-meta absolute top-0 right-0 p-3 flex items-center gap-3 pointer-events-none">
        {onlineUsers.length > 0 && (
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded-full">
            {onlineUsers.length} online
          </span>
        )}
        
        {getMetaText()}
      </div>
    </div>
  );
};

export default Editor;
