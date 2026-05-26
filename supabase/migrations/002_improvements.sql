-- Search status for background processing
alter table searches add column if not exists status text not null default 'completed'
  check (status in ('processing', 'completed', 'failed'));

-- Email metadata columns
alter table businesses add column if not exists email_source text;
alter table businesses add column if not exists email_confidence integer
  check (email_confidence is null or (email_confidence >= 0 and email_confidence <= 100));

-- Deduplication: unique per user on (name, city, state)
-- Names are stored as-is; app-level normalization handles case differences
alter table businesses add constraint if not exists businesses_dedup_key
  unique (user_id, name, city, state);

-- Index for status polling
create index if not exists searches_status_idx on searches(status);
create index if not exists searches_user_status_idx on searches(user_id, status);
