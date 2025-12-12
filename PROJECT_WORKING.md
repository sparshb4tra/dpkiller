# noteai - Project Working Documentation

> **Reference document for AI assistants and future development**

## Overview

noteai is a real-time collaborative AI chat application with an integrated notepad, inspired by dontpad.com. Users can create/join rooms via URL (like `/#/myroom`) and collaborate in real-time.

## Core Features

1. **URL-based Rooms** - Type any URL like `/#/myroom` to create/join a room
2. **Real-time Sync** - Multiple users see changes instantly (like dontpad.com)
3. **AI Chat** - Gemini-powered AI assistant that can see the notepad content
4. **Collaborative Notepad** - Shared notes that sync across all users
5. **Presence** - See who's online and who's typing

---

## Architecture

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + CSS Variables
- **AI**: Google Gemini API (`@google/genai`)
- **Real-time Sync**: Supabase Realtime (Broadcast Channels)
- **Database**: Supabase PostgreSQL

### Key Files

```
src/
├── App.tsx                    # Hash router, routes to rooms
├── components/
│   ├── RoomView.tsx          # Main room component (sync logic lives here)
│   ├── Chat.tsx              # AI chat interface
│   ├── Editor.tsx            # Notepad textarea
│   ├── Header.tsx            # Top bar with room info
│   └── HomeView.tsx          # Landing page
├── services/
│   ├── syncService.ts        # ⭐ MAIN SYNC LOGIC (Supabase Broadcast)
│   ├── geminiService.ts      # AI chat streaming
│   └── storageService.ts     # Local storage fallback
└── types.ts                  # TypeScript interfaces
```

---

## How Real-time Sync Works (Dontpad-style)

### The Problem with Naive Approaches
- **Polling**: Too slow, wastes bandwidth
- **postgres_changes**: Waits for DB write before broadcast (200-500ms latency)
- **Pure WebSockets**: Requires custom server

### Our Solution: Supabase Broadcast Channels

```
User A types → Broadcast to channel → User B sees instantly
                    ↓
              Debounced save to DB (for persistence)
```

### Key Concepts

1. **INSTANT Broadcast** (no DB roundtrip)
   - When user types, we broadcast to all connected clients immediately
   - This is peer-to-peer style - no waiting for database

2. **Debounced Database Save**
   - We save to Supabase every 500ms of inactivity
   - This is for persistence, NOT for sync

3. **Typing Detection**
   - When you're typing, we ignore incoming content updates
   - This prevents cursor jumping
   - After 1.5s of no typing, we accept remote updates again

4. **Presence Tracking**
   - Supabase Presence shows who's online
   - We broadcast `isTyping` state for live indicators

### Code Flow (in `syncService.ts`)

```typescript
// 1. Connect to room
const channel = supabase.channel(`room-sync:${roomId}`)
  .on('broadcast', { event: 'sync' }, handleIncomingSync)
  .on('presence', { event: 'sync' }, handlePresence)
  .subscribe();

// 2. When user types
broadcastContent(newContent);     // INSTANT to other users
scheduleSave(roomData);           // Debounced DB save

// 3. When receiving broadcast
if (!isTyping) {
  applyRemoteContent(incomingContent);
}
```

---

## Database Schema (Supabase)

Run this SQL in the Supabase SQL Editor to create the table:

```sql
-- Create the rooms table with camelCase column names
-- (Supabase preserves case when using double quotes)
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  content TEXT DEFAULT '',
  messages JSONB DEFAULT '[]'::jsonb,
  "updatedAt" BIGINT DEFAULT 0,
  "lastEditor" JSONB
);

-- Enable Realtime for this table (REQUIRED for sync!)
-- Go to Database > Replication > Add the "rooms" table
-- Or run:
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

-- Enable Row Level Security (required by Supabase)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access (for MVP - customize for production)
CREATE POLICY "Allow anonymous read" ON rooms FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update" ON rooms FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous delete" ON rooms FOR DELETE USING (true);
```

