-- Track the last changelog version a user has seen so we can show the "What's New" badge.
alter table user_profiles
  add column if not exists last_seen_changelog text;
