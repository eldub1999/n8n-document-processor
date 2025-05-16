# Supabase Configuration

## Project Details

- **Project Name:** n8n-document-processor
- **Project ID:** gppuubxnxuyuwixbtpho
- **Project URL:** https://gppuubxnxuyuwixbtpho.supabase.co
- **Anon Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcHV1YnhueHV5dXdpeGJ0cGhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0MTk0OTgsImV4cCI6MjA2Mjk5NTQ5OH0.C6lKb3U8L5BUzEMhDD5tpm4tlpcARraQe0tk6k7eYF0

## Database Configuration

The database has been set up with the following:

1. **Extensions Enabled:**
   - UUID-OSSP: For UUID generation
   - Vector: For vector operations and similarity search

2. **Tables Created:**

### documents

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

### document_embeddings

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

### Indexes

```sql
CREATE INDEX document_embeddings_embedding_idx ON public.document_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

## Environment Variables for n8n

When setting up the workflow in n8n.cloud, you'll need to configure the following environment variables:

```
SUPABASE_URL=https://gppuubxnxuyuwixbtpho.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcHV1YnhueHV5dXdpeGJ0cGhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0MTk0OTgsImV4cCI6MjA2Mjk5NTQ5OH0.C6lKb3U8L5BUzEMhDD5tpm4tlpcARraQe0tk6k7eYF0
```

## Vector Search Function Example

Here's an example of how to perform vector similarity search with the configured database:

```sql
-- Example query to find similar documents using vector similarity
SELECT 
  d.name,
  d.markdown,
  de.provider,
  1 - (de.embedding <=> '[query_embedding_here]') as similarity
FROM 
  document_embeddings de
JOIN 
  documents d ON de.document_id = d.id
WHERE 
  de.provider = 'google' -- or 'voyage'
ORDER BY 
  de.embedding <=> '[query_embedding_here]'
LIMIT 5;
```

Replace `[query_embedding_here]` with the actual vector embedding of your query. 