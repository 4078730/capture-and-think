-- Migration 007 Fix: Update bucket constraint (with data cleanup)
-- Run this in Supabase SQL Editor if the previous migration failed

-- Step 1: Check current constraint name (it might have a different name)
-- Run this first to see the constraint name:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'items'::regclass AND contype = 'c';

-- Step 2: Drop ALL check constraints on bucket column
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'items'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%bucket%'
    ) LOOP
        EXECUTE 'ALTER TABLE items DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- Step 3: Migrate existing data with old bucket values to new values
UPDATE items SET bucket = 'rfa' WHERE bucket = 'work';
UPDATE items SET bucket = 'game' WHERE bucket = 'boardgame';

-- Step 4: Clean up any invalid bucket values (set to NULL if not in allowed list)
UPDATE items SET bucket = NULL 
WHERE bucket IS NOT NULL 
AND bucket NOT IN ('management', 'rfa', 'cxc', 'paper', 'video', 'life', 'game');

-- Step 5: Add new check constraint with updated bucket values
ALTER TABLE items ADD CONSTRAINT items_bucket_check
  CHECK (bucket IS NULL OR bucket IN ('management', 'rfa', 'cxc', 'paper', 'video', 'life', 'game'));

