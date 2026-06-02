-- Track which onboarding checklist steps each user has completed.
-- Using a jsonb column so we can add/remove steps without migrations.
create table if not exists onboarding_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  completed_steps jsonb not null default '[]',
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table onboarding_progress enable row level security;

create policy "Users can manage own onboarding progress"
  on onboarding_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger onboarding_progress_updated_at
  before update on onboarding_progress
  for each row execute function update_updated_at();
