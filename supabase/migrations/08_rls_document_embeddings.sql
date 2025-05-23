-- Migration: Define RLS policies for document_embeddings
-- Description: Ensures users can only access embeddings related to their own documents.

-- Ensure RLS is enabled (it should be based on mcp_supabase_list_tables output, but explicit is good)
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, to start fresh or avoid conflicts by name
-- (It's safer to assume generic default policies might exist if RLS was enabled without specific policies being created by us)
DROP POLICY IF EXISTS "Users can view embeddings for their documents" ON public.document_embeddings;
DROP POLICY IF EXISTS "Allow select for service_role if applicable" ON public.document_embeddings; -- Example name

-- Policy: Users can view embeddings for documents they have access to
CREATE POLICY "Users can view embeddings for their documents" 
ON public.document_embeddings FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = document_id AND d.created_by = auth.uid()
  )
);

-- Policy: Block direct inserts, updates, deletes by default for authenticated users
-- These operations should typically be handled by backend processes (Edge Functions)
-- operating with elevated privileges (e.g., service_role which bypasses RLS).

CREATE POLICY "Block direct inserts on document_embeddings" 
ON public.document_embeddings FOR INSERT 
TO authenticated
WITH CHECK (false);

CREATE POLICY "Block direct updates on document_embeddings" 
ON public.document_embeddings FOR UPDATE 
TO authenticated
USING (false);

CREATE POLICY "Block direct deletes on document_embeddings" 
ON public.document_embeddings FOR DELETE 
TO authenticated
USING (false);

-- Comment: If there are specific scenarios where authenticated users (not service roles)
-- might need to create or modify embeddings directly (unlikely for this table),
-- more granular policies would be needed. For now, assume backend processes handle this. 