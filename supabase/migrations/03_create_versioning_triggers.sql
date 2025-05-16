-- Migration: Create versioning triggers
-- Description: Sets up triggers to automate document versioning

-- Function to calculate 5-year expiry date
CREATE OR REPLACE FUNCTION calculate_expiry_date()
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    RETURN now() + INTERVAL '5 years';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle document updates by creating a version record
CREATE OR REPLACE FUNCTION handle_document_update()
RETURNS TRIGGER AS $$
DECLARE
    new_version_number INTEGER;
BEGIN
    -- Only version the document if it's not just metadata changing
    IF OLD.storage_path != NEW.storage_path OR OLD.content_hash != NEW.content_hash THEN
        -- Determine next version number
        SELECT COALESCE(MAX(version_number), 0) + 1 INTO new_version_number
        FROM public.document_versions
        WHERE document_id = NEW.id;
        
        -- Create version record for the old document version
        INSERT INTO public.document_versions (
            document_id,
            version_number,
            storage_path,
            created_by,
            expiry_date
        ) VALUES (
            OLD.id,
            new_version_number,
            OLD.storage_path,
            NEW.created_by,
            calculate_expiry_date()
        );
        
        -- Update version number on the main document
        NEW.version := new_version_number + 1;
        NEW.is_latest := TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for document updates
DROP TRIGGER IF EXISTS document_update_trigger ON public.documents;

CREATE TRIGGER document_update_trigger
BEFORE UPDATE ON public.documents
FOR EACH ROW
WHEN (OLD.storage_path IS NOT NULL)
EXECUTE FUNCTION handle_document_update(); 