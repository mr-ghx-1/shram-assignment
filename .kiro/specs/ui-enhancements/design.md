# Design Document

## Overview

This document details the design for UI/UX enhancements to the voice-first to-do list web application. The enhancements focus on five key areas: visual design alignment with the provided mockup, natural language filter display, voice agent lifecycle management, user onboarding with greeting messages, and discoverability through a help section. Additionally, the system will support priority keyword mapping to provide a more natural interaction model.

### Enhancement Scope

- **Visual Design**: Align existing components with the design reference image
- **Filter Display**: Convert JSON filter objects to human-readable text
- **Agent Lifecycle**: Implement proper connection/disconnection on mic toggle
- **Greeting System**: Add voice introduction when agent connects
- **Help Section**: Create discoverable UI for voice command examples
- **Priority Keywords**: Map natural language priority terms to numeric values

## Architecture

### Component Modifications

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Application                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  AppShell (Enhanced)                                   │ │
│  │  - Updated color palette                               │ │
│  │  - Refined spacing and typography                      │ │
│  │  - Help button in header                               │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  TaskCard (Enhanced)                                   │ │
│  │  - Priority keyword display (Low/Normal/High/etc.)     │ │
│  │  - Updated visual styling                              │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  VoiceDock (Enhanced)                                  │ │
│  │  - Natural language filter display                     │ │
│  │  - Connection state management                         │ │
│  │  - Disconnect on mic toggle                            │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  HelpPanel (New Component)                             │ │
│  │  - Expandable command reference                        │ │
│  │  - Categorized examples                                │ │
│  │  - Priority keyword documentation                      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ WebRTC (Livekit)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Voice Agent (Enhanced)                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Greeting System                                       │ │
│  │  - Play introduction on room join                      │ │
│  │  - "Hi, I'm Sid, how can I assist you today?"         │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Priority Keyword Mapper                               │ │
│  │  - Convert keywords to numeric values                  │ │
│  │  - Low=1, Normal=2, High=3, Urgent=4, Critical=5      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Enhanced VoiceDock Component

#### Natural Language Filter Display

```typescript
interface FilterState {
  priority?: number;
  scheduled?: string;
  query?: string;
  tags?: string[];
}

interface VoiceDockProps {
  // ... existing props
  activeFilter?: FilterState | null;
}

/**
 * Converts filter state to natural language description
 */
function formatFilterDisplay(filter: FilterState | null): string {
  if (!filter) return 'Tap to speak';
  
  const parts: string[] = [];
  
  // Priority filter
  if (filter.priority) {
    const priorityLabels = {
      1: 'low priority',
      2: 'normal priority',
      3: 'high priority',
      4: 'urgent',
      5: 'critical'
    };
    parts.push(priorityLabels[filter.priority] || `priority ${filter.priority}`);
  }
  
  // Scheduled filter
  if (filter.scheduled) {
    const date = new Date(filter.scheduled);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === now.toDateString()) {
      parts.push("today's");
    } else if (date.toDateString() === tomorrow.toDateString()) {
      parts.push("tomorrow's");
    } else {
      parts.push(`${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
    }
  }
  
  // Query filter
  if (filter.query) {
    parts.push(`"${filter.query}"`);
  }
  
  // Tags filter
  if (filter.tags && filter.tags.length > 0) {
    parts.push(filter.tags.map(t => `#${t}`).join(', '));
  }
  
  if (parts.length === 0) {
    return 'Showing all tasks';
  }
  
  return `Showing ${parts.join(' ')} tasks`;
}
```

**Implementation Notes**:
- Replace raw JSON display with `formatFilterDisplay()` output
- Update transcript display area to show filter description
- Maintain existing visual styling and animations

#### Microphone Pause/Resume Management

```typescript
interface VoiceDockState {
  isConnected: boolean;
  isListening: boolean;
  isPaused: boolean;
  voiceAssistant: VoiceAssistant | null;
}

/**
 * Handle microphone toggle with pause/resume functionality
 */
