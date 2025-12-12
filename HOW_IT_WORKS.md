# How noteai Works

This document explains the technical architecture and data flow of the noteai application in simple terms.

## Core Architecture

The application is built using three main components:
1. **Frontend:** React (TypeScript) running on the user's browser.
2. **Backend/Database:** Supabase (PostgreSQL) for storing data and real-time syncing.
3. **AI Service:** Groq API (Llama 3) for fast chat responses.

## 1. Room System

The application uses "hash routing" to manage rooms. When you visit the site, the URL hash determines your room.
- `padai.com/` -> Loads the Home view.
- `padai.com/#/my-room` -> Loads the Room view for the ID "my-room".

If you access a room URL that doesn't exist, the application automatically creates a new room entry in the database.

## 2. Real-Time Synchronization

The most complex part of the application is ensuring all users see the same text and messages instantly. We use a "Database-Triggered" approach.

### The Flow:
1. **User Types:** When User A types in the notepad or sends a message, the application updates their local view immediately so it feels instant.
2. **Save to Database:** The application sends this new data to Supabase.
   - For notepad edits: It waits 500ms after you stop typing (debounce) before saving, to reduce server load.
   - For chat messages: It saves immediately.
3. **Database Update:** Supabase receives the data and updates the `rooms` table in the PostgreSQL database.
4. **Broadcast to Others:** We use a feature called `postgres_changes`. Supabase watches the database. When it sees a change in the `rooms` table, it automatically sends a signal to every other user currently connected to that room.
5. **Update View:** User B's browser receives this signal, downloads the new data, and updates their screen.

This ensures that even if users are on different networks or devices, the "Database is the Source of Truth."

## 3. Live Cursor Tracking (High Performance)

For the "Other users are typing" indicators and live cursors, we use a hybrid approach for maximum speed:

1.  **User A moves mouse**:
    -   `Editor.tsx` detects movements and throttles them to ~20 times per second to prevent overloading the network.
    -   It calls `syncChannel.sendCursor(x, y)`.
2.  **Supabase Broadcast (Low Latency)**:
    -   Instead of saving to the database (which is slow), we use **Supabase Broadcast** channels. These are ephemeral messages sent directly between connected users.
3.  **Reception & Smoothing**:
    -   Other users receive these coordinates instantly.
    -   We use the **`perfect-cursors`** library to interpolate the movement. This adds "smoothing" (spline animation) between points, making the cursor look like it's gliding continuously rather than jumping from point to point.
4.  **Identity**:
    -   User names and colors are synced via **Presence** (so we know *who* the cursor belongs to), while the *position* streams via Broadcast.

## 4. AI Chat Integration

The chat system integrates directly with the document context.

1. **User Asks:** You type a message in the chat.
2. **Context Packaging:** The application takes your message AND the current text in the notepad.
3. **API Call:** It sends both to Groq API.
4. **Streaming Response:** The AI's response is "streamed" back chunk by chunk. As each word arrives, it is displayed on the screen and saved to the room history so other users can see the AI typing in real-time.

## 5. Mobile Layout Handling

To make the app feel like a native mobile app, we use specific web techniques:
- **Visual Viewport API:** We listen for changes to the visible screen size. When the mobile keyboard opens, the screen size shrinks.
- **Fixed Positioning:** The Header and Input bar are pinned to the top and bottom of the visual viewport.
- **Dynamic Padding:** When the keyboard pushes the input bar up, we add padding to the bottom of the chat list so messages aren't hidden behind the input field.

## 6. Data Structure

All data is stored in a single table called `rooms` in Supabase with this structure:
- `id`: The room name (e.g., "my-room").
- `content`: The text inside the notepad.
- `messages`: A list (JSON array) of all chat messages.
- `updatedAt`: The timestamp of the last change.

This simple structure allows for fast loading and easy synchronization.
