# N8N Document Processing & RAG Architecture

## System Architecture Overview

```
+---------------------+     +---------------------+     +---------------------+
|                     |     |                     |     |                     |
|   Document Source   |---->|   n8n Workflows     |---->|  Supabase Storage   |
|   (Google Drive)    |     |  (Processing Logic) |     |    & Database      |
|                     |     |                     |     |                     |
+---------------------+     +---------------------+     +---------------------+
                                     |                          |
                                     v                          v
                            +---------------------+     +---------------------+
                            |                     |     |                     |
                            |    AI Services      |---->|   Vector Storage    |
                            |   (Embeddings)      |     |    (Supabase)       |
                            |                     |     |                     |
                            +---------------------+     +---------------------+
                                                               |
                                                               v
                            +---------------------+     +---------------------+
                            |                     |     |                     |
                            |   Query Interface   |<----|   Search Function   |
                            |   (n8n or Web)      |     |    (Supabase)       |
                            |                     |     |                     |
                            +---------------------+     +---------------------+
```

## Workflow Components

### MVP1: Document Processing Pipeline

1. **Google Drive Trigger**
   - Monitors specific folder for new documents
   - Triggers workflow on document creation/update
   - Captures document metadata and content

2. **Document Import**
   - Downloads document from Google Drive
   - Stores original document in Supabase storage
   - Creates document record in Supabase database
   - Maintains source information and metadata

3. **Document Pre-processing**
   - Converts document to markdown format
   - Optimizes content for RAG:
     - Cleans formatting
     - Extracts meaningful text
     - Preserves semantic structure
     - Removes noise (headers, footers, etc.)
   - Chunks text appropriately for embeddings
   - Stores processed version in Supabase
   - Updates document record with processed status

4. **Embedding Generation**
   - For each document chunk:
     - Sends text to AI embedding service
     - Receives vector embeddings
     - Stores vectors in Supabase vector store
     - Updates chunk record with embedding data
   - Updates document record with embedding status

### MVP2: Query Interface

1. **Chat Trigger Interface**
   - Provides interface for user queries
   - Captures query text and context
   - Routes query to processing workflow

2. **RAG Query Processing**
   - Generates embedding for user query
   - Searches vector store for relevant chunks
   - Retrieves context from top matches
   - Formulates AI prompt with retrieved context
   - Sends prompt to AI service
   - Receives and formats response
   - Returns response to chat interface

### Beta 1: Webhook Integration

1. **Supabase Webhook**
   - Triggered on document insert/update
   - Captures document information
   - Makes HTTP request to n8n webhook endpoint

2. **n8n Webhook Receiver**
   - Exposes HTTP endpoint for document processing
   - Validates incoming webhook requests
   - Initiates document processing workflow
   - Returns status response

3. **Web Application Integration**
   - Provides API endpoints for document upload
   - Handles user authentication and permissions
   - Manages document metadata and tracking
   - Displays processing status and results

## Data Flow

1. **Document Ingestion**
   ```
   Google Drive -> n8n trigger -> Download -> Supabase storage/DB
   ```

2. **Document Processing**
   ```
   Supabase DB trigger -> n8n processing workflow -> MD conversion -> Chunking -> Supabase storage/DB
   ```

3. **Embedding Generation**
   ```
   n8n workflow -> For each chunk -> AI embedding service -> Supabase vector store
   ```

4. **Query Processing**
   ```
   User query -> n8n chat interface -> Query embedding -> Supabase vector search -> Context retrieval -> AI service -> Formatted response
   ```

## Infrastructure Requirements

### n8n
- Self-hosted or cloud instance
- Required nodes and credentials configured
- Workflow execution environment
- Webhook endpoints (for Beta 1)

### Supabase
- Project with appropriate plan (vector storage support)
- Storage buckets for documents
- Database tables for document tracking
- Vector indexes for semantic search
- Authentication system (for Beta 1)

### AI Services
- Embedding generation (e.g., OpenAI, Cohere, etc.)
- Text processing capabilities
- API keys and credentials

### Google Drive API
- API credentials
- Folder monitoring permissions
- File access and download permissions

## Security Considerations

- Secure storage of credentials and API keys
- Authentication for webhook endpoints
- Row-level security in Supabase
- Access controls for document storage
- API rate limiting
- Data encryption for sensitive documents 