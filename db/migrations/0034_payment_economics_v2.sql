ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS stripe_processing_fee_recovered integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trader_transfer_amount integer;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_processing_fee_recovered_non_negative;
ALTER TABLE payments ADD CONSTRAINT payments_processing_fee_recovered_non_negative
  CHECK (stripe_processing_fee_recovered >= 0);

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_trader_transfer_non_negative;
ALTER TABLE payments ADD CONSTRAINT payments_trader_transfer_non_negative
  CHECK (trader_transfer_amount IS NULL OR trader_transfer_amount >= 0);

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS cost_items jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN payments.stripe_processing_fee_recovered IS
  'Actual Stripe processing cost recovered from this trader payout. BuildPair recovers processing progressively instead of loading all costs onto the final milestone.';

COMMENT ON COLUMN payments.trader_transfer_amount IS
  'Exact amount instructed for transfer to the connected tradesperson account for this payment stage.';

COMMENT ON COLUMN quotes.cost_items IS
  'Itemized quote rows shown to the homeowner. Categories are labour, materials, or overhead. The quotes.labor_cost column is the total feeable labour/service value including overhead; materials_cost remains materials only.';
