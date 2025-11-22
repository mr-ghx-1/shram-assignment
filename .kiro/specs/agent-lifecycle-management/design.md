# Design Document: Agent Lifecycle Management

## Overview

This design implements intelligent agent lifecycle management for the voice-todo application, preventing resource leaks from duplicate agent dispatches and implementing automatic cleanup with TTL management. The solution includes both frontend connection logic and backend dispatch management with Railway-compliant log rate limiting.

## Architecture

### High-Level Flow

```
User Connects → Check Existing Agents → Reuse or Create → Track Activity → TTL Cleanup
     ↓                    ↓                    ↓                ↓              ↓
  Frontend          Backend API         Dispatch Client    Activity Tracker  Cleanup Worker
```

### Components

1. **Frontend (useLivekit hook)**: Manages room connection and agent dispatch requests
2. **Backend API (dispatch-agent route)**: Handles agent dispatch logic with reuse checks
3. **Agent Tracker Service**: Tracks agent activity and manages TTL timers
4. **Cleanup Worker**: Periodic background process for expired agent cleanup
5. **Log Rate Limiter**: Utility to prevent Railway log rate limit violations

## Components and Interfaces

### 1. Agent Tracker Service

**Purpose**: Track active agent dispatches and their activity timestamps

**Interface**:
```typescript
interface AgentActivity {
  dispatchId: string;
  roomName: string;
  agentName: string;
  createdAt: Date;
  lastActivityAt: Date;
  participantCount: number;
  ttlExpiresAt: Date | null;
}

class AgentTracker {
  // Track agent activity
  trackActivity(dispatchId: string, roomName: string): void;
  
  // Get agent activity info
  getActivity(roomName: string, agentName: string): AgentActivity | null;
  
  // Mark agent for cleanup
  markForCleanup(dispatchId: string, ttlSeconds: number): void;
  
  // Cancel cleanup timer
  cancelCleanup(dispatchId: string): void;
  
  // Get expired agents
  getExpiredAgents(): AgentActivity[];
  
  // Remove agent from tracking
  removeAgent(dispatchId: string): void;
}
```

**Implementation Details**:
- Use in-memory Map for tracking (suitable for single-instance deployment)
- Store activity data with timestamps
- Implement TTL calculation based on last activity
- Thread-safe operations for concurrent access

### 2. Enhanced Dispatch Agent API

**Endpoint**: `POST /api/livekit/dispatch-agent`

**Request Body**:
```typescript
{
  roomName: string;
  timezone?: string;
  timezoneOffset?: number;
}
```

**Response**:
```typescript
{
  success: boolean;
  dispatchId: string;
  reused: boolean;  // New field
  message?: string;
}
```

**Logic Flow**:
1. Validate request parameters
2. Query existing dispatches for the room
3. If existing dispatch found:
   - Check if agent is still active
   - Reset TTL timer
   - Return existing dispatch ID with `reused: true`
4. If no existing dispatch or agent is dead:
   - Clean up any stale dispatches
   - Create new dispatch
   - Track in AgentTracker
   - Return new dispatch ID with `reused: false`

### 3. Agent Status API

**Endpoint**: `GET /api/livekit/agent-status?roomName={roomName}`

**Response**:
```typescript
{
  hasAgent: boolean;
  dispatchId?: string;
  createdAt?: string;
  lastActivityAt?: string;
  participantCount?: number;
  ttlExpiresAt?: string | null;
}
```

**Purpose**: Allow frontend to check agent status before connecting

### 4. Cleanup Worker

**Purpose**: Periodic background process to clean up expired agents

**Implementation**:
```typescript
class CleanupWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly intervalMs = 60000; // 60 seconds
  
  start(): void;
  stop(): void;
  private async runCleanup(): Promise<void>;
}
```

**Cleanup Logic**:
1. Query AgentTracker for expired agents
2. For each expired agent:
   - Verify no active participants in room
   - Delete dispatch via AgentDispatchClient
   - Remove from AgentTracker
   - Log cleanup action
