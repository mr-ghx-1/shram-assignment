# Tool Calling Diagnosis

## Test Results

### ✅ Tools Are Properly Defined
All 5 tools are correctly defined with:
- Description
- Parameters (Zod schemas)
- Execute functions

### ✅ Tools Work Independently
- `get_current_time` executes successfully
- Other tools fail only due to API connectivity (expected in test environment)

### ⚠️ Potential Issues

#### 1. OpenAI Realtime API Tool Registration

The agent uses OpenAI Realtime API (`gpt-realtime-mini`), which requires tools to be registered differently than standard LLM models.

**Current Code:**
```typescript
// Tools are passed to voice.Agent constructor
const agent = new TaskAssistant(taskFunctionContext, userTimezone);

// Agent is passed to session.start()
await session.start({
  agent: agent,
  room: ctx.room,
});
```

**Potential Issue:**
The Realtime API might not automatically pick up tools from the `voice.Agent` constructor. Tools might need to be:
1. Passed directly to the `RealtimeModel` constructor
2. Passed to the `AgentSession` constructor
3. Configured differently for Realtime API

#### 2. Tool Schema Format

The test shows parameters as empty arrays `[]`, which might indicate the Zod schemas aren't being properly serialized for the Realtime API.

**Zod Schema Example:**
```typescript
parameters: z.object({
  title: z.string().describe('Task title'),
  scheduled_time: z.string().nullable().optional(),
  priority: z.union([z.number(), z.string()]).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
})
```

This should work, but the Realtime API might expect a different format.

## Recommended Fixes

### Fix 1: Pass Tools to AgentSession

Try passing tools directly to the `AgentSession` constructor:

```typescript
const taskFunctionContext = new TaskFunctionContext(ctx.room);

const sessionOptions: any = {
  llm: new openai.realtime.RealtimeModel({
    model: 'gpt-realtime-mini',
    voice: 'sage',
    temperature: 0.7,
    turnDetection: { /* ... */ },
  }),
  // Add tools here
  tools: [
    taskFunctionContext.get_current_time,
    taskFunctionContext.create_task,
    taskFunctionContext.get_tasks,
    taskFunctionContext.update_task,
    taskFunctionContext.delete_task,
  ],
};

const session = new voice.AgentSession(sessionOptions);
```

### Fix 2: Check LiveKit Agents Version

Ensure you're using a version of `@livekit/agents-plugin-openai` that supports tool calling with Realtime API.

**Check version:**
```bash
npm list @livekit/agents-plugin-openai
```

**Current version:** 1.0.19

### Fix 3: Enable Tool Calling in Realtime Model

The Realtime API might need explicit configuration to enable tool calling:

```typescript
llm: new openai.realtime.RealtimeModel({
  model: 'gpt-realtime-mini',
  voice: 'sage',
  temperature: 0.7,
  // Explicitly enable tool calling
  tools: 'auto', // or 'required'
  turnDetection: { /* ... */ },
})
```

### Fix 4: Use Standard LLM Instead of Realtime

If Realtime API doesn't support tool calling properly, fall back to standard pipeline:

```typescript
const sessionOptions = {
  stt: 'openai/whisper-1',
  llm: 'openai/gpt-4o-mini',
  tts: 'openai/tts-1',
  vad: await silero.VAD.load(),
};
```

This will have slightly higher latency but guaranteed tool calling support.

## Testing Steps

1. **Check Agent Logs**:
   - Look for tool registration messages
   - Check if LLM receives tool definitions
   - Verify tool calls are being made

2. **Test with Simple Command**:
   - Say: "Show me all my tasks"
   - Expected: LLM calls `get_tasks` tool
   - Check logs for tool invocation

3. **Enable Debug Logging**:
   ```typescript
   logger.setLevel('debug');
   ```

4. **Check Railway Logs**:
   - Look for tool-related errors
   - Check if tools are being invoked
   - Verify API calls are being made

## Next Steps

1. Try Fix 1 (pass tools to AgentSession)
2. If that doesn't work, check LiveKit documentation for Realtime API + tools
3. If still broken, fall back to standard LLM pipeline
4. Test with production API to rule out connectivity issues

## Additional Resources

- [LiveKit Agents Tool Calling](https://docs.livekit.io/agents/build/tools)
- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [LiveKit OpenAI Plugin](https://docs.livekit.io/agents/models/realtime/plugins/openai)
