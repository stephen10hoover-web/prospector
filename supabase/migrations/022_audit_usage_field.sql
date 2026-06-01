-- Add audit_generated_count to usage tracking.
-- The audit generation feature uses atomicCheckAndIncrement with this field name,
-- but neither the column nor the SQL function branches existed — causing the
-- function to always return FALSE and silently block all audit generation.

ALTER TABLE usage
  ADD COLUMN IF NOT EXISTS audit_generated_count integer NOT NULL DEFAULT 0;

-- Rebuild check_and_increment_usage to include audit_generated_count
CREATE OR REPLACE FUNCTION check_and_increment_usage(
  p_user_id uuid,
  p_month   text,
  p_field   text,
  p_limit   integer
) RETURNS boolean AS $$
DECLARE
  v_updated integer;
BEGIN
  -- Ensure the usage row exists
  INSERT INTO usage (user_id, month, searches_count, emails_sent_count, outreach_generated_count, audit_generated_count)
  VALUES (p_user_id, p_month, 0, 0, 0, 0)
  ON CONFLICT (user_id, month) DO NOTHING;

  -- Atomically increment only if under limit
  IF p_field = 'searches_count' THEN
    UPDATE usage
    SET searches_count = searches_count + 1
    WHERE user_id = p_user_id AND month = p_month AND searches_count < p_limit;
  ELSIF p_field = 'emails_sent_count' THEN
    UPDATE usage
    SET emails_sent_count = emails_sent_count + 1
    WHERE user_id = p_user_id AND month = p_month AND emails_sent_count < p_limit;
  ELSIF p_field = 'outreach_generated_count' THEN
    UPDATE usage
    SET outreach_generated_count = outreach_generated_count + 1
    WHERE user_id = p_user_id AND month = p_month AND outreach_generated_count < p_limit;
  ELSIF p_field = 'audit_generated_count' THEN
    UPDATE usage
    SET audit_generated_count = audit_generated_count + 1
    WHERE user_id = p_user_id AND month = p_month AND audit_generated_count < p_limit;
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rebuild increment_usage_field to include audit_generated_count
CREATE OR REPLACE FUNCTION increment_usage_field(
  p_user_id uuid,
  p_month   text,
  p_field   text
) RETURNS void AS $$
BEGIN
  INSERT INTO usage (user_id, month, searches_count, emails_sent_count, outreach_generated_count, audit_generated_count)
  VALUES (p_user_id, p_month, 0, 0, 0, 0)
  ON CONFLICT (user_id, month) DO NOTHING;

  IF p_field = 'searches_count' THEN
    UPDATE usage SET searches_count = searches_count + 1
    WHERE user_id = p_user_id AND month = p_month;
  ELSIF p_field = 'emails_sent_count' THEN
    UPDATE usage SET emails_sent_count = emails_sent_count + 1
    WHERE user_id = p_user_id AND month = p_month;
  ELSIF p_field = 'outreach_generated_count' THEN
    UPDATE usage SET outreach_generated_count = outreach_generated_count + 1
    WHERE user_id = p_user_id AND month = p_month;
  ELSIF p_field = 'audit_generated_count' THEN
    UPDATE usage SET audit_generated_count = audit_generated_count + 1
    WHERE user_id = p_user_id AND month = p_month;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
