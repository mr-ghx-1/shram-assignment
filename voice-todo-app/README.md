# Voice-First Todo Web Application

A voice-controlled to-do list application built with Next.js, LiveKit, and AI. Manage your tasks using natural language voice commands with sub-2-second latency.

## 🚀 Live Demo

**Deployed Application**: [https://shram-voice-todo.vercel.app](https://shram-voice-todo.vercel.app)

**GitHub Repository**: [https://github.com/mr-ghx-1/shram-assignment](https://github.com/mr-ghx-1/shram-assignment)

## Features

- 🎤 **Voice-First Interface**: Create, read, update, and delete tasks using natural language
- ⚡ **Low Latency**: Sub-2-second response time for voice commands
- 🤖 **AI-Powered**: Uses GPT-4o mini for intent recognition and natural language understanding
- 🎨 **Beautiful UI**: Clean, modern interface with "Nature Calm" design system
- 📱 **Responsive**: Works on desktop and mobile devices
- 🔒 **Secure**: Built with Supabase for reliable data persistence

## Technology Stack

- **Frontend**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **Voice Infrastructure**: LiveKit for real-time audio streaming
- **Voice Model**: OpenAI Realtime API (gpt-4o-realtime-preview)
  - Integrated Speech-to-Text
  - Integrated Language Model with function calling
  - Integrated Text-to-Speech ("sage" voice)
- **Database**: Supabase PostgreSQL
- **Deployment**: Vercel

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- Accounts for: Supabase, LiveKit Cloud, OpenAI (with Realtime API access)

### Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd voice-todo-app
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Copy `.env.example` to `.env.local` and fill in your API keys:

```bash
cp .env.example .env.local
```

See [SETUP.md](./SETUP.md) for detailed instructions on obtaining API keys.

4. **Set up the database**

Run the SQL migration in your Supabase project (see [SETUP.md](./SETUP.md#database-setup))

5. **Run the development server**

```bash
npm run dev
```

6. **Open the app**

Navigate to [http://localhost:3000](http://localhost:3000)

## Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup and deployment guide
- **[.env.example](./.env.example)** - Environment variable template

## Voice Commands

Example commands you can use:

- **Create**: "Create a task to buy groceries tomorrow"
- **Read**: "Show me all my tasks" or "What tasks do I have for today?"
- **Update**: "Reschedule the 4th task to next Monday" or "Mark the task about groceries as complete"
- **Delete**: "Delete the task about groceries" or "Remove the 4th task"

## Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

See [SETUP.md](./SETUP.md#deployment) for detailed deployment instructions.

## Architecture

```
User Browser (Next.js App)
    ↓ WebRTC (LiveKit)
Voice Agent (LiveKit Agents)
    ↓ OpenAI Realtime API (Integrated STT + LLM + TTS)
Next.js API Routes
    ↓ REST API
Supabase PostgreSQL
```

## Technology Choices

### Why OpenAI Realtime API?

- **Ultra-low latency**: Integrated STT + LLM + TTS pipeline with <1s end-to-end latency
- **High accuracy**: Built on GPT-4o with 90%+ accuracy for speech recognition and intent understanding
- **Unified architecture**: Single API eliminates network overhead between separate services
- **Function calling**: Native support for structured CRUD operations
- **Natural conversation**: Built-in interruption handling and turn-taking
- **LiveKit integration**: Native support through `@livekit/agents-plugin-openai`
- **Voice quality**: High-quality "sage" voice for natural, friendly responses

## Project Structure

```
voice-todo-app/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── tasks/        # Task CRUD endpoints
│   │   └── livekit/      # LiveKit token generation
│   ├── page.tsx          # Main page
│   └── layout.tsx        # Root layout
├── components/            # React components
│   ├── AppShell.tsx      # Main layout wrapper
│   ├── TaskCard.tsx      # Individual task display
│   ├── TaskList.tsx      # Task list with filtering
│   └── VoiceDock.tsx     # Voice interface control
├── lib/                   # Utilities
│   ├── supabase.ts       # Supabase client
│   └── date-parser.ts    # Natural language date parsing
├── types/                 # TypeScript types
└── public/               # Static assets
```

## Related Projects

- **[agent-starter-node](../agent-starter-node/)** - LiveKit voice agent service

## License

MIT

## Support

For issues or questions:
- Check the [SETUP.md](./SETUP.md) guide
- Review the [LiveKit documentation](https://docs.livekit.io/)
- Check the [Next.js documentation](https://nextjs.org/docs)
