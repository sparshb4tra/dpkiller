import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { RoomData } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export const hasSupabase = Boolean(supabaseUrl && supabaseKey);

// Health logging for debugging sync issues
export const logSupabaseHealth = () => {
  console.info("[Supabase Health]", {
    envPresent: {
      VITE_SUPABASE_URL: Boolean(supabaseUrl),
      VITE_SUPABASE_ANON_KEY: Boolean(supabaseKey),
    },
    clientInitialized: Boolean(client),
    hasSupabase,
  });
};

const getClient = () => {
  if (!hasSupabase) return null;
  if (!client) {
    client = createClient(supabaseUrl!, supabaseKey!, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return client;
};

export const fetchRoom = async (roomId: string): Promise<RoomData | null> => {
  const supabase = getClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (error) {
    console.error("[Supabase] fetchRoom error:", error.message);
    return null;
  }
  return data as RoomData | null;
};

export const upsertRoom = async (room: RoomData): Promise<boolean> => {
  const supabase = getClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("rooms")
    .upsert(room, { onConflict: "id" });

  if (error) {
    console.error("[Supabase] upsertRoom error:", error.message);
    return false;
  }
  return true;
};

// Legacy functions for compatibility
export const insertRoomIfMissing = async (room: RoomData): Promise<void> => {
  await upsertRoom(room);
};

export const updateRoom = async (room: RoomData): Promise<void> => {
  await upsertRoom(room);
};

// Simple realtime subscription - just broadcasts all changes
export const subscribeToRoom = (
  roomId: string,
  onUpdate: (room: RoomData) => void,
  onStatus?: (status: string) => void
) => {
  const supabase = getClient();
  if (!supabase) {
    console.warn("[Supabase] No client - cannot subscribe");
    return () => {};
  }

  console.info("[Supabase] Subscribing to room:", roomId);

  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "rooms",
        filter: `id=eq.${roomId}`,
      },
      (payload) => {
        console.info("[Supabase] Realtime event:", payload.eventType);
        if (payload.new && typeof payload.new === "object") {
          onUpdate(payload.new as RoomData);
        }
      }
    )
    .subscribe((status, err) => {
      console.info("[Supabase] Subscription status:", status, err || "");
      if (onStatus) onStatus(status);
    });

  return () => {
    console.info("[Supabase] Unsubscribing from room:", roomId);
    supabase.removeChannel(channel);
  };
};
