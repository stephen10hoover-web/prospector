-- Add outreach generation counter to usage table
alter table usage add column if not exists outreach_generated_count integer not null default 0;

-- Atomic check-and-increment to prevent TOCTOU race condition on usage limits.
-- Returns TRUE if the increment succeeded (user was under limit), FALSE if limit was already hit.
create or replace function check_and_increment_usage(
  p_user_id uuid,
  p_month text,
  p_field text,
  p_limit integer
) returns boolean as $$
declare
  v_updated integer;
begin
  -- Ensure the usage row exists
  insert into usage (user_id, month, searches_count, emails_sent_count, outreach_generated_count)
  values (p_user_id, p_month, 0, 0, 0)
  on conflict (user_id, month) do nothing;

  -- Atomically increment only if under limit
  if p_field = 'searches_count' then
    update usage
    set searches_count = searches_count + 1
    where user_id = p_user_id and month = p_month and searches_count < p_limit;
  elsif p_field = 'emails_sent_count' then
    update usage
    set emails_sent_count = emails_sent_count + 1
    where user_id = p_user_id and month = p_month and emails_sent_count < p_limit;
  elsif p_field = 'outreach_generated_count' then
    update usage
    set outreach_generated_count = outreach_generated_count + 1
    where user_id = p_user_id and month = p_month and outreach_generated_count < p_limit;
  end if;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$ language plpgsql security definer;

-- Update the simple increment function to also handle the new field
create or replace function increment_usage_field(
  p_user_id uuid,
  p_month text,
  p_field text
) returns void as $$
begin
  insert into usage (user_id, month, searches_count, emails_sent_count, outreach_generated_count)
  values (p_user_id, p_month, 0, 0, 0)
  on conflict (user_id, month) do nothing;

  if p_field = 'searches_count' then
    update usage set searches_count = searches_count + 1
    where user_id = p_user_id and month = p_month;
  elsif p_field = 'emails_sent_count' then
    update usage set emails_sent_count = emails_sent_count + 1
    where user_id = p_user_id and month = p_month;
  elsif p_field = 'outreach_generated_count' then
    update usage set outreach_generated_count = outreach_generated_count + 1
    where user_id = p_user_id and month = p_month;
  end if;
end;
$$ language plpgsql security definer;
