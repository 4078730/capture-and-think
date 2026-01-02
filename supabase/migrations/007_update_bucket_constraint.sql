-- Migration 007: Update bucket constraint to include new buckets
-- Run this in Supabase SQL Editor

-- Step 1: First, temporarily disable the constraint by dropping it
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_bucket_check;

-- Step 2: Migrate existing data with old bucket values to new values
-- Map old buckets to new buckets
UPDATE items SET bucket = 'rfa' WHERE bucket = 'work';
UPDATE items SET bucket = 'game' WHERE bucket = 'boardgame';

-- Step 3: Verify no invalid bucket values exist (optional check)
-- This will show any rows with invalid bucket values
-- SELECT DISTINCT bucket FROM items WHERE bucket IS NOT NULL AND bucket NOT IN ('management', 'rfa', 'cxc', 'paper', 'video', 'life', 'game');

-- Step 4: Add new check constraint with updated bucket values
ALTER TABLE items ADD CONSTRAINT items_bucket_check
  CHECK (bucket IS NULL OR bucket IN ('management', 'rfa', 'cxc', 'paper', 'video', 'life', 'game'));

