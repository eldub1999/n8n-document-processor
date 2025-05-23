CREATE TABLE public.processed_markdown_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NULL,
  markdown_content text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT processed_markdown_documents_pkey PRIMARY KEY (id),
  CONSTRAINT processed_markdown_documents_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_processed_markdown_documents_document_id ON public.processed_markdown_documents USING btree (document_id) TABLESPACE pg_default; 