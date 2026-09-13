-- BuildPay fee responsibility: freeze who requested BuildPay and whether the
-- tradesperson absorbs the fee or the homeowner pays the optional BuildPay
-- service fee. Money values are pence.

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS buildpay_requested_by text,
  ADD COLUMN IF NOT EXISTS buildpay_fee_mode text,
  ADD COLUMN IF NOT EXISTS buildpay_customer_fee_estimate integer NOT NULL DEFAULT 0;

ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_buildpay_requested_by_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_buildpay_requested_by_check
  CHECK (buildpay_requested_by IS NULL OR buildpay_requested_by IN ('trader','customer'));
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_buildpay_fee_mode_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_buildpay_fee_mode_check
  CHECK (buildpay_fee_mode IS NULL OR buildpay_fee_mode IN ('trader_absorbs','customer_pays'));
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_buildpay_customer_fee_non_negative;
ALTER TABLE quotes ADD CONSTRAINT quotes_buildpay_customer_fee_non_negative
  CHECK (buildpay_customer_fee_estimate >= 0);

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS buildpay_requested_by text,
  ADD COLUMN IF NOT EXISTS buildpay_fee_mode text,
  ADD COLUMN IF NOT EXISTS buildpay_customer_fee_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buildpay_fee_terms_version text;

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_buildpay_requested_by_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_buildpay_requested_by_check
  CHECK (buildpay_requested_by IS NULL OR buildpay_requested_by IN ('trader','customer'));
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_buildpay_fee_mode_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_buildpay_fee_mode_check
  CHECK (buildpay_fee_mode IS NULL OR buildpay_fee_mode IN ('trader_absorbs','customer_pays'));
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_buildpay_customer_fee_non_negative;
ALTER TABLE jobs ADD CONSTRAINT jobs_buildpay_customer_fee_non_negative
  CHECK (buildpay_customer_fee_total >= 0);

ALTER TABLE buildpay_funding_batches
  ADD COLUMN IF NOT EXISTS customer_fee_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkout_amount integer;

UPDATE buildpay_funding_batches SET checkout_amount = total_amount WHERE checkout_amount IS NULL;
ALTER TABLE buildpay_funding_batches ALTER COLUMN checkout_amount SET NOT NULL;

ALTER TABLE buildpay_funding_batches DROP CONSTRAINT IF EXISTS buildpay_funding_batches_customer_fee_non_negative;
ALTER TABLE buildpay_funding_batches ADD CONSTRAINT buildpay_funding_batches_customer_fee_non_negative
  CHECK (customer_fee_amount >= 0);
ALTER TABLE buildpay_funding_batches DROP CONSTRAINT IF EXISTS buildpay_funding_batches_checkout_amount_positive;
ALTER TABLE buildpay_funding_batches ADD CONSTRAINT buildpay_funding_batches_checkout_amount_positive
  CHECK (checkout_amount > 0 AND checkout_amount = total_amount + customer_fee_amount);

ALTER TABLE buildpay_funding_allocations
  ADD COLUMN IF NOT EXISTS customer_fee integer NOT NULL DEFAULT 0;
ALTER TABLE buildpay_funding_allocations DROP CONSTRAINT IF EXISTS buildpay_funding_allocations_customer_fee_non_negative;
ALTER TABLE buildpay_funding_allocations ADD CONSTRAINT buildpay_funding_allocations_customer_fee_non_negative
  CHECK (customer_fee >= 0);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS customer_fee_amount integer NOT NULL DEFAULT 0;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_customer_fee_non_negative;
ALTER TABLE payments ADD CONSTRAINT payments_customer_fee_non_negative
  CHECK (customer_fee_amount >= 0);

COMMENT ON COLUMN quotes.buildpay_requested_by IS 'Who first made BuildPay part of the proposed deal: tradesperson or homeowner.';
COMMENT ON COLUMN quotes.buildpay_fee_mode IS 'trader_absorbs keeps the homeowner at the contract price; customer_pays adds the disclosed BuildPay service fee.';
COMMENT ON COLUMN quotes.buildpay_customer_fee_estimate IS 'Pre-acceptance estimate of the optional BuildPay service fee, calculated from the current proposed schedule.';
COMMENT ON COLUMN jobs.buildpay_customer_fee_total IS 'Frozen total BuildPay service fee for the accepted job. Zero when the tradesperson absorbs BuildPay costs.';
COMMENT ON COLUMN buildpay_funding_batches.total_amount IS 'Contract value funded by this batch, excluding any BuildPay customer service fee.';
COMMENT ON COLUMN buildpay_funding_batches.customer_fee_amount IS 'Portion of the frozen BuildPay customer service fee collected with this funding batch.';
COMMENT ON COLUMN buildpay_funding_batches.checkout_amount IS 'Exact amount charged to the homeowner for this batch: contract amount plus BuildPay service fee.';
COMMENT ON COLUMN buildpay_funding_allocations.customer_fee IS 'Portion of the frozen customer BuildPay service fee allocated to this contract stage.';
