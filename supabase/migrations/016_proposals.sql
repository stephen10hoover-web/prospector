-- Proposal templates: reusable building blocks
create table if not exists proposal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  content jsonb not null default '{}',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table proposal_templates enable row level security;

create policy "Users can manage their own proposal templates"
  on proposal_templates for all
  using (auth.uid() = user_id);

create trigger proposal_templates_updated_at before update on proposal_templates
  for each row execute function update_updated_at();

-- Proposals: per-lead generated proposals
create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  content jsonb not null default '{}',
  share_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'viewed', 'accepted', 'declined')),
  viewed_at timestamptz,
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposals_business_idx on proposals(business_id);
create index if not exists proposals_user_idx on proposals(user_id);
create index if not exists proposals_share_token_idx on proposals(share_token);

alter table proposals enable row level security;

create policy "Users can manage their own proposals"
  on proposals for all
  using (auth.uid() = user_id);

create trigger proposals_updated_at before update on proposals
  for each row execute function update_updated_at();
