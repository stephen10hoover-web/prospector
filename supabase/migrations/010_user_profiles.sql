-- User profiles: per-user sending email, display name, and physical address for CAN-SPAM
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  sending_email text unique,
  physical_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_profiles enable row level security;

create policy "Users can view their own profile"
  on user_profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on user_profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on user_profiles for insert
  with check (auth.uid() = id);

create index if not exists user_profiles_sending_email_idx on user_profiles(sending_email);

create trigger user_profiles_updated_at before update on user_profiles
  for each row execute function update_updated_at();
