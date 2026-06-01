-- Idempotent Stripe webhook processing.
-- Stripe retries webhooks on 5xx or network timeouts, so the same event can
-- arrive more than once. This table lets the webhook handler skip events it
-- has already processed successfully.
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     text        NOT NULL UNIQUE,   -- Stripe event ID (e.g. evt_xxx)
  event_type   text        NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- Only service-role connections (used by createAdminClient) can read or write
-- this table. JWT-authenticated users are blocked because no SELECT/INSERT
-- policies exist — Postgres denies by default when RLS is enabled.
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS processed_webhook_events_event_id_idx
  ON processed_webhook_events(event_id);
