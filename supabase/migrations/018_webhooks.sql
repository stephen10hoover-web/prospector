-- Outbound webhooks: user-configured integrations
create table if not exists outbound_webhooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  url text not null,
  secret text,
  events text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outbound_webhooks_user_idx on outbound_webhooks(user_id);

alter table outbound_webhooks enable row level security;

create policy "Users can manage their own webhooks"
  on outbound_webhooks for all
  using (auth.uid() = user_id);

create trigger outbound_webhooks_updated_at before update on outbound_webhooks
  for each row execute function update_updated_at();

-- Webhook delivery log
create table if not exists webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_id uuid references outbound_webhooks(id) on delete cascade not null,
  event text not null,
  payload jsonb not null default '{}',
  status_code int not null default 0,
  response_body text,
  success boolean not null default false,
  delivered_at timestamptz not null default now()
);

create index if not exists webhook_deliveries_webhook_idx on webhook_deliveries(webhook_id, delivered_at desc);

alter table webhook_deliveries enable row level security;

create policy "Users can view their own webhook deliveries"
  on webhook_deliveries for select
  using (
    exists (select 1 from outbound_webhooks where id = webhook_id and user_id = auth.uid())
  );
