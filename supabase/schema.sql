-- Capture & Think Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create items table
CREATE TABLE IF NOT EXISTS items (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- User input fields (3 only)
  body TEXT NOT NULL,
  bucket TEXT CHECK (bucket IN ('work', 'video', 'life', 'boardgame')),
  pinned BOOLEAN DEFAULT FALSE,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),

  -- AI auto-generated fields
  category TEXT,
  kind TEXT DEFAULT 'unknown' CHECK (kind IN ('idea', 'task', 'note', 'reference', 'unknown')),
  summary TEXT,
  auto_tags TEXT[] DEFAULT '{}',
  confidence REAL DEFAULT 0.0,

  -- Processing state
  triage_state TEXT DEFAULT 'pending' CHECK (triage_state IN ('pending', 'done', 'failed')),
  triaged_at TIMESTAMPTZ,

  -- Metadata
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_bucket ON items(bucket);
CREATE INDEX IF NOT EXISTS idx_items_pinned ON items(pinned);
CREATE INDEX IF NOT EXISTS idx_items_triage_state ON items(triage_state);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_user_status_created ON items(user_id, status, created_at DESC);

-- Full-text search (simple tokenizer for now, pg_bigm for Japanese support later)
ALTER TABLE items ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', body || ' ' || COALESCE(summary, ''))
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_items_fts ON items USING GIN(fts);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_items_updated_at ON items;
CREATE TRIGGER trigger_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS)
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own items
CREATE POLICY "Users can view own items"
  ON items FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own items
CREATE POLICY "Users can insert own items"
  ON items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own items
CREATE POLICY "Users can update own items"
  ON items FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own items
CREATE POLICY "Users can delete own items"
  ON items FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON items TO authenticated;
GRANT ALL ON items TO service_role;
