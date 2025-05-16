-- Migration: Update documents table for deduplication, versioning, and metadata tagging
-- Description: Adds fields for content_hash, versioning, and jurisdiction metadata

-- Add content_hash column for deduplication
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Create index on content_hash for faster duplicate detection
CREATE INDEX IF NOT EXISTS idx_documents_content_hash 
ON public.documents(content_hash);

-- Add versioning columns
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT TRUE;

-- Add metadata tagging columns
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS jurisdiction TEXT,
ADD COLUMN IF NOT EXISTS county TEXT,
ADD COLUMN IF NOT EXISTS document_type TEXT;

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_documents_is_latest 
ON public.documents(is_latest);

CREATE INDEX IF NOT EXISTS idx_documents_jurisdiction 
ON public.documents(jurisdiction);

CREATE INDEX IF NOT EXISTS idx_documents_document_type 
ON public.documents(document_type);

-- Update RLS policies to include new fields 