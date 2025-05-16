# Supabase Database Design

## Storage Buckets

### `documents_original`
- Stores original documents uploaded from Google Drive
- Metadata includes:
  - `filename`
  - `mime_type`
  - `source` (e.g., "google_drive")
  - `upload_date`
  - `file_size`
  - `source_id` (Google Drive file ID)

### `documents_processed`
- Stores processed markdown versions of documents
- Metadata includes:
  - `original_document_id` (reference to original document)
  - `process_date`
  - `processor_version`
  - `word_count`
  - `chunk_count`

## Database Tables

### `documents`
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_path TEXT NOT NULL,
  processed_path TEXT,
  title TEXT NOT NULL,
  source_id TEXT,
  source_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'processing', 'processed', 'error'
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_message TEXT
);

-- Index for faster queries
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_source_id ON documents(source_id);
```

### `document_chunks`
```sql
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding VECTOR(1536), -- Adjust dimension based on embedding model
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique chunks per document
  UNIQUE(document_id, chunk_index)
);

-- Create vector index for similarity search
CREATE INDEX document_chunks_embedding_idx ON document_chunks 
USING ivfflat (embedding vector_l2_ops)
WITH (lists = 100);
```

### `processing_log`
```sql
CREATE TABLE processing_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  stage TEXT NOT NULL, -- 'import', 'preprocessing', 'embedding'
  status TEXT NOT NULL, -- 'success', 'error'
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Functions and Stored Procedures

### `search_documents`
```sql
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
) 
RETURNS TABLE (
  document_id UUID,
  chunk_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.document_id,
    c.id AS chunk_id,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM document_chunks c
  WHERE 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

## Webhook Configuration

For Beta 1, we'll set up a Supabase database function and webhook:

```sql
-- Function to call when documents are uploaded
CREATE OR REPLACE FUNCTION handle_document_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Make HTTP request to n8n webhook
  PERFORM net.http_post(
    'https://your-n8n-instance.com/webhook/document-upload',
    jsonb_build_object(
      'document_id', NEW.id,
      'storage_path', NEW.original_path,
      'metadata', NEW.metadata
    ),
    '{}'::jsonb,
    '{}'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on document insert
CREATE TRIGGER on_document_upload
  AFTER INSERT ON documents
  FOR EACH ROW
  EXECUTE PROCEDURE handle_document_upload();
```

## Security Policies

```sql
-- Public access policies (adjust as needed)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_log ENABLE ROW LEVEL SECURITY;

-- Admin access
CREATE POLICY "Admin Full Access" ON documents 
  FOR ALL USING (auth.role() = 'authenticated');
  
CREATE POLICY "Admin Full Access" ON document_chunks 
  FOR ALL USING (auth.role() = 'authenticated');
  
CREATE POLICY "Admin Full Access" ON processing_log 
  FOR ALL USING (auth.role() = 'authenticated');

-- Allow select for anonymous users (for query interface)
CREATE POLICY "Anonymous Read Access" ON document_chunks
  FOR SELECT USING (true);
``` 