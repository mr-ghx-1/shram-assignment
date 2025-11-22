# Agent Lifecycle Management - Testing Guide

## Deployment Status

✅ **Agent (Railway)**: Deployed and running
- Service: voice-todo-agent
- Status: Active
- Configuration: `closeOnDisconnect: false` (agent stays alive during page refresh)
- Logs: Available via Railway dashboard

✅ **Frontend (Vercel)**: Deployed successfully
- Production URL: https://voice-todo-okyk9mll2-siddhartha-manis-projects.vercel.app
- Deployment ID: dpl_3McLP7sKKYdwTvBF6hMfkD7EWFjc
- Status: READY

## Recent Fix

**Issue**: Agent was closing on participant disconnect during page refresh
**Solution**: Added `inputOptions: { closeOnDisconnect: false }` to agent session configuration
**Result**: Agent now stays alive during page refreshes and can be reused

## Environment Configuration

Both environments are configured with:
- `AGENT_TTL_SECONDS=300` (5 minutes)
- `CLEANUP_INTERVAL_MS=60000` (60 seconds)
- `LOG_RATE_LIMIT=400` (logs per second)

## Testing Scenarios

### 1. Page Refresh Scenario (Verify Single Agent)

**Objective**: Verify that multiple page refreshes don't create duplicate agents

**Steps**:
1. Open the production URL in your browser
2. Connect to the voice assistant (click the voice dock)
3. Wait for the agent to connect (you should hear audio)
4. Refresh the page 5 times rapidly (F5 or Ctrl+R)
5. Check Railway logs for dispatch creation/reuse messages

**Expected Results**:
- First connection: New dispatch created
- Subsequent refreshes: Existing dispatch reused
- Log messages should show: `[LIFECYCLE] [REUSE] Reusing existing dispatch`
- Only ONE agent dispatch should exist for your room

**How to Verify**:
```bash
# Check Railway logs
railway logs --service voice-todo-agent
```

Look for log patterns like:
```
[LIFECYCLE] [CREATE] Successfully created dispatch: <dispatch-id>
[LIFECYCLE] [REUSE] Reusing existing dispatch: <dispatch-id>
[LIFECYCLE] [REUSE] TTL reset for dispatch: <dispatch-id>
```

---

### 2. TTL Expiration Test (Disconnect and Wait)

**Objective**: Verify that inactive agents are cleaned up after TTL expires

**Steps**:
1. Connect to the voice assistant
2. Wait for successful connection
3. Disconnect (close the voice dock or navigate away)
4. Wait for 5 minutes (TTL duration)
5. Check Railway logs for cleanup messages

**Expected Results**:
- After disconnect: TTL countdown starts
- After 5 minutes: Cleanup worker deletes the dispatch
- Log messages should show: `[CLEANUP-WORKER] Successfully cleaned up expired agent`

**How to Verify**:
```bash
# Monitor Railway logs in real-time
railway logs --service voice-todo-agent --follow
```

Look for log patterns like:
```
[CLEANUP-WORKER] Found 1 expired agent(s) to clean up
[CLEANUP-WORKER] Deleting expired dispatch: <dispatch-id>
[CLEANUP-WORKER] Successfully cleaned up expired agent
```

---

### 3. Reconnection Within TTL (Verify Reuse)

**Objective**: Verify that reconnecting within TTL reuses the existing agent

**Steps**:
1. Connect to the voice assistant
2. Wait for successful connection
3. Disconnect (close the voice dock)
4. Wait 2 minutes (less than TTL)
5. Reconnect to the voice assistant
6. Check Railway logs for reuse messages

**Expected Results**:
- Reconnection should reuse the existing dispatch
- TTL should be reset
- Log messages should show: `[LIFECYCLE] [REUSE] Reusing existing dispatch`
- No new dispatch should be created

**How to Verify**:
Look for log patterns showing the same dispatch ID being reused:
```
[LIFECYCLE] [REUSE] Reusing existing dispatch: <same-dispatch-id>
[LIFECYCLE] [REUSE] TTL reset for dispatch: <same-dispatch-id>
```

---

### 4. Monitor Railway Logs for Rate Limiting

**Objective**: Verify that log rate limiting is working and no logs are being dropped

**Steps**:
1. Connect to the voice assistant
2. Perform various actions (create tasks, update tasks, etc.)
3. Monitor Railway logs for rate limiting warnings
4. Check for dropped log messages

**Expected Results**:
- Logs should stay under 400 logs/second
- No rate limit warnings from Railway
- If logs are dropped, should see summary messages every 60 seconds

**How to Verify**:
```bash
# Monitor logs in real-time
railway logs --service voice-todo-agent --follow
```

Look for:
- No Railway rate limit errors
- Smooth log flow without gaps
- If rate limiting occurs, look for: `[RATE-LIMITER] Dropped X logs in the last 60 seconds`

---

## Monitoring Commands

### Check Railway Deployment Status
```bash
railway status
```

### View Recent Railway Logs
```bash
railway logs --service voice-todo-agent --lines 100
```

### Follow Railway Logs in Real-Time
```bash
railway logs --service voice-todo-agent --follow
```

### Check Vercel Deployment Status
```bash
vercel ls
```

### View Vercel Logs
```bash
vercel logs https://voice-todo-okyk9mll2-siddhartha-manis-projects.vercel.app
```

---

## Troubleshooting

### Issue: Agent not connecting
**Solution**: 
1. Check Railway logs for errors
2. Verify environment variables are set correctly
3. Check LiveKit credentials

### Issue: Multiple agents created on refresh
**Solution**:
1. Check dispatch-agent API logs
2. Verify AgentTracker is working correctly
3. Check for errors in dispatch reuse logic

### Issue: Agents not being cleaned up
**Solution**:
1. Check CleanupWorker logs
2. Verify AGENT_TTL_SECONDS is set correctly
3. Check if cleanup worker is running

### Issue: Log rate limit warnings
**Solution**:
1. Check LOG_RATE_LIMIT setting
2. Verify log rate limiter is working
3. Reduce log verbosity if needed

---

## Success Criteria

All tests pass if:
- ✅ Page refresh reuses existing agent (no duplicates)
- ✅ Inactive agents are cleaned up after TTL expires
- ✅ Reconnection within TTL reuses existing agent
- ✅ No Railway log rate limit warnings
- ✅ All lifecycle events are properly logged

---

## Next Steps

After successful testing:
1. Monitor production logs for 24 hours
2. Check for any unexpected behavior
3. Adjust TTL or cleanup interval if needed
4. Document any issues or improvements
