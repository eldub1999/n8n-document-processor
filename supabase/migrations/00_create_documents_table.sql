-- Migration: Create documents table
-- Description: Creates the initial documents table structure

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT
);

-- Enable Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create policy for users to select their own documents
CREATE POLICY "Users can view their own documents" 
ON public.documents FOR SELECT 
TO authenticated
USING (created_by = auth.uid());

-- Create policy for users to insert their own documents
CREATE POLICY "Users can insert their own documents" 
ON public.documents FOR INSERT 
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Create policy for users to update their own documents
CREATE POLICY "Users can update their own documents" 
ON public.documents FOR UPDATE
TO authenticated
USING (created_by = auth.uid()) 
WITH CHECK (created_by = auth.uid());

-- Create policy for users to delete their own documents
CREATE POLICY "Users can delete their own documents" 
ON public.documents FOR DELETE
TO authenticated
USING (created_by = auth.uid()); 