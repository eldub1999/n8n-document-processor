-- Migration: Optimize database indexes
-- Description: Adds recommended indexes for performance and RLS efficiency.

-- Indexes for public.documents
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON public.documents(created_by);
-- Optional: Composite index example if queries often use these filters together.
-- CREATE INDEX IF NOT EXISTS idx_documents_juris_doctype_latest ON public.documents(jurisdiction, document_type, is_latest);
CREATE INDEX IF NOT EXISTS idx_documents_created_by_is_latest ON public.documents(created_by, is_latest);

-- Indexes for public.document_embeddings
-- An index on document_id is likely created by the FK, but explicit creation is safe.
CREATE INDEX IF NOT EXISTS idx_doc_embeddings_document_id ON public.document_embeddings(document_id);

-- Vector index for semantic search (ensure pgvector extension is enabled)
-- Replace vector_cosine_ops with the appropriate opclass for your embeddings if different (e.g., vector_l2_ops, vector_ip_ops)
-- HNSW is generally good for a balance of speed and accuracy.
-- Consider tuning HNSW parameters (m, ef_construction) based on your data/needs.
CREATE INDEX IF NOT EXISTS idx_doc_embeddings_embedding_hnsw ON public.document_embeddings USING hnsw (embedding vector_cosine_ops);
-- Alternative IVFFlat example (better for very large datasets, tune lists, probes):
-- CREATE INDEX IF NOT EXISTS idx_doc_embeddings_embedding_ivfflat ON public.document_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Indexes for public.chat_conversations
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON public.chat_conversations(user_id);

-- Indexes for public.chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);

-- Indexes for public.processed_markdown_documents
CREATE INDEX IF NOT EXISTS idx_processed_markdown_doc_id ON public.processed_markdown_documents(document_id);

-- Indexes for public.document_processing_status
-- An index on document_id is likely created by the FK/UNIQUE constraint, but explicit creation is safe.
CREATE INDEX IF NOT EXISTS idx_doc_processing_status_doc_id ON public.document_processing_status(document_id);

-- Comment: Review existing indexes before applying to avoid redundancy.
-- Some foreign key constraints might automatically create indexes on the referencing columns. 