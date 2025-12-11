import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './Header';
import Editor from './Editor';
import Chat from './Chat';
import { RoomData, ChatMessage, MessageRole } from '../types';
import { getRoom as getRoomLocal, saveRoom as saveRoomLocal, subscribeToRoom as subscribeToRoomLocal, getClientIdentity } from '../services/storageService';
import { streamAIResponse } from '../services/geminiService';
import { hasSupabase, fetchRoom as fetchRoomRemote, insertRoomIfMissing, updateRoom as updateRoomRemote, subscribeToRoom as subscribeToRoomRemote } from '../services/supabaseService';

interface RoomViewProps {
  roomId: string;
  navigateHome: () => void;
}

const RoomView: React.FC<RoomViewProps> = ({ roomId, navigateHome }) => {
  const [data, setData] = useState<RoomData | null>(null); // localState (what UI sees)
  const serverStateRef = useRef<RoomData | null>(null);
  const pendingRef = useRef<RoomData | null>(null);
  const lastSentRef = useRef<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [noteWidth, setNoteWidth] = useState<number>(0.35); // fraction of container width
  const clientIdRef = useRef<string>('');
  const clientLabelRef = useRef<string>('');
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('padai_theme') === 'dark';
  });
  const [accent, setAccent] = useState<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isResizingRef = useRef<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth < 640);
  
  // Ref for debouncing save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const merge = useCallback((local: RoomData, incoming: RoomData) => {
    if (!incoming) return local;
    return incoming.updatedAt > local.updatedAt ? incoming : local;
  }, []);

  // Initialize Room & Subscribe to Sync with last-writer-wins
  useEffect(() => {
    const { id, label } = getClientIdentity();
    clientIdRef.current = id;
    clientLabelRef.current = label;

    // Accent handling
    const existingAccent = localStorage.getItem('padai_accent');
    if (existingAccent) {
      setAccent(existingAccent);
      document.documentElement.style.setProperty('--accent', existingAccent);
    } else {
      const palette = ['#2563eb', '#7c3aed', '#db2777', '#0ea5e9', '#16a34a', '#f97316'];
      const pick = palette[Math.floor(Math.random() * palette.length)];
      setAccent(pick);
      localStorage.setItem('padai_accent', pick);
      document.documentElement.style.setProperty('--accent', pick);
    }

    let unsubscribeLocal: (() => void) | null = null;
    let unsubscribeRemote: (() => void) | null = null;

    const load = async () => {
      if (hasSupabase) {
        try {
          const remote = await fetchRoomRemote(roomId);
          if (remote) {
            serverStateRef.current = remote;
            pendingRef.current = remote;
            lastSentRef.current = JSON.stringify(remote);
            setData(remote);
            setIsSaved(true);
            saveRoomLocal(remote);
          } else {
            const fresh = getRoomLocal(roomId);
            const withTs = { ...fresh, updatedAt: Date.now() };
            serverStateRef.current = withTs;
            pendingRef.current = withTs;
            lastSentRef.current = '';
            setData(withTs);
            setIsSaved(true);
            saveRoomLocal(withTs);
            await insertRoomIfMissing(withTs);
          }
          unsubscribeRemote = subscribeToRoomRemote(roomId, (newData) => {
            if (!newData) return;
            const current = serverStateRef.current || newData;
            const merged = merge(current, newData);
            serverStateRef.current = merged;
            setData(prev => {
              if (!prev) return merged;
              return merge(prev, merged);
            });
          });
          console.info("Supabase realtime subscribed");
        } catch (err) {
          console.warn("Supabase load error", err);
          const local = getRoomLocal(roomId);
          setData(local);
        }
      } else {
        const roomData = getRoomLocal(roomId);
        serverStateRef.current = roomData;
        pendingRef.current = roomData;
        setData(roomData);
        setIsSaved(true);
        unsubscribeLocal = subscribeToRoomLocal(roomId, (newData) => {
          setData(prev => merge(prev ?? newData, newData));
          setIsSaved(true);
        });
      }
    };

    load();

    return () => {
      if (unsubscribeLocal) unsubscribeLocal();
      if (unsubscribeRemote) unsubscribeRemote();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [roomId, merge]);

  // Theme handling
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

  // Mobile detection
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Drag-to-resize handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const fraction = (rect.right - e.clientX) / rect.width; // portion for notes on the right
      const clamped = Math.min(0.7, Math.max(0.2, fraction));
      setNoteWidth(clamped);
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = 'default';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResize = (e: React.MouseEvent) => {
    if (!isNotesOpen) return;
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/#/${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const persistRoom = useCallback(async (room: RoomData) => {
    if (hasSupabase) {
      const payload = { ...room, updatedAt: Date.now() };
      const serialized = JSON.stringify({ content: payload.content, messages: payload.messages, updatedAt: payload.updatedAt });
      if (serialized === lastSentRef.current) {
        return;
      }
      lastSentRef.current = serialized;
      pendingRef.current = payload;
      saveRoomLocal(payload);
      try {
        await updateRoomRemote(payload);
        serverStateRef.current = payload;
      } catch (err) {
        console.warn("Persist failed, will retry on next edit", err);
      }
    } else {
      saveRoomLocal(room);
    }
  }, []);

  // Handle content changes
  const handleContentChange = useCallback((newContent: string) => {
    setIsSaved(false);
    setData(prev => {
      if (!prev) return null;
      const updated = { ...prev, content: newContent, lastEditor: { id: clientIdRef.current, label: clientLabelRef.current } };
      return updated;
    });
    
    // Debounce Save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      setData(currentData => {
        if (currentData) {
          persistRoom(currentData);
          setIsSaved(true);
        }
        return currentData;
      });
    }, 800);
  }, [persistRoom]);

  const handleSendMessage = async (text: string) => {
    if (!data) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      text: text,
      timestamp: Date.now(),
      senderId: clientIdRef.current,
      senderLabel: clientLabelRef.current || 'Guest'
    };

    // Optimistic Update
    const updatedData = { ...data, messages: [...data.messages, userMsg] };
    setData(updatedData);
    persistRoom(updatedData); // Save immediately so other tabs see the chat
    setIsAILoading(true);

    // Placeholder for AI
    const aiMsgId = (Date.now() + 1).toString();
    const placeholderAiMsg: ChatMessage = {
      id: aiMsgId,
      role: MessageRole.MODEL,
      text: "",
      timestamp: Date.now(),
      isStreaming: true,
      senderId: "ai",
      senderLabel: "AI"
    };

    setData(prev => prev ? { ...prev, messages: [...prev.messages, placeholderAiMsg] } : null);

    // Stream
    await streamAIResponse(
      updatedData.messages, 
      updatedData.content, 
      text, 
      (chunkText) => {
        setData(prev => {
            if (!prev) return null;
            const newMessages = prev.messages.map(m => 
                m.id === aiMsgId ? { ...m, text: chunkText } : m
            );
            return { ...prev, messages: newMessages };
        });
      }
    );

    setIsAILoading(false);
    
    // Finalize
    setData(prev => {
        if (!prev) return null;
        const finalMessages = prev.messages.map(m => 
            m.id === aiMsgId ? { ...m, isStreaming: false } : m
        );
        const finalData = { ...prev, messages: finalMessages };
        persistRoom(finalData); // Save AI response
        return finalData;
    });
  };

  if (!data) return <div className="h-screen flex items-center justify-center font-sans">Loading...</div>;

  return (
    <div className="flex flex-col h-screen w-full app-shell relative">
      <Header 
        roomId={roomId} 
        onCopyLink={handleCopyLink} 
        showCopied={isCopied}
        onNewRoom={navigateHome}
        isSaved={isSaved}
        onToggleTheme={() => setIsDark(prev => !prev)}
        isDark={isDark}
        onToggleNotes={() => setIsNotesOpen(prev => !prev)}
        isNotesOpen={isNotesOpen}
      />

      <div ref={containerRef} className="flex-1 flex overflow-hidden relative p-3 sm:p-4 lg:p-6 gap-4">
        <div
          className={`${isMobile ? '' : 'bg-white dark:bg-[var(--bg-surface)] border border-[var(--border-muted)] rounded-2xl shadow-lg'} h-full overflow-hidden transition-all duration-200`}
          style={{
            flexBasis: isNotesOpen && !isMobile ? `${(1 - noteWidth) * 100}%` : '100%',
            minWidth: '40%',
          }}
        >
          <Chat 
            messages={data.messages} 
            onSendMessage={handleSendMessage} 
            isLoading={isAILoading}
            clientId={clientIdRef.current}
          />
        </div>

        {!isMobile && isNotesOpen && (
          <div className="resizer h-full" onMouseDown={startResize} />
        )}

        {!isMobile && (
          <div
            className={`
              bg-white dark:bg-[var(--bg-surface)] border border-[var(--border-muted)] rounded-2xl shadow-lg h-full transition-all duration-200 overflow-hidden
              ${isNotesOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}
            style={{
              flexBasis: isNotesOpen ? `${noteWidth * 100}%` : '0%',
              minWidth: isNotesOpen ? '25%' : '0',
            }}
          >
            <Editor content={data.content} onChange={handleContentChange} />
          </div>
        )}

        {isMobile && isNotesOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm flex items-center justify-center px-3"
            onClick={() => setIsNotesOpen(false)}
          >
            <div
              className="w-full max-w-xl h-[70vh] bg-white dark:bg-[var(--bg-surface)] border border-[var(--border-muted)] rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-muted)]">
                <span className="text-base font-semibold text-[var(--text-primary)]">Notes</span>
                <button className="text-sm text-[var(--accent)] font-bold" onClick={() => setIsNotesOpen(false)}>Close</button>
              </div>
              <div className="h-[calc(100%-52px)]">
                <Editor content={data.content} onChange={handleContentChange} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomView;
