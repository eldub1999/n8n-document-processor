CREATE TABLE public.document_embeddings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  chunk_index integer NOT NULL,
  chunk_text text NOT NULL,
  chunk_tokens integer NOT NULL,
  embedding extensions.vector(1024) NOT NULL,
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT document_embeddings_pkey PRIMARY KEY (id),
  CONSTRAINT document_embeddings_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_document_embeddings_document_id ON public.document_embeddings USING btree (document_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_document_embeddings_embedding ON public.document_embeddings USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists='100') TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_document_embeddings_created_at ON public.document_embeddings USING btree (created_at) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_embeddings_document_chunk ON public.document_embeddings USING btree (document_id, chunk_index) TABLESPACE pg_default; 