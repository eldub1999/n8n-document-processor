# Supabase Configuration

This directory contains the Supabase configuration files, edge functions, and database migrations for the Document Management Application.

## Directory Structure

- `functions/`: Contains Edge Functions that run serverless code for document processing
  - `document-processing/`: Function for extracting metadata from documents
  - `document-validation/`: Function for validating documents and preventing duplicates

- `migrations/`: Contains SQL migration files for database schema management
  - `01_update_documents_table.sql`: Adds fields for deduplication, versioning, and metadata
  - `02_create_document_versions_table.sql`: Creates table for document version history
  - `03_create_versioning_triggers.sql`: Sets up triggers for automated versioning
  - `04_create_archive_bucket.sql`: Creates storage bucket for archived versions
  - `05_cleanup_expired_versions.sql`: Function to clean up expired versions

## Database Schema

### Main Tables

- **documents**: Stores metadata for current document versions
  - Added `content_hash` for deduplication
  - Added `version` and `is_latest` for versioning
  - Added `jurisdiction`, `county`, and `document_type` for metadata tagging

- **document_versions**: Stores metadata for archived document versions
  - Linked to main documents via `document_id`
  - Includes 5-year `expiry_date` for retention policy

### Storage Buckets

- **documents**: Primary storage for current document versions
- **document-archive**: Storage for archived document versions

## Applying Migrations

To apply these migrations to your Supabase project:

1. Navigate to the SQL editor in your Supabase dashboard
2. Open each migration file in order (01, 02, etc.)
3. Execute the SQL statements
4. Verify the changes in the Table Editor

Alternatively, use the Supabase CLI:

```bash
supabase migration up
```

## Edge Functions

The Edge Functions provide server-side processing capabilities:

- **document-processing**: Extracts metadata from uploaded documents
- **document-validation**: Validates documents and checks for duplicates (hash-based)

To deploy the Edge Functions:

```bash
supabase functions deploy document-processing
supabase functions deploy document-validation
``` 