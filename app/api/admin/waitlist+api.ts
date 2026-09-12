import { jsonError, requireAdmin } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { ensureLaunchWaitlistTable } from '@/lib/waitlist-store';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    await ensureLaunchWaitlistTable();
    const sql = getSql();
    const entries = await sql`
      SELECT
        id, name, email, phone, postcode, audience, trade,
        preferred_contact AS "preferredContact",
        tester_interest AS "testerInterest",
        sms_opt_in AS "smsOptIn",
        marketing_opt_in AS "marketingOptIn",
        source, status,
        launch_notified_at AS "launchNotifiedAt",
        registered_user_id AS "registeredUserId",
        registered_at AS "registeredAt",
        pro_reward_granted_at AS "proRewardGrantedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        CASE WHEN audience = 'trader' THEN
          count(*) FILTER (WHERE audience = 'trader') OVER (ORDER BY created_at, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
        ELSE NULL END AS "traderPosition"
      FROM launch_waitlist
      WHERE status <> 'removed'
      ORDER BY created_at DESC
      LIMIT 5000
    `;
    const summaryRows = await sql`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE audience = 'trader')::int AS traders,
        count(*) FILTER (WHERE audience = 'homeowner')::int AS homeowners,
        count(*) FILTER (WHERE tester_interest)::int AS testers,
        count(*) FILTER (WHERE status = 'registered')::int AS registered,
        count(*) FILTER (WHERE pro_reward_granted_at IS NOT NULL)::int AS rewarded,
        count(*) FILTER (WHERE preferred_contact IN ('sms', 'both'))::int AS "textContacts"
      FROM launch_waitlist WHERE status <> 'removed'
    ` as unknown as { total: number; traders: number; homeowners: number; testers: number; registered: number; rewarded: number; textContacts: number }[];
    return Response.json({ summary: summaryRows[0] ?? { total: 0, traders: 0, homeowners: 0, testers: 0, registered: 0, rewarded: 0, textContacts: 0 }, entries });
  } catch (error) {
    return jsonError(error);
  }
}
