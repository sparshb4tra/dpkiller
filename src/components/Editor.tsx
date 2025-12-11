import React from 'react';

interface EditorProps {
  content: string;
  onChange: (value: string) => void;
}

const Editor: React.FC<EditorProps> = ({ content, onChange }) => {
  return (
    <div className="h-full w-full flex flex-col editor-surface relative">
      <textarea
        className="editor-textarea flex-1 w-full h-full p-5 sm:p-8 resize-none outline-none text-lg leading-relaxed font-sans"
        style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}
        placeholder="Start typing..."
        value={content}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoFocus
      />
      <div className="editor-meta">
        Last edited by you
      </div>
    </div>
  );
};

export default Editor;
