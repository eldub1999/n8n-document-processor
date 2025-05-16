-- Migration: Create archive storage bucket
-- Description: Creates a storage bucket for archived document versions

-- Create archive bucket for document versions
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-archive', 'document-archive', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for document-archive bucket
CREATE POLICY "Users can read their archived documents" ON storage.objects
FOR SELECT
USING (
    bucket_id = 'document-archive' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Prevent direct updates to archived documents
CREATE POLICY "No one can update archived documents" ON storage.objects
FOR UPDATE
USING (
    bucket_id != 'document-archive'
);

-- Prevent direct deletions of archived documents (managed by expiry process)
CREATE POLICY "No one can delete archived documents directly" ON storage.objects
FOR DELETE
USING (
    bucket_id != 'document-archive'
); 