### Important: Enable Realtime
1. Go to Supabase Dashboard → Database → Replication
2. Click "0 tables" next to `supabase_realtime`
3. Toggle ON the `rooms` table
4. This enables real-time updates!

---

## Environment Variables

```env
# Required for AI chat
VITE_API_KEY=your_gemini_api_key

# Required for real-time sync
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## Data Types

```typescript
interface RoomData {
  id: string;              // Room identifier (from URL)
  content: string;         // Notepad content
  messages: ChatMessage[]; // Chat history
  updatedAt: number;       // Unix timestamp
  lastEditor?: {           // Who edited last
    id: string;
    label: string;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number;
  isStreaming?: boolean;   // True while AI is typing
  senderId?: string;       // Client ID
  senderLabel?: string;    // Display name
}
```

---

## Sync Service API (`syncService.ts`)

```typescript
// Check if Supabase is configured
hasSupabase: boolean

// Database operations
fetchRoom(roomId: string): Promise<RoomData | null>
upsertRoom(room: RoomData): Promise<boolean>

// Sync channel class
class RoomSyncChannel {
  constructor(roomId, clientId, clientLabel, callbacks)
  
  connect(): Promise<RoomData | null>  // Connect and return initial data
  broadcastContent(content: string)    // Send content to other users
  broadcastMessages(messages: ChatMessage[]) // Send messages to other users
  updatePresence(isTyping: boolean)    // Update typing status
  scheduleSave(room: RoomData)         // Debounced database save
  forceSave(room: RoomData)            // Immediate save (before disconnect)
  disconnect()                         // Clean up
}
```

---

## Component Props

### RoomView
Main orchestrator - handles all sync logic.

### Editor
```typescript
interface EditorProps {
  content: string;
  onChange: (value: string) => void;
  lastEditor?: { id: string; label: string } | null;
  onlineUsers?: { id: string; label: string; isTyping: boolean }[];
  clientId?: string;
}
```

### Chat
```typescript
interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  clientId: string;
}
```

### Header
```typescript
interface HeaderProps {
  roomId: string;
  onCopyLink: () => void;
  onNewRoom: () => void;
  showCopied: boolean;
  isSaved: boolean;
  onToggleTheme: () => void;
  isDark: boolean;
  onToggleNotes: () => void;
  isNotesOpen: boolean;
  isConnected?: boolean;
  onlineCount?: number;
}
```

---

## Running the Project

```bash
# Install dependencies
npm install

# Create .env file with your keys
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev

# Build for production
npm run build
```

---

## Troubleshooting

### "Sync not working"
1. Check browser console for `[Sync]` logs
2. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
3. Ensure Realtime is enabled on the `rooms` table in Supabase dashboard
4. Check Supabase dashboard → Realtime → Logs for connection issues

### "AI not responding"
1. Check browser console for Gemini errors
2. Verify `VITE_API_KEY` is set correctly
3. Ensure you have API quota remaining

### "Cursor jumping while typing"
- This shouldn't happen with our typing detection
- If it does, increase the typing timeout (currently 1.5s)

### "Changes not persisting after refresh"
- Check Supabase dashboard to see if rows are being created
- Verify RLS policies allow writes
- Check browser console for `[Sync] upsertRoom error`

---

## Future Improvements

1. **Operational Transforms** - For true collaborative editing (like Google Docs)
2. **Cursor Sharing** - Show other users' cursor positions
3. **User Authentication** - Named users instead of random Guest IDs
4. **Room History** - Undo/redo across all users
5. **File Attachments** - Upload images/documents to notes
6. **Multiple AI Models** - Support for Claude, GPT, etc.

---

## Key Design Decisions

1. **Broadcast over postgres_changes**
   - 10-50ms vs 200-500ms latency
   - No DB roundtrip for sync

2. **Typing detection blocks remote updates**
   - Prevents cursor jumping
   - Simple and effective (like dontpad)

3. **Debounced saves (500ms)**
   - Reduces database writes
   - Still feels instant to users

4. **Local storage fallback**
   - Works offline or without Supabase
   - Same-tab storage sync

5. **Hash routing**
   - Simple, no server config needed
   - Works on any static host

