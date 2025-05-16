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
- **Vectorization**: Google Vertex AI or Voyage AI embedding generation with vector storage in Supabase

### MVP2: Query Interface
- **Vector Search**: Similarity search using pgvector in Supabase
- **Chat Interface**: Built with an n8n webhook endpoint
- **Response Generation**: Using retrieved content with a provided chat prompt

### Beta 1: Web Application Integration
- **HTTP Webhook**: To replace Google Drive trigger
- **API Layer**: For direct integration with web applications
- **Authentication**: For secure document processing requests

## Implementation Details

### Key Components

1. **Document Ingestion**
   - Google Drive trigger monitors folder for new documents
   - n8n workflow extracts text and metadata

2. **Text Processing**
   - Convert PDF documents to clean text
   - Transform to markdown format with RAG optimizations
   - Chunk documents if they exceed embedding token limits

3. **Vector Generation**
   - Choice of embedding providers:
     - **Google Vertex AI**: text-embedding-gecko model 
     - **Voyage AI**: voyage-3-large model
   - Embedding dimension: 1024 (configurable)

4. **Storage**
   - Supabase PostgreSQL database
   - pgvector extension for vector operations
   - Table structure for documents and embeddings

## Setup Instructions

1. **n8n.cloud Setup**
   - Create an n8n.cloud account
   - Import workflow from JSON file
   - Configure credentials and variables

2. **Supabase Setup**
   - Create a Supabase project
   - Enable pgvector extension
   - Create required database tables

3. **Integration Setup**
   - Connect Google Drive account
   - Set up API keys for your chosen embedding provider

Detailed setup instructions are available in the [Import Guide](workflows/IMPORT_GUIDE.md).

## Usage

1. **Document Processing**
   - Add PDF documents to your configured Google Drive folder
   - Workflow automatically processes and vectorizes content
   - View processed documents in Supabase

2. **Using Embeddings**
   - Query Supabase using vector similarity search
   - Use embeddings for semantic document search
   - Integrate with AI systems for RAG

## Project Structure

- `/workflows/` - n8n workflow definitions
  - `n8n-document-processor.json` - Main workflow file to import into n8n

## Future Enhancements

1. **Multiple File Types**
   - Support for Word, Excel, PowerPoint, etc.
   - Support for image-based documents with OCR

2. **Advanced RAG Optimizations**
   - Improved chunking strategies
   - Metadata extraction and tagging

3. **Webhook Interface**
   - Direct document upload API
   - Real-time processing status updates

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