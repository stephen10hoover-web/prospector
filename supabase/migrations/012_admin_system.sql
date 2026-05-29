-- ============================================================
-- Admin System: Audit Logs, Analytics Events, User Sessions
-- All tables are append-only and inaccessible to regular users.
-- Only the service role (admin client) can read/write these.
-- ============================================================

-- Audit logs: immutable record of all significant system events
CREATE TABLE IF NOT EXISTS audit_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      uuid,                                     -- null for anonymous/system
  actor_email   text        NOT NULL DEFAULT 'system',
  action        text        NOT NULL,                     -- e.g. 'admin.user.viewed'
  resource_type text,                                     -- e.g. 'user', 'subscription'
  resource_id   text,
  metadata      jsonb       NOT NULL DEFAULT '{}',
  ip_address    text,
  user_agent    text,
  severity      text        NOT NULL DEFAULT 'info'
                CHECK (severity IN ('info', 'warning', 'critical')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Enforce immutability at the database level
CREATE OR REPLACE RULE audit_logs_no_update
  AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE OR REPLACE RULE audit_logs_no_delete
  AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- RLS enabled with NO policies = inaccessible to all jwt roles; service role bypasses RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS audit_logs_actor_idx     ON audit_logs(actor_email);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx    ON audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_severity_idx  ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx   ON audit_logs(created_at DESC);

-- ============================================================
-- Analytics events: client-side behavior tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid,
  anonymous_id text,       -- for pre-auth or logged-out tracking
  session_id   text        NOT NULL,
  event_name   text        NOT NULL,
  properties   jsonb       NOT NULL DEFAULT '{}',
  url          text,
  referrer     text,
  user_agent   text,
  ip_address   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE RULE analytics_events_no_update
  AS ON UPDATE TO analytics_events DO INSTEAD NOTHING;
CREATE OR REPLACE RULE analytics_events_no_delete
  AS ON DELETE TO analytics_events DO INSTEAD NOTHING;

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS analytics_events_user_idx    ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS analytics_events_name_idx    ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS analytics_events_session_idx ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS analytics_events_created_idx ON analytics_events(created_at DESC);

-- ============================================================
-- User sessions: session-level analytics
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id            text        PRIMARY KEY,   -- client-generated nanoid
  user_id       uuid,
  anonymous_id  text,
  started_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz,
  page_views    integer     NOT NULL DEFAULT 0,
  events_count  integer     NOT NULL DEFAULT 0,
  ip_address    text,
  user_agent    text,
  referrer      text,
  landing_page  text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS user_sessions_user_idx     ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_started_idx  ON user_sessions(started_at DESC);
