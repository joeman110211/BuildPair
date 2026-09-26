-- Retention foundations: reusable private properties and links from those properties to jobs.
CREATE TABLE IF NOT EXISTS customer_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname text NOT NULL DEFAULT 'My property',
  property_type text NOT NULL,
  postcode text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  town_city text NOT NULL,
  access_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_property_nickname_check CHECK (char_length(trim(nickname)) BETWEEN 2 AND 80)
);
CREATE INDEX IF NOT EXISTS customer_properties_customer_idx ON customer_properties(customer_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS customer_property_jobs (
  property_id uuid NOT NULL REFERENCES customer_properties(id) ON DELETE CASCADE,
  job_id uuid PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
  linked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_property_jobs_property_idx ON customer_property_jobs(property_id, linked_at DESC);

COMMENT ON TABLE customer_properties IS 'Private reusable homeowner property records. Exact addresses must never be exposed in public marketplace job responses.';
COMMENT ON TABLE customer_property_jobs IS 'Links a job to the private property profile it was created from. Job-private address details are snapshotted separately so historical jobs do not change when a property profile is edited.';
