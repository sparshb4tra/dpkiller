export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
  isStreaming?: boolean;
  senderId?: string;
  senderLabel?: string;
}

export interface RoomData {
  id: string;
  content: string;
  messages: ChatMessage[];
  updatedAt: number;
  lastEditor?: { id: string; label: string };
}

export type ViewMode = 'editor' | 'chat' | 'split';
