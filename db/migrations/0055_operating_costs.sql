-- Owner-maintained operating-cost ledger. This records actual invoices and budgets,
-- not guessed live-provider balances. No marketplace payment records are modified.
CREATE TABLE IF NOT EXISTS admin_operating_costs (
  provider text PRIMARY KEY CHECK (provider IN ('render','neon','clerk','gemini','resend','cloudinary','stripe','github','godaddy','datadog')),
  amount_minor bigint CHECK (amount_minor IS NULL OR (amount_minor >= 0 AND amount_minor <= 100000000000)),
  monthly_budget_minor bigint CHECK (monthly_budget_minor IS NULL OR (monthly_budget_minor >= 0 AND monthly_budget_minor <= 100000000000)),
  currency text NOT NULL DEFAULT 'GBP' CHECK (currency IN ('GBP','USD')),
  billing_period text NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly','annual','usage','one-off')),
  invoice_date date,
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 400),
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE admin_operating_costs IS 'Admin-only operating expense entries. Amounts are manually recorded provider invoices, not provider-synced statements.';