async function handleMicToggle() {
  if (!voiceAssistant) return;
  
  if (isListening) {
    // Pause: stop listening and clear pipeline
    await voiceAssistant.stopAudio(); // Stop any playing audio immediately
    await voiceAssistant.clearPipeline(); // Clear in-progress processing
    setIsListening(false);
    setIsPaused(true);
  } else {
    // Resume: start listening again
    await voiceAssistant.resumeListening();
    setIsListening(true);
    setIsPaused(false);
  }
}
```

**Implementation Notes**:
- Maintain room connection throughout pause/resume cycle
- Stop audio playback immediately on pause
- Clear STT and LLM processing pipeline on pause
- Resume listening without reconnecting to room
- Update status indicators to show "Paused" when mic is off

### 2. New HelpPanel Component

```typescript
interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandExample {
  category: string;
  examples: string[];
}

const COMMAND_EXAMPLES: CommandExample[] = [
  {
    category: 'Create Tasks',
    examples: [
      'Create a task to finish the report',
      'Add a high priority task to review the code',
      'Make a critical task for the client meeting tomorrow',
    ]
  },
  {
    category: 'View Tasks',
    examples: [
      'Show me all tasks',
      'Show me high priority tasks',
      'What tasks do I have today?',
      'Show me tasks tagged with work',
    ]
  },
  {
    category: 'Update Tasks',
    examples: [
      'Move the report task to tomorrow',
      'Change the priority of the first task to urgent',
      'Mark the third task as complete',
    ]
  },
  {
    category: 'Delete Tasks',
    examples: [
      'Delete the task about groceries',
      'Remove the second task',
    ]
  },
  {
    category: 'Priority Levels',
    examples: [
      'Low (1) - Nice-to-have, optional',
      'Normal (2) - Standard task, no urgency',
      'High (3) - Should be completed soon',
      'Urgent (4) - Time-sensitive, needs attention',
      'Critical (5) - Highest severity, must address immediately',
    ]
  }
];

