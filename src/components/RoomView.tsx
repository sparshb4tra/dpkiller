import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './Header';
import Editor from './Editor';
import Chat from './Chat';
import { RoomData, ChatMessage, MessageRole } from '../types';
import { getRoom as getRoomLocal, saveRoom as saveRoomLocal, subscribeToRoom as subscribeToRoomLocal, getClientIdentity } from '../services/storageService';
import { streamAIResponse } from '../services/geminiService';
import { hasSupabase, fetchRoom, upsertRoom, subscribeToRoom as subscribeSupabase, logSupabaseHealth } from '../services/supabaseService';

interface RoomViewProps {
  roomId: string;
  navigateHome: () => void;
}

const RoomView: React.FC<RoomViewProps> = ({ roomId, navigateHome }) => {
  const [data, setData] = useState<RoomData | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [noteWidth, setNoteWidth] = useState<number>(0.35);
  const [isDark, setIsDark] = useState<boolean>(() => localStorage.getItem('padai_theme') === 'dark');
  const [accent, setAccent] = useState<string>('');
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth < 640);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isResizingRef = useRef<boolean>(false);
  const clientIdRef = useRef<string>('');
  const clientLabelRef = useRef<string>('');
  
  // DONTPAD-STYLE SYNC: Simple refs for tracking
  const isTypingRef = useRef<boolean>(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>('');
  const lastSavedMessagesRef = useRef<string>('');

  // Initialize
  useEffect(() => {
    const { id, label } = getClientIdentity();
    clientIdRef.current = id;
    clientLabelRef.current = label;

    console.info("[PadAI] Init", { roomId, clientId: id, hasSupabase });
    logSupabaseHealth();

    // Accent color
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

    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      if (hasSupabase) {
        // 1. Fetch initial data
        let room = await fetchRoom(roomId);
        
        if (!room) {
          // Create new room
          room = getRoomLocal(roomId);
          room.updatedAt = Date.now();
          await upsertRoom(room);
          console.info("[PadAI] Created new room");
        }

        setData(room);
        saveRoomLocal(room);
        lastSavedContentRef.current = room.content;
        lastSavedMessagesRef.current = JSON.stringify(room.messages);
        setIsSaved(true);

        // 2. Subscribe to realtime updates - DONTPAD STYLE: just apply if not typing
        unsubscribe = subscribeSupabase(
          roomId,
          (incoming) => {
            console.info("[PadAI] Received update", { 
              isTyping: isTypingRef.current,
              incomingUpdatedAt: incoming.updatedAt 
            });

            // DONTPAD LOGIC: Only apply remote updates when NOT actively typing
            // This prevents cursor jumping while you type
            if (!isTypingRef.current) {
              console.info("[PadAI] Applying remote update");
              setData(incoming);
              saveRoomLocal(incoming);
              lastSavedContentRef.current = incoming.content;
              lastSavedMessagesRef.current = JSON.stringify(incoming.messages);
              setIsSaved(true);
            } else {
              console.info("[PadAI] Skipping remote update - user is typing");
            }
          },
          (status) => {
            console.info("[PadAI] Realtime status:", status);
          }
        );
      } else {
        // Local only mode
        const room = getRoomLocal(roomId);
        setData(room);
        setIsSaved(true);
        
        unsubscribe = subscribeToRoomLocal(roomId, (incoming) => {
          if (!isTypingRef.current) {
            setData(incoming);
            setIsSaved(true);
          }
        });
      }
    };

    init();

    return () => {
      if (unsubscribe) unsubscribe();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [roomId]);

  // Theme handling
  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark');
      localStorage.setItem('padai_theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('padai_theme', 'light');
    }
  }, [isDark]);

  // Mobile detection
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Resize handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const fraction = (rect.right - e.clientX) / rect.width;
      setNoteWidth(Math.min(0.7, Math.max(0.2, fraction)));
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

  // DONTPAD-STYLE: Save to server with debounce
  const saveToServer = useCallback(async (roomData: RoomData) => {
    const contentChanged = roomData.content !== lastSavedContentRef.current;
    const messagesChanged = JSON.stringify(roomData.messages) !== lastSavedMessagesRef.current;

    if (!contentChanged && !messagesChanged) {
      console.info("[PadAI] No changes to save");
      setIsSaved(true);
      return;
    }

    const payload: RoomData = {
      ...roomData,
      updatedAt: Date.now(),
      lastEditor: { id: clientIdRef.current, label: clientLabelRef.current }
    };

    console.info("[PadAI] Saving to server...");
    
    if (hasSupabase) {
      const success = await upsertRoom(payload);
      if (success) {
        lastSavedContentRef.current = payload.content;
        lastSavedMessagesRef.current = JSON.stringify(payload.messages);
        setIsSaved(true);
        console.info("[PadAI] Saved successfully");
      } else {
        console.error("[PadAI] Save failed");
      }
    } else {
      saveRoomLocal(payload);
      lastSavedContentRef.current = payload.content;
      lastSavedMessagesRef.current = JSON.stringify(payload.messages);
      setIsSaved(true);
    }
  }, []);

  // DONTPAD-STYLE: Handle content changes with typing detection
  const handleContentChange = useCallback((newContent: string) => {
    // Mark as typing - this blocks remote updates temporarily
    isTypingRef.current = true;
    
    // Clear previous typing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    // Set typing to false after 1.5s of no typing
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      console.info("[PadAI] Typing stopped");
    }, 1500);

    // Update local state immediately
    setIsSaved(false);
    setData(prev => {
      if (!prev) return null;
      return { ...prev, content: newContent };
    });

    // Debounce save (300ms like Dontpad)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setData(current => {
        if (current) saveToServer(current);
        return current;
      });
    }, 300);
  }, [saveToServer]);

  // Handle chat messages
  const handleSendMessage = async (text: string) => {
    if (!data) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      text,
      timestamp: Date.now(),
      senderId: clientIdRef.current,
      senderLabel: clientLabelRef.current || 'Guest'
    };

    // Add user message and save
    const withUserMsg = { ...data, messages: [...data.messages, userMsg] };
    setData(withUserMsg);
    await saveToServer(withUserMsg);
    
    setIsAILoading(true);

    // AI placeholder
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

    // Stream AI response
    await streamAIResponse(
      withUserMsg.messages,
      withUserMsg.content,
      text,
      (chunkText) => {
        setData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            messages: prev.messages.map(m => m.id === aiMsgId ? { ...m, text: chunkText } : m)
          };
        });
      }
    );

    setIsAILoading(false);

    // Finalize AI message and save
    setData(prev => {
      if (!prev) return null;
      const finalMessages = prev.messages.map(m =>
        m.id === aiMsgId ? { ...m, isStreaming: false } : m
      );
      const finalData = { ...prev, messages: finalMessages };
      saveToServer(finalData);
      return finalData;
    });
  };

  if (!data) {
    return <div className="h-screen flex items-center justify-center font-sans">Loading...</div>;
  }

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

      <div ref={containerRef} className="flex-1 flex overflow-hidden relative p-0 sm:p-4 lg:p-6 sm:gap-4">
        <div
          className={`${isMobile ? 'w-full' : 'bg-white dark:bg-[var(--bg-surface)] border border-[var(--border-muted)] rounded-2xl shadow-lg'} h-full overflow-hidden transition-all duration-200`}
          style={{
            flexBasis: isNotesOpen && !isMobile ? `${(1 - noteWidth) * 100}%` : '100%',
            minWidth: isMobile ? '100%' : '40%',
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
