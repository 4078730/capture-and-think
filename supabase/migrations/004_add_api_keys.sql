-- Migration 004: Add API keys for MCP Server authentication
-- Run this in Supabase SQL Editor

-- Create API keys table for Claude/ChatGPT integration
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,        -- SHA256 hash of the API key
  key_prefix TEXT NOT NULL,      -- First 8 chars for display (e.g., "cat_xxxx")
  name TEXT NOT NULL,            -- User-friendly name ("Claude Desktop", "ChatGPT", etc.)
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,        -- NULL = never expires
  UNIQUE(key_hash)
);

-- Index for efficient key lookup
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own keys"
  ON api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Note: No update policy - keys should be deleted and recreated

-- Grant permissions
GRANT ALL ON api_keys TO authenticated;

-- Service role needs to verify keys (for MCP auth)
GRANT SELECT ON api_keys TO service_role;
