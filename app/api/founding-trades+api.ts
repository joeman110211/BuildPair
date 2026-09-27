import { LAUNCH_DATE_ISO } from '@/lib/launch-config';
import { jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

const FOUNDING_TARGET = 50;

export async function GET() {
  try {
    const rows = await getSql()`
      SELECT count(*)::int AS count
      FROM trader_profiles tp
      WHERE tp.created_at < ${LAUNCH_DATE_ISO}::timestamptz
        AND tp.user_id NOT LIKE 'seed_demo_trader_%'
        AND NOT EXISTS (
          SELECT 1
          FROM users u
          WHERE u.id = tp.user_id
            AND (
              coalesce(u.is_suspended, false) = true
              OR coalesce(u.is_deleted, false) = true
              OR coalesce(u.email, '') LIKE '%@buildpair.test'
            )
        )
    ` as unknown as { count: number }[];

    const count = Math.max(0, Number(rows[0]?.count ?? 0));
    const onboarded = Math.min(count, FOUNDING_TARGET);

    return Response.json({
      onboarded,
      target: FOUNDING_TARGET,
      remaining: Math.max(0, FOUNDING_TARGET - onboarded),
      filled: count >= FOUNDING_TARGET,
    }, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
    });
  } catch (error) {
    return jsonError(error);
  }
}
