-- Migration: Add ADF (Atlassian Document Format) content column
-- This enables rich text editing with inline images, formatted text, etc.

-- ADFコンテンツカラム追加
ALTER TABLE items ADD COLUMN IF NOT EXISTS adf_content JSONB;

-- 将来のJSONBクエリ用GINインデックス
CREATE INDEX IF NOT EXISTS idx_items_adf_content ON items USING GIN (adf_content);

-- カラムの説明
COMMENT ON COLUMN items.adf_content IS 'Atlassian Document Format structured content for rich text editing';
