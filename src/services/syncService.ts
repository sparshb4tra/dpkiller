/**
 * REAL-TIME SYNC SERVICE
 * 
 * Uses Supabase Realtime postgres_changes for reliable cross-device sync.
 * This is more reliable than broadcast-only approach for remote devices.
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
          eventsPerSecond: 20,
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
  
  console.info("[Sync] ✅ Saved to database");
  return true;
};

// ==================== SYNC CHANNEL CLASS ====================

interface SyncCallbacks {
  onRoomUpdate: (room: RoomData, isRemote: boolean) => void;
  onPresenceUpdate: (users: { id: string; label: string; isTyping: boolean; cursor?: { x: number; y: number } }[]) => void;
  onConnectionChange: (status: 'connected' | 'disconnected' | 'connecting') => void;
}

export class RoomSyncChannel {
  private channel: RealtimeChannel | null = null;
  private roomId: string;
  private clientId: string;
  private clientLabel: string;
  private callbacks: SyncCallbacks;
  private saveTimeout: NodeJS.Timeout | null = null;
  private lastSavedHash: string = '';
  private isSaving: boolean = false;

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

  private hashRoom(room: RoomData): string {
    return `${room.content}|${room.messages.length}|${room.messages[room.messages.length - 1]?.id || ''}`;
  }

  async connect(): Promise<RoomData | null> {
    const supabase = getClient();
    if (!supabase) {
      console.warn("[Sync] No Supabase client available");
      return null;
    }

    // Fetch initial room data
    let room = await fetchRoom(this.roomId);
    console.info("[Sync] Initial fetch:", room ? "found" : "not found");

    // Create channel for this room
    const channelName = `room:${this.roomId}`;
    console.info("[Sync] Subscribing to channel:", channelName);
    
    this.channel = supabase.channel(channelName, {
      config: {
        presence: { key: this.clientId },
      },
    });

    // Listen for database changes - THIS IS THE RELIABLE SYNC
    this.channel.on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'rooms',
        filter: `id=eq.${this.roomId}`
      },
      (payload) => {
        console.info("[Sync] 📦 Database change:", payload.eventType);
        
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          const newData = payload.new as RoomData;
          
          if (newData) {
            const newHash = this.hashRoom(newData);
            
            // Skip if this is our own save (hash matches what we just saved)
            if (newHash === this.lastSavedHash && this.isSaving) {
              console.info("[Sync] Skipping own update");
              return;
            }
            
            console.info("[Sync] ✅ Applying remote update");
            this.callbacks.onRoomUpdate(newData, true);
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
        cursor: p.cursor,
      }));
      this.callbacks.onPresenceUpdate(users);
    });

    // Subscribe and track status
    this.channel.subscribe((status, err) => {
      console.info("[Sync] Channel status:", status, err ? `Error: ${err}` : "");
      
      if (status === 'SUBSCRIBED') {
        console.info("[Sync] ✅ Connected and listening for changes");
        this.callbacks.onConnectionChange('connected');
        
        // Track our presence
        this.channel?.track({
          clientId: this.clientId,
          clientLabel: this.clientLabel,
          isTyping: false,
          joinedAt: Date.now(),
        });
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        console.warn("[Sync] ❌ Disconnected");
        this.callbacks.onConnectionChange('disconnected');
      } else {
        this.callbacks.onConnectionChange('connecting');
      }
    });

    return room;
  }

  // Update presence (typing indicator)
  updatePresence(isTyping: boolean, cursor?: { x: number; y: number }) {
    this.channel?.track({
      clientId: this.clientId,
      clientLabel: this.clientLabel,
      isTyping,
      cursor,
      joinedAt: Date.now(),
    });
  }

  // Save to database - this triggers postgres_changes for other clients
  async saveRoom(room: RoomData): Promise<boolean> {
    this.isSaving = true;
    this.lastSavedHash = this.hashRoom(room);
    
    const success = await upsertRoom(room);
    
    // Reset saving flag after a short delay
    setTimeout(() => {
      this.isSaving = false;
    }, 500);
    
    return success;
  }

  // Debounced save (for typing - saves after 300ms of inactivity)
  scheduleSave(room: RoomData) {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.saveRoom(room);
    }, 300);
  }

  // Immediate save (for messages)
  async immediateSave(room: RoomData): Promise<boolean> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    return await this.saveRoom(room);
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
