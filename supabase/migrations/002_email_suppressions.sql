create table if not exists email_suppressions (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists email_suppressions_email_idx on email_suppressions(email);

-- No RLS needed — this table is only accessed by the admin/service role
