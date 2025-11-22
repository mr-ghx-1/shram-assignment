# Voice Todo App - Setup Guide

This guide will help you set up and deploy the Voice-First Todo Web Application.

## Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- Accounts for the following services:
  - [Supabase](https://supabase.com) - Database
  - [LiveKit Cloud](https://cloud.livekit.io) - Voice infrastructure
  - [OpenAI](https://platform.openai.com) - Realtime API (integrated STT, LLM, and TTS)
  - [Vercel](https://vercel.com) - Frontend deployment (optional)

## Environment Variables

### Required Environment Variables

Copy `.env.example` to `.env.local` and fill in the following values:

#### Supabase Configuration

Get these from your Supabase project settings at `https://app.supabase.com/project/_/settings/api`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**How to get these:**
1. Go to [Supabase](https://supabase.com) and create a new project
2. Navigate to Project Settings → API
3. Copy the "Project URL" as `NEXT_PUBLIC_SUPABASE_URL`
4. Copy the "anon public" key as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### LiveKit Configuration

Get these from your LiveKit Cloud project at `https://cloud.livekit.io/`

```bash
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

**How to get these:**
1. Go to [LiveKit Cloud](https://cloud.livekit.io/) and create a new project
2. Navigate to Settings → Keys
3. Create a new API key pair
4. Copy the API Key as `LIVEKIT_API_KEY`
5. Copy the API Secret as `LIVEKIT_API_SECRET`
6. Copy the WebSocket URL as `NEXT_PUBLIC_LIVEKIT_URL`

#### OpenAI Configuration

Get your API key from `https://platform.openai.com/api-keys`

```bash
OPENAI_API_KEY=sk-your-openai-api-key
```

**How to get this:**
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Copy the key as `OPENAI_API_KEY`
4. Note: You'll need billing set up for API access



## Database Setup

### 1. Create the tasks table

Run the following SQL in your Supabase SQL Editor:

```sql
-- Create tasks table
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

-- Enable pg_trgm extension for semantic search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

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

### 2. Enable Row Level Security (Optional)

If you want to add user authentication later:

```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for now (remove this in production)
CREATE POLICY "Allow anonymous access" ON tasks
  FOR ALL USING (true);
```

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Run the development server

```bash
npm run dev
```

### 3. Open the app

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Deploy to Vercel

#### Option 1: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

#### Option 2: Using Vercel Dashboard

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/new)
3. Import your repository
4. Add environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
   - `NEXT_PUBLIC_LIVEKIT_URL`
   - `OPENAI_API_KEY`
5. Click "Deploy"

### Configure API Route Timeouts

The `vercel.json` file is already configured with a 30-second timeout for API routes. If you need to adjust this:

```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

## Troubleshooting

### Database Connection Issues

- Verify your Supabase URL and anon key are correct
- Check that the tasks table exists in your database
- Ensure pg_trgm extension is enabled

### LiveKit Connection Issues

- Verify your LiveKit API key and secret are correct
- Check that the WebSocket URL is correct (should start with `wss://`)
- Ensure the voice agent is running (see agent-starter-node setup)

### Voice Agent Not Responding

- Make sure the voice agent service is deployed and running
- Check that the agent has the correct `API_BASE_URL` pointing to your Next.js deployment
- Verify your OpenAI API key is valid and has Realtime API access

### API Route Timeouts

- If operations are timing out, increase the `maxDuration` in `vercel.json`
- Check Vercel logs for specific error messages

## Next Steps

After setting up the frontend:

1. Set up and deploy the voice agent (see `../agent-starter-node/SETUP.md`)
2. Test voice commands in the deployed app
3. Monitor latency and accuracy metrics
4. Customize the UI and voice assistant behavior

## Support

For issues or questions:
- Check the [LiveKit Agents documentation](https://docs.livekit.io/agents/)
- Review the [Next.js documentation](https://nextjs.org/docs)
- Check the [Supabase documentation](https://supabase.com/docs)
