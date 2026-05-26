-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Searches table
create table searches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null,
  location text not null,
  radius integer not null default 20,
  result_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Businesses table
create table businesses (
  id uuid primary key default uuid_generate_v4(),
  search_id uuid references searches(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text not null,
  address text not null default '',
  city text not null default '',
  state text not null default '',
  phone text,
  email text,
  website_url text,
  google_maps_url text,
  review_count integer not null default 0,
  rating numeric(3,2) not null default 0,
  has_website boolean not null default false,
  website_quality_score integer not null default 0 check (website_quality_score >= 0 and website_quality_score <= 100),
  website_issues text[] not null default '{}',
  lead_score integer not null default 0 check (lead_score >= 0 and lead_score <= 100),
  outreach_status text not null default 'not_contacted' check (outreach_status in ('not_contacted','generated','sent','replied','interested','closed','not_interested')),
  ai_score_reasoning text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Outreach logs
create table outreach_logs (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('email','generated')),
  subject text,
  body text,
  sent_to text,
  status text not null default 'generated' check (status in ('generated','sent','failed')),
  created_at timestamptz not null default now()
);

-- AI generations
create table ai_generations (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,
  input jsonb not null default '{}',
  output jsonb not null default '{}',
  model text not null,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table searches enable row level security;
alter table businesses enable row level security;
alter table outreach_logs enable row level security;
alter table ai_generations enable row level security;

create policy "Users can manage their own searches" on searches for all using (auth.uid() = user_id);
create policy "Users can manage their own businesses" on businesses for all using (auth.uid() = user_id);
create policy "Users can manage their own outreach_logs" on outreach_logs for all using (auth.uid() = user_id);
create policy "Users can manage their own ai_generations" on ai_generations for all using (auth.uid() = user_id);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger businesses_updated_at before update on businesses
  for each row execute function update_updated_at();

-- Indexes
create index businesses_user_id_idx on businesses(user_id);
create index businesses_search_id_idx on businesses(search_id);
create index businesses_lead_score_idx on businesses(lead_score desc);
create index businesses_outreach_status_idx on businesses(outreach_status);
create index outreach_logs_business_id_idx on outreach_logs(business_id);
