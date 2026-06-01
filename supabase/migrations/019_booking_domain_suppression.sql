-- Booking link: per-user calendar booking URL (Calendly, Cal.com, etc.)
alter table user_profiles
  add column if not exists booking_link text check (char_length(booking_link) <= 500);

-- Domain-level suppressions: block all emails to an entire domain
create table if not exists domain_suppressions (
  id uuid primary key default uuid_generate_v4(),
  domain text not null unique,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists domain_suppressions_domain_idx on domain_suppressions(domain);

-- No RLS — only accessible via service role, same as email_suppressions

-- Add reason + suppression type to email_suppressions for better UI
alter table email_suppressions
  add column if not exists reason text check (reason in ('unsubscribe', 'bounce', 'complaint', 'manual')),
  add column if not exists added_by uuid references auth.users(id) on delete set null;

-- Backfill existing rows as unsubscribes
update email_suppressions set reason = 'unsubscribe' where reason is null;
