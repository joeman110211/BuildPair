import { jsonError, requireRole, HttpError } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { hasPlanSetupAccess, tierAtLeast } from '@/lib/subscription';

export async function GET(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const plans = await getSql()`
      SELECT subscription_tier AS "subscriptionTier", is_subscription_active AS "isSubscriptionActive", trial_ends_at AS "trialEndsAt"
      FROM trader_profiles WHERE user_id = ${trader.id} LIMIT 1
    ` as unknown as { subscriptionTier: 'free' | 'core' | 'basic' | 'featured'; isSubscriptionActive: boolean; trialEndsAt: string | null }[];
    const plan = plans[0];
    if (!plan || !tierAtLeast(plan.subscriptionTier, 'basic') || !hasPlanSetupAccess(plan, 'basic')) throw new HttpError(402, 'The working calendar is included with BuildPair Plus and Pro.');
    const horizonDays = plan.subscriptionTier === 'featured' ? 183 : 84;
    const rows = await getSql()`
      SELECT * FROM (
        SELECT ('job:' || j.id::text) AS id, 'job'::text AS type, j.title,
               j.scheduled_start_at AS "startsAt", NULL::timestamptz AS "endsAt",
               j.status::text AS status, ('/trader/jobs/' || j.id::text) AS href
        FROM jobs j
        JOIN quotes q ON q.id = j.accepted_quote_id
        WHERE q.trader_id = ${trader.id}
          AND j.scheduled_start_at IS NOT NULL
          AND j.scheduled_start_at >= now() - interval '7 days'
          AND j.scheduled_start_at <= now() + (${horizonDays}::text || ' days')::interval
        UNION ALL
        SELECT ('visit:' || v.id::text), 'site_visit', ('Site visit · ' || j.title),
               v.proposed_at, NULL::timestamptz, v.status,
               ('/trader/visits/' || v.id::text)
        FROM job_site_visits v JOIN jobs j ON j.id = v.job_id
        WHERE v.trader_id = ${trader.id}
          AND v.status IN ('proposed','confirmed')
          AND v.proposed_at >= now() - interval '7 days'
          AND v.proposed_at <= now() + (${horizonDays}::text || ' days')::interval
        UNION ALL
        SELECT ('availability:' || a.id::text), 'availability', 'Available for new work',
               a.starts_at, a.ends_at, a.status, '/trader/trust'
        FROM trader_availability a
        WHERE a.trader_id = ${trader.id}
          AND a.ends_at >= now() - interval '1 day'
          AND a.starts_at <= now() + (${horizonDays}::text || ' days')::interval
      ) events
      ORDER BY "startsAt" ASC
      LIMIT 400
    `;
    return Response.json({ horizonDays, tier: plan.subscriptionTier, events: rows });
  } catch (error) { return jsonError(error); }
}
