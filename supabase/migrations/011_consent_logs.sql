create table if not exists consent_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ip_address text,
  user_agent text,
  terms_version text not null default '1.1',
  privacy_version text not null default '1.1',
  consented_at timestamptz not null default now()
);

-- Immutable — no RLS update/delete policies
alter table consent_logs enable row level security;

create policy "Users can view own consent logs"
  on consent_logs for select
  using (auth.uid() = user_id);

-- Insert only via service role (admin client in callback route)
