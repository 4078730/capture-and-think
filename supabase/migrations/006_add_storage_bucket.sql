-- Migration: Create item-attachments storage bucket
-- Note: This may need to be run in Supabase Dashboard if storage.buckets is not accessible via migrations

-- Create the bucket (if running via Supabase Dashboard or with proper permissions)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'item-attachments',
--   'item-attachments',
--   true,
--   10485760, -- 10MB
--   ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
-- )
-- ON CONFLICT (id) DO NOTHING;

-- RLS Policies for storage.objects
-- Note: These policies should be created in Supabase Dashboard under Storage > Policies

-- Policy: Users can upload to their own folder
-- CREATE POLICY "Users can upload to own folder"
-- ON storage.objects
-- FOR INSERT
-- WITH CHECK (
--   bucket_id = 'item-attachments' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Policy: Anyone can view attachments (public bucket)
-- CREATE POLICY "Anyone can view attachments"
-- ON storage.objects
-- FOR SELECT
-- USING (bucket_id = 'item-attachments');

-- Policy: Users can delete their own files
-- CREATE POLICY "Users can delete own files"
-- ON storage.objects
-- FOR DELETE
-- USING (
--   bucket_id = 'item-attachments' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Instructions:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Create a new bucket named "item-attachments"
-- 3. Enable "Public bucket" option
-- 4. Set file size limit to 10MB
-- 5. Set allowed MIME types: image/jpeg, image/png, image/gif, image/webp
-- 6. Add the following policies:
--    - INSERT: (bucket_id = 'item-attachments' AND auth.uid()::text = (storage.foldername(name))[1])
--    - SELECT: (bucket_id = 'item-attachments')
--    - DELETE: (bucket_id = 'item-attachments' AND auth.uid()::text = (storage.foldername(name))[1])
