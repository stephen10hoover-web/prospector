-- Migration 034: Impersonation sessions
-- Tracks active + historical impersonation sessions for audit.
-- Token is SHA-256 hashed before storage.

CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email     text        NOT NULL,
  target_user_id  text        NOT NULL,
  target_email    text        NOT NULL,
  token_hash      text        NOT NULL UNIQUE,  -- SHA-256(raw_token)
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,
  ip_address      text,
  user_agent      text
);

-- RLS: service-role only
ALTER TABLE impersonation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON impersonation_sessions USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_impersonation_admin    ON impersonation_sessions (admin_email, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_token    ON impersonation_sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_impersonation_active   ON impersonation_sessions (target_user_id) WHERE ended_at IS NULL;
