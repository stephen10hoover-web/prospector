create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_name text,
  mailing_address text,
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can upsert own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);
