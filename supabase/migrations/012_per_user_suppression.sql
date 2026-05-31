-- Restructure email_suppressions to be scoped per user.
-- Existing global suppression entries are cleared (early-stage, intentional).
truncate table email_suppressions;

alter table email_suppressions
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Drop global unique constraint, replace with per-user unique constraint
alter table email_suppressions
  drop constraint if exists email_suppressions_email_key;

alter table email_suppressions
  add constraint email_suppressions_user_email_key unique (user_id, email);

-- user_id is required going forward
alter table email_suppressions
  alter column user_id set not null;

create index if not exists email_suppressions_user_id_idx on email_suppressions(user_id);

-- Update RLS: users can only see their own suppressions
drop policy if exists "Users can manage own suppressions" on email_suppressions;

create policy "Users can view own suppressions"
  on email_suppressions for select
  using (auth.uid() = user_id);
