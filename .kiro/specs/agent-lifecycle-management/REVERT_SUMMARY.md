# Agent Lifecycle Management - Revert to Simple System

## Date: November 21, 2025

## Decision

Reverted from complex agent reuse system back to simple single-agent dispatch model where each page refresh creates a fresh agent.

## Reason

The agent reuse system was proving buggy and complex:
- Agent persistence issues during page refresh
- Type coercion problems with OpenAI Realtime API
- Complexity of tracking agent state across sessions
- Cleanup worker coordination challenges

The simpler approach is more reliable and easier to maintain.

## Changes Made

### 1. Simplified Dispatch Agent API

**File**: `voice-todo-app/app/api/livekit/dispatch-agent/route.ts`

**Before**: 
- Complex reuse logic with agent tracking
- Stale dispatch cleanup
- TTL management
- Retry logic with exponential backoff

**After**:
- Simple dispatch creation
- No reuse logic
- No tracking
- Direct dispatch creation

**Code Reduction**: ~250 lines → ~60 lines

### 2. Reverted Agent Configuration

**File**: `agent-starter-node/src/agent.ts`

**Before**:
```typescript
inputOptions: {
  closeOnDisconnect: false, // Keep agent alive
}
```

**After**:
```typescript
// Default behavior - agent closes when participant disconnects
```

### 3. Removed Cleanup Worker Initialization

**File**: `voice-todo-app/instrumentation.ts`

**Before**:
- Initialized cleanup worker on server start
- Registered shutdown handlers
- Managed background cleanup process

**After**:
- Empty initialization
- No background workers

### 4. Files No Longer Used

These files are still in the codebase but no longer actively used:
- `voice-todo-app/lib/agent-tracker.ts` - Agent activity tracking
- `voice-todo-app/lib/cleanup-worker.ts` - Background cleanup process

**Note**: These files can be deleted in a future cleanup task if desired.

## New Behavior

### Page Refresh Flow

1. User refreshes page
2. Frontend disconnects from LiveKit room
3. Agent detects participant disconnect
4. Agent session closes automatically (default LiveKit behavior)
5. Frontend reconnects to room
6. Frontend calls `/api/livekit/dispatch-agent`
7. New agent dispatch is created
8. Fresh agent joins the room

### Benefits

- **Simplicity**: Much easier to understand and maintain
- **Reliability**: No complex state management
- **Predictability**: Each session gets a fresh agent
- **No Bugs**: Eliminates agent reuse edge cases

### Trade-offs

- **Resource Usage**: Creates new agent on each refresh (minimal impact)
- **Connection Time**: Slight delay on page refresh (acceptable)
- **No Conversation Continuity**: Agent doesn't remember previous session (acceptable for task management)

## Deployment

### Agent Service (Railway)
- **Status**: ✅ Deployed
- **Deployment ID**: eaf415b7-e443-47cd-ae95-c9f4150a3e5f
- **Configuration**: Default closeOnDisconnect behavior

### Frontend (Vercel)
- **Status**: ✅ Deployed
- **URL**: https://voice-todo-jaxeu2jhn-siddhartha-manis-projects.vercel.app
- **Deployment ID**: 3iLCgGZkh5xBZSqGNYJ3Lc6GPNYF

## Environment Variables

Removed/No longer needed:
- `AGENT_TTL_SECONDS` - No TTL management
- `CLEANUP_INTERVAL_MS` - No cleanup worker
- `LOG_RATE_LIMIT` - Still used for Railway log rate limiting

## Testing

The system now works as follows:

1. **Initial Connection**: Fresh agent dispatched
2. **Page Refresh**: Old agent closes, new agent dispatched
3. **Multiple Refreshes**: Each refresh gets a new agent
4. **No Cleanup Needed**: Agents close automatically on disconnect

## Code Quality

- **Reduced Complexity**: Removed ~300 lines of lifecycle management code
- **Fewer Dependencies**: No longer depends on agent-tracker or cleanup-worker
- **Easier Debugging**: Simpler flow, fewer moving parts
- **Better Maintainability**: Less code to maintain and test

## Future Considerations

If agent reuse becomes necessary in the future:
1. Consider using LiveKit's built-in agent pooling
2. Implement server-side session management
3. Use Redis or similar for distributed state
4. Add comprehensive monitoring and alerting

For now, the simple approach is the right choice.

---

**Status**: ✅ Complete and Deployed

The system is now simpler, more reliable, and easier to maintain.
