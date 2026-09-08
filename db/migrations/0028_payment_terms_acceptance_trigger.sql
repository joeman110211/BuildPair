CREATE OR REPLACE FUNCTION buildpair_stamp_payment_terms_acceptance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.payment_mode = 'buildpair' AND OLD.payment_mode IS DISTINCT FROM 'buildpair' THEN
    NEW.payment_terms_accepted_at := now();
    NEW.payment_terms_version := '2026-09-08-v1';
  ELSIF NEW.payment_mode <> 'buildpair' THEN
    NEW.payment_terms_accepted_at := NULL;
    NEW.payment_terms_version := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jobs_payment_terms_acceptance_trigger ON jobs;
CREATE TRIGGER jobs_payment_terms_acceptance_trigger
BEFORE UPDATE OF payment_mode ON jobs
FOR EACH ROW
EXECUTE FUNCTION buildpair_stamp_payment_terms_acceptance();
