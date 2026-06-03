-- Migration 032: MRR snapshots for sparklines and trend analysis
-- One row per day, written by the daily mrr-snapshot cron job.

CREATE TABLE IF NOT EXISTS mrr_snapshots (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date    NOT NULL,
  mrr_cents     integer NOT NULL DEFAULT 0,  -- MRR in cents (avoid float rounding)
  pro_count     integer NOT NULL DEFAULT 0,
  team_count    integer NOT NULL DEFAULT 0,
  trial_count   integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT mrr_snapshots_date_unique UNIQUE (snapshot_date)
);

-- RLS: service-role only
ALTER TABLE mrr_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON mrr_snapshots USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_mrr_snapshots_date ON mrr_snapshots (snapshot_date DESC);

-- Composite indexes on audit_logs for admin console filter queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity_time ON audit_logs (severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_time   ON audit_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_time    ON audit_logs (actor_email, created_at DESC);

-- Composite indexes on subscriptions for admin queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at      ON subscriptions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_updated  ON subscriptions (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_status     ON subscriptions (plan, status);
