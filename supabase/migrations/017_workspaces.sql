-- Workspaces: multi-user collaboration unit
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id) not null,
  slug text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspaces_owner_idx on workspaces(owner_id);
create index if not exists workspaces_slug_idx on workspaces(slug);

alter table workspaces enable row level security;

create policy "Workspace members can view their workspace"
  on workspaces for select
  using (
    auth.uid() = owner_id
    or exists (
      select 1 from workspace_members
      where workspace_id = id and user_id = auth.uid()
    )
  );

create policy "Workspace owner can update their workspace"
  on workspaces for update
  using (auth.uid() = owner_id);

create trigger workspaces_updated_at before update on workspaces
  for each row execute function update_updated_at();

-- Workspace members
create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  invited_by uuid references auth.users(id),
  joined_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists workspace_members_user_idx on workspace_members(user_id);
create index if not exists workspace_members_workspace_idx on workspace_members(workspace_id);

alter table workspace_members enable row level security;

create policy "Members can view their workspace membership"
  on workspace_members for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from workspaces
      where id = workspace_id and owner_id = auth.uid()
    )
  );

-- Workspace invites
create table if not exists workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  invited_by uuid references auth.users(id) not null,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  token text unique not null default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz
);

create index if not exists workspace_invites_workspace_idx on workspace_invites(workspace_id);
create index if not exists workspace_invites_token_idx on workspace_invites(token);
create index if not exists workspace_invites_email_idx on workspace_invites(email);

alter table workspace_invites enable row level security;

create policy "Workspace admins/owners can manage invites"
  on workspace_invites for all
  using (
    exists (
      select 1 from workspace_members
      where workspace_id = workspace_invites.workspace_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- Track which workspace a user belongs to (denormalized for fast lookup)
alter table user_profiles
  add column if not exists workspace_id uuid references workspaces(id) on delete set null;

create index if not exists user_profiles_workspace_idx on user_profiles(workspace_id) where workspace_id is not null;

-- Auto-create a personal workspace for existing users who don't have one
-- (This runs at migration time)
insert into workspaces (name, owner_id, slug)
select
  coalesce(up.display_name, split_part(u.email, '@', 1)) || '''s Workspace',
  u.id,
  lower(replace(coalesce(up.display_name, split_part(u.email, '@', 1)), ' ', '-'))
    || '-' || substr(replace(u.id::text, '-', ''), 1, 8)
from auth.users u
left join user_profiles up on up.id = u.id
where not exists (
  select 1 from workspace_members wm
  join workspaces w on w.id = wm.workspace_id
  where wm.user_id = u.id
)
on conflict do nothing;

-- Add these users as owners of their new workspace
insert into workspace_members (workspace_id, user_id, role)
select w.id, w.owner_id, 'owner'
from workspaces w
where not exists (
  select 1 from workspace_members wm
  where wm.workspace_id = w.id and wm.user_id = w.owner_id
)
on conflict do nothing;

-- Point their profile to their personal workspace
update user_profiles up
set workspace_id = (
  select w.id from workspaces w
  where w.owner_id = up.id
  limit 1
)
where up.workspace_id is null;
