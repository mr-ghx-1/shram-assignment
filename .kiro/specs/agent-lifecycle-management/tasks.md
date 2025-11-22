# Implementation Plan

- [x] 1. Implement Log Rate Limiter utility





  - Create `agent-starter-node/src/log-rate-limiter.ts` with token bucket algorithm
  - Implement priority-based log filtering (ERROR > WARN > INFO > DEBUG)
  - Add message aggregation for repetitive logs
  - Export singleton instance for global use
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Integrate Log Rate Limiter into agent code





  - Replace all `console.log` calls in `agent.ts` with rate-limited logger
  - Replace all `console.log` calls in `task-function-context.ts` with rate-limited logger
  - Replace all `console.log` calls in other agent utilities with rate-limited logger
  - Configure log priorities appropriately (errors high, debug low)
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 3. Create Agent Tracker service





  - Create `voice-todo-app/lib/agent-tracker.ts` with AgentTracker class
  - Implement in-memory Map for tracking agent activities
  - Add methods: trackActivity, getActivity, markForCleanup, cancelCleanup, getExpiredAgents, removeAgent
  - Add TTL calculation logic based on configurable timeout
  - Export singleton instance
  - _Requirements: 2.1, 2.2, 2.3, 3.2, 3.3, 4.1, 4.3_

- [x] 4. Update dispatch-agent API with reuse logic





  - [x] 4.1 Add function to check existing dispatches for a room


    - Query LiveKit API for existing dispatches by room name
    - Filter by agent name to match 'task-assistant'
    - Return dispatch check result with reuse recommendation
    - _Requirements: 1.1, 1.4_
  
  - [x] 4.2 Implement dispatch reuse logic

    - Check for existing active dispatches before creating new one
    - If found and active, return existing dispatch ID with `reused: true`
    - Track activity in AgentTracker and reset TTL
    - _Requirements: 1.2, 3.1, 3.2, 3.3_
  
  - [x] 4.3 Add stale dispatch cleanup

    - Identify and delete multiple dispatches for same room
    - Keep only the most recent dispatch
    - Log cleanup actions
    - _Requirements: 1.3, 1.5_
  
  - [x] 4.4 Add retry logic with exponential backoff

    - Wrap dispatch creation in retry function
    - Implement exponential backoff (1s, 2s, 4s)
    - Maximum 3 retry attempts
    - _Requirements: 6.1, 6.2_

- [x] 5. Create Cleanup Worker service





  - Create `voice-todo-app/lib/cleanup-worker.ts` with CleanupWorker class
  - Implement periodic cleanup check (every 60 seconds)
  - Query AgentTracker for expired agents
  - Delete expired dispatches via LiveKit API
  - Handle cleanup errors gracefully without blocking
  - Add start/stop methods for lifecycle management
  - _Requirements: 2.4, 2.5, 4.2, 4.4, 6.4, 6.5_

- [x] 6. Initialize Cleanup Worker in Next.js app




  - Start CleanupWorker when Next.js server starts
  - Add cleanup worker initialization to appropriate lifecycle hook
  - Ensure worker stops gracefully on server shutdown
  - _Requirements: 2.4, 4.4_

- [x] 7. Create Agent Status API endpoint





  - Create `voice-todo-app/app/api/livekit/agent-status/route.ts`
  - Implement GET handler to query agent status by room name
  - Return dispatch info from AgentTracker
  - Include participant count and TTL expiration time
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 8. Add environment configuration





  - Add `AGENT_TTL_SECONDS` to `.env.local` and `.env.example` (default: 300)
  - Add `CLEANUP_INTERVAL_MS` to `.env.local` and `.env.example` (default: 60000)
  - Add `LOG_RATE_LIMIT` to `.env.local` and `.env.example` (default: 400)
  - Update Railway environment variables via dashboard
  - _Requirements: 2.1, 2.4, 7.1_

- [x] 9. Update frontend connection logic





  - Modify `useLivekit.ts` to handle reused dispatch responses
  - Add logging to distinguish new vs reused connections
  - Update connection state management for reuse scenarios
  - _Requirements: 3.1, 3.4, 5.4_

- [x] 10. Add comprehensive logging





  - Log all agent lifecycle events (creation, reuse, cleanup)
  - Include timestamps in all lifecycle logs
  - Log dispatch IDs for traceability
  - Add summary logs for dropped messages
  - _Requirements: 1.5, 2.5, 3.5, 5.3, 5.4, 7.5_

- [x] 11. Deploy and test agent lifecycle management





  - Build and deploy agent code to Railway
  - Deploy frontend to Vercel
  - Test page refresh scenario (verify single agent)
  - Test TTL expiration (disconnect and wait)
  - Test reconnection within TTL (verify reuse)
  - Monitor Railway logs for rate limiting
  - _Requirements: All_
