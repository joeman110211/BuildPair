UPDATE job_milestones
SET kind = CASE
  WHEN lower(title) LIKE '%material%' THEN 'materials'
  WHEN lower(title) = 'deposit' OR lower(title) LIKE '%deposit%' THEN 'deposit'
  WHEN lower(title) LIKE '%final%' OR lower(title) = 'full payment' THEN 'final'
  ELSE 'stage'
END,
release_mode = CASE
  WHEN lower(title) LIKE '%material%' THEN 'immediate'
  ELSE 'customer_payment'
END,
trigger_description = CASE
  WHEN lower(title) LIKE '%material%' THEN 'Due before the agreed materials are ordered.'
  WHEN lower(title) LIKE '%deposit%' THEN 'Due before the agreed work starts.'
  WHEN lower(title) LIKE '%final%' OR lower(title) = 'full payment' THEN 'Due after the agreed work is complete and approved by the homeowner.'
  ELSE trigger_description
END
WHERE kind = 'stage' AND trigger_description = '';

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY job_id ORDER BY created_at ASC, id ASC) AS position
  FROM job_milestones
)
UPDATE job_milestones m
SET sort_order = ranked.position
FROM ranked
WHERE m.id = ranked.id AND m.sort_order = 0;
