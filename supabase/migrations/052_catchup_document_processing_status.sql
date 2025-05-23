CREATE TABLE public.document_processing_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  status text NOT NULL,
  stage text NULL,
  progress_percentage integer NULL DEFAULT 0,
  total_chunks integer NULL DEFAULT 0,
  processed_chunks integer NULL DEFAULT 0,
  error_message text NULL,
  processing_metadata jsonb NULL DEFAULT '{}'::jsonb,
  started_at timestamp with time zone NULL,
  completed_at timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT document_processing_status_pkey PRIMARY KEY (id),
  CONSTRAINT document_processing_status_document_id_key UNIQUE (document_id),
  CONSTRAINT document_processing_status_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  CONSTRAINT document_processing_status_progress_percentage_check CHECK (((progress_percentage >= 0) AND (progress_percentage <= 100))),
  CONSTRAINT document_processing_status_stage_check CHECK ((stage = ANY (ARRAY['text_extraction'::text, 'chunking'::text, 'embedding_generation'::text, 'storage'::text]))),
  CONSTRAINT document_processing_status_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'retrying'::text])))
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_processing_status_document_id ON public.document_processing_status USING btree (document_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_processing_status_status ON public.document_processing_status USING btree (status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_processing_status_created_at ON public.document_processing_status USING btree (created_at) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_processing_status_document_updated ON public.document_processing_status USING btree (document_id, updated_at DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_processing_status_status_stage ON public.document_processing_status USING btree (status, stage, updated_at DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_document_processing_status_realtime ON public.document_processing_status USING btree (document_id, status, updated_at DESC) TABLESPACE pg_default; 