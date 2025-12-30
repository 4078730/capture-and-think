-- Migration 002: Add AI approval flow fields
-- Run this in Supabase SQL Editor

-- Add 'awaiting_approval' to triage_state
-- Note: PostgreSQL doesn't support ALTER TYPE ADD VALUE in a transaction
-- So we need to drop and recreate the constraint

-- First, drop existing check constraint if exists
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_triage_state_check;

-- Add new check constraint with 'awaiting_approval' state
ALTER TABLE items ADD CONSTRAINT items_triage_state_check
  CHECK (triage_state IN ('pending', 'awaiting_approval', 'done', 'failed'));

-- Add fields to store AI suggestions before approval
ALTER TABLE items ADD COLUMN IF NOT EXISTS ai_suggested_bucket TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS ai_suggested_category TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS ai_suggested_kind TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS ai_suggested_summary TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS ai_suggested_tags TEXT[] DEFAULT '{}';
ALTER TABLE items ADD COLUMN IF NOT EXISTS ai_confidence REAL;

-- Index for fetching items awaiting approval efficiently
CREATE INDEX IF NOT EXISTS idx_items_awaiting_approval ON items(user_id, triage_state)
  WHERE triage_state = 'awaiting_approval';
