-- Migration: Enhance RLS policies for public.documents
-- Description: Modifies existing RLS policies and adds new ones for more granular access control.

-- Drop existing basic policies first to redefine them
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;

-- Policy: Users can insert documents for themselves
CREATE POLICY "Users can insert their own new documents" 
ON public.documents FOR INSERT 
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Policy: Users can view their own documents (all versions by default if not specified otherwise by a view/function)
CREATE POLICY "Users can view their own documents (all versions)" 
ON public.documents FOR SELECT 
TO authenticated
USING (created_by = auth.uid());

-- Policy: Users can update their own documents 
-- Note: The handle_document_update trigger manages versioning on storage_path/content_hash changes.
-- This policy allows metadata updates on the latest version.
CREATE POLICY "Users can update their own latest documents" 
ON public.documents FOR UPDATE
TO authenticated
USING (created_by = auth.uid() AND is_latest = TRUE)
WITH CHECK (created_by = auth.uid());

-- Policy: Users can delete their own documents (latest record and associated versions via CASCADE)
-- This will also trigger deletion of related data in other tables due to CASCADE FKs (e.g., document_versions, document_embeddings)
CREATE POLICY "Users can delete their own documents (latest entry)" 
ON public.documents FOR DELETE
TO authenticated
USING (created_by = auth.uid() AND is_latest = TRUE);

-- Example: Policy for a hypothetical 'admin' role to view all documents
-- This requires a way to identify admins, e.g., a custom claim in JWT or a separate 'user_roles' table.
-- For this example, we'll assume a custom claim 'user_role' exists.
-- Adjust or remove if not applicable / if admin access is handled differently (e.g., service_role key).
/*
CREATE POLICY "Admins can view all documents" 
ON public.documents FOR SELECT 
TO authenticated
USING (auth.jwt()->>'user_role' = 'admin');
*/

-- Example: Policy for 'admin' to update any document's metadata (latest version)
/*
CREATE POLICY "Admins can update any latest document metadata" 
ON public.documents FOR UPDATE 
TO authenticated
USING (auth.jwt()->>'user_role' = 'admin' AND is_latest = TRUE);
*/

-- Example: Policy for 'admin' to delete any document (latest record)
/*
CREATE POLICY "Admins can delete any latest document" 
ON public.documents FOR DELETE 
TO authenticated
USING (auth.jwt()->>'user_role' = 'admin' AND is_latest = TRUE);
*/

-- Comment: The RLS policies related to auth.uid() assume that the user interacting
-- with the database is authenticated and their UID is available via auth.uid().
-- Service-level operations (like Edge Functions running with a service_role key)
-- typically bypass RLS by default unless specifically configured not to. 