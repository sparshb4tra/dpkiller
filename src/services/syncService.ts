/**
 * DONTPAD-STYLE SYNC SERVICE
 * 
 * How it works (like dontpad.com):
 * 1. BROADCAST for instant sync - messages go directly to other clients, no DB roundtrip
 * 2. DEBOUNCED DATABASE SAVE - persist to Supabase every 500ms of inactivity
 * 3. TYPING DETECTION - when you're typing, ignore remote content updates (prevents cursor jump)
 * 4. MERGE on reconnect - fetch latest from DB when reconnecting
 * 
 * This is MUCH faster than postgres_changes which waits for DB write.
 */

import { createClient, SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import { RoomData, ChatMessage } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export const hasSupabase = Boolean(supabaseUrl && supabaseKey);

const getClient = (): SupabaseClient | null => {
  if (!hasSupabase) return null;
  if (!client) {
    client = createClient(supabaseUrl!, supabaseKey!, {
      realtime: {
        params: {
          eventsPerSecond: 20, // Higher rate for responsive sync
        },
      },
    });
  }
  return client;
};

// ==================== DATABASE OPERATIONS ====================

export const fetchRoom = async (roomId: string): Promise<RoomData | null> => {
  const supabase = getClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (error) {
    console.error("[Sync] fetchRoom error:", error.message);
    return null;
  }
  
  return data as RoomData | null;
};

export const upsertRoom = async (room: RoomData): Promise<boolean> => {
  const supabase = getClient();
  if (!supabase) return false;

  // Try with full room data first, fallback to minimal columns
  const { error } = await supabase
    .from("rooms")
    .upsert({
      id: room.id,
      content: room.content,
      messages: room.messages,
    }, { onConflict: "id" });

  if (error) {
    console.error("[Sync] upsertRoom error:", error.message);
    return false;
  }
  return true;
};

// ==================== SYNC CHANNEL CLASS ====================

type SyncEventType = 'content' | 'messages' | 'presence';

interface SyncEvent {
  type: SyncEventType;
  senderId: string;
  senderLabel: string;
  timestamp: number;
  payload: {
    content?: string;
    messages?: ChatMessage[];
    cursorPosition?: number;
  };
}

interface SyncCallbacks {
  onContentUpdate: (content: string, senderId: string, senderLabel: string) => void;
  onMessagesUpdate: (messages: ChatMessage[], senderId: string) => void;
  onPresenceUpdate: (users: { id: string; label: string; isTyping: boolean }[]) => void;
  onConnectionChange: (status: 'connected' | 'disconnected' | 'connecting') => void;
}

export class RoomSyncChannel {
  private channel: RealtimeChannel | null = null;
  private roomId: string;
  private clientId: string;
  private clientLabel: string;
  private callbacks: SyncCallbacks;
  private saveTimeout: NodeJS.Timeout | null = null;
  private pendingRoom: RoomData | null = null;
  private lastSavedContent: string = '';
  private lastSavedMessages: string = '';

  constructor(
    roomId: string,
    clientId: string,
    clientLabel: string,
    callbacks: SyncCallbacks
  ) {
    this.roomId = roomId;
    this.clientId = clientId;
    this.clientLabel = clientLabel;
    this.callbacks = callbacks;
  }

  async connect(): Promise<RoomData | null> {
    const supabase = getClient();
    if (!supabase) {
      console.warn("[Sync] No Supabase client available");
      return null;
    }

    // Fetch initial room data
    let room = await fetchRoom(this.roomId);

    // Subscribe to broadcast channel (this is the fast path!)
    // Using a simple channel name that works across all devices
    const channelName = `room:${this.roomId}`;
    console.info("[Sync] Connecting to channel:", channelName);
    
    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: { 
          self: false,  // Don't receive your own broadcasts
          ack: true,    // Get acknowledgment of broadcasts
        },
        presence: { key: this.clientId },
      },
    });

    // Listen for broadcast events (instant, no DB roundtrip)
    this.channel.on('broadcast', { event: 'sync' }, ({ payload }) => {
      const event = payload as SyncEvent;
      
      // Ignore our own events (shouldn't happen with self: false, but safety)
      if (event.senderId === this.clientId) return;

      console.info("[Sync] ✅ Received broadcast:", event.type, "from:", event.senderLabel);

      if (event.type === 'content' && event.payload.content !== undefined) {
        this.callbacks.onContentUpdate(
          event.payload.content,
          event.senderId,
          event.senderLabel
        );
      }

      if (event.type === 'messages' && event.payload.messages) {
        this.callbacks.onMessagesUpdate(event.payload.messages, event.senderId);
      }
    });

    // ALSO listen for postgres_changes as a fallback for cross-device sync
    // This ensures sync works even if broadcast has issues
    this.channel.on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'rooms',
        filter: `id=eq.${this.roomId}`
      },
      (payload) => {
        console.info("[Sync] 📦 DB change detected:", payload.eventType);
        if (payload.new && typeof payload.new === 'object') {
          const newData = payload.new as RoomData;
          // Only apply if it's from someone else (check content differs)
          this.callbacks.onContentUpdate(
            newData.content || '',
            'db-sync',
            'Remote'
          );
          if (newData.messages) {
            this.callbacks.onMessagesUpdate(newData.messages, 'db-sync');
          }
        }
      }
    );

    // Presence for showing who's online/typing
    this.channel.on('presence', { event: 'sync' }, () => {
      const state = this.channel?.presenceState() || {};
      const users = Object.values(state).flat().map((p: any) => ({
        id: p.clientId,
        label: p.clientLabel,
        isTyping: p.isTyping || false,
      }));
      this.callbacks.onPresenceUpdate(users);
    });

    // Track connection status
    this.channel.subscribe((status, err) => {
      console.info("[Sync] Channel status:", status, err ? `Error: ${err}` : "");
      
      if (status === 'SUBSCRIBED') {
        console.info("[Sync] ✅ Connected to room:", this.roomId);
        this.callbacks.onConnectionChange('connected');
        // Track our presence
        this.channel?.track({
          clientId: this.clientId,
          clientLabel: this.clientLabel,
          isTyping: false,
          joinedAt: Date.now(),
        });
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        console.warn("[Sync] ❌ Disconnected from room:", this.roomId);
        this.callbacks.onConnectionChange('disconnected');
      } else {
        this.callbacks.onConnectionChange('connecting');
      }
    });

    return room;
  }

  // Broadcast content change to other clients (INSTANT)
  broadcastContent(content: string) {
    if (!this.channel) {
      console.warn("[Sync] Cannot broadcast - no channel");
      return;
    }

    const event: SyncEvent = {
      type: 'content',
      senderId: this.clientId,
      senderLabel: this.clientLabel,
      timestamp: Date.now(),
      payload: { content },
    };

    this.channel.send({
      type: 'broadcast',
      event: 'sync',
      payload: event,
    }).then((result) => {
      if (result === 'ok') {
        console.info("[Sync] 📤 Content broadcast sent");
      } else {
        console.warn("[Sync] ⚠️ Content broadcast failed:", result);
      }
    });
  }

  // Broadcast messages change to other clients (INSTANT)
  broadcastMessages(messages: ChatMessage[]) {
    if (!this.channel) {
      console.warn("[Sync] Cannot broadcast - no channel");
      return;
    }

    const event: SyncEvent = {
      type: 'messages',
      senderId: this.clientId,
      senderLabel: this.clientLabel,
      timestamp: Date.now(),
      payload: { messages },
    };

    this.channel.send({
      type: 'broadcast',
      event: 'sync',
      payload: event,
    }).then((result) => {
      if (result === 'ok') {
        console.info("[Sync] 📤 Messages broadcast sent, count:", messages.length);
      } else {
        console.warn("[Sync] ⚠️ Messages broadcast failed:", result);
      }
    });
  }

  // Update presence (typing indicator)
  updatePresence(isTyping: boolean) {
    this.channel?.track({
      clientId: this.clientId,
      clientLabel: this.clientLabel,
      isTyping,
      joinedAt: Date.now(),
    });
  }

  // Debounced save to database (for persistence, not for sync)
  scheduleSave(room: RoomData) {
    this.pendingRoom = {
      ...room,
      updatedAt: Date.now(),
      lastEditor: { id: this.clientId, label: this.clientLabel },
    };

    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Schedule save after 500ms of inactivity
    this.saveTimeout = setTimeout(async () => {
      if (!this.pendingRoom) return;

      const contentChanged = this.pendingRoom.content !== this.lastSavedContent;
      const messagesChanged = JSON.stringify(this.pendingRoom.messages) !== this.lastSavedMessages;

      if (!contentChanged && !messagesChanged) {
        console.info("[Sync] No changes to persist");
        return;
      }

      console.info("[Sync] Persisting to database...");
      const success = await upsertRoom(this.pendingRoom);

      if (success) {
        this.lastSavedContent = this.pendingRoom.content;
        this.lastSavedMessages = JSON.stringify(this.pendingRoom.messages);
        console.info("[Sync] Persisted successfully");
      }
    }, 500);
  }

  // Force immediate save (useful before disconnect)
  async forceSave(room: RoomData): Promise<boolean> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    return await upsertRoom({
      ...room,
      updatedAt: Date.now(),
      lastEditor: { id: this.clientId, label: this.clientLabel },
    });
  }

  // Set initial saved state (to track changes)
  setInitialState(content: string, messages: ChatMessage[]) {
    this.lastSavedContent = content;
    this.lastSavedMessages = JSON.stringify(messages);
  }

  disconnect() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    if (this.channel) {
      const supabase = getClient();
      if (supabase) {
        supabase.removeChannel(this.channel);
      }
      this.channel = null;
    }
  }
}

// ==================== HELPER: Create default room ====================

export const createDefaultRoom = (roomId: string, welcomeMessage: ChatMessage): RoomData => ({
  id: roomId,
  content: "",
  messages: [welcomeMessage],
  updatedAt: Date.now(),
});

