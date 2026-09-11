ALTER TABLE job_milestones
  ADD COLUMN IF NOT EXISTS refund_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_approved_at timestamptz;

COMMENT ON COLUMN job_milestones.refund_requested_at IS 'Homeowner request to refund an unreleased BuildPay stage. No refund occurs merely because this timestamp exists.';
COMMENT ON COLUMN job_milestones.refund_approved_at IS 'Tradesperson agreement to a requested refund before BuildPair submits the Stripe refund.';
