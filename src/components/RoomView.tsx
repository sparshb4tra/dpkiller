import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './Header';
import Editor from './Editor';
import Chat from './Chat';
import { RoomData, ChatMessage, MessageRole } from '../types';
import { getRoom as getRoomLocal, saveRoom as saveRoomLocal, getClientIdentity } from '../services/storageService';
import { streamAIResponse } from '../services/geminiService';
import { RoomSyncChannel, hasSupabase, upsertRoom, createDefaultRoom, fetchRoom } from '../services/syncService';

interface RoomViewProps {
  roomId: string;
  navigateHome: () => void;
}

interface OnlineUser {
  id: string;
  label: string;
  isTyping: boolean;
}

const WELCOME_MESSAGES = [
  "Hello. I'm here to help you with your notes.",
  "Hey there! Ready to brainstorm?",
  "Hi! What can I help you write today?",
  "Welcome back. What are we working on?",
  "Hi! Share the room link so others can collaborate."
];

const getRandomWelcome = () => WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];

const RoomView: React.FC<RoomViewProps> = ({ roomId, navigateHome }) => {
  // Core state
  const [data, setData] = useState<RoomData | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [lastEditor, setLastEditor] = useState<{ id: string; label: string } | null>(null);

  // UI state
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [noteWidth, setNoteWidth] = useState<number>(0.35);
  const [isDark, setIsDark] = useState<boolean>(() => localStorage.getItem('padai_theme') === 'dark');
  const [accent, setAccent] = useState<string>('');
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth < 640);

  // Refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isResizingRef = useRef<boolean>(false);
  const clientIdRef = useRef<string>('');
  const clientLabelRef = useRef<string>('');
  
  // Sync refs
  const syncChannelRef = useRef<RoomSyncChannel | null>(null);
  const isTypingRef = useRef<boolean>(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== INITIALIZATION ====================
  useEffect(() => {
    const { id, label } = getClientIdentity();
    clientIdRef.current = id;
    clientLabelRef.current = label;

    console.info("[PadAI] Init", { roomId, clientId: id, hasSupabase });

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

    const init = async () => {
      if (hasSupabase) {
        // Create sync channel
        const syncChannel = new RoomSyncChannel(
          roomId,
          id,
          label,
          {
            // Called when room data changes (from database)
            onRoomUpdate: (incomingRoom, isRemote) => {
              if (!isRemote) return;
              
              console.info("[PadAI] 📥 Remote update received");
              
              // Only update if we're not actively typing
              if (!isTypingRef.current) {
                setData(prev => {
                  if (!prev) return incomingRoom;
                  
                  // Keep our streaming AI message if we have one
                  const ourStreamingMsg = prev.messages.find(m => m.isStreaming);
                  if (ourStreamingMsg) {
                    const otherMsgs = incomingRoom.messages.filter(m => !m.isStreaming);
                    return { 
                      ...incomingRoom, 
                      messages: [...otherMsgs, ourStreamingMsg] 
                    };
                  }
                  
                  return incomingRoom;
                });
                setLastEditor({ id: 'remote', label: 'Someone' });
              } else {
                console.info("[PadAI] Skipping update - user is typing");
              }
            },

            // Presence updates
            onPresenceUpdate: (users) => {
              setOnlineUsers(users.filter(u => u.id !== id));
            },

            // Connection status
            onConnectionChange: (status) => {
              setIsConnected(status === 'connected');
              console.info("[PadAI] Connection:", status);
            },
          }
        );

        syncChannelRef.current = syncChannel;

        // Connect and get initial data
        let room = await syncChannel.connect();

        if (!room) {
          // Create new room
          const welcomeMsg: ChatMessage = {
            id: "welcome-msg",
            role: MessageRole.MODEL,
            text: getRandomWelcome(),
            senderId: "ai",
            senderLabel: "AI",
            timestamp: Date.now()
          };
          room = createDefaultRoom(roomId, welcomeMsg);
          await upsertRoom(room);
          console.info("[PadAI] Created new room");
        }

        setData(room);
        saveRoomLocal(room);
        setIsSaved(true);

      } else {
        // Local-only mode
        const room = getRoomLocal(roomId);
        setData(room);
        setIsSaved(true);
        console.info("[PadAI] Running in local-only mode");
      }
    };

    init();

    return () => {
      syncChannelRef.current?.disconnect();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [roomId]);

  // ==================== THEME ====================
  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark');
      localStorage.setItem('padai_theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('padai_theme', 'light');
    }
  }, [isDark]);

  // ==================== MOBILE DETECTION ====================
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ==================== RESIZE HANDLERS ====================
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

  // ==================== COPY LINK ====================
  const handleCopyLink = () => {
    const url = `${window.location.origin}/#/${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // ==================== CONTENT CHANGE ====================
  const handleContentChange = useCallback((newContent: string) => {
    // Mark as typing
    isTypingRef.current = true;
    syncChannelRef.current?.updatePresence(true);

    // Clear previous typing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    // Reset typing after 2s
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      syncChannelRef.current?.updatePresence(false);
    }, 2000);

    // Update local state
    setIsSaved(false);
    setData(prev => {
      if (!prev) return null;
      const updated = { ...prev, content: newContent };
      
      // Save to local storage immediately
      saveRoomLocal(updated);
      
      // Schedule database save (debounced)
      syncChannelRef.current?.scheduleSave(updated);
      
      return updated;
    });

    setIsSaved(true);
  }, []);

  // ==================== CHAT MESSAGE HANDLING ====================
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

    // Add user message
    const withUserMsg: RoomData = { 
      ...data, 
      messages: [...data.messages, userMsg] 
    };
    setData(withUserMsg);

    // SAVE IMMEDIATELY so other devices see the message
    console.info("[PadAI] 📤 Saving message to sync...");
    await syncChannelRef.current?.immediateSave(withUserMsg);
    
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
            messages: prev.messages.map(m => 
              m.id === aiMsgId ? { ...m, text: chunkText } : m
            )
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
      
      // Save final state
      saveRoomLocal(finalData);
      syncChannelRef.current?.immediateSave(finalData);
      
      return finalData;
    });
  };

  // ==================== RENDER ====================
  if (!data) {
    return (
      <div className="h-screen flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-[var(--text-secondary)]">Connecting to room...</span>
        </div>
      </div>
    );
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
        isConnected={isConnected}
        onlineCount={onlineUsers.length}
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
            <Editor 
              content={data.content} 
              onChange={handleContentChange}
              lastEditor={lastEditor}
              onlineUsers={onlineUsers}
              clientId={clientIdRef.current}
            />
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
                <Editor 
                  content={data.content} 
                  onChange={handleContentChange}
                  lastEditor={lastEditor}
                  onlineUsers={onlineUsers}
                  clientId={clientIdRef.current}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomView;
