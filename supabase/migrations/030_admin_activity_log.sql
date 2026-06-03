-- Migration 030: Admin activity log table
-- Separate from audit_logs — tracks admin-console-specific actions with richer context.
-- Append-only: UPDATE/DELETE blocked by RULE.

CREATE TABLE IF NOT EXISTS admin_activity_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email text        NOT NULL,
  action      text        NOT NULL,
  target_user text,          -- user email or id that was acted on
  metadata    jsonb       NOT NULL DEFAULT '{}',
  ip_address  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Append-only enforcement
CREATE RULE no_update_admin_activity_log AS ON UPDATE TO admin_activity_log DO INSTEAD NOTHING;
CREATE RULE no_delete_admin_activity_log AS ON DELETE TO admin_activity_log DO INSTEAD NOTHING;

-- RLS: only service-role can read/write
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON admin_activity_log USING (false) WITH CHECK (false);

-- Indexes for the admin log page
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin   ON admin_activity_log (admin_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_action  ON admin_activity_log (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created ON admin_activity_log (created_at DESC);
