-- Migration 029: Admin suspension and ban columns on user_profiles
-- Adds suspension/ban state for admin enforcement via middleware.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_suspended    boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_banned       boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at    timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz,
  ADD COLUMN IF NOT EXISTS ban_reason      text;

-- Index for middleware suspension checks (point-lookup by id, so PK covers it,
-- but a partial index lets Postgres quickly find suspended/banned users).
CREATE INDEX IF NOT EXISTS idx_user_profiles_suspended ON user_profiles (id) WHERE is_suspended = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_banned    ON user_profiles (id) WHERE is_banned    = true;

COMMENT ON COLUMN user_profiles.is_suspended    IS 'Temporary suspension — user cannot log in or use the app';
COMMENT ON COLUMN user_profiles.is_banned       IS 'Permanent ban — user cannot log in or create a new account';
COMMENT ON COLUMN user_profiles.suspended_until IS 'NULL means indefinite; past timestamp means auto-lifted';
COMMENT ON COLUMN user_profiles.ban_reason      IS 'Internal reason shown on /banned page';
