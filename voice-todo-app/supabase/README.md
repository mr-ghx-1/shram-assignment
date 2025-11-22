# Supabase Database Setup

This directory contains the database migration files for the Voice Todo App.

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com) and sign up or log in
2. Click "New Project"
3. Fill in your project details:
   - Name: voice-todo-app (or your preferred name)
   - Database Password: Choose a strong password
   - Region: Select the region closest to you
4. Wait for the project to be created (takes ~2 minutes)

### 2. Get Your Connection Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env.local` in the project root:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 4. Run the Database Migration

You have two options to run the migration:

#### Option A: Using Supabase SQL Editor (Recommended for Quick Setup)

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the contents of `migrations/001_create_tasks_table.sql`
4. Paste into the SQL editor
5. Click "Run" to execute the migration

#### Option B: Using Supabase CLI (Recommended for Production)

1. Install the Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-id
   ```

3. Run migrations:
   ```bash
   supabase db push
   ```

### 5. Verify the Setup

1. In your Supabase dashboard, go to **Table Editor**
2. You should see a `tasks` table with the following columns:
   - id (uuid, primary key)
   - title (text)
   - completed (boolean)
   - scheduled_time (timestamptz)
   - priority_index (integer)
   - tags (text[])
   - created_at (timestamptz)
   - updated_at (timestamptz)

3. Check that the indexes were created:
   - Go to **Database** → **Indexes**
   - You should see indexes for title (gin), scheduled_time, priority_index, and completed

## Database Schema

### Tasks Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, auto-generated |
| title | TEXT | Task title (required) |
| completed | BOOLEAN | Task completion status (default: false) |
| scheduled_time | TIMESTAMPTZ | When the task is scheduled (optional) |
| priority_index | INTEGER | Priority level 1-5 (optional) |
| tags | TEXT[] | Array of tags (optional) |
| created_at | TIMESTAMPTZ | Creation timestamp (auto-generated) |
| updated_at | TIMESTAMPTZ | Last update timestamp (auto-updated) |

### Indexes

- **idx_tasks_title_trgm**: GIN index for semantic search on title using pg_trgm
- **idx_tasks_scheduled**: B-tree index for scheduled time queries
- **idx_tasks_priority**: B-tree index for priority queries
- **idx_tasks_completed**: B-tree index for completion status queries

### Triggers

- **update_tasks_updated_at**: Automatically updates the `updated_at` column on row updates

## Testing the Connection

After setup, you can test the database connection by running the Next.js development server:

```bash
npm run dev
```

The Supabase client will automatically validate the connection on initialization.
