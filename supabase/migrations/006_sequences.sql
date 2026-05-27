-- Reusable follow-up sequence templates
create table if not exists sequences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Steps within a sequence
create table if not exists sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid references sequences(id) on delete cascade not null,
  step_number int not null check (step_number >= 1),
  delay_days int not null default 3 check (delay_days >= 0),
  subject text not null,
  body text not null,
  unique(sequence_id, step_number)
);

-- Active lead enrollments
create table if not exists sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid references sequences(id) on delete cascade not null,
  business_id uuid references businesses(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  current_step int not null default 1,
  status text not null default 'active'
    check (status in ('active','paused','completed','replied','bounced','cancelled')),
  enrolled_at timestamptz not null default now(),
  next_send_at timestamptz not null,
  completed_at timestamptz,
  unique(business_id, sequence_id)
);

-- Audit log — prevents double-sends (unique per enrollment+step)
create table if not exists sequence_email_logs (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid references sequence_enrollments(id) on delete cascade not null,
  step_number int not null,
  to_email text not null,
  subject text not null,
  sent_at timestamptz not null default now(),
  unique(enrollment_id, step_number)
);

create index if not exists sequences_user_idx on sequences(user_id);
create index if not exists seq_enrollments_due_idx on sequence_enrollments(next_send_at) where status = 'active';
create index if not exists seq_enrollments_user_idx on sequence_enrollments(user_id, status);
create index if not exists seq_email_logs_enrollment_idx on sequence_email_logs(enrollment_id);

alter table sequences enable row level security;
alter table sequence_steps enable row level security;
alter table sequence_enrollments enable row level security;
alter table sequence_email_logs enable row level security;

create policy "Users own sequences" on sequences for all using (auth.uid() = user_id);
create policy "Users own sequence steps" on sequence_steps for all using (
  exists (select 1 from sequences where id = sequence_id and user_id = auth.uid())
);
create policy "Users own enrollments" on sequence_enrollments for all using (auth.uid() = user_id);
create policy "Users own sequence logs" on sequence_email_logs for all using (
  exists (select 1 from sequence_enrollments where id = enrollment_id and user_id = auth.uid())
);
