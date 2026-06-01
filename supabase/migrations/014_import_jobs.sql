-- Import jobs: track CSV import batches
create table if not exists import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  filename text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  total_rows int not null default 0,
  imported_rows int not null default 0,
  skipped_rows int not null default 0,
  error_message text,
  search_id uuid references searches(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists import_jobs_user_idx on import_jobs(user_id);

alter table import_jobs enable row level security;

create policy "Users can manage their own import jobs"
  on import_jobs for all
  using (auth.uid() = user_id);

-- Phone source and confidence fields (parallel to email_source/email_confidence)
alter table businesses
  add column if not exists phone_source text check (phone_source in ('google_maps', 'manual', 'import')),
  add column if not exists phone_confidence int check (phone_confidence >= 0 and phone_confidence <= 100);

-- Tag imported businesses clearly
alter table businesses
  add column if not exists import_job_id uuid references import_jobs(id) on delete set null;

create index if not exists businesses_import_job_idx on businesses(import_job_id) where import_job_id is not null;
