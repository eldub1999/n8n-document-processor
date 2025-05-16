# n8n Document Processing Workflow Import Guide

This document explains how to import and configure the document processing workflow in n8n.cloud.

## Prerequisites

Before importing the workflow, ensure you have:

1. An active n8n.cloud account
2. A Google account with access to Google Drive
3. A Supabase project with the necessary tables set up
4. Access to either Google Vertex AI or Voyage AI API for generating embeddings

## Import Steps

1. Log in to your n8n.cloud workspace
2. Navigate to "Workflows" in the main menu
3. Click on "Import from File" or "Import from URL" 
4. Select the workflow file from this repository:
   - `n8n-document-processor.json` (supports both Google and Voyage AI embeddings)
5. Click "Import" to add the workflow to your workspace

## Embedding Model Selection

The combined workflow supports two embedding providers:
- **Google Vertex AI** - Uses the text-embedding-gecko model
- **Voyage AI** - Uses the voyage-3-large model

The provider can be selected by setting the `EMBEDDING_PROVIDER` variable in n8n to either `google` or `voyage`.

## Required Credentials

The workflow requires the following credentials to be set up in n8n.cloud:

### Google Drive

1. Go to "Settings" > "Credentials" in n8n
2. Click "Create New Credentials"
3. Select the "Google Drive OAuth2 API" credential type
4. Follow the prompts to connect to your Google account
5. Name the credentials "google_drive_credentials"

### Supabase Database

1. Go to "Settings" > "Credentials" in n8n
2. Click "Create New Credentials"
3. Select the "Postgres" credential type
4. Enter your Supabase connection details:
   - Host: Your Supabase project hostname (e.g., `db.abcdefghijkl.supabase.co`)
   - Database: `postgres`
   - User: `postgres`
   - Password: Your Supabase database password
   - Port: `5432` (default)
   - SSL: Enabled
5. Name the credentials "supabase_db_credentials"

## Required Variables

Set up the following variables in n8n:

1. `GOOGLE_DRIVE_FOLDER_ID` - The ID of the Google Drive folder to monitor (from the folder URL)
2. `EMBEDDING_PROVIDER` - Set to either `google` or `voyage` depending on which embedding service you want to use
3. `GOOGLE_AI_API_URL` - Your Google Vertex AI API URL (typically `https://us-central1-aiplatform.googleapis.com`)
4. `GOOGLE_AI_API_KEY` - Your Google API key (if using Google embeddings)
5. `VOYAGE_AI_API_KEY` - Your Voyage AI API key (if using Voyage AI embeddings)

## Required Database Tables

Create these tables in your Supabase project:

### Documents Table

```sql
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    mime_type TEXT,
    created_time TIMESTAMP WITH TIME ZONE,
    web_view_link TEXT,
    content TEXT,
    markdown TEXT,
    chunk_number INTEGER DEFAULT 0,
    total_chunks INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Document Embeddings Table

```sql
CREATE TABLE public.document_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id),
    embedding VECTOR(1024),
    provider TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT fk_document FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE
);
```

Make sure to enable the `vector` extension in your Supabase project:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## Testing the Workflow

After configuring the workflow:

1. Activate the workflow by toggling the "Active" switch in the top-right corner
2. Add a PDF file to your configured Google Drive folder
3. The workflow should detect the new file, process it, and store it in your Supabase database
4. Check your Supabase database to see the document and its embedding

## Workflow Steps Overview

1. **Google Drive Trigger**: Detects new files added to the specified folder
2. **Is PDF Document?**: Filters for PDF files only
3. **Download PDF**: Retrieves the PDF file from Google Drive
4. **Prepare PDF Metadata**: Extracts and formats document metadata
5. **Insert PDF Document**: Stores the document record in Supabase
6. **Extract Text from PDF**: Extracts text content from the PDF
7. **Transform to Markdown**: Converts the text to RAG-optimized markdown
8. **Update Document with Content**: Saves the processed content to Supabase
9. **Choose Embedding Provider**: Routes to Google or Voyage AI based on the EMBEDDING_PROVIDER variable
10. **Generate Embeddings**: Creates vector embeddings using the selected provider
11. **Extract Embedding Vector**: Processes the API response
12. **Save Embedding to Supabase**: Stores the embedding vector in the database
13. **Handle Non-PDF**: Processes non-PDF files (skips them)
14. **Record Skipped Document**: Records skipped documents in the database

## Troubleshooting

- **Google Drive Connection Issues**: Ensure your OAuth credentials are valid
- **Supabase Errors**: Verify your table schema matches the expected structure
- **Embedding Generation Failures**: Check your API key and usage limits for your chosen provider
- **Switch Node Issues**: Verify the `EMBEDDING_PROVIDER` variable is set correctly ("google" or "voyage") 