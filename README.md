# N8N Document Processing & RAG Workflow

A document processing pipeline using n8n.cloud workflows and Supabase for storage and vector search.

## Project Overview

This project implements an automated workflow for:
1. Detecting documents added to a Google Drive folder
2. Importing and storing documents in Supabase
3. Pre-processing documents into RAG-optimized markdown
4. Generating embeddings and storing vectors in Supabase
5. Providing a query interface for AI-powered document search

## Architecture

### MVP1: Document Processing Pipeline
- **Trigger**: Google Drive folder monitoring
- **Storage**: Supabase database for document metadata, content, and vectors
- **Processing**: Document conversion and optimization for RAG
- **Vectorization**: Google Vertex AI or Anthropic embedding generation with vector storage in Supabase

### MVP2: Query Interface
- **Interface**: n8n chat trigger
- **Query Processing**: Context retrieval and AI response generation
- **Response Delivery**: Formatted responses through chat interface

### Beta 1: Webhook Integration
- **Trigger**: Supabase webhook for document uploads
- **Integration**: Web application connection points

## Setup Requirements

### Prerequisites
- n8n.cloud account
- Supabase account and project
- Google Drive API credentials
- Either Google Vertex AI or Anthropic API key for embeddings

### Installation
1. Set up your n8n.cloud workspace
2. Import the workflow JSON file:
   - Use `workflows/n8n-document-processor.json` - a single workflow that supports both Google and Anthropic embeddings
3. Configure credentials for Google Drive and Supabase
4. Set up required environment variables, including `EMBEDDING_PROVIDER` set to either "google" or "anthropic"
5. Create the necessary Supabase database tables

For detailed setup instructions, see the [Import Guide](workflows/IMPORT_GUIDE.md).

## Workflow Structure

The document processing workflow consists of these key steps:

1. **Detection**: Monitor Google Drive folder for new documents
2. **Filtering**: Process only PDF files (configurable to add more types)
3. **Extraction**: Download documents and extract text content
4. **Processing**: Convert to RAG-optimized markdown format
5. **Vectorization**: Generate embeddings using either Google Vertex AI or Anthropic API based on your configuration
6. **Storage**: Store all metadata, content, and vectors in Supabase

## Development

### Project Files
- `workflows/n8n-document-processor.json`: The complete workflow JSON to import into n8n.cloud
- `workflows/IMPORT_GUIDE.md`: Detailed import and configuration instructions

### Database Schema
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
  embedding vector(1536), -- Dimensions tracked automatically in vector_dimensions field
  embedding_provider text,
  vector_dimensions integer,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone
);
```

## License

[License details to be determined] 