# Agent Lifecycle Management - LiveKit Best Practices

## Problem Analysis

### Current Issue
When implementing agent reuse, the agent dispatch is reused correctly but **the agent doesn't respond** because:

1. **Agent Session Lifecycle**: `AgentSession` closes when the linked participant disconnects (default: `close_on_disconnect: True`)
2. **Room Deletion**: When session closes, room is deleted by default (`delete_room_on_close: True`)
3. **Dispatch Consumption**: Agent dispatches are consumed once - they cannot be reused for new sessions
4. **Connection State**: Page refresh creates a new WebRTC connection, but old agent session is already closed

## Solution: Two Recommended Patterns

### Pattern 1: Persistent Room with Fresh Agent Dispatch (RECOMMENDED)

This pattern maintains conversation continuity while properly managing agent lifecycle.

#### Architecture
```
User Refresh → Same Room → New Agent Dispatch → New Agent Session
```

#### Implementation

**Frontend Changes:**

```typescript
// voice-todo-app/lib/useLivekit.ts

export function useLivekit({
  roomName,
  participantName,
  onTranscript,
  onError,
}: UseLivekitOptions): UseLivekitReturn {
  // Use consistent room name (not random)
  const [persistentRoomName] = useState(() => {
    // Get from localStorage or generate once
    const stored = localStorage.getItem('livekit_room_name');
    if (stored) return stored;
    
    const newRoom = `voice-todo-room-${Date.now()}`;
    localStorage.setItem('livekit_room_name', newRoom);
    return newRoom;
  });

  const connect = useCallback(async () => {
    // ... existing connection code ...
    
    // ALWAYS dispatch a new agent (don't check for existing)
    try {
      const dispatchResponse = await fetch('/api/livekit/dispatch-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomName: persistentRoomName,  // Use persistent room
          timezone,
          timezoneOffset,
        }),
      });

      const dispatchData = await dispatchResponse.json();
      console.log(`[${new Date().toISOString()}] Created new agent dispatch: ${dispatchData.dispatchId}`);
    } catch (dispatchError) {
      console.warn('Error dispatching agent:', dispatchError);
    }
  }, [persistentRoomName]);

  // Clear room on explicit disconnect
  const disconnect = useCallback(() => {
    localStorage.removeItem('livekit_room_name');
    // ... existing disconnect code ...
  }, []);
}
```

**Backend Changes:**

```typescript
// voice-todo-app/app/api/livekit/dispatch-agent/route.ts

export async function POST(request: Request) {
  const { roomName, timezone, timezoneOffset } = await request.json();

  // ALWAYS create a new dispatch (remove reuse logic)
  const dispatch = await agentDispatchClient.createDispatch(
    roomName,
    'voice-todo-agent',  // Must match agent_name in agent code
    {
      metadata: JSON.stringify({
        timezone: timezone || 'UTC',
        timezoneOffset: timezoneOffset || 0,
      }),
    }
  );

  return NextResponse.json({
    dispatchId: dispatch.id,
    reused: false,  // Always false now
  });
}
```

**Agent Changes:**

```typescript
// agent-starter-node/src/agent.ts

export default defineAgent({
  // CRITICAL: Set agent_name for explicit dispatch
  agentName: 'voice-todo-agent',
  
  entry: async (ctx: JobContext) => {
    // Configure session to NOT delete room on close
    const session = new voice.AgentSession({
      stt: /* ... */,
      llm: /* ... */,
      tts: /* ... */,
    });

    await session.start({
      room: ctx.room,
      agent: new voice.Agent({
        instructions: /* ... */,
      }),
      inputOptions: {
        // CRITICAL: Don't close session when participant disconnects
        closeOnDisconnect: false,
        // CRITICAL: Don't delete room when session closes
        deleteRoomOnClose: false,
      },
    });

    // Handle participant disconnect gracefully
    ctx.room.on('participantDisconnected', (participant) => {
      console.log(`Participant ${participant.identity} disconnected`);
      
      // Wait for potential reconnect (30 seconds)
      setTimeout(async () => {
        const remainingParticipants = Array.from(ctx.room.remoteParticipants.values());
        
        if (remainingParticipants.length === 0) {
          console.log('No participants remaining, shutting down agent');
          await session.shutdown();
        }
      }, 30000);  // 30 second grace period
    });
  },
});
```

### Pattern 2: Clean Shutdown with New Room (SIMPLER)

This pattern creates a fresh start on each page load.

#### Architecture
```
User Refresh → New Room → New Agent Dispatch → New Agent Session
```

#### Implementation

**Frontend Changes:**

