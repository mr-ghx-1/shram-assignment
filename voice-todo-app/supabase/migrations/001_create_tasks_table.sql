-- Enable pg_trgm extension for semantic search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

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

-- Index for semantic search on title using pg_trgm
CREATE INDEX idx_tasks_title_trgm ON tasks USING gin (title gin_trgm_ops);

-- Index for scheduled time queries
CREATE INDEX idx_tasks_scheduled ON tasks (scheduled_time) WHERE scheduled_time IS NOT NULL;

-- Index for priority queries
CREATE INDEX idx_tasks_priority ON tasks (priority_index) WHERE priority_index IS NOT NULL;

-- Index for completed status
CREATE INDEX idx_tasks_completed ON tasks (completed);

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row updates
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
