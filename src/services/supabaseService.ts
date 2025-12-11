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
    .single();

  if (error) {
    console.warn("Supabase fetchRoom error", error.message);
    return null;
  }
  return data as RoomData;
};

export const saveRoom = async (room: RoomData): Promise<void> => {
  const supabase = getClient();
  if (!supabase) return;
  const payload = { ...room, updatedAt: Date.now() };
  const { error } = await supabase.from("rooms").upsert(payload);
  if (error) {
    console.warn("Supabase saveRoom error", error.message);
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
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

