import { HttpError } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { hasPlanSetupAccess, tierAtLeast } from '@/lib/subscription';

function esc(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}
function stamp(value: string | Date) {
  const d = new Date(value);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export async function GET(_request: Request, { token }: { token: string }) {
  if (!token || token.length < 40) throw new HttpError(404, 'Calendar not found');
  const owners = await getSql()`
    SELECT t.user_id AS "userId", tp.business_name AS "businessName",
           tp.subscription_tier AS "subscriptionTier", tp.is_subscription_active AS "isSubscriptionActive",
           tp.trial_ends_at AS "trialEndsAt"
    FROM trader_calendar_tokens t
    JOIN trader_profiles tp ON tp.user_id = t.user_id
    WHERE t.token = ${token}
    LIMIT 1
  ` as unknown as { userId: string; businessName: string; subscriptionTier: 'free'|'core'|'basic'|'featured'; isSubscriptionActive: boolean; trialEndsAt: string | null }[];
  const owner = owners[0];
  if (!owner || !tierAtLeast(owner.subscriptionTier, 'basic') || !hasPlanSetupAccess(owner, 'basic')) {
    throw new HttpError(404, 'Calendar not found');
  }
  const horizonDays = owner.subscriptionTier === 'featured' ? 183 : 84;
  const rows = await getSql()`
    SELECT * FROM (
      SELECT ('job:' || j.id::text) AS id, 'BuildPair job'::text AS type, j.title,
             j.scheduled_start_at AS "startsAt", (j.scheduled_start_at + interval '2 hours') AS "endsAt",
             ('/trader/jobs/' || j.id::text) AS href
      FROM jobs j JOIN quotes q ON q.id = j.accepted_quote_id
      WHERE q.trader_id = ${owner.userId} AND j.scheduled_start_at IS NOT NULL
        AND j.scheduled_start_at >= now() - interval '14 days'
        AND j.scheduled_start_at <= now() + (${horizonDays}::text || ' days')::interval
      UNION ALL
      SELECT ('visit:' || v.id::text), 'Site visit', ('Site visit · ' || j.title),
             v.proposed_at, (v.proposed_at + interval '1 hour'),
             ('/trader/visits/' || v.id::text)
      FROM job_site_visits v JOIN jobs j ON j.id = v.job_id
      WHERE v.trader_id = ${owner.userId} AND v.status IN ('proposed','confirmed')
        AND v.proposed_at >= now() - interval '14 days'
        AND v.proposed_at <= now() + (${horizonDays}::text || ' days')::interval
      UNION ALL
      SELECT ('availability:' || a.id::text), 'Availability', 'Available for new work',
             a.starts_at, a.ends_at, '/trader/trust'
      FROM trader_availability a
      WHERE a.trader_id = ${owner.userId}
        AND a.ends_at >= now() - interval '1 day'
        AND a.starts_at <= now() + (${horizonDays}::text || ' days')::interval
    ) events ORDER BY "startsAt" ASC LIMIT 500
  ` as unknown as { id: string; type: string; title: string; startsAt: string; endsAt: string | null; href: string }[];

  const origin = 'https://www.buildpair.co.uk';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BuildPair//Working Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(`BuildPair · ${owner.businessName}`)}`,
    'X-WR-TIMEZONE:Europe/London',
    ...rows.flatMap((row) => [
      'BEGIN:VEVENT',
      `UID:${esc(row.id)}@buildpair.co.uk`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(row.startsAt)}`,
      `DTEND:${stamp(row.endsAt ?? new Date(new Date(row.startsAt).getTime() + 60 * 60 * 1000))}`,
      `SUMMARY:${esc(row.title)}`,
      `DESCRIPTION:${esc(`${row.type}. Open in BuildPair: ${origin}${row.href}`)}`,
      `URL:${origin}${row.href}`,
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
    '',
  ];
  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
      'Content-Disposition': 'inline; filename="buildpair-calendar.ics"',
    },
  });
}
