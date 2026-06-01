-- Lead notes: user-authored notes attached to a business/lead
create table if not exists lead_notes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  body text not null check (char_length(body) >= 1 and char_length(body) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lead_notes_business_idx on lead_notes(business_id);
create index if not exists lead_notes_user_idx on lead_notes(user_id);

alter table lead_notes enable row level security;

create policy "Users can manage their own notes"
  on lead_notes for all
  using (auth.uid() = user_id);

create trigger lead_notes_updated_at before update on lead_notes
  for each row execute function update_updated_at();

-- Lead activities: append-only event log for everything that happens to a lead
create table if not exists lead_activities (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in (
    'note_added',
    'note_updated',
    'note_deleted',
    'email_sent',
    'email_opened',
    'reply_received',
    'stage_changed',
    'status_changed',
    'call_logged',
    'task_completed',
    'imported',
    'proposal_sent',
    'proposal_viewed',
    'sequence_enrolled',
    'sequence_replied',
    'sequence_completed'
  )),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists lead_activities_business_idx on lead_activities(business_id);
create index if not exists lead_activities_user_idx on lead_activities(user_id);
create index if not exists lead_activities_created_idx on lead_activities(business_id, created_at desc);

alter table lead_activities enable row level security;

create policy "Users can view their own lead activities"
  on lead_activities for select
  using (auth.uid() = user_id);

create policy "Users can insert their own lead activities"
  on lead_activities for insert
  with check (auth.uid() = user_id);

-- Add message_id column to inbound_messages for deduplication
alter table inbound_messages
  add column if not exists message_id text;

create index if not exists inbound_messages_message_id_idx on inbound_messages(message_id) where message_id is not null;
