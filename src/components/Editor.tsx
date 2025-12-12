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
      return `${names} typing...`;
    }
    if (lastEditor && lastEditor.id !== clientId) {
      return `Last edit by ${lastEditor.label}`;
    }
    return 'Start typing...';
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
      <div className={`editor-meta ${typingUsers.length > 0 ? 'animate-pulse' : ''}`}>
        {onlineUsers.length > 0 && (
          <span className="mr-2">
            {onlineUsers.length} online
          </span>
        )}
        <span className={typingUsers.length > 0 ? 'text-[var(--accent)]' : ''}>
          {getMetaText()}
        </span>
      </div>
    </div>
  );
};

export default Editor;
