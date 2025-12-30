-- Migration 003: Add Google Calendar sync support
-- Run this in Supabase SQL Editor

-- Create user settings table for OAuth tokens and preferences
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_calendar_token JSONB,  -- Stores access_token, refresh_token, expiry
  google_calendar_enabled BOOLEAN DEFAULT FALSE,
  google_calendar_id TEXT,      -- Target calendar ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add calendar event reference to items
ALTER TABLE items ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;

-- Index for finding synced items
CREATE INDEX IF NOT EXISTS idx_items_calendar_event ON items(google_calendar_event_id)
  WHERE google_calendar_event_id IS NOT NULL;

-- Enable RLS for user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON user_settings TO authenticated;

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_settings_updated_at ON user_settings;
CREATE TRIGGER trigger_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_settings_updated_at();
