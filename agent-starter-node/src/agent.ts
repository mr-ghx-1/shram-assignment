import {
  type JobContext,
  type JobProcess,
  WorkerOptions,
  cli,
  defineAgent,
  metrics,
  voice,
} from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { TaskFunctionContext } from './task-function-context.js';
import { startHealthCheckServer } from './health-check.js';
import { logger } from './log-rate-limiter.js';

// Load .env.local if it exists (for local development)
// In production (Railway), environment variables are set directly
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' });
}

// Start health check server only in the main worker process, not in job processes
// Check if this is the main process by looking for the worker mode
const isMainWorker = process.argv.includes('dev') || process.argv.includes('start');
if (isMainWorker) {
  const healthCheckPort = parseInt(process.env.HEALTH_CHECK_PORT || '8080', 10);
  startHealthCheckServer(healthCheckPort);
}

/**
 * Task management assistant that handles CRUD operations via voice commands
 */
class TaskAssistant extends voice.Agent {
  constructor(taskContext: TaskFunctionContext, userTimezone: string = 'UTC') {
    // Get current date/time in user's timezone using proper date formatting
    const now = new Date();
    
    // Format dates in user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    
    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const day = parts.find(p => p.type === 'day')?.value || '';
    const dayOfWeek = parts.find(p => p.type === 'weekday')?.value || '';
    
    const currentDate = `${year}-${month}-${day}`; // YYYY-MM-DD
    const timeString = now.toLocaleTimeString('en-US', { timeZone: userTimezone, hour12: true });
    
    // Calculate example dates by adding days to current date
    const todayDate = new Date(`${currentDate}T00:00:00Z`);
    
    const tomorrow = new Date(todayDate);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const dayAfterTomorrow = new Date(todayDate);
    dayAfterTomorrow.setUTCDate(dayAfterTomorrow.getUTCDate() + 2);
    const dayAfterTomorrowStr = dayAfterTomorrow.toISOString().split('T')[0];
    
    super({
      instructions: `Role:
You are a calm, concise, and supportive task-management voice assistant. You speak briefly but warmly, avoiding anything unnecessary. You maintain a steady, professional tone — never curt, never chatty. You prioritize clarity, efficiency, date accuracy, and context awareness.

Tone guidelines:

warm, brief, steady
no exclamation marks
no small talk
no filler
confirmations should feel gentle, not robotic
prefer softening phrases like “All set” when appropriate
remain minimal at all times

USER TIMEZONE

${userTimezone}

DATE/TIME HANDLING (CRITICAL)

When you need to interpret or operate on dates:

1. ALWAYS call get_current_time FIRST

You must never assume the current date/time.
You must always retrieve it via tool call.

2. Use ONLY the returned values:

current_date
current_time
tomorrow_date
day_after_tomorrow_date
any other provided fields

3. Relative date rules

“today” → use current_date
“tomorrow” → use tomorrow_date
“day after tomorrow” → use day_after_tomorrow_date
“in X days” → add X days to current_date
“next week” → add 7 days to current_date

4. Format

You must use ISO 8601 always:
YYYY-MM-DDTHH:MM:SS.000Z

CONTEXT AWARENESS (HIGHEST PRIORITY)
1. After ANY get_tasks call

You now operate only on the tasks visible in the UI.
Do not reference tasks outside this filtered list.

2. If only ONE task is visible

Any reference such as:

“the task”
“this task”
“that task”
“this one”
“that one”
“it”

ALWAYS refers to that one task.
Never ask for clarification.

3. If MULTIPLE tasks are visible

Use positional references (1st, 2nd, 3rd…) based strictly on the filtered list.

If ambiguous, ask softly:
“Which task would you like? 1, 2, or 3?”

4. UI Behavior

After get_tasks, the UI always shows the tasks.
Never read task details aloud unless asked.

RESPONSE RULES

Your speech is minimal but warm.
You speak only when required.

Allowed speech

Confirmations (gentle + short)

“All set — task created.”
“Task created.”
“Updated.”
“All set.”
“Deleted.”
“Task removed.”
“Marked complete.”
“All set — completed.”

Missing information

“What’s the task title?”
“Which date should I use?”
“What priority should it have?”
“Which tags should I add?”
Ambiguity or multiple matches
“Which task would you like? 1, 2, or 3?”
“Just to confirm — task 1 or 2?”
“Which one did you mean?”

Errors
Short, factual, gentle.

Forbidden speech

No greetings
No small talk
No explaining what you’re doing
No repeating information visible on UI
No asking “Anything else?”
No unnecessary words

TASK OPERATIONS

You have four task functions and one time function.

Call tools immediately whenever a user request maps to one.

Create Task

Fields:

title (required)
scheduled_time
priority (1=low, 2=normal, 3=high, 4=urgent, 5=critical)
tags (array)

Get / Filter Tasks

Fields:

query
priority
scheduled (ISO 8601)
completed
tags

Update Task

Identify by:

position in filtered list, or
exact title
Any field may be updated.

Delete Task

Identify by:

position in filtered list, or
exact title

Get Current Time (CRITICAL)

Call this whenever:

user references a date
user references “today”, “tomorrow”, etc.
you need to compute relative dates
you need to set or compare dates
a filter involves dates
Never rely on previously computed dates.

FILTER EXAMPLES (MUST FOLLOW EXACTLY)

These filters do NOT include scheduled unless user explicitly mentions a date:

“show completed tasks” → completed: true
“show incomplete tasks” → completed: false
“show work tasks” → tags: ["work"]
“show all work tasks” → tags: ["work"]
“show my work tasks” → tags: ["work"]
“show urgent work tasks” → tags: ["work", "urgent"], priority: 4

Filters requiring date lookup (MUST call get_current_time first):

“show today’s tasks” → use current_date
“show today’s work tasks” → use current_date + tags: ["work"]
“show tomorrow’s tasks” → use tomorrow_date

IMPORTANT DATE LOGIC

Only add a scheduled filter if the user explicitly mentions a date or time.
Do NOT add scheduled for general queries such as:

“show all tasks”
“work tasks”
“completed tasks”

Relative dates always require first calling get_current_time.

TASK LISTING RULE

On fetch: say “Found X tasks.” or “I found X tasks.”
Never list tasks aloud unless asked.

TOOL EXECUTION RULE

Whenever a user instruction maps to an operation:

Call the tool immediately and without commentary.
After the tool completes (unless schema forbids text), give a warm, minimal confirmation.`,

      // Register all CRUD operation tools from the task context
      tools: {
        get_current_time: taskContext.get_current_time,
        create_task: taskContext.create_task,
        get_tasks: taskContext.get_tasks,
        update_task: taskContext.update_task,
        delete_task: taskContext.delete_task,
      },
    });
  }
}

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    // No prewarm needed for OpenAI Realtime API
    // The Realtime API handles VAD internally
  },
  entry: async (ctx: JobContext) => {
    logger.info('Starting voice agent for task management with OpenAI Realtime API...');
    logger.info('Environment check:', {
      hasLivekitUrl: !!process.env.LIVEKIT_URL,
      hasLivekitKey: !!process.env.LIVEKIT_API_KEY,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      nodeEnv: process.env.NODE_ENV,
    });

    // Extract timezone from job metadata (passed during dispatch)
    let userTimezone = 'UTC';
    let timezoneOffset = 0;
    try {
      // Try to get metadata from job first, then fall back to room
      const metadataStr = ctx.job.metadata || ctx.room.metadata;
      logger.debug('Raw metadata:', metadataStr);
      
      if (metadataStr) {
        const parsed = JSON.parse(metadataStr);
        userTimezone = parsed.timezone || 'UTC';
        timezoneOffset = parsed.timezoneOffset || 0;
        logger.info(`User timezone: ${userTimezone} (offset: ${timezoneOffset} minutes)`);
      } else {
        logger.info('No metadata found, using UTC');
      }
    } catch (err) {
      logger.warn('Failed to parse metadata for timezone:', err);
    }

    // Set up voice AI pipeline with OpenAI Realtime API
    // This provides an all-in-one speech-to-speech solution with:
    // - Built-in STT (speech-to-text)
    // - LLM processing with function calling
    // - Built-in TTS (text-to-speech)
    // - Automatic VAD (voice activity detection)
    // - Lower latency than separate STT/LLM/TTS pipeline
    const sessionOptions: any = {
      // OpenAI Realtime API - handles STT, LLM, and TTS in one model
      // Using gpt-realtime-mini for cost-effective operation
      llm: new openai.realtime.RealtimeModel({
        model: 'gpt-realtime-mini', // Cost-effective realtime model
        voice: 'sage', // Natural, friendly, gender-neutral voice
        temperature: 0.7, // Balanced creativity for natural responses
        // Server VAD configuration for turn detection
        turnDetection: {
          type: 'server_vad',
          threshold: 0.47, // Sensitivity to voice (0.0-1.0, higher = less sensitive)
          prefix_padding_ms: 300, // Audio to include before speech starts
          silence_duration_ms: 500, // Silence duration to detect speech end
          create_response: true, // Automatically create response after user stops
          interrupt_response: true, // Allow user to interrupt agent
        },
      }),
    };

    const session = new voice.AgentSession(sessionOptions);

    // Metrics collection for monitoring pipeline performance
    const usageCollector = new metrics.UsageCollector();
    
    session.on(voice.AgentSessionEventTypes.MetricsCollected, (ev) => {
      metrics.logMetrics(ev.metrics);
      usageCollector.collect(ev.metrics);
      conversationTurnCount++;
    });

    // Log usage summary on shutdown
    const logUsage = async () => {
      const summary = usageCollector.getSummary();
      logger.info(`Usage Summary: ${JSON.stringify(summary, null, 2)}`);
    };

    ctx.addShutdownCallback(logUsage);

    // Track conversation state for debugging and monitoring
    let conversationTurnCount = 0;

    // Initialize the task function context with CRUD operations
    const taskFunctionContext = new TaskFunctionContext(ctx.room);

    // Join the room and connect to the user first
    await ctx.connect();
    logger.info('Connected to room:', ctx.room.name);

    // Start the session with the task assistant
    await session.start({
      agent: new TaskAssistant(taskFunctionContext, userTimezone),
      room: ctx.room,
      // Note: OpenAI Realtime API handles noise internally
    });

    logger.info('Voice agent session started successfully');
    logger.info('Using OpenAI Realtime API (gpt-realtime-mini)');
    logger.info('Voice: alloy (built-in STT, LLM, and TTS)');

    // Note: Greeting disabled for Realtime API
    // The Realtime API doesn't support session.say() for programmatic speech
    // The agent will respond naturally when the user speaks first

    logger.info('Agent is ready to receive voice commands');

    // Log when participant joins
    ctx.room.on('participantConnected', (participant) => {
      logger.info(`Participant connected: ${participant.identity}`);
    });

    ctx.room.on('participantDisconnected', (participant) => {
      logger.info(`Participant disconnected: ${participant.identity}`);
      logger.info(`Total conversation turns: ${conversationTurnCount}`);
    });
  },
});

// Set up cleanup on process exit
async function cleanupOnExit() {
  logger.info('\n🧹 Cleaning up agent dispatches...');
  try {
    const { AgentDispatchClient } = await import('livekit-server-sdk');
    
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      logger.warn('⚠️  Missing LiveKit credentials, skipping cleanup');
      return;
    }

    const livekitHost = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    const client = new AgentDispatchClient(livekitHost, apiKey, apiSecret);
    
    const roomName = 'voice-todo-room';
    const dispatches = await client.listDispatch(roomName);
    
    logger.info(`Found ${dispatches.length} agent dispatch(es) to clean up`);

    let deletedCount = 0;
    for (const dispatch of dispatches) {
      try {
        await client.deleteDispatch(dispatch.id, roomName);
        logger.info(`✓ Deleted dispatch: ${dispatch.id}`);
        deletedCount++;
      } catch (err) {
        // Ignore errors during cleanup
      }
    }

    logger.info(`✅ Cleanup complete: ${deletedCount}/${dispatches.length} dispatches removed`);
  } catch (err) {
    logger.warn('⚠️ Cleanup failed: ', err instanceof Error ? err.message : 'Unknown error');
  }
}

// Handle graceful shutdown
let isShuttingDown = false;

process.on('SIGINT', async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info('\n\nReceived SIGINT, shutting down gracefully...');
  await cleanupOnExit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info('\n\nReceived SIGTERM, shutting down gracefully...');
  await cleanupOnExit();
  process.exit(0);
});

cli.runApp(new WorkerOptions({ 
  agent: fileURLToPath(import.meta.url),
  agentName: 'task-assistant', // Enable explicit dispatch
}));
