CREATE OR REPLACE FUNCTION buildpair_stamp_payment_terms_acceptance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.payment_mode = 'buildpair' AND OLD.payment_mode IS DISTINCT FROM 'buildpair' THEN
    NEW.payment_terms_accepted_at := now();
    NEW.payment_terms_version := '2026-09-09-v2';
  ELSIF NEW.payment_mode <> 'buildpair' THEN
    NEW.payment_terms_accepted_at := NULL;
    NEW.payment_terms_version := NULL;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON COLUMN jobs.payment_terms_accepted_at IS 'When the homeowner explicitly selected BuildPair staged payments after reviewing the agreed schedule and release responsibilities.';
COMMENT ON COLUMN jobs.payment_terms_version IS 'Version of the BuildPair payment terms and responsibility notice accepted when staged payments were selected.';
