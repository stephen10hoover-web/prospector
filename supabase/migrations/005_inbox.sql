-- Inbound messages: business replies captured from email
create table if not exists inbound_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  from_email text not null,
  from_name text,
  subject text,
  body text not null,
  received_at timestamptz not null default now(),
  read boolean not null default false
);

create index if not exists inbound_messages_user_id_idx on inbound_messages(user_id);
create index if not exists inbound_messages_business_id_idx on inbound_messages(business_id);
create index if not exists inbound_messages_unread_idx on inbound_messages(user_id) where read = false;

alter table inbound_messages enable row level security;

create policy "Users can view their own inbound messages"
  on inbound_messages for select
  using (auth.uid() = user_id);

create policy "Users can update their own inbound messages"
  on inbound_messages for update
  using (auth.uid() = user_id);
