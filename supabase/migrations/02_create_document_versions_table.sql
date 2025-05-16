-- Migration: Create document_versions table
-- Description: Creates a table to store archived versions of documents

-- Create document_versions table
CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Ensure unique document versions
    CONSTRAINT unique_document_version UNIQUE (document_id, version_number)
);

-- Create index for faster searching
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id
ON public.document_versions(document_id);

CREATE INDEX IF NOT EXISTS idx_document_versions_expiry_date
ON public.document_versions(expiry_date);

-- Apply RLS policies for document_versions
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see versions of documents they have access to
CREATE POLICY "Users can see document versions they have access to" ON public.document_versions
FOR SELECT
USING (
    document_id IN (
        SELECT id FROM public.documents WHERE auth.uid() = created_by
    )
);

-- Policy: Users can only create versions of their own documents
CREATE POLICY "Users can create versions of their own documents" ON public.document_versions
FOR INSERT
WITH CHECK (
    document_id IN (
        SELECT id FROM public.documents WHERE auth.uid() = created_by
    ) 
    AND auth.uid() = created_by
);

-- Block updates/deletes to maintain version history integrity
CREATE POLICY "No one can update document versions" ON public.document_versions
FOR UPDATE
USING (false);

CREATE POLICY "No one can delete document versions" ON public.document_versions
FOR DELETE
USING (false); 