3. Handle errors gracefully without blocking other cleanups

### 5. Log Rate Limiter

**Purpose**: Prevent Railway log rate limit violations (500 logs/sec)

**Interface**:
```typescript
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

class LogRateLimiter {
  private readonly maxLogsPerSecond = 400; // Safety margin under 500
  
  log(level: LogLevel, message: string, ...args: any[]): void;
  shouldLog(level: LogLevel): boolean;
  getDroppedCount(): number;
  resetDroppedCount(): void;
}
```

**Implementation Strategy**:
- Use token bucket algorithm for rate limiting
- Prioritize ERROR > WARN > INFO > DEBUG
- Aggregate repetitive messages (e.g., "process memory usage is high")
- Emit summary every 60 seconds for dropped logs
- Replace all `console.log` calls with rate-limited logger

**Aggregation Rules**:
- Memory warnings: Log once per minute with count
- Connection events: Log first occurrence, then summary every 5 minutes
- Task operations: Always log (high priority)
- Debug messages: Drop first when rate limit approached

## Data Models

### Agent Activity Record

```typescript
interface AgentActivity {
  dispatchId: string;        // Unique dispatch identifier
  roomName: string;          // Room the agent is assigned to
  agentName: string;         // Agent type identifier
  createdAt: Date;           // When dispatch was created
  lastActivityAt: Date;      // Last participant activity
  participantCount: number;  // Current participant count
  ttlExpiresAt: Date | null; // When TTL expires (null if active)
}
```

### Dispatch Check Result

```typescript
interface DispatchCheckResult {
  exists: boolean;
  dispatchId?: string;
  isActive: boolean;
  shouldReuse: boolean;
  staleDispatches: string[]; // IDs of stale dispatches to clean
}
```

## Error Handling

### Dispatch Creation Failures

**Strategy**: Retry with exponential backoff

```typescript
async function createDispatchWithRetry(
  roomName: string,
  agentName: string,
  metadata: any,
  maxRetries = 3
): Promise<string> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const dispatch = await agentDispatchClient.createDispatch(
        roomName,
        agentName,
        { metadata }
      );
      return dispatch.id;
    } catch (error) {
      lastError = error;
      const delayMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      await sleep(delayMs);
    }
  }
  
  throw new Error(`Failed to create dispatch after ${maxRetries} attempts: ${lastError.message}`);
}
```

### Cleanup Failures

**Strategy**: Log and continue

- Don't block other cleanup operations
- Log error with dispatch ID and reason
- Retry cleanup on next cycle
- Alert if same dispatch fails cleanup 3+ times

### Connection Failures

**Strategy**: Graceful degradation

- Show user-friendly error message
- Provide retry button
- Don't create orphaned dispatches
- Clean up partial connections

## Testing Strategy

### Unit Tests

1. **AgentTracker**:
   - Test activity tracking
   - Test TTL expiration calculation
   - Test concurrent access
   - Test cleanup marking

2. **LogRateLimiter**:
   - Test rate limiting enforcement
   - Test priority-based dropping
   - Test message aggregation
   - Test dropped count tracking

3. **Dispatch Logic**:
   - Test reuse detection
   - Test stale dispatch cleanup
   - Test retry mechanism
   - Test error handling

### Integration Tests

1. **End-to-End Flow**:
   - Connect → Dispatch → Disconnect → Reconnect → Reuse
   - Multiple rapid refreshes → Single agent
   - TTL expiration → Cleanup → New dispatch

2. **Cleanup Worker**:
   - Expired agent cleanup
   - Active agent preservation
   - Error recovery

3. **Log Rate Limiting**:
   - High-frequency logging scenarios
   - Priority-based log retention
   - Aggregation accuracy

### Manual Testing Scenarios

1. **Page Refresh**: Refresh page 5 times rapidly, verify only 1 agent exists
2. **TTL Expiration**: Disconnect, wait 5 minutes, verify agent cleaned up
3. **Reconnection**: Disconnect, reconnect within TTL, verify same agent reused
4. **Multiple Tabs**: Open 3 tabs, verify all share same agent
5. **Log Rate**: Monitor Railway logs during high activity, verify no drops

## Configuration

### Environment Variables

```bash
# Agent TTL in seconds (default: 300 = 5 minutes)
AGENT_TTL_SECONDS=300

# Cleanup worker interval in milliseconds (default: 60000 = 1 minute)
CLEANUP_INTERVAL_MS=60000

# Log rate limit (logs per second, default: 400)
LOG_RATE_LIMIT=400

# Enable log aggregation (default: true)
ENABLE_LOG_AGGREGATION=true
```

### Deployment Considerations

**Railway Deployment**:
- Single instance deployment (no distributed state needed)
- In-memory tracking sufficient for current scale
- Consider Redis for multi-instance future scaling
- Monitor memory usage for AgentTracker

**Vercel Deployment** (Frontend):
- No changes needed
- API routes remain stateless
- Agent tracking happens in Railway backend

## Migration Plan

### Phase 1: Add Agent Tracking (Non-Breaking)
- Implement AgentTracker service
- Add tracking to existing dispatch logic
- Deploy without changing behavior
- Monitor tracking accuracy

### Phase 2: Implement Reuse Logic
- Update dispatch-agent API to check existing agents
- Add reuse response field
- Deploy and test with gradual rollout
- Monitor dispatch creation rate

### Phase 3: Add Cleanup Worker
- Implement cleanup worker
- Start with longer TTL (10 minutes) for safety
- Monitor cleanup logs
- Gradually reduce TTL to 5 minutes

### Phase 4: Add Log Rate Limiting
- Implement LogRateLimiter utility
- Replace console.log calls incrementally
- Start with high limit (450/sec)
- Monitor Railway logs
- Adjust limit as needed

## Performance Considerations

### Memory Usage
- AgentTracker: ~1KB per active agent
- Expected: <10 concurrent agents = <10KB
- Acceptable: Up to 100 agents = ~100KB

### CPU Usage
- Cleanup worker: Minimal (runs every 60s)
- Log rate limiter: Negligible overhead
- Dispatch checks: <10ms per request

### Network
- Reduced agent dispatches = Less LiveKit API calls
- Cleanup operations: Minimal bandwidth
- No impact on WebRTC audio quality

## Monitoring and Observability

### Key Metrics

1. **Agent Lifecycle**:
   - Dispatch creation rate
   - Dispatch reuse rate
   - Average agent lifetime
   - Cleanup success rate

2. **Log Rate Limiting**:
   - Logs per second
   - Dropped log count
   - Aggregated message count

3. **Resource Usage**:
   - Active agent count
   - Memory usage
   - API call rate

### Logging Strategy

**High Priority (Always Log)**:
- Agent dispatch creation/reuse
- Cleanup operations
- Error conditions
- User connection events

**Medium Priority (Rate Limited)**:
- Activity tracking updates
- TTL timer operations
- Periodic health checks

**Low Priority (Aggregated)**:
- Memory warnings
- Debug messages
- Repetitive status updates

### Alerts

- Alert if agent count > 20 (potential leak)
- Alert if cleanup failure rate > 10%
- Alert if log drop rate > 5%
- Alert if dispatch creation fails 3+ times

## Security Considerations

- Validate room names to prevent injection
- Authenticate dispatch requests
- Rate limit API endpoints
- Sanitize log messages (no PII)
- Secure agent metadata

## Future Enhancements

1. **Distributed State**: Use Redis for multi-instance deployments
2. **Advanced Metrics**: Prometheus/Grafana integration
3. **Dynamic TTL**: Adjust based on usage patterns
4. **Agent Pooling**: Pre-warm agents for faster connections
5. **Graceful Shutdown**: Drain agents before deployment
