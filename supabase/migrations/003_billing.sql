-- Subscriptions table (one row per user)
create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled', 'trialing')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Monthly usage tracking
create table if not exists usage (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  month text not null, -- YYYY-MM
  searches_count integer not null default 0,
  emails_sent_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

alter table subscriptions enable row level security;
alter table usage enable row level security;

create policy "Users can view their own subscription" on subscriptions
  for select using (auth.uid() = user_id);

create policy "Users can view their own usage" on usage
  for select using (auth.uid() = user_id);

-- updated_at triggers
create trigger subscriptions_updated_at before update on subscriptions
  for each row execute function update_updated_at();

create trigger usage_updated_at before update on usage
  for each row execute function update_updated_at();

create index if not exists subscriptions_stripe_customer_idx on subscriptions(stripe_customer_id);

-- Atomic usage increment to avoid race conditions
create or replace function increment_usage_field(
  p_user_id uuid,
  p_month text,
  p_field text
) returns void as $$
begin
  insert into usage (user_id, month, searches_count, emails_sent_count)
  values (p_user_id, p_month, 0, 0)
  on conflict (user_id, month) do nothing;

  if p_field = 'searches_count' then
    update usage set searches_count = searches_count + 1
    where user_id = p_user_id and month = p_month;
  elsif p_field = 'emails_sent_count' then
    update usage set emails_sent_count = emails_sent_count + 1
    where user_id = p_user_id and month = p_month;
  end if;
end;
$$ language plpgsql security definer;
create index if not exists subscriptions_stripe_sub_idx on subscriptions(stripe_subscription_id);
create index if not exists usage_user_month_idx on usage(user_id, month);
