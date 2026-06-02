-- Add ownership column to domain_suppressions so we can enforce per-user deletes.
-- The column allows NULL to be backward-compatible with any rows inserted before
-- this migration (old rows simply have no owner and are admin-only).
alter table domain_suppressions
  add column if not exists added_by uuid references auth.users(id) on delete set null;

create index if not exists idx_domain_suppressions_added_by
  on domain_suppressions(added_by);

-- Re-enable RLS if not already on (table was created without RLS in migration 019)
alter table domain_suppressions enable row level security;

-- Users can only see and delete suppressions they added
create policy "Users can view own domain suppressions"
  on domain_suppressions for select
  using (added_by = auth.uid());

create policy "Users can insert own domain suppressions"
  on domain_suppressions for insert
  with check (added_by = auth.uid());

create policy "Users can delete own domain suppressions"
  on domain_suppressions for delete
  using (added_by = auth.uid());
