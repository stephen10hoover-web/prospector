-- Add open tracking columns to outreach_logs
alter table outreach_logs
  add column if not exists open_count int not null default 0,
  add column if not exists first_opened_at timestamptz;

-- Tracking tokens: one per sent email, maps random token → email context
create table if not exists email_tracking_tokens (
  id uuid primary key default gen_random_uuid(),
  token text unique not null default encode(gen_random_bytes(16), 'hex'),
  outreach_log_id uuid references outreach_logs(id) on delete set null,
  business_id uuid references businesses(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  sequence_enrollment_id uuid references sequence_enrollments(id) on delete set null,
  step_number int,
  created_at timestamptz not null default now()
);

-- One row per open event (includes machine opens)
create table if not exists email_open_events (
  id uuid primary key default gen_random_uuid(),
  token_id uuid references email_tracking_tokens(id) on delete cascade not null,
  opened_at timestamptz not null default now(),
  user_agent text,
  is_machine_open boolean not null default false
);

create index if not exists email_tracking_tokens_token_idx on email_tracking_tokens(token);
create index if not exists email_tracking_tokens_business_idx on email_tracking_tokens(business_id);
create index if not exists email_open_events_token_idx on email_open_events(token_id);
create index if not exists outreach_logs_opened_idx on outreach_logs(user_id) where first_opened_at is not null;

alter table email_tracking_tokens enable row level security;
alter table email_open_events enable row level security;

create policy "Users view own tokens" on email_tracking_tokens for select using (auth.uid() = user_id);
create policy "Users view own open events" on email_open_events for select using (
  exists (select 1 from email_tracking_tokens t where t.id = token_id and t.user_id = auth.uid())
);
