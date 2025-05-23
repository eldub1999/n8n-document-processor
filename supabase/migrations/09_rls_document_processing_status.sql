-- Migration: Define RLS policies for document_processing_status
-- Description: Ensures users can only access status information related to their own documents.

-- Ensure RLS is enabled (it should be based on mcp_supabase_list_tables output, but explicit is good)
ALTER TABLE public.document_processing_status ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can access status for their documents" ON public.document_processing_status;

-- Policy: Users can view status for documents they have access to
CREATE POLICY "Users can access status for their documents" 
ON public.document_processing_status FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = document_id AND d.created_by = auth.uid()
  )
);

-- Policy: Block direct inserts, updates, deletes by default for authenticated users
-- These operations are handled by backend processes (Edge Functions).
CREATE POLICY "Block direct inserts on document_processing_status" 
ON public.document_processing_status FOR INSERT 
TO authenticated
WITH CHECK (false);

CREATE POLICY "Block direct updates on document_processing_status" 
ON public.document_processing_status FOR UPDATE 
TO authenticated
USING (false);

CREATE POLICY "Block direct deletes on document_processing_status" 
ON public.document_processing_status FOR DELETE 
TO authenticated
USING (false);

-- Comment: Backend processes creating/updating these records would use a service_role key to bypass RLS. 