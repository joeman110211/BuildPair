ALTER TABLE business_quotes
  ADD COLUMN IF NOT EXISTS trade_category text,
  ADD COLUMN IF NOT EXISTS revision_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS supersedes_quote_id uuid REFERENCES business_quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS managed_job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decision_note text;

CREATE INDEX IF NOT EXISTS business_quotes_managed_job_idx ON business_quotes(managed_job_id);
CREATE INDEX IF NOT EXISTS business_quotes_supersedes_idx ON business_quotes(supersedes_quote_id);

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'marketplace',
  ADD COLUMN IF NOT EXISTS external_source_quote_id uuid REFERENCES business_quotes(id) ON DELETE SET NULL;

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_source_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_source_check
  CHECK (source IN ('marketplace', 'direct', 'external_quote'));

CREATE INDEX IF NOT EXISTS jobs_external_source_quote_idx ON jobs(external_source_quote_id);


CREATE OR REPLACE FUNCTION claim_external_business_quote(p_business_quote_id uuid, p_customer_id text)
RETURNS uuid AS $$
DECLARE
  bq business_quotes%ROWTYPE;
  customer_email text;
  created_job_id uuid := gen_random_uuid();
  created_quote_id uuid := gen_random_uuid();
  materials_total integer := 0;
  service_total integer := 0;
  deposit_total integer := 0;
  stage jsonb;
  stage_count integer := 0;
BEGIN
  SELECT * INTO bq FROM business_quotes WHERE id = p_business_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'External quote not found'; END IF;
  IF bq.status <> 'accepted' THEN RAISE EXCEPTION 'External quote must be accepted before it can become a BuildPair project'; END IF;
  IF bq.managed_job_id IS NOT NULL THEN RETURN bq.managed_job_id; END IF;
  IF bq.customer_email IS NULL OR trim(bq.customer_email) = '' THEN RAISE EXCEPTION 'The quote needs the customer email before it can be claimed'; END IF;

  SELECT email INTO customer_email FROM users WHERE id = p_customer_id;
  IF customer_email IS NULL OR lower(trim(customer_email)) <> lower(trim(bq.customer_email)) THEN
    RAISE EXCEPTION 'This quote belongs to a different customer email';
  END IF;

  SELECT coalesce(sum(line_total) FILTER (WHERE category = 'materials'), 0)::integer,
         coalesce(sum(line_total) FILTER (WHERE category <> 'materials'), 0)::integer
    INTO materials_total, service_total
  FROM business_quote_items
  WHERE quote_id = bq.id;

  SELECT coalesce(sum((value->>'amount')::integer) FILTER (WHERE value->>'kind' = 'deposit'), 0)::integer
    INTO deposit_total
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(bq.payment_schedule) = 'array' THEN bq.payment_schedule ELSE '[]'::jsonb END);

  INSERT INTO jobs(
    id, customer_id, target_trader_id, title, category, property_type, postcode,
    location_label, urgency, description, budget_range, photos, is_emergency,
    status, payment_mode, source, external_source_quote_id,
    buildpay_requested_by, buildpay_fee_mode, buildpay_customer_fee_total, buildpay_fee_terms_version,
    external_payment_proposed_by, external_payment_proposed_at,
    external_payment_customer_agreed_at, external_payment_trader_agreed_at,
    updated_at
  ) VALUES (
    created_job_id, p_customer_id, bq.trader_id, bq.job_title,
    coalesce(nullif(bq.trade_category, ''), 'Building & Extensions'),
    'Other', NULL, NULL, 'Flexible', bq.work_included, 'Not sure / discuss',
    ARRAY[]::text[], false, 'in_progress',
    CASE WHEN bq.payment_method = 'external' THEN 'external' WHEN bq.payment_method = 'buildpair' THEN 'buildpair' ELSE 'undecided' END,
    'external_quote', bq.id,
    CASE WHEN bq.payment_method = 'buildpair' THEN 'trader' ELSE NULL END,
    CASE WHEN bq.payment_method = 'buildpair' THEN 'trader_absorbs' ELSE NULL END,
    0,
    CASE WHEN bq.payment_method = 'buildpair' THEN '2026-09-13-v1' ELSE NULL END,
    CASE WHEN bq.payment_method = 'external' THEN bq.trader_id ELSE NULL END,
    CASE WHEN bq.payment_method = 'external' THEN now() ELSE NULL END,
    CASE WHEN bq.payment_method = 'external' THEN now() ELSE NULL END,
    CASE WHEN bq.payment_method = 'external' THEN now() ELSE NULL END,
    now()
  );

  INSERT INTO quotes(
    id, job_id, trader_id, labor_cost, materials_cost, vat_amount, deposit_amount,
    total_amount, payment_terms, scope, exclusions, notes, duration_days,
    warranty_months, proposed_start_at, status, valid_until, payment_schedule,
    payment_schedule_status, payment_schedule_revision, payment_schedule_updated_by,
    created_at, updated_at
  ) VALUES (
    created_quote_id, created_job_id, bq.trader_id, service_total, materials_total,
    bq.vat_amount, deposit_total, bq.total_amount, bq.payment_terms, bq.work_included,
    bq.not_included, bq.notes, NULL, NULL, NULL, 'accepted', bq.valid_until,
    bq.payment_schedule, 'agreed', 1, p_customer_id, bq.created_at, now()
  );

  UPDATE jobs SET accepted_quote_id = created_quote_id, updated_at = now() WHERE id = created_job_id;

  IF jsonb_typeof(bq.payment_schedule) = 'array' AND jsonb_array_length(bq.payment_schedule) > 0 THEN
    FOR stage IN SELECT value FROM jsonb_array_elements(bq.payment_schedule)
    LOOP
      stage_count := stage_count + 1;
      INSERT INTO job_milestones(job_id, quote_id, title, amount, kind, trigger_description, sort_order, release_mode)
      VALUES (
        created_job_id,
        created_quote_id,
        coalesce(nullif(stage->>'title', ''), 'Payment stage'),
        greatest(1, (stage->>'amount')::integer),
        coalesce(nullif(stage->>'kind', ''), 'stage'),
        coalesce(stage->>'trigger', ''),
        coalesce((stage->>'sortOrder')::integer, stage_count),
        CASE WHEN stage->>'kind' = 'materials' THEN 'immediate' ELSE 'customer_payment' END
      );
    END LOOP;
  ELSE
    INSERT INTO job_milestones(job_id, quote_id, title, amount, kind, trigger_description, sort_order, release_mode)
    VALUES (created_job_id, created_quote_id, 'Final payment', bq.total_amount, 'final', 'Due when the agreed work is complete.', 1, 'customer_payment');
  END IF;

  UPDATE business_quotes SET managed_job_id = created_job_id, updated_at = now() WHERE id = bq.id;
  RETURN created_job_id;
END;
$$ LANGUAGE plpgsql;
