Docs
Realtime Cursor
Realtime Cursor

Real-time cursor sharing for collaborative applications
Installation
npx shadcn@latest add @supabase/realtime-cursor-nextjs
Open in
Folder structure

import { cn } from '@/lib/utils'
import { MousePointer2 } from 'lucide-react'

export const Cursor = ({
  className,
  style,
  color,
  name,
}: {
  className?: string
  style?: React.CSSProperties
  color: string
  name: string
}) => {
  return (
    <div className={cn('pointer-events-none', className)} style={style}>
      <MousePointer2 color={color} fill={color} size={30} />

      <div
        className="mt-1 px-2 py-1 rounded text-xs font-bold text-white text-center"
        style={{ backgroundColor: color }}
      >
        {name}
      </div>
    </div>
  )

}

Introduction

The Realtime Cursors component lets users share their cursor position with others in the same room—perfect for real-time collaboration. It handles all the setup and boilerplate for you, so you can add it to your app with minimal effort.

Features

    Broadcast cursor position to other users in the same room
    Customizable cursor appearance
    Presence detection (automatically joins/leaves users)
    Low-latency updates using Supabase Realtime
    Room-based isolation for scoped collaboration

Usage

The Realtime Cursor component is designed to be used in a room. It can be used to build real-time collaborative applications. Add the <RealtimeCursors /> component to your page and it will render realtime cursors from other users in the room.

'use client'
import { RealtimeCursors } from '@/components/realtime-cursors'
 
export default function Page() {
  return (
    <div className="w-full min-h-screen">
      <RealtimeCursors roomName="macrodata_refinement_office" username="Mark Scout" />
    </div>
  )
}

Props
Prop	Type	Description
roomName	string	Unique identifier for the shared room or session.
username	string	Name of the current user; used to track and label cursors.
Further reading

    Realtime Broadcast
    Realtime authorization

Smoother cursors

While our Realtime Cursor component aims to keep things simple and lightweight, you may want to add smoother cursor animations for a more polished experience. Libraries like perfect-cursors can be integrated to add sophisticated interpolation between cursor positions. This is especially useful when dealing with network latency, as it creates fluid cursor movements even when position updates are received at longer intervals (e.g., every 50-80ms). The library handles the complex math of creating natural-looking cursor paths while maintaining performance.