-- 009: AI usage and cost logging
-- Every Claude call writes one row to ai_processing_logs with its token usage
-- and cost (lib/ai/usage.ts). Usage rows have task set; document-parse
-- tracking rows (doc_type/status/parsed_json) keep task null.
-- The app tolerates this migration not being applied yet (logs and continues).

alter table if exists public.ai_processing_logs
  add column if not exists task text,
  add column if not exists model text,
  add column if not exists effort text,
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer,
  add column if not exists cache_creation_input_tokens integer,
  add column if not exists cache_read_input_tokens integer,
  add column if not exists cost_usd numeric(12, 6),
  add column if not exists latency_ms integer,
  add column if not exists stop_reason text,
  add column if not exists doc_id text;

comment on column public.ai_processing_logs.task is 'AI task profile (lib/ai/models.ts); null on document-parse tracking rows';
comment on column public.ai_processing_logs.model is 'Model that served the call (may be a server-side fallback model)';
comment on column public.ai_processing_logs.cost_usd is 'USD cost from usage and the pricing table in lib/ai/models.ts';
comment on column public.ai_processing_logs.doc_id is 'parsed_documents.id or the source file hash, when the call is about one document';

-- Analytics card: calls and cost this month, by task
create index if not exists ai_processing_logs_usage_idx
  on public.ai_processing_logs (created_at desc)
  where task is not null;

-- RLS on. Writes and reads go through the service role (which bypasses RLS);
-- no anon or authenticated policies, so the public anon key cannot read
-- usage or parsed document data.
alter table public.ai_processing_logs enable row level security;
