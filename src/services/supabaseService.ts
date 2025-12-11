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
    client = createClient(supabaseUrl!, supabaseKey!);
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
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Supabase fetchRoom error", error.message);
    return null;
  }
  return data as RoomData | null;
};

export const insertRoomIfMissing = async (room: RoomData): Promise<void> => {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase.from("rooms").insert({ ...room, updatedAt: Date.now() }).select("id");
  if (error && error.code !== "23505") {
    // 23505 = duplicate key, ignore
    console.warn("Supabase insertRoomIfMissing error", error.message);
  }
};

export const updateRoom = async (room: RoomData): Promise<void> => {
  const supabase = getClient();
  if (!supabase) return;
  // IMPORTANT: Do NOT override updatedAt here - use the timestamp passed in from persistRoom
  // This prevents echo loops where we receive our own update back via realtime
  const { error } = await supabase.from("rooms").update(room).eq("id", room.id);
  if (error) {
    console.warn("Supabase updateRoom error", error.message);
  }
};

export const subscribeToRoom = (
  roomId: string,
  callback: (room: RoomData) => void,
  onStatusChange?: (status: string) => void
) => {
  const supabase = getClient();
  if (!supabase) {
    console.warn("[Supabase] Cannot subscribe - client not initialized");
    return () => {};
  }

  const channel = supabase
    .channel(`room-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "rooms",
        filter: `id=eq.${roomId}`,
      },
      (payload) => {
        if (payload.new) {
          const incoming = payload.new as RoomData;
          console.info("[Supabase Realtime] Payload received", {
            roomId,
            updatedAt: incoming.updatedAt,
            lastEditor: incoming.lastEditor,
            eventType: payload.eventType,
          });
          callback(incoming);
        }
      }
    )
    .subscribe((status) => {
      console.info("[Supabase Realtime] Subscription status:", status, "for room:", roomId);
      if (onStatusChange) {
        onStatusChange(status);
      }
    });

  return () => {
    console.info("[Supabase Realtime] Unsubscribing from room:", roomId);
    supabase.removeChannel(channel);
  };
};

