-- Create the diagnostic-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diagnostic-images',
  'diagnostic-images', 
  true,  -- Make bucket public for easy image viewing
  10485760,  -- 10MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']::text[]
);

-- Set up RLS policies for the bucket
-- Allow anyone to read (since bucket is public)
CREATE POLICY "Public read access for diagnostic images"
ON storage.objects FOR SELECT
USING (bucket_id = 'diagnostic-images');

-- Allow authenticated users to insert (your API will upload)
CREATE POLICY "Authenticated users can upload diagnostic images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'diagnostic-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Authenticated users can delete diagnostic images"
ON storage.objects FOR DELETE
USING (bucket_id = 'diagnostic-images' AND auth.role() = 'authenticated');