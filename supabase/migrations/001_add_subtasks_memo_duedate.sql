-- Migration 001: Add subtasks, memo, and due_date fields
-- Run this in Supabase SQL Editor

-- Add memo field for detailed notes
ALTER TABLE items ADD COLUMN IF NOT EXISTS memo TEXT;

-- Add subtasks as JSONB array
-- Format: [{"id": "uuid", "text": "subtask text", "completed": false, "created_at": "timestamp"}]
ALTER TABLE items ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb;

-- Add due date field
ALTER TABLE items ADD COLUMN IF NOT EXISTS due_date DATE;

-- Index for due date queries
CREATE INDEX IF NOT EXISTS idx_items_due_date ON items(due_date) WHERE due_date IS NOT NULL;

-- Composite index for common query: active items with due dates by user
CREATE INDEX IF NOT EXISTS idx_items_user_active_due ON items(user_id, status, due_date)
  WHERE status = 'active' AND due_date IS NOT NULL;

-- Update full-text search to include memo (optional - may need to recreate)
-- Note: If fts column exists as generated column, we need to drop and recreate it
-- First check if the column exists and handle accordingly

-- For now, we'll add a simple index for memo text search
CREATE INDEX IF NOT EXISTS idx_items_memo ON items USING GIN (to_tsvector('simple', COALESCE(memo, '')));
