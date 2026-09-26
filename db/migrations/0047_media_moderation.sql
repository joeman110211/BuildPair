CREATE TABLE IF NOT EXISTS media_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('job', 'trader')),
  url text NOT NULL UNIQUE,
  provider_public_id text,
  moderation_status text NOT NULL DEFAULT 'approved'
    CHECK (moderation_status IN ('approved', 'grandfathered')),
  moderation_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_uploads_user_kind_idx
  ON media_uploads(user_id, kind, created_at DESC);

-- Existing media predates the moderation gate. Record it as grandfathered so
-- editing an existing job/profile does not fail after this migration.
INSERT INTO media_uploads(user_id, kind, url, moderation_status, moderation_reason)
SELECT j.customer_id, 'job', p.url, 'grandfathered', 'Existing job media before moderation gate'
FROM jobs j
CROSS JOIN LATERAL unnest(j.photos) AS p(url)
WHERE p.url IS NOT NULL AND p.url <> ''
ON CONFLICT (url) DO NOTHING;

INSERT INTO media_uploads(user_id, kind, url, moderation_status, moderation_reason)
SELECT tp.user_id, 'trader', p.url, 'grandfathered', 'Existing trader gallery media before moderation gate'
FROM trader_profiles tp
CROSS JOIN LATERAL unnest(tp.photos) AS p(url)
WHERE p.url IS NOT NULL AND p.url <> ''
ON CONFLICT (url) DO NOTHING;

INSERT INTO media_uploads(user_id, kind, url, moderation_status, moderation_reason)
SELECT s.user_id, 'trader', v.url, 'grandfathered', 'Existing trader showcase media before moderation gate'
FROM trader_profile_showcase s
CROSS JOIN LATERAL (VALUES
  (s.cover_photo_url),
  (s.profile_image_url),
  (s.logo_url)
) AS v(url)
WHERE v.url IS NOT NULL AND v.url <> ''
ON CONFLICT (url) DO NOTHING;

INSERT INTO media_uploads(user_id, kind, url, moderation_status, moderation_reason)
SELECT s.user_id, 'trader', v.url, 'grandfathered', 'Existing before/after media before moderation gate'
FROM trader_profile_showcase s
CROSS JOIN LATERAL jsonb_array_elements(coalesce(s.before_after_projects, '[]'::jsonb)) AS project(item)
CROSS JOIN LATERAL (VALUES
  (project.item->>'before'),
  (project.item->>'after')
) AS v(url)
WHERE v.url IS NOT NULL AND v.url <> ''
ON CONFLICT (url) DO NOTHING;

INSERT INTO media_uploads(user_id, kind, url, moderation_status, moderation_reason)
SELECT st.trader_id, 'trader', p.url, 'grandfathered', 'Existing project story media before moderation gate'
FROM trader_stories st
CROSS JOIN LATERAL unnest(st.before_photos || st.after_photos) AS p(url)
WHERE p.url IS NOT NULL AND p.url <> ''
ON CONFLICT (url) DO NOTHING;
