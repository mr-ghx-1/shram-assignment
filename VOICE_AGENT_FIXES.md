# Voice Agent Issues and Fixes

## Issues Identified

### 1. Date Parsing Issue - "Next Week Wednesday"
**Problem:** The date parser couldn't handle phrases like "next week Wednesday". It only supported:
- "next Wednesday" 
- "next week"

But not the combination "next week Wednesday".

**Fix Applied:** Added a new pattern matcher in `agent-starter-node/src/date-parser.ts` to handle "next week [weekday]" format before the "next [weekday]" pattern.

```typescript
// Handle "next week [weekday]" (e.g., "next week Wednesday")
else if (normalized.match(/^next week (monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/)) {
  const weekday = normalized.replace('next week ', '');
  targetDate = getNextWeekday(weekday, referenceDate, true);
}
```

### 2. Task Creation and Fetching Issues

**Potential Causes:**
1. **API Base URL:** Currently set to `https://voice-todo-app-two.vercel.app` in `.env.local`
   - Verify this is the correct production URL
   - Check if the API is accessible from the agent server

2. **Network/CORS Issues:** The agent might be having trouble reaching the Next.js API
   - Check Railway logs for HTTP errors
   - Verify the API endpoints are responding

3. **Agent Instructions:** The agent has very strict instructions to be minimal
   - It might not be providing enough feedback when operations fail
   - Check the agent logs for actual errors

## Debugging Steps

### 1. Check Agent Logs
```bash
# On Railway, check the agent logs
railway logs
```

Look for:
- HTTP errors (404, 500, etc.)
- Connection timeouts
- API response errors

### 2. Test API Endpoints Directly
```bash
# Test if the API is accessible
curl https://voice-todo-app-two.vercel.app/api/tasks

# Test creating a task
curl -X POST https://voice-todo-app-two.vercel.app/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test task","priority_index":1}'
```

### 3. Check Environment Variables
Verify in Railway dashboard:
- `API_BASE_URL` is set correctly
- `OPENAI_API_KEY` is valid
- `LIVEKIT_*` credentials are correct

### 4. Enable More Verbose Logging
The agent uses a log rate limiter. You can increase verbosity by:
- Setting `LOG_RATE_LIMIT` to a higher value (currently 400)
- Or temporarily removing rate limiting for debugging

## Recommended Next Steps

1. **Deploy the date parser fix** - This will fix the "next week Wednesday" issue
2. **Check Railway logs** - Look for actual error messages when tasks fail to create
3. **Verify API connectivity** - Test the API endpoints from the agent server
4. **Test with simpler commands** - Try "create a task called test" to isolate the issue

## Testing the Fix

After deploying, test with:
1. "Create a task for next week Wednesday" - Should now parse correctly
2. "Show me all my tasks" - Should fetch and display tasks
3. "Create a task called test" - Should create without date issues

## Additional Notes

The agent has these tools available:
- `get_current_time` - Gets current date/time (should be called before date operations)
- `create_task` - Creates tasks
- `get_tasks` - Fetches/filters tasks
- `update_task` - Updates tasks
- `delete_task` - Deletes tasks

The agent is instructed to ALWAYS call `get_current_time` before any date-related operations, so make sure this tool is working correctly.
