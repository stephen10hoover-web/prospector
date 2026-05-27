create table if not exists audit_reports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content jsonb not null,
  share_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  generated_at timestamptz not null default now(),
  unique(business_id)
);

create index if not exists audit_reports_business_idx on audit_reports(business_id);
create index if not exists audit_reports_share_token_idx on audit_reports(share_token);

alter table audit_reports enable row level security;
create policy "Users own audit reports" on audit_reports for all using (auth.uid() = user_id);
