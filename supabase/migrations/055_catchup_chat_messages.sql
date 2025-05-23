CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  message_metadata jsonb NULL DEFAULT '{}'::jsonb,
  document_sources uuid[] NULL DEFAULT '{}'::uuid[],
  embedding_sources uuid[] NULL DEFAULT '{}'::uuid[],
  processing_time_ms integer NULL,
  token_count integer NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
  CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages USING btree (conversation_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages USING btree (created_at) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON public.chat_messages USING btree (role) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_chat_messages_realtime ON public.chat_messages USING btree (conversation_id, created_at DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created ON public.chat_messages USING btree (conversation_id, created_at) TABLESPACE pg_default; 