import { jsonError, requireAdmin } from '@/lib/server';
import { getSql } from '@/lib/sql';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 500) || 500, 1), 1000);

    const rows = await getSql()`
      WITH media AS (
        SELECT 'job_photo'::text AS kind, j.id::text AS "sourceId", j.title::text AS label,
               u.id::text AS "ownerId", u.email::text AS "ownerEmail", p.url::text AS url, j.created_at AS "createdAt"
        FROM jobs j
        LEFT JOIN users u ON u.id = j.customer_id
        CROSS JOIN LATERAL unnest(j.photos) AS p(url)

        UNION ALL
        SELECT 'trader_gallery', tp.id::text, tp.business_name::text,
               u.id::text, u.email::text, p.url::text, tp.updated_at
        FROM trader_profiles tp
        JOIN users u ON u.id = tp.user_id
        CROSS JOIN LATERAL unnest(tp.photos) AS p(url)

        UNION ALL
        SELECT ('trader_' || v.asset_type)::text, tp.id::text, tp.business_name::text,
               u.id::text, u.email::text, v.url::text, s.updated_at
        FROM trader_profile_showcase s
        JOIN trader_profiles tp ON tp.user_id = s.user_id
        JOIN users u ON u.id = s.user_id
        CROSS JOIN LATERAL (VALUES
          ('cover', s.cover_photo_url),
          ('profile', s.profile_image_url),
          ('logo', s.logo_url)
        ) AS v(asset_type, url)
        WHERE v.url IS NOT NULL AND v.url <> ''

        UNION ALL
        SELECT ('before_after_' || v.asset_type)::text, tp.id::text,
               coalesce(project.item->>'caption', tp.business_name)::text,
               u.id::text, u.email::text, v.url::text, s.updated_at
        FROM trader_profile_showcase s
        JOIN trader_profiles tp ON tp.user_id = s.user_id
        JOIN users u ON u.id = s.user_id
        CROSS JOIN LATERAL jsonb_array_elements(coalesce(s.before_after_projects, '[]'::jsonb)) AS project(item)
        CROSS JOIN LATERAL (VALUES
          ('before', project.item->>'before'),
          ('after', project.item->>'after')
        ) AS v(asset_type, url)
        WHERE v.url IS NOT NULL AND v.url <> ''

        UNION ALL
        SELECT 'story_before', st.id::text, st.title::text, u.id::text, u.email::text, p.url::text, st.created_at
        FROM trader_stories st
        JOIN users u ON u.id = st.trader_id
        CROSS JOIN LATERAL unnest(st.before_photos) AS p(url)

        UNION ALL
        SELECT 'story_after', st.id::text, st.title::text, u.id::text, u.email::text, p.url::text, st.created_at
        FROM trader_stories st
        JOIN users u ON u.id = st.trader_id
        CROSS JOIN LATERAL unnest(st.after_photos) AS p(url)
      )
      SELECT * FROM media
      WHERE url IS NOT NULL AND url <> ''
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `;

    return Response.json(rows);
  } catch (error) {
    return jsonError(error);
  }
}
