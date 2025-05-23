-- Migration: Enable RLS for processed_markdown_documents and add policies
-- Description: Addresses security gap by enabling RLS and adding baseline policies.

-- Enable Row Level Security
ALTER TABLE public.processed_markdown_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view processed markdown for documents they have access to
CREATE POLICY "Users can view processed markdown for their documents" 
ON public.processed_markdown_documents FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = document_id AND d.created_by = auth.uid()
  )
);

-- Policy: Block inserts, updates, deletes by default (to be handled by system/triggers if needed)
-- This assumes that processed_markdown_documents is populated by a backend process (e.g., Edge Function)
-- that operates with elevated privileges or a specific service role.

CREATE POLICY "Block direct inserts on processed_markdown_documents" 
ON public.processed_markdown_documents FOR INSERT 
TO authenticated
WITH CHECK (false);

CREATE POLICY "Block direct updates on processed_markdown_documents" 
ON public.processed_markdown_documents FOR UPDATE 
TO authenticated
USING (false);

CREATE POLICY "Block direct deletes on processed_markdown_documents" 
ON public.processed_markdown_documents FOR DELETE 
TO authenticated
USING (false);

-- Comment: Further policies might be needed if direct user modification is ever required,
-- or if service roles need specific permissions not covered by bypass RLS. 