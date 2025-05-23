CREATE TABLE public.chat_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  title text NOT NULL DEFAULT 'New Conversation'::text,
  document_context uuid[] NULL DEFAULT '{}'::uuid[],
  conversation_metadata jsonb NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT chat_conversations_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON public.chat_conversations USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_at ON public.chat_conversations USING btree (created_at) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON public.chat_conversations USING btree (updated_at DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON public.chat_conversations USING btree (user_id, updated_at DESC) TABLESPACE pg_default; 