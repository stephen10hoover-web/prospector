-- Add fields required for subscription cancellation UX and billing-period
-- tracking. cancel_at_period_end lets the UI show "cancels on <date>" without
-- immediately losing access. current_period_start is needed to seed the usage
-- reset row on invoice.payment_succeeded.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end  boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_period_start  timestamptz;
