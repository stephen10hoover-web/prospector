-- Email notification system
-- Tables: email_logs, notification_preferences
-- Subscription columns: 10 new sentinel/timing fields
-- RPCs: batch queries for cron workers (join auth.users for email addresses)
-- Indexes: 5 for cron scan performance

-- ─── email_logs ───────────────────────────────────────────────────────────────
-- Audit trail for all system notification emails. Service-role only (no JWT policies).
CREATE TABLE IF NOT EXISTS public.email_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type    text        NOT NULL,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  metadata      jsonb
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
-- No RLS policies: only the service role writes/reads this table.

-- ─── notification_preferences ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id             uuid    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_reminders     boolean NOT NULL DEFAULT true,
  usage_warnings      boolean NOT NULL DEFAULT true,
  subscription_events boolean NOT NULL DEFAULT true,
  win_back            boolean NOT NULL DEFAULT false,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own notification preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Subscription sentinel columns ─────────────────────────────────────────────
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at              timestamptz,
  ADD COLUMN IF NOT EXISTS welcome_sent_at            timestamptz,
  ADD COLUMN IF NOT EXISTS trial_reminder_3d_sent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS trial_reminder_1d_sent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS trial_expired_sent_at      timestamptz,
  ADD COLUMN IF NOT EXISTS usage_75_sent_at           timestamptz,
  ADD COLUMN IF NOT EXISTS usage_90_sent_at           timestamptz,
  ADD COLUMN IF NOT EXISTS usage_period               text,
  ADD COLUMN IF NOT EXISTS win_back_7d_sent_at        timestamptz,
  ADD COLUMN IF NOT EXISTS win_back_30d_sent_at       timestamptz;

-- Backfill trial_ends_at from trial_started_at for existing rows
UPDATE public.subscriptions
SET trial_ends_at = trial_started_at + INTERVAL '7 days'
WHERE plan = 'free_trial'
  AND trial_started_at IS NOT NULL
  AND trial_ends_at IS NULL;

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends_at
  ON public.subscriptions(trial_ends_at);

CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end
  ON public.subscriptions(current_period_end);

CREATE INDEX IF NOT EXISTS idx_email_logs_user_type_sent
  ON public.email_logs(user_id, email_type, sent_at);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id
  ON public.notification_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_usage_user_month
  ON public.usage(user_id, month);

-- ─── RPC: trial lifecycle candidates ──────────────────────────────────────────
-- Returns users needing any trial lifecycle email (3d, 1d, expired, win-back).
-- SECURITY DEFINER so it can join auth.users without exposing the schema via anon key.
CREATE OR REPLACE FUNCTION public.get_trial_notification_candidates(p_limit int DEFAULT 50)
RETURNS TABLE(
  user_id                    uuid,
  email                      text,
  trial_ends_at              timestamptz,
  trial_reminder_3d_sent_at  timestamptz,
  trial_reminder_1d_sent_at  timestamptz,
  trial_expired_sent_at      timestamptz,
  win_back_7d_sent_at        timestamptz,
  win_back_30d_sent_at       timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    s.user_id,
    au.email::text,
    s.trial_ends_at,
    s.trial_reminder_3d_sent_at,
    s.trial_reminder_1d_sent_at,
    s.trial_expired_sent_at,
    s.win_back_7d_sent_at,
    s.win_back_30d_sent_at
  FROM public.subscriptions s
  JOIN auth.users au ON au.id = s.user_id
  WHERE s.plan = 'free_trial'
    AND s.trial_ends_at IS NOT NULL
    AND (
      -- 3-day reminder window
      (s.trial_reminder_3d_sent_at IS NULL
        AND s.trial_ends_at > now()
        AND s.trial_ends_at <= now() + INTERVAL '3 days 1 hour')
      OR
      -- 1-day reminder window
      (s.trial_reminder_1d_sent_at IS NULL
        AND s.trial_ends_at > now()
        AND s.trial_ends_at <= now() + INTERVAL '25 hours')
      OR
      -- Expired (not yet notified)
      (s.trial_expired_sent_at IS NULL
        AND s.trial_ends_at <= now())
      OR
      -- Win-back day 7 (expired 7-8 days ago)
      (s.win_back_7d_sent_at IS NULL
        AND s.trial_ends_at <= now() - INTERVAL '7 days'
        AND s.trial_ends_at >= now() - INTERVAL '8 days')
      OR
      -- Win-back day 30 (expired 30-31 days ago)
      (s.win_back_30d_sent_at IS NULL
        AND s.trial_ends_at <= now() - INTERVAL '30 days'
        AND s.trial_ends_at >= now() - INTERVAL '31 days')
    )
  LIMIT p_limit;
$$;

-- ─── RPC: usage warning candidates ────────────────────────────────────────────
-- Returns paid (active) users with usage data for the given period.
-- Caller filters by percentage threshold client-side.
CREATE OR REPLACE FUNCTION public.get_usage_warning_candidates(
  p_period text,
  p_limit  int DEFAULT 50
)
RETURNS TABLE(
  user_id           uuid,
  email             text,
  plan              text,
  usage_period      text,
  usage_75_sent_at  timestamptz,
  usage_90_sent_at  timestamptz,
  searches_count    int,
  emails_sent_count int
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    s.user_id,
    au.email::text,
    s.plan,
    s.usage_period,
    s.usage_75_sent_at,
    s.usage_90_sent_at,
    COALESCE(u.searches_count, 0)    AS searches_count,
    COALESCE(u.emails_sent_count, 0) AS emails_sent_count
  FROM public.subscriptions s
  JOIN auth.users au ON au.id = s.user_id
  LEFT JOIN public.usage u
    ON u.user_id = s.user_id AND u.month = p_period
  WHERE s.plan IN ('pro', 'team')
    AND s.status = 'active'
    AND (
      s.usage_period IS DISTINCT FROM p_period
      OR s.usage_75_sent_at IS NULL
      OR s.usage_90_sent_at IS NULL
    )
  LIMIT p_limit;
$$;

-- ─── RPC: payment-failed resend candidates ─────────────────────────────────────
-- Returns users still past_due whose first failure email was sent 3+ days ago
-- but who have not yet received the follow-up.
CREATE OR REPLACE FUNCTION public.get_payment_failed_resend_candidates(p_limit int DEFAULT 50)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT s.user_id, au.email::text
  FROM public.subscriptions s
  JOIN auth.users au ON au.id = s.user_id
  WHERE s.status = 'past_due'
    AND EXISTS (
      SELECT 1 FROM public.email_logs el
      WHERE el.user_id = s.user_id
        AND el.email_type = 'payment_failed_1'
        AND el.sent_at <= now() - INTERVAL '3 days'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.email_logs el
      WHERE el.user_id = s.user_id
        AND el.email_type = 'payment_failed_2'
    )
  LIMIT p_limit;
$$;
