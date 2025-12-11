import { RoomData, ChatMessage, MessageRole } from "../types";

const STORAGE_PREFIX = "padai_room_";
const CLIENT_ID_KEY = "padai_client_id";
const CLIENT_LABEL_KEY = "padai_client_label";

const WELCOME_MESSAGES = [
  "Hello. I’m here to help you with your notes.",
  "Hey there! Ready to brainstorm?",
  "Hi! What can I help you write today?",
  "Welcome back. What are we working on?",
  "Hi! Share the room link so others can collaborate."
];

const getRandomWelcome = () =>
  WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];

export const getClientIdentity = (): { id: string; label: string } => {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  let label = localStorage.getItem(CLIENT_LABEL_KEY);

  if (!id) {
    id = Math.random().toString(36).substring(2, 7);
    localStorage.setItem(CLIENT_ID_KEY, id);
  }

  if (!label) {
    label = `Guest-${id}`;
    localStorage.setItem(CLIENT_LABEL_KEY, label);
  }

  return { id, label };
};

export const getRoom = (roomId: string): RoomData => {
  const key = `${STORAGE_PREFIX}${roomId}`;
  const stored = localStorage.getItem(key);
  
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse room data", e);
    }
  }

  // Return default new room
  return {
    id: roomId,
    content: "",
    messages: [
      {
        id: "welcome-msg",
        role: MessageRole.MODEL,
        text: getRandomWelcome(),
        senderId: "ai",
        senderLabel: "AI",
        timestamp: Date.now()
      }
    ],
    updatedAt: Date.now()
  };
};

export const saveRoom = (room: RoomData): void => {
  const key = `${STORAGE_PREFIX}${room.id}`;
  // Use the existing updatedAt from room - do NOT override
  // This keeps localStorage in sync with Supabase timestamps
  localStorage.setItem(key, JSON.stringify(room));
};

export const generateRoomId = (): string => {
  return Math.random().toString(36).substring(2, 7);
};

// New: Subscribe to changes from other tabs/windows
export const subscribeToRoom = (roomId: string, callback: (data: RoomData) => void) => {
  const key = `${STORAGE_PREFIX}${roomId}`;

  const handler = (e: StorageEvent) => {
    // Only react if the specific room key changed
    if (e.key === key && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        callback(data);
      } catch (err) {
        console.error("Sync error parsing storage data", err);
      }
    }
  };

  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
};
