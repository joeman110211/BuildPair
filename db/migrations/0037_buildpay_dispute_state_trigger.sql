CREATE OR REPLACE FUNCTION sync_buildpay_dispute_state() RETURNS trigger AS $$
BEGIN
  IF NEW.status::text = 'disputed' AND COALESCE(NEW.dispute_status, 'none') = 'none' THEN
    NEW.dispute_status := 'open';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_milestones_sync_buildpay_dispute_state ON job_milestones;
CREATE TRIGGER job_milestones_sync_buildpay_dispute_state
BEFORE INSERT OR UPDATE OF status ON job_milestones
FOR EACH ROW EXECUTE FUNCTION sync_buildpay_dispute_state();

UPDATE job_milestones
SET dispute_status = 'open'
WHERE status::text = 'disputed' AND dispute_status = 'none';
