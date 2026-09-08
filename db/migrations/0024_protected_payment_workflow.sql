ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS payment_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_schedule_status text NOT NULL DEFAULT 'proposed',
  ADD COLUMN IF NOT EXISTS payment_schedule_revision integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS payment_schedule_updated_by text REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_payment_schedule_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_payment_schedule_status_check
  CHECK (payment_schedule_status IN ('proposed', 'customer_edited', 'agreed'));

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'undecided';
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_payment_mode_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_payment_mode_check
  CHECK (payment_mode IN ('undecided', 'buildpair', 'external'));

ALTER TABLE job_milestones
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'stage',
  ADD COLUMN IF NOT EXISTS trigger_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS release_mode text NOT NULL DEFAULT 'customer_payment';

ALTER TABLE job_milestones DROP CONSTRAINT IF EXISTS job_milestones_kind_check;
ALTER TABLE job_milestones ADD CONSTRAINT job_milestones_kind_check
  CHECK (kind IN ('materials', 'deposit', 'stage', 'final'));
ALTER TABLE job_milestones DROP CONSTRAINT IF EXISTS job_milestones_release_mode_check;
ALTER TABLE job_milestones ADD CONSTRAINT job_milestones_release_mode_check
  CHECK (release_mode IN ('immediate', 'customer_payment'));

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS stripe_transfer_id text,
  ADD COLUMN IF NOT EXISTS released_at timestamptz;

CREATE OR REPLACE FUNCTION accept_job_quote(p_quote_id uuid, p_customer_id text) RETURNS void AS $$
DECLARE
  selected_quote quotes%ROWTYPE;
  selected_job jobs%ROWTYPE;
  stage jsonb;
  stage_count integer := 0;
BEGIN
  SELECT * INTO selected_quote FROM quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found'; END IF;
  SELECT * INTO selected_job FROM jobs WHERE id = selected_quote.job_id AND customer_id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job not found'; END IF;
  IF selected_job.status NOT IN ('open', 'quoted') THEN RAISE EXCEPTION 'Job already awarded'; END IF;
  IF selected_quote.payment_schedule_status = 'customer_edited' THEN
    RAISE EXCEPTION 'Tradesperson must agree the edited payment stages before quote acceptance';
  END IF;

  UPDATE quotes SET status = CASE WHEN id = p_quote_id THEN 'accepted'::quote_status ELSE 'declined'::quote_status END, updated_at = now()
    WHERE job_id = selected_job.id;
  UPDATE jobs SET status = 'in_progress', accepted_quote_id = p_quote_id, payment_mode = 'undecided', updated_at = now() WHERE id = selected_job.id;

  DELETE FROM job_milestones WHERE job_id = selected_job.id;

  IF jsonb_typeof(selected_quote.payment_schedule) = 'array' AND jsonb_array_length(selected_quote.payment_schedule) > 0 THEN
    FOR stage IN SELECT value FROM jsonb_array_elements(selected_quote.payment_schedule)
    LOOP
      stage_count := stage_count + 1;
      INSERT INTO job_milestones(job_id, quote_id, title, amount, kind, trigger_description, sort_order, release_mode)
      VALUES (
        selected_job.id,
        p_quote_id,
        COALESCE(NULLIF(stage->>'title', ''), 'Payment stage'),
        GREATEST(1, (stage->>'amount')::integer),
        COALESCE(NULLIF(stage->>'kind', ''), 'stage'),
        COALESCE(stage->>'trigger', ''),
        COALESCE((stage->>'sortOrder')::integer, stage_count),
        CASE WHEN stage->>'kind' = 'materials' THEN 'immediate' ELSE 'customer_payment' END
      );
    END LOOP;
  ELSIF selected_quote.deposit_amount > 0 THEN
    INSERT INTO job_milestones(job_id, quote_id, title, amount, kind, sort_order, release_mode)
      VALUES (selected_job.id, p_quote_id, 'Deposit', selected_quote.deposit_amount, 'deposit', 1, 'customer_payment');
    IF selected_quote.total_amount > selected_quote.deposit_amount THEN
      INSERT INTO job_milestones(job_id, quote_id, title, amount, kind, sort_order, release_mode)
        VALUES (selected_job.id, p_quote_id, 'Final payment', selected_quote.total_amount - selected_quote.deposit_amount, 'final', 2, 'customer_payment');
    END IF;
  ELSE
    INSERT INTO job_milestones(job_id, quote_id, title, amount, kind, sort_order, release_mode)
      VALUES (selected_job.id, p_quote_id, 'Full payment', selected_quote.total_amount, 'final', 1, 'customer_payment');
  END IF;
END;
$$ LANGUAGE plpgsql;
