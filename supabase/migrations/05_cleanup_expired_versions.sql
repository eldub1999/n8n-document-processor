-- Migration: Create cleanup function for expired document versions
-- Description: Sets up function to periodically clean up expired versions

-- Function to remove expired document versions
CREATE OR REPLACE FUNCTION cleanup_expired_document_versions()
RETURNS void AS $$
DECLARE
    version_record RECORD;
BEGIN
    -- Find expired document versions
    FOR version_record IN 
        SELECT * FROM public.document_versions
        WHERE expiry_date < now()
    LOOP
        -- Delete the file from storage
        -- Note: In production, this would use a more robust approach with retries
        -- and transaction management
        PERFORM extensions.http((
            'DELETE',
            current_setting('supabase_functions.url') || '/storage/v1/object/document-archive/' || version_record.storage_path,
            ARRAY[
                extensions.http_header('Authorization', 'Bearer ' || current_setting('supabase.auth.anon_key'))
            ],
            NULL,
            NULL
        )::extensions.http_request);
        
        -- Delete the version record
        DELETE FROM public.document_versions
        WHERE id = version_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on function
COMMENT ON FUNCTION cleanup_expired_document_versions IS 
'Removes document versions that have passed their expiry date.
This function should be scheduled to run periodically.';

/*
Note: To actually schedule this function, you'd need to set up
a cron job or similar mechanism. In Supabase, this would typically
be done with pg_cron extension or with an external scheduler.

Example pg_cron setup (if enabled):

SELECT cron.schedule(
  'cleanup-expired-versions', -- name of the job
  '0 0 * * 0',               -- weekly on Sunday at midnight
  $$SELECT cleanup_expired_document_versions()$$
);
*/ 