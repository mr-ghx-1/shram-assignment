# Design Document

## Overview

The Voice-First Todo Web Application is a Next.js-based system that enables users to manage tasks through natural language voice commands. The architecture consists of three primary layers: a Next.js frontend with voice UI, a Livekit voice agent for speech processing and intent recognition, and a Supabase PostgreSQL database for task persistence. The system achieves sub-2-second latency by optimizing each stage of the voice processing pipeline and uses GPT-4o mini for fast, accurate natural language understanding.

### Technology Stack

- **Frontend**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **Voice Infrastructure**: Livekit Agents SDK, Deepgram STT, OpenAI TTS
- **LLM**: OpenAI GPT-4o mini (function calling for structured CRUD operations)
- **Database**: Supabase PostgreSQL
- **Deployment**: Vercel (frontend), Railway/Render (voice agent service)

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Next.js Web Application                      │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │ │
│  │  │  Voice Dock  │  │  Task List   │  │  App Shell  │ │ │
│  │  │  Component   │  │  Component   │  │             │ │ │
│  │  └──────┬───────┘  └──────┬───────┘  └─────────────┘ │ │
│  └─────────┼──────────────────┼───────────────────────────┘ │
└────────────┼──────────────────┼─────────────────────────────┘
             │                  │
             │ WebRTC           │ HTTP/REST
             │ (Livekit)        │
             ▼                  ▼
┌────────────────────┐   ┌──────────────────────────────────┐
│  Livekit Cloud     │   │   Next.js API Routes             │
│  (Room Management) │   │  ┌────────────────────────────┐  │
└────────┬───────────┘   │  │  /api/tasks/*              │  │
         │               │  │  - CRUD endpoints          │  │
         │               │  │  - Supabase client         │  │
         ▼               │  └────────────┬───────────────┘  │
┌────────────────────┐   │               │                  │
│  Voice Agent       │   └───────────────┼──────────────────┘
│  (Livekit Agent)   │                   │
│  ┌──────────────┐  │                   │
│  │ STT Pipeline │  │                   ▼
│  │  (Deepgram)  │  │          ┌────────────────┐
│  └──────┬───────┘  │          │    Supabase    │
│  ┌──────▼───────┐  │          │   PostgreSQL   │
│  │ LLM Layer    │  │          │                │
│  │ (GPT-4o mini)│──┼─────────▶│  tasks table   │
│  └──────┬───────┘  │          └────────────────┘
│  ┌──────▼───────┐  │
│  │ TTS Pipeline │  │
│  │ (OpenAI TTS) │  │
│  └──────────────┘  │
└────────────────────┘
```

### Data Flow

1. **Voice Input → STT**: User speaks → Deepgram converts to text (target: <500ms)
2. **Text → LLM**: Text sent to GPT-4o mini with function definitions (target: <1000ms)
3. **LLM → Action**: LLM returns structured function call (operation + parameters)
4. **Action → Database**: Voice agent calls Next.js API → Supabase operation
5. **Response → TTS**: Result formatted as natural language → OpenAI TTS (target: <500ms)
6. **Audio → User**: TTS audio streamed back through Livekit

**Total Latency Budget**: 2000ms (with 500ms buffer for network overhead)

## Components and Interfaces

### Frontend Components

#### 1. AppShell Component
```typescript
interface AppShellProps {
  children: React.ReactNode;
}

// Responsibilities:
// - Apply "Nature Calm" gradient background
// - Provide responsive container (max-width 4xl desktop, full-width mobile)
// - Render persistent header and voice dock
```

**Styling**:
- Background: `linear-gradient(180deg, #F6FBF6 0%, #FFFFFF 80%)`
- Desktop: Centered column, max-width 4xl, padding 32-48px
- Mobile: Full-width, padding 16px

#### 2. TaskCard Component
```typescript
interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  scheduled_time?: string; // ISO 8601 datetime
  priority_index?: number; // 1-5 scale
  tags?: string[];
  created_at: string;
}

// Responsibilities:
// - Display task with checkbox, title, due date, tags, priority
// - Handle hover elevation on desktop
// - Emit toggle/delete events
```

**Styling**:
- Background: `#FFFFFF`
- Border radius: `14px`
- Shadow: `0 6px 20px rgba(34, 50, 30, 0.08)`
- Padding: `16px`
- Hover (desktop only): Slight elevation increase
- Tags: Background `#DFF6E6`, text `#439153`, pill-shaped

#### 3. TaskList Component
```typescript
interface TaskListProps {
  tasks: Task[];
  filter?: TaskFilter;
  onTaskToggle: (id: string) => void;
  onTaskDelete: (id: string) => void;
}

interface TaskFilter {
  query?: string;
  priority?: number;
  scheduled?: 'today' | 'tomorrow' | 'week';
}

// Responsibilities:
// - Render vertical stack of TaskCard components
// - Apply filtering based on voice commands
// - Show empty state when no tasks
// - Handle real-time updates from voice operations
```

**Styling**:
- Vertical stack with 8-16px gap
- Empty state: Soft green plant icon, "You're all clear" message

#### 4. VoiceDock Component
```typescript
interface VoiceDockProps {
  isConnected: boolean;
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  onMicToggle: () => void;
}

// Responsibilities:
// - Display microphone button with state indicators
// - Show real-time transcript preview (single line, truncated)
// - Manage Livekit room connection
// - Provide visual feedback for listening/processing states
```

**Styling**:
- Desktop: Floating pill, bottom-right, 56-64px mic button
- Mobile: Full-width bottom dock, 80% opacity white background with blur
- Mic button idle: White background, green600 icon
- Mic button active: Green600 background, white icon
- Status label: "Tap mic to speak" / "Listening..." / "Processing..."
- Animation: 160ms cubic-bezier(.2, .8, .2, 1)

#### 5. ConfirmationModal Component
```typescript
interface ConfirmationModalProps {
  isOpen: boolean;
  intent: ParsedIntent;
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
}

interface ParsedIntent {
  operation: 'create' | 'read' | 'update' | 'delete';
  summary: string; // Human-readable description
  confidence: number;
}

// Responsibilities:
// - Display parsed intent for user confirmation
// - Show when LLM confidence < threshold (0.85)
// - Trap focus, prevent interaction with background
// - Provide Confirm/Edit/Cancel actions
```

**Styling**:
- Background: White, 14px radius, soft shadow
- Buttons: Confirm (green500), Edit/Cancel (muted)
- Must appear above VoiceDock
- Never full-screen on desktop

### Backend API Routes

#### 1. Task CRUD Endpoints

```typescript
// GET /api/tasks
// Returns all tasks, optionally filtered
interface GetTasksQuery {
  query?: string;      // Semantic search on title
  priority?: number;
  scheduled?: string;  // ISO date
  limit?: number;
}

// POST /api/tasks
interface CreateTaskBody {
  title: string;
  scheduled_time?: string;
  priority_index?: number;
  tags?: string[];
}

// PATCH /api/tasks/[id]
interface UpdateTaskBody {
  title?: string;
  completed?: boolean;
  scheduled_time?: string;
  priority_index?: number;
  tags?: string[];
}

// DELETE /api/tasks/[id]
// Returns deleted task for confirmation
```

#### 2. Livekit Room Management

```typescript
// POST /api/livekit/token
// Generates access token for Livekit room
interface TokenRequest {
  roomName: string;
  participantName: string;
}

interface TokenResponse {
  token: string;
  url: string; // Livekit server URL
}
```

### Voice Agent Architecture

#### Agent Entry Point
```typescript
// agent/index.ts
import { WorkerOptions, cli, defineAgent } from '@livekit/agents';
import { DeepgramSTT } from '@livekit/agents-plugin-deepgram';
import { OpenAILLM, OpenAITTS } from '@livekit/agents-plugin-openai';

const agent = defineAgent({
  entry: async (ctx) => {
    // Initialize STT, LLM, TTS
    const stt = new DeepgramSTT();
    const llm = new OpenAILLM({ model: 'gpt-4o-mini' });
    const tts = new OpenAITTS();
    
    // Connect to room
    await ctx.connect();
    
    // Start voice pipeline
    const assistant = new VoiceAssistant({
      stt,
      llm,
      tts,
      fnc_ctx: new TaskFunctionContext(),
    });
    
    assistant.start(ctx.room);
  },
});

cli.runApp(new WorkerOptions({ agent }));
```

#### Function Context for CRUD Operations
```typescript
class TaskFunctionContext extends FunctionContext {
  @llm.ai_callable()
  async create_task(
    title: string,
    scheduled_time?: string,
    priority_index?: number,
    tags?: string[]
  ): Promise<string> {
    // Call Next.js API: POST /api/tasks
    const response = await fetch(`${API_BASE_URL}/api/tasks`, {
      method: 'POST',
      body: JSON.stringify({ title, scheduled_time, priority_index, tags }),
    });
    const task = await response.json();
    return `Created task: ${task.title}`;
  }

  @llm.ai_callable()
  async get_tasks(
    query?: string,
    priority?: number,
    scheduled?: string
  ): Promise<string> {
    // Call Next.js API: GET /api/tasks
    const params = new URLSearchParams({ query, priority, scheduled });
    const response = await fetch(`${API_BASE_URL}/api/tasks?${params}`);
    const tasks = await response.json();
    
    if (tasks.length === 0) {
      return "You have no tasks matching that criteria.";
    }
    
    // Format tasks for TTS
    return tasks.map((t, i) => 
      `${i + 1}. ${t.title}${t.scheduled_time ? ` due ${formatDate(t.scheduled_time)}` : ''}`
    ).join('. ');
  }

  @llm.ai_callable()
  async update_task(
    identifier: string, // Title substring or index (e.g., "4th")
    title?: string,
    scheduled_time?: string,
    priority_index?: number
  ): Promise<string> {
    // 1. Resolve identifier to task ID
    const taskId = await this.resolveTaskIdentifier(identifier);
    
    // 2. Call Next.js API: PATCH /api/tasks/[id]
    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title, scheduled_time, priority_index }),
    });
    const task = await response.json();
    return `Updated task: ${task.title}`;
  }

  @llm.ai_callable()
  async delete_task(identifier: string): Promise<string> {
    // 1. Resolve identifier to task ID
    const taskId = await this.resolveTaskIdentifier(identifier);
    
    // 2. Call Next.js API: DELETE /api/tasks/[id]
    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      method: 'DELETE',
    });
    const task = await response.json();
    return `Deleted task: ${task.title}`;
  }

  private async resolveTaskIdentifier(identifier: string): Promise<string> {
    // Handle ordinal references (e.g., "4th", "fourth")
    const ordinalMatch = identifier.match(/(\d+)(st|nd|rd|th)/i);
    if (ordinalMatch) {
      const index = parseInt(ordinalMatch[1]) - 1;
      const tasks = await this.getAllTasks();
      return tasks[index]?.id;
    }
    
    // Handle semantic matching (e.g., "task about compliances")
    const tasks = await this.getAllTasks();
    const matches = tasks.filter(t => 
      t.title.toLowerCase().includes(identifier.toLowerCase())
    );
    
    if (matches.length === 1) {
      return matches[0].id;
    } else if (matches.length > 1) {
      throw new Error('Multiple tasks match. Please be more specific.');
    } else {
      throw new Error('No task found matching that description.');
    }
  }
}
```

## Data Models

### Database Schema (Supabase PostgreSQL)

```sql
-- tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  scheduled_time TIMESTAMPTZ,
  priority_index INTEGER CHECK (priority_index BETWEEN 1 AND 5),
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for semantic search on title
CREATE INDEX idx_tasks_title_trgm ON tasks USING gin (title gin_trgm_ops);

-- Index for scheduled time queries
CREATE INDEX idx_tasks_scheduled ON tasks (scheduled_time) WHERE scheduled_time IS NOT NULL;

-- Index for priority queries
CREATE INDEX idx_tasks_priority ON tasks (priority_index) WHERE priority_index IS NOT NULL;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### TypeScript Types

```typescript
// types/task.ts
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  scheduled_time: string | null;
  priority_index: number | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export type CreateTaskInput = Pick<Task, 'title'> & 
  Partial<Pick<Task, 'scheduled_time' | 'priority_index' | 'tags'>>;

export type UpdateTaskInput = Partial<
  Pick<Task, 'title' | 'completed' | 'scheduled_time' | 'priority_index' | 'tags'>
>;

export interface TaskFilter {
  query?: string;
  priority?: number;
  scheduled?: string;
  completed?: boolean;
}
```

## Error Handling

### Frontend Error Handling

```typescript
// utils/error-handler.ts
export class VoiceError extends Error {
  constructor(
    message: string,
    public code: VoiceErrorCode,
    public recoverable: boolean = true
  ) {
    super(message);
  }
}

export enum VoiceErrorCode {
  MICROPHONE_PERMISSION_DENIED = 'MICROPHONE_PERMISSION_DENIED',
  LIVEKIT_CONNECTION_FAILED = 'LIVEKIT_CONNECTION_FAILED',
  STT_TIMEOUT = 'STT_TIMEOUT',
  LLM_ERROR = 'LLM_ERROR',
  API_ERROR = 'API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export function handleVoiceError(error: VoiceError): string {
  switch (error.code) {
    case VoiceErrorCode.MICROPHONE_PERMISSION_DENIED:
      return "Please allow microphone access to use voice commands.";
    case VoiceErrorCode.LIVEKIT_CONNECTION_FAILED:
      return "Connection failed. Please refresh and try again.";
    case VoiceErrorCode.STT_TIMEOUT:
      return "I didn't catch that. Could you repeat?";
    case VoiceErrorCode.LLM_ERROR:
      return "I'm having trouble understanding. Could you rephrase?";
    case VoiceErrorCode.API_ERROR:
      return "Something went wrong. Please try again.";
    case VoiceErrorCode.DATABASE_ERROR:
      return "Failed to save changes. Please try again.";
    default:
      return "An unexpected error occurred.";
  }
}
```

### Voice Agent Error Handling

```typescript
// agent/error-handler.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 500
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError!;
}

// Usage in function context
async create_task(title: string, ...): Promise<string> {
  try {
    return await withRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: 'POST',
        body: JSON.stringify({ title, ... }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const task = await response.json();
      return `Created task: ${task.title}`;
    });
  } catch (error) {
    return "I couldn't create that task. Please try again.";
  }
}
```

### API Route Error Handling

```typescript
// app/api/tasks/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input
    if (!body.title || body.title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }
    
    // Insert into database
    const { data, error } = await supabase
      .from('tasks')
      .insert(body)
      .select()
      .single();
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Testing Strategy

### Unit Tests

**Frontend Components**:
- Test TaskCard rendering with various task states
- Test VoiceDock state transitions (idle → listening → processing)
- Test ConfirmationModal user interactions
- Test task filtering logic in TaskList

**API Routes**:
- Test CRUD operations with valid/invalid inputs
- Test error handling for database failures
- Test query parameter parsing for GET /api/tasks

**Voice Agent Functions**:
- Test task identifier resolution (ordinal, semantic)
- Test function call formatting for LLM
- Test retry logic for API failures

### Integration Tests

**Voice Pipeline**:
- Test end-to-end flow: voice input → STT → LLM → API → TTS
- Test latency measurements for each stage
- Test error recovery when STT fails
- Test ambiguous command handling (multiple matches)

**Database Operations**:
- Test concurrent task creation
- Test semantic search accuracy
- Test scheduled time parsing and storage

### Performance Tests

**Latency Benchmarks**:
- Measure STT latency (target: <500ms)
- Measure LLM response time (target: <1000ms)
- Measure TTS generation (target: <500ms)
- Measure total round-trip time (target: <2000ms)

**Load Tests**:
- Test Livekit room connection under load
- Test API route performance with 100+ tasks
- Test database query performance with semantic search

### Accuracy Tests

**Intent Recognition**:
- Test 50+ sample commands across all CRUD operations
- Measure accuracy rate (target: >90%)
- Test edge cases (ambiguous commands, typos in STT)
- Test multi-step commands (e.g., "Create a task and mark it high priority")

## Design Rationale

### Why Deepgram for STT?
- **Low latency**: Deepgram's streaming API provides real-time transcription with <300ms latency
- **High accuracy**: Industry-leading accuracy for conversational speech
- **Cost-effective**: Pay-per-use pricing suitable for demo/MVP
- **Livekit integration**: Native plugin available

### Why GPT-4o mini for LLM?
- **Speed**: Optimized for low-latency responses (<1s typical)
- **Function calling**: Excellent structured output for CRUD operations
- **Cost**: 60% cheaper than GPT-4, suitable for high-volume voice interactions
- **Accuracy**: Sufficient for intent classification and parameter extraction

### Why Livekit for Voice Infrastructure?
- **WebRTC**: Low-latency real-time audio streaming
- **Agent SDK**: Built-in orchestration for STT → LLM → TTS pipeline
- **Scalability**: Cloud-hosted rooms with automatic scaling
- **Developer experience**: Simple API, good documentation

### Why Supabase for Database?
- **PostgreSQL**: Full-text search with pg_trgm for semantic matching
- **Real-time**: Optional real-time subscriptions for multi-user future
- **Hosted**: No infrastructure management required
- **Free tier**: Sufficient for demo/MVP

### Why Next.js for Frontend?
- **Vercel deployment**: One-click deployment with optimal performance
- **API routes**: Backend and frontend in single codebase
- **TypeScript**: Type safety across full stack
- **React Server Components**: Optimal loading performance
