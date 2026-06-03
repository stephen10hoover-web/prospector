-- Migration 033: Feature flags + per-user overrides
-- Used by isFeatureEnabled() utility and /console/flags admin page.

CREATE TABLE IF NOT EXISTS feature_flags (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text        NOT NULL UNIQUE,
  enabled     boolean     NOT NULL DEFAULT false,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Per-user overrides: override a flag for a specific user
CREATE TABLE IF NOT EXISTS feature_flag_overrides (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key    text    NOT NULL REFERENCES feature_flags(key) ON DELETE CASCADE,
  user_id     text    NOT NULL,
  enabled     boolean NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flag_key, user_id)
);

-- RLS: service-role only
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON feature_flags USING (false) WITH CHECK (false);
CREATE POLICY "service_role_only" ON feature_flag_overrides USING (false) WITH CHECK (false);

-- Seed initial kill-switch flags
INSERT INTO feature_flags (key, enabled, description) VALUES
  ('ai_outreach_generation', true,  'Claude AI outreach generation'),
  ('email_sending',          true,  'All outbound email delivery via Resend'),
  ('serp_api_search',        true,  'SerpAPI Google Maps business discovery'),
  ('stripe_billing',         true,  'Stripe payment processing and webhooks')
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_flag ON feature_flag_overrides (flag_key, user_id);
