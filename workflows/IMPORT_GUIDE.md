# n8n Document Processing Workflow Import Guide

This document explains how to import and configure the document processing workflow in n8n.cloud.

## Prerequisites

Before importing the workflow, ensure you have:

1. An active n8n.cloud account
2. A Google account with access to Google Drive
3. A Supabase project with the necessary tables set up
4. Access to either Google AI (Vertex AI) or Anthropic API for generating embeddings

## Import Steps

1. Log in to your n8n.cloud workspace
2. Navigate to "Workflows" in the main menu
3. Click on "Import from File" or "Import from URL" 
4. Select the workflow file from this repository:
   - `n8n-document-processor.json` (supports both Google and Anthropic embeddings)
5. Click "Import" to add the workflow to your workspace

## Embedding Model Selection

The combined workflow supports both embedding providers through a Switch node that checks the `EMBEDDING_PROVIDER` variable:

- Set `EMBEDDING_PROVIDER` to `"google"` to use Google Vertex AI embeddings (default if not specified)
- Set `EMBEDDING_PROVIDER` to `"anthropic"` to use Anthropic embeddings

## Required Credentials

The workflow requires the following credentials to be set up in n8n.cloud:

### Google Drive

1. Go to "Settings" → "Credentials"
2. Click "Create New" and select "Google Drive OAuth2 API"
3. Follow the prompts to connect your Google account

### Supabase

1. Go to "Settings" → "Credentials"
2. Click "Create New" and select "Supabase API"
3. Enter your Supabase URL and API key

## Required Variables

Set up the following variables in n8n.cloud under "Settings" → "Variables":

| Variable Name | Description | Example | Required For |
|---------------|-------------|---------|-------------|
| GOOGLE_DRIVE_FOLDER_ID | ID of the Google Drive folder to monitor | 1aBcDeFgHiJkLmNoPqRsTuVwXyZ | All providers |
| EMBEDDING_PROVIDER | Provider to use for embeddings ("google" or "anthropic") | google | Provider selection |
| GOOGLE_AI_API_URL | Google Vertex AI API endpoint | https://us-central1-aiplatform.googleapis.com | Google embeddings |
| GOOGLE_AI_API_KEY | Your Google AI API key | your-google-api-key | Google embeddings |
| ANTHROPIC_API_KEY | Your Anthropic API key | sk-ant-xxxx | Anthropic embeddings |

## Supabase Database Setup

The workflow expects a `documents` table in your Supabase database with the following schema:

```sql
create table documents (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  source_id text not null,
  source_type text not null,
  mime_type text,
  status text not null,
  content text,
  metadata jsonb,
  embedding vector(1536),
  embedding_provider text,
  vector_dimensions integer,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone
);

-- Create index for vector similarity search
create index on documents using ivfflat (embedding vector_cosine_ops);
```

Note: The embedding dimension will be automatically detected and stored in the `vector_dimensions` column.
Typical dimensions are:
- Google text-embedding-gecko: 768 dimensions
- Anthropic Claude: 1024 dimensions

Ensure the pgvector extension is enabled in your Supabase project.

## Testing the Workflow

After importing and configuring:

1. Activate the workflow by toggling the "Active" switch
2. Set the `EMBEDDING_PROVIDER` variable to your preferred provider ("google" or "anthropic")
3. Add a PDF file to your monitored Google Drive folder
4. Check the execution logs to verify each step is completing successfully
5. Verify the document and its embedding are stored in your Supabase database

## Workflow Steps Overview

1. **Google Drive Trigger**: Detects new files added to the specified folder
2. **Is PDF Document?**: Filters for PDF files only
3. **Download PDF**: Retrieves the PDF file from Google Drive
4. **Prepare PDF Metadata**: Extracts and formats document metadata
5. **Insert PDF Document**: Stores the document record in Supabase
6. **Extract Text from PDF**: Extracts text content from the PDF
7. **Transform to Markdown**: Converts the text to RAG-optimized markdown
8. **Update Document with Content**: Saves the processed content to Supabase
9. **Choose Embedding Provider**: Routes to Google or Anthropic based on the EMBEDDING_PROVIDER variable
10. **Generate Embeddings**: Creates vector embeddings using the selected provider
11. **Extract Embedding Vector**: Processes the API response
12. **Save Embedding to Supabase**: Stores the embedding vector in the database
13. **Handle Non-PDF**: Processes non-PDF files (skips them)
14. **Record Skipped Document**: Records skipped documents in the database

## Troubleshooting

- **Google Drive Connection Issues**: Ensure your OAuth credentials are valid
- **Supabase Errors**: Verify your table schema matches the expected structure
- **Embedding Generation Failures**: Check your API key and usage limits for your chosen provider
- **Switch Node Issues**: Verify the `EMBEDDING_PROVIDER` variable is set correctly ("google" or "anthropic") 