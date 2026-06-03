-- Migration 035: Support ticket submissions
-- Stores user-submitted support requests for the admin console viewer.

CREATE TABLE IF NOT EXISTS support_submissions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text,       -- nullable (pre-auth submissions allowed)
  user_email  text        NOT NULL,
  subject     text        NOT NULL CHECK (char_length(subject) > 0 AND char_length(subject) <= 200),
  body        text        NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 5000),
  category    text        NOT NULL DEFAULT 'general',  -- 'billing' | 'bug' | 'feature' | 'general'
  status      text        NOT NULL DEFAULT 'open',     -- 'open' | 'in_progress' | 'resolved' | 'closed'
  admin_reply text,
  replied_at  timestamptz,
  replied_by  text,       -- admin email
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS: users can insert + read their own; service-role for admin
ALTER TABLE support_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_insert_own" ON support_submissions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);
CREATE POLICY "users_read_own" ON support_submissions
  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "service_role_all" ON support_submissions USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_support_status_created  ON support_submissions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_user_created    ON support_submissions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_category        ON support_submissions (category, created_at DESC);
