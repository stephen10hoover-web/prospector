-- Expand plan types to support free_trial and team
-- Expand status types to support expired

alter table subscriptions
  drop constraint if exists subscriptions_plan_check;

alter table subscriptions
  add constraint subscriptions_plan_check
  check (plan in ('free_trial', 'pro', 'team'));

alter table subscriptions
  drop constraint if exists subscriptions_status_check;

alter table subscriptions
  add constraint subscriptions_status_check
  check (status in ('active', 'past_due', 'canceled', 'trialing', 'expired'));

-- Track when the free trial started so we can compute expiry
alter table subscriptions
  add column if not exists trial_started_at timestamptz;

-- Migrate any existing 'free' plan rows to 'free_trial'
update subscriptions set plan = 'free_trial' where plan = 'free';
