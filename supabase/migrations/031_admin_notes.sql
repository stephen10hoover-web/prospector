-- Migration 031: Admin notes on users
-- Internal notes visible only in the admin console — never shown to users.

CREATE TABLE IF NOT EXISTS user_admin_notes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text        NOT NULL,  -- references auth.users(id) but no FK (user may be deleted)
  admin_email text        NOT NULL,
  body        text        NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 2000),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS: service-role only (admin console uses createAdminClient)
ALTER TABLE user_admin_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON user_admin_notes USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_user_admin_notes_user    ON user_admin_notes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_admin_notes_created ON user_admin_notes (created_at DESC);