```typescript
// voice-todo-app/lib/useLivekit.ts

export function useLivekit({
  roomName,
  participantName,
  onTranscript,
  onError,
}: UseLivekitOptions): UseLivekitReturn {
  // Generate unique room name each time
  const [uniqueRoomName] = useState(() => `voice-todo-room-${Date.now()}`);

  const connect = useCallback(async () => {
    // ... existing connection code with uniqueRoomName ...
    
    // Dispatch agent to new room
    await fetch('/api/livekit/dispatch-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        roomName: uniqueRoomName,
        timezone,
        timezoneOffset,
      }),
    });
  }, [uniqueRoomName]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Delete room when component unmounts
      fetch('/api/livekit/delete-room', {
        method: 'POST',
        body: JSON.stringify({ roomName: uniqueRoomName }),
      });
    };
  }, [uniqueRoomName]);
}
```

**Backend Changes:**

```typescript
// voice-todo-app/app/api/livekit/delete-room/route.ts (NEW)

import { RoomServiceClient } from 'livekit-server-sdk';

export async function POST(request: Request) {
  const { roomName } = await request.json();
  
  const roomService = new RoomServiceClient(
    process.env.LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );

  try {
    await roomService.deleteRoom(roomName);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting room:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
```

**Agent Changes:**

```typescript
// agent-starter-node/src/agent.ts

export default defineAgent({
  agentName: 'voice-todo-agent',
  
  entry: async (ctx: JobContext) => {
    const session = new voice.AgentSession({
      stt: /* ... */,
      llm: /* ... */,
      tts: /* ... */,
    });

    await session.start({
      room: ctx.room,
      agent: new voice.Agent({
        instructions: /* ... */,
      }),
      inputOptions: {
        // Default behavior: close on disconnect
        closeOnDisconnect: true,
        // Default behavior: delete room on close
        deleteRoomOnClose: true,
      },
    });

    // Agent will automatically shut down when participant disconnects
  },
});
```

## Comparison

| Feature | Pattern 1 (Persistent Room) | Pattern 2 (Clean Shutdown) |
|---------|------------------------------|----------------------------|
| **Conversation History** | ✅ Preserved across refreshes | ❌ Lost on refresh |
| **Complexity** | Higher | Lower |
| **Resource Usage** | Moderate (room persists) | Lower (clean slate) |
| **User Experience** | Better (continuity) | Simpler (fresh start) |
| **Best For** | Production apps | MVP/Testing |

## Why Your Current Approach Doesn't Work

### The Reuse Problem

```typescript
// ❌ WRONG: Trying to reuse agent dispatch
const existingDispatches = await agentDispatchClient.listDispatch(roomName);
if (existingDispatches.length > 0) {
  return { dispatchId: existingDispatches[0].id, reused: true };
}
```

**Why it fails:**
1. Agent dispatch is **consumed** when agent joins room
2. Reused dispatch ID doesn't trigger a new agent session
3. Old agent session is already closed (participant disconnected)
4. No new agent joins the room → no response

### The Correct Flow

```typescript
// ✅ CORRECT: Always create new dispatch
const dispatch = await agentDispatchClient.createDispatch(
  roomName,
  'voice-todo-agent',
  { metadata: JSON.stringify({ timezone, timezoneOffset }) }
);
```

**Why it works:**
1. New dispatch creates new agent session
2. Agent joins room (new or existing)
3. Agent is ready to respond
4. Proper lifecycle management

## Recommended Implementation Steps

### For Your Assignment (Pattern 2 - Simpler)

1. **Remove agent reuse logic** from dispatch-agent API
2. **Generate unique room names** on each page load
3. **Keep default session options** (closeOnDisconnect: true, deleteRoomOnClose: true)
4. **Add room cleanup** on page unload (optional)

### For Production (Pattern 1 - Better UX)

1. **Implement persistent room names** (localStorage)
2. **Always create new agent dispatch** (no reuse)
3. **Configure session options** (closeOnDisconnect: false, deleteRoomOnClose: false)
4. **Add grace period** for reconnection (30 seconds)
5. **Implement room cleanup** after timeout

## Key LiveKit Concepts

### Agent Dispatch
- **Purpose**: Tells LiveKit to start an agent for a specific room
- **Lifecycle**: Consumed once when agent joins
- **Cannot be reused**: Each connection needs a new dispatch

### Agent Session
- **Purpose**: Manages the agent's interaction with the room
- **Lifecycle**: Starts when agent joins, ends when closed
- **Options**: Control disconnect and room deletion behavior

### Room Persistence
- **Purpose**: Maintain conversation context across connections
- **Benefit**: Better user experience with history
- **Trade-off**: Requires explicit cleanup logic

## Testing Checklist

- [ ] Agent responds on first connection
- [ ] Agent responds after page refresh
- [ ] Agent shuts down when no participants
- [ ] Room is cleaned up properly
- [ ] No orphaned agents or rooms
- [ ] Conversation history preserved (Pattern 1 only)
- [ ] Multiple users can connect simultaneously

## References

- [LiveKit Agent Dispatch](https://docs.livekit.io/agents/server/agent-dispatch)
- [Agent Session Lifecycle](https://docs.livekit.io/agents/build/sessions)
- [Job Lifecycle](https://docs.livekit.io/agents/server/job)
- [Room Management](https://docs.livekit.io/home/server/managing-rooms)
