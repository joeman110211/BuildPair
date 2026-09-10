CREATE TABLE IF NOT EXISTS business_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trader_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quote_number text NOT NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  job_title text NOT NULL,
  job_address text,
  work_included text NOT NULL,
  not_included text,
  expected_start text,
  duration_text text,
  warranty_text text,
  subtotal integer NOT NULL DEFAULT 0,
  vat_rate integer NOT NULL DEFAULT 0,
  vat_amount integer NOT NULL DEFAULT 0,
  total_amount integer NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'undecided',
  payment_terms text NOT NULL DEFAULT 'Payment due in line with the agreed payment schedule.',
  payment_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  show_breakdown boolean NOT NULL DEFAULT true,
  valid_until timestamptz,
  status text NOT NULL DEFAULT 'draft',
  share_token text NOT NULL UNIQUE,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_quotes_status_check CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'withdrawn')),
  CONSTRAINT business_quotes_payment_method_check CHECK (payment_method IN ('undecided', 'buildpair', 'external')),
  CONSTRAINT business_quotes_amounts_check CHECK (subtotal >= 0 AND vat_amount >= 0 AND total_amount = subtotal + vat_amount),
  CONSTRAINT business_quotes_vat_rate_check CHECK (vat_rate BETWEEN 0 AND 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS business_quotes_trader_number_unique ON business_quotes(trader_id, quote_number);
CREATE INDEX IF NOT EXISTS business_quotes_trader_updated_idx ON business_quotes(trader_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS business_quotes_status_idx ON business_quotes(trader_id, status);

CREATE TABLE IF NOT EXISTS business_quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES business_quotes(id) ON DELETE CASCADE,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  quantity numeric(12, 2) NOT NULL DEFAULT 1,
  unit_price integer NOT NULL DEFAULT 0,
  line_total integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 1,
  CONSTRAINT business_quote_items_category_check CHECK (category IN ('labour', 'materials', 'other')),
  CONSTRAINT business_quote_items_values_check CHECK (quantity > 0 AND unit_price >= 0 AND line_total >= 0)
);

CREATE INDEX IF NOT EXISTS business_quote_items_quote_idx ON business_quote_items(quote_id, sort_order);