export function HelpPanel({ isOpen, onClose }: HelpPanelProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-card shadow-soft-hover max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-900">
            Voice Commands
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            aria-label="Close help"
          >
            <svg className="w-5 h-5 text-neutral-500" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {COMMAND_EXAMPLES.map((section, index) => (
            <div key={index}>
              <h3 className="text-lg font-medium text-neutral-900 mb-3">
                {section.category}
              </h3>
              <ul className="space-y-2">
                {section.examples.map((example, exIndex) => (
                  <li key={exIndex} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">•</span>
                    <span className="text-sm text-neutral-700">{example}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Implementation Notes**:
- Modal overlay with backdrop blur
- Scrollable content area for long command lists
- Organized by CRUD operation categories
- Include priority keyword reference section
- Accessible via button in AppShell header

### 3. Enhanced AppShell Component

```typescript
export function AppShell({ children }: AppShellProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-gradient-calm">
      <header className="w-full border-b border-neutral-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-green-600">
            Voice Todo
          </h1>
          
          {/* Help button */}
          <button
            onClick={() => setIsHelpOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Help
          </button>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-12">
        {children}
      </main>
      
      <HelpPanel isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
```

**Visual Design Updates**:
- Maintain existing gradient background
- Add help button to header with icon
- Ensure consistent spacing and typography
- Match design reference color palette

### 4. Enhanced TaskCard Component

```typescript
/**
 * Map priority index to keyword label
 */
function getPriorityLabel(priority: number | null): string | null {
  if (!priority) return null;
  
  const labels: Record<number, string> = {
    1: 'Low',
    2: 'Normal',
    3: 'High',
    4: 'Urgent',
    5: 'Critical'
  };
  
  return labels[priority] || null;
}

/**
 * Get priority color classes
 */
function getPriorityColor(priority: number | null): string {
  if (!priority) return 'text-neutral-600';
  
  const colors: Record<number, string> = {
    1: 'text-blue-600',      // Low - calm blue
    2: 'text-neutral-600',   // Normal - neutral gray
    3: 'text-orange-600',    // High - attention orange
    4: 'text-red-600',       // Urgent - warning red
    5: 'text-red-700',       // Critical - strong red
  };
  
  return colors[priority] || 'text-neutral-600';
}
```

**Implementation Notes**:
- Replace numeric priority display with keyword labels
- Apply color coding to priority badges
- Maintain existing card styling and hover effects
- Ensure visual consistency with design reference

### 5. Voice Agent Greeting System

```typescript
// agent/greeting.ts

interface GreetingConfig {
  message: string;
  voice: string;
  playOnce: boolean;
}

const GREETING_CONFIG: GreetingConfig = {
  message: "Hi, I'm Sid, how can I assist you today?",
  voice: 'alloy', // OpenAI TTS voice
  playOnce: true
};

/**
 * Play greeting message when agent connects to room
 */
async function playGreeting(ctx: JobContext, tts: OpenAITTS) {
  // Check if greeting has already been played for this room
  const roomId = ctx.room.name;
  const greetingPlayed = await ctx.room.metadata?.greetingPlayed;
  
  if (greetingPlayed) {
    return; // Skip if already greeted
  }
  
  // Generate TTS audio for greeting
  const audioStream = await tts.synthesize(GREETING_CONFIG.message);
  
  // Play audio to room
  await ctx.room.localParticipant.publishTrack(audioStream);
  
  // Mark greeting as played
  await ctx.room.updateMetadata({ greetingPlayed: true });
}
```

**Integration in Agent Entry Point**:

```typescript
// agent/index.ts

const agent = defineAgent({
  entry: async (ctx) => {
    const stt = new DeepgramSTT();
    const llm = new OpenAILLM({ model: 'gpt-4o-mini' });
    const tts = new OpenAITTS();
    
    await ctx.connect();
    
    // Play greeting before starting assistant
    await playGreeting(ctx, tts);
    
    const assistant = new VoiceAssistant({
      stt,
      llm,
      tts,
      fnc_ctx: new TaskFunctionContext(),
    });
    
    assistant.start(ctx.room);
  },
});
```

**Implementation Notes**:
- Play greeting immediately after room connection
- Use room metadata to track greeting state
- Ensure greeting completes before accepting user input
- Use consistent TTS voice for greeting and responses

### 6. Priority Keyword Mapping in Voice Agent

```typescript
// agent/priority-mapper.ts

interface PriorityMapping {
  keywords: string[];
  value: number;
  label: string;
}

const PRIORITY_MAPPINGS: PriorityMapping[] = [
  { keywords: ['low', 'minor', 'optional'], value: 1, label: 'Low' },
  { keywords: ['normal', 'medium', 'standard', 'regular'], value: 2, label: 'Normal' },
  { keywords: ['high', 'important', 'elevated'], value: 3, label: 'High' },
  { keywords: ['urgent', 'pressing', 'time-sensitive'], value: 4, label: 'Urgent' },
  { keywords: ['critical', 'severe', 'blocking', 'emergency'], value: 5, label: 'Critical' },
];

/**
 * Convert priority keyword or number to numeric value
 */
export function parsePriority(input: string | number): number | null {
  // If already a number, validate and return
  if (typeof input === 'number') {
    return input >= 1 && input <= 5 ? input : null;
  }
  
  // Normalize input
  const normalized = input.toLowerCase().trim();
  
  // Check if it's a numeric string
  const numericValue = parseInt(normalized);
  if (!isNaN(numericValue) && numericValue >= 1 && numericValue <= 5) {
    return numericValue;
  }
  
  // Match against keywords
  for (const mapping of PRIORITY_MAPPINGS) {
    if (mapping.keywords.some(keyword => normalized.includes(keyword))) {
      return mapping.value;
    }
  }
  
  return null;
}

/**
 * Convert priority value to keyword label
 */
export function formatPriority(value: number): string {
  const mapping = PRIORITY_MAPPINGS.find(m => m.value === value);
  return mapping?.label || `Priority ${value}`;
}
```

**Integration in Function Context**:

```typescript
// agent/task-function-context.ts

class TaskFunctionContext extends FunctionContext {
  @llm.ai_callable({
    description: 'Create a new task with optional priority (use keywords: low, normal, high, urgent, critical or numbers 1-5)',
  })
  async create_task(
    title: string,
    scheduled_time?: string,
    priority?: string | number,
    tags?: string[]
  ): Promise<string> {
    // Parse priority keyword to numeric value
    const priorityValue = priority ? parsePriority(priority) : null;
    
    const response = await fetch(`${API_BASE_URL}/api/tasks`, {
      method: 'POST',
      body: JSON.stringify({ 
        title, 
        scheduled_time, 
        priority_index: priorityValue, 
        tags 
      }),
    });
    
    const task = await response.json();
    
    // Format response with priority keyword
    const priorityLabel = priorityValue ? formatPriority(priorityValue) : '';
    return `Created ${priorityLabel ? priorityLabel.toLowerCase() + ' priority ' : ''}task: ${task.title}`;
  }
  
  @llm.ai_callable({
    description: 'Get tasks with optional filters (priority can be keyword or number)',
  })
  async get_tasks(
    query?: string,
    priority?: string | number,
    scheduled?: string
  ): Promise<string> {
    // Parse priority keyword to numeric value
    const priorityValue = priority ? parsePriority(priority) : undefined;
    
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (priorityValue) params.append('priority', priorityValue.toString());
    if (scheduled) params.append('scheduled', scheduled);
    
    const response = await fetch(`${API_BASE_URL}/api/tasks?${params}`);
    const tasks = await response.json();
    
    if (tasks.length === 0) {
      return "You have no tasks matching that criteria.";
    }
    
    return tasks.map((t, i) => {
      const parts = [`${i + 1}. ${t.title}`];
      if (t.priority_index) {
        parts.push(`${formatPriority(t.priority_index).toLowerCase()} priority`);
      }
      if (t.scheduled_time) {
        parts.push(`due ${formatDate(t.scheduled_time)}`);
      }
      return parts.join(', ');
    }).join('. ');
  }
}
```

**Implementation Notes**:
- Accept both keywords and numeric values in LLM function calls
- Convert keywords to numeric values before database operations
- Format responses using keyword labels for natural speech
- Update LLM function descriptions to document keyword support

## Data Models

### Filter State Type

```typescript
// types/filter.ts

export interface FilterState {
  priority?: number;
  scheduled?: string; // ISO 8601 date
  query?: string;
  tags?: string[];
}

export interface FilterDisplay {
  text: string;
  isActive: boolean;
}
```

### Priority Mapping Type

```typescript
// types/priority.ts

export type PriorityKeyword = 'low' | 'normal' | 'high' | 'urgent' | 'critical';

export interface PriorityLevel {
  value: number;
  keyword: PriorityKeyword;
  label: string;
  description: string;
  color: string;
}

export const PRIORITY_LEVELS: PriorityLevel[] = [
  {
    value: 1,
    keyword: 'low',
    label: 'Low',
    description: 'Nice-to-have, optional, can be done anytime',
    color: 'blue'
  },
  {
    value: 2,
    keyword: 'normal',
    label: 'Normal',
    description: 'Standard task with no urgency',
    color: 'neutral'
  },
  {
    value: 3,
    keyword: 'high',
    label: 'High',
    description: 'Should be completed soon, elevated importance',
    color: 'orange'
  },
  {
    value: 4,
    keyword: 'urgent',
    label: 'Urgent',
    description: 'Time-sensitive, needs attention shortly',
    color: 'red'
  },
  {
    value: 5,
    keyword: 'critical',
    label: 'Critical',
    description: 'Highest severity; blocking, must be addressed immediately',
    color: 'red-dark'
  }
];
```

## Visual Design Specifications

### Color Palette (from Design Reference)

```css
/* Primary Colors */
--green-50: #F6FBF6;
--green-100: #DFF6E6;
--green-200: #C1EDD1;
--green-500: #439153;
--green-600: #2D7A3E;
--green-700: #1F5A2B;

/* Neutral Colors */
--neutral-50: #FAFAFA;
--neutral-100: #F5F5F5;
--neutral-200: #E5E5E5;
--neutral-300: #D4D4D4;
--neutral-500: #737373;
--neutral-600: #525252;
--neutral-700: #404040;
--neutral-900: #171717;

/* Priority Colors */
--blue-600: #2563EB;      /* Low */
--orange-600: #EA580C;    /* High */
--red-600: #DC2626;       /* Urgent */
--red-700: #B91C1C;       /* Critical */

/* Semantic Colors */
--error-50: #FEF2F2;
--error-200: #FECACA;
--error-600: #DC2626;
--error-800: #991B1B;
```

### Typography

```css
/* Font Family */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
```

### Spacing and Borders

```css
/* Border Radius */
--radius-sm: 8px;
--radius-md: 12px;
--radius-card: 14px;
--radius-pill: 9999px;

/* Shadows */
--shadow-soft: 0 6px 20px rgba(34, 50, 30, 0.08);
--shadow-soft-hover: 0 8px 24px rgba(34, 50, 30, 0.12);

/* Spacing Scale */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
```

### Animations

```css
/* Transitions */
--transition-fast: 160ms cubic-bezier(0.2, 0.8, 0.2, 1);
--transition-base: 200ms cubic-bezier(0.2, 0.8, 0.2, 1);

/* Keyframes */
@keyframes press {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(0.95); }
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## Error Handling

### Filter Display Errors

```typescript
/**
 * Handle invalid filter states gracefully
 */
function safeFormatFilterDisplay(filter: FilterState | null): string {
  try {
    return formatFilterDisplay(filter);
  } catch (error) {
    console.error('Error formatting filter display:', error);
    return 'Tap to speak';
  }
}
```

### Priority Parsing Errors

```typescript
/**
 * Handle invalid priority inputs
 */
function safeParsePriority(input: string | number): number | null {
  try {
    return parsePriority(input);
  } catch (error) {
    console.error('Error parsing priority:', error);
    return null; // Default to no priority
  }
}
```

### Greeting Playback Errors

```typescript
/**
 * Handle greeting playback failures
 */
async function safePlayGreeting(ctx: JobContext, tts: OpenAITTS) {
  try {
    await playGreeting(ctx, tts);
  } catch (error) {
    console.error('Failed to play greeting:', error);
    // Continue without greeting - non-critical error
  }
}
```

## Testing Strategy

### Unit Tests

**Filter Display Formatting**:
- Test single filter (priority only, scheduled only, query only)
- Test multiple filters combined
- Test edge cases (null, undefined, empty objects)
- Test date formatting (today, tomorrow, specific dates)

**Priority Keyword Mapping**:
- Test all keyword variations (low, minor, optional, etc.)
- Test numeric inputs (1-5)
- Test invalid inputs (out of range, unknown keywords)
- Test case insensitivity

**Component Rendering**:
- Test HelpPanel open/close states
- Test TaskCard priority label display
- Test VoiceDock filter display updates
- Test AppShell help button interaction

### Integration Tests

**Voice Agent Greeting**:
- Test greeting plays on room connection
- Test greeting plays only once per session
- Test greeting completes before accepting input

**Microphone Pause/Resume**:
- Test pause on mic toggle off (audio stops, pipeline clears)
- Test resume on mic toggle on (listening resumes without reconnect)
- Test room connection persists during pause

**Priority End-to-End**:
- Test voice command with priority keyword
- Test task creation with priority
- Test task display with priority label
- Test filtering by priority keyword

### Visual Regression Tests

**Design Alignment**:
- Compare rendered components to design reference
- Test color palette consistency
- Test spacing and typography
- Test responsive layouts (desktop and mobile)

## Design Rationale

### Why Natural Language Filter Display?

Raw JSON is technical and confusing for end users. Natural language descriptions like "Showing high priority tasks due today" are immediately understandable and align with the voice-first interaction model.

### Why Pause Instead of Disconnect?

Maintaining the room connection while pausing provides faster resume times and avoids the overhead of reconnecting. Users can quickly toggle the mic on/off without waiting for connection establishment. The pause mechanism stops audio playback and clears the processing pipeline immediately, giving users instant control while keeping the connection ready for quick resumption.

### Why Greeting Message?

First-time users may not know the system is ready or how to interact with it. A friendly greeting provides immediate feedback that the voice agent is active and sets expectations for the interaction model.

### Why Help Section?

Voice interfaces have a discoverability problem - users don't know what commands are available. A visible help section solves this by providing examples and reducing the learning curve.

### Why Priority Keywords?

Saying "create a high priority task" is more natural than "create a priority 3 task". Keywords align with how people think about urgency and make the system more intuitive.

### Why Color-Coded Priorities?

Visual differentiation helps users quickly scan and identify urgent tasks. The color progression (blue → gray → orange → red) provides an intuitive urgency scale.
