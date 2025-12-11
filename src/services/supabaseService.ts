import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { RoomData } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export const hasSupabase = Boolean(supabaseUrl && supabaseKey);

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
  const payload = { ...room, updatedAt: Date.now() };
  const { error } = await supabase.from("rooms").update(payload).eq("id", room.id);
  if (error) {
    console.warn("Supabase updateRoom error", error.message);
  }
};

export const subscribeToRoom = (
  roomId: string,
  callback: (room: RoomData) => void
) => {
  const supabase = getClient();
  if (!supabase) return () => {};

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
          callback(payload.new as RoomData);
        }
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        // no-op; useful for debugging
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
};

