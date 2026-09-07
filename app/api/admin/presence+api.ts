import { jsonError, requireAdmin } from '@/lib/server';
import { getSql } from '@/lib/sql';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const rows = await getSql()`
      SELECT
        u.id,
        u.email,
        u.role,
        coalesce(u.customer_enabled, false) AS "customerEnabled",
        coalesce(u.trader_enabled, false) AS "traderEnabled",
        coalesce(u.is_suspended, false) AS "isSuspended",
        tp.business_name AS "businessName",
        up.last_seen_at AS "lastSeenAt",
        up.last_path AS "lastPath",
        up.client_platform AS "platform",
        (up.last_seen_at >= now() - interval '2 minutes') AS "onlineNow"
      FROM user_presence up
      JOIN users u ON u.id = up.user_id
      LEFT JOIN trader_profiles tp ON tp.user_id = u.id
      WHERE coalesce(u.is_deleted, false) = false
      ORDER BY up.last_seen_at DESC
      LIMIT 500
    `;
    return Response.json(rows);
  } catch (error) {
    return jsonError(error);
  }
}
