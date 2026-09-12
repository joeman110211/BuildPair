import { jsonError, requireAdmin } from '@/lib/server';
import { getSql } from '@/lib/sql';

function missingAnalyticsStorage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /visitor_(analytics_hourly|sessions|session_events).*does not exist|relation .*visitor_.* does not exist/i.test(message);
}

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function channelFor(referrerValue: unknown, sourceValue: unknown, mediumValue: unknown) {
  const referrer = String(referrerValue ?? '').toLowerCase();
  const source = String(sourceValue ?? '').toLowerCase();
  const medium = String(mediumValue ?? '').toLowerCase();
  const haystack = `${source} ${medium} ${referrer}`;
  if (/tiktok/.test(haystack)) return 'TikTok';
  if (/facebook|fb\.com|instagram|meta/.test(haystack)) return 'Facebook / Instagram';
  if (/youtube|youtu\.be/.test(haystack)) return 'YouTube';
  if (/linkedin/.test(haystack)) return 'LinkedIn';
  if (/reddit/.test(haystack)) return 'Reddit';
  if (/chatgpt|openai|perplexity|claude|anthropic|gemini/.test(haystack)) return 'AI assistants';
  if (/google|bing|duckduckgo|yahoo|search/.test(haystack)) return 'Search';
  if (/email|newsletter/.test(haystack)) return 'Email';
  if (!source && !referrer) return 'Direct / unknown';
  return source ? source : referrer.replace(/^www\./, '') || 'Other referral';
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const requestedDays = Number(url.searchParams.get('days') || 7);
    const days = [1, 7, 30, 90].includes(requestedDays) ? requestedDays : 7;
    const sessionId = url.searchParams.get('sessionId');
    const sql = getSql();

    if (sessionId) {
      const events = await sql`
        SELECT id, event_type AS "eventType", path, target, value, details, created_at AS "createdAt"
        FROM visitor_session_events
        WHERE session_id = ${sessionId}::uuid
        ORDER BY created_at ASC
        LIMIT 1000
      `;
      return Response.json({ storageReady: true, sessionId, events });
    }

    const [
      summaryRows,
      sessionSummaryRows,
      trackingRows,
      topPages,
      topLandingPages,
      topClicks,
      acquisitionRows,
      devices,
      locations,
      forms,
      recentSessions,
      signupRows,
    ] = await Promise.all([
      sql`
        SELECT
          coalesce(sum(event_count) FILTER (WHERE event_type = 'page_view'), 0)::bigint AS "pageViews",
          coalesce(sum(event_count) FILTER (WHERE event_type = 'click'), 0)::bigint AS clicks,
          coalesce(sum(event_count) FILTER (WHERE event_type = 'scroll'), 0)::bigint AS scrolls,
          coalesce(sum(event_count) FILTER (WHERE event_type = 'form_interaction'), 0)::bigint AS "formInteractions",
          coalesce(sum(event_count) FILTER (WHERE event_type = 'form_submit'), 0)::bigint AS "formSubmits",
          coalesce(sum(event_count) FILTER (WHERE event_type = 'page_view' AND dimensions->>'path' ILIKE '%sign-up%'), 0)::bigint AS "signupPageViews",
          coalesce(sum(event_count) FILTER (WHERE event_type = 'click' AND ((dimensions->>'targetPath') ILIKE '%sign-up%' OR (dimensions->>'target') ILIKE '%sign up%')), 0)::bigint AS "signupClicks",
          coalesce(sum(total_value) FILTER (WHERE event_type = 'page_time'), 0)::double precision AS "totalPageSeconds",
          coalesce(sum(event_count) FILTER (WHERE event_type = 'page_time'), 0)::bigint AS "pageTimeSamples"
        FROM visitor_analytics_hourly
        WHERE bucket_start >= now() - (${days}::int * interval '1 day')
      `,
      sql`
        WITH cutoff AS (
          SELECT now() - (${days}::int * interval '1 day') AS since
        ),
        first_seen AS (
          SELECT visitor_id, min(started_at) AS first_seen
          FROM visitor_sessions
          GROUP BY visitor_id
        ),
        page_counts AS (
          SELECT session_id, count(*) FILTER (WHERE event_type = 'page_view')::int AS page_views
          FROM visitor_session_events
          GROUP BY session_id
        ),
        period AS (
          SELECT s.*, f.first_seen, coalesce(p.page_views, 0)::int AS page_views
          FROM visitor_sessions s
          JOIN first_seen f ON f.visitor_id = s.visitor_id
          LEFT JOIN page_counts p ON p.session_id = s.id
          CROSS JOIN cutoff c
          WHERE s.started_at >= c.since
        )
        SELECT
          count(*)::int AS sessions,
          count(DISTINCT visitor_id)::int AS "uniqueVisitors",
          count(DISTINCT visitor_id) FILTER (WHERE first_seen >= (SELECT since FROM cutoff))::int AS "newVisitors",
          count(DISTINCT visitor_id) FILTER (WHERE first_seen < (SELECT since FROM cutoff))::int AS "returningVisitors",
          count(*) FILTER (WHERE started_at > first_seen)::int AS "returningSessions",
          count(DISTINCT visitor_id) FILTER (WHERE last_seen_at >= now() - interval '2 minutes')::int AS "activeNow",
          count(*) FILTER (WHERE converted)::int AS "convertedSessions",
          count(*) FILTER (WHERE NOT converted AND last_seen_at < now() - interval '30 minutes')::int AS "likelyNonConversions",
          count(*) FILTER (WHERE page_views <= 1)::int AS "singlePageSessions",
          count(*) FILTER (WHERE page_views > 1 OR extract(epoch FROM (last_seen_at - started_at)) >= 60)::int AS "engagedSessions",
          coalesce(avg(page_views), 0)::double precision AS "pagesPerSession",
          coalesce(sum(page_views), 0)::bigint AS "trackedPageViews",
          coalesce(avg(extract(epoch FROM (last_seen_at - started_at))), 0)::double precision AS "avgSessionSeconds"
        FROM period
      `,
      sql`
        WITH tracking AS (
          SELECT min(started_at) AS started FROM visitor_sessions
        )
        SELECT
          (SELECT started FROM tracking) AS "uniqueTrackingSince",
          coalesce(sum(event_count) FILTER (
            WHERE event_type = 'page_view'
              AND ((SELECT started FROM tracking) IS NULL OR bucket_start < date_trunc('hour', (SELECT started FROM tracking)))
          ), 0)::bigint AS "legacyAggregatePageViews"
        FROM visitor_analytics_hourly
      `,
      sql`
        SELECT
          dimensions->>'path' AS path,
          coalesce(sum(event_count) FILTER (WHERE event_type = 'page_view'), 0)::bigint AS views,
          coalesce(sum(total_value) FILTER (WHERE event_type = 'page_time') / nullif(sum(event_count) FILTER (WHERE event_type = 'page_time'), 0), 0)::double precision AS "avgSeconds"
        FROM visitor_analytics_hourly
        WHERE bucket_start >= now() - (${days}::int * interval '1 day')
          AND coalesce(dimensions->>'path', '') <> ''
        GROUP BY dimensions->>'path'
        ORDER BY views DESC, "avgSeconds" DESC
        LIMIT 40
      `,
      sql`
        SELECT landing_path AS path, count(*)::int AS sessions, count(DISTINCT visitor_id)::int AS visitors,
               count(*) FILTER (WHERE converted)::int AS conversions
        FROM visitor_sessions
        WHERE started_at >= now() - (${days}::int * interval '1 day')
          AND coalesce(landing_path, '') <> ''
        GROUP BY landing_path
        ORDER BY sessions DESC, visitors DESC
        LIMIT 30
      `,
      sql`
        SELECT
          dimensions->>'target' AS target,
          dimensions->>'targetPath' AS "targetPath",
          sum(event_count)::bigint AS clicks
        FROM visitor_analytics_hourly
        WHERE bucket_start >= now() - (${days}::int * interval '1 day')
          AND event_type = 'click'
          AND coalesce(dimensions->>'target', '') <> ''
        GROUP BY dimensions->>'target', dimensions->>'targetPath'
        ORDER BY clicks DESC
        LIMIT 40
      `,
      sql`
        SELECT
          coalesce(nullif(referrer_host, ''), 'Direct / unknown') AS "referrerHost",
          coalesce(acquisition->>'utmSource', '') AS "utmSource",
          coalesce(acquisition->>'utmMedium', '') AS "utmMedium",
          coalesce(acquisition->>'utmCampaign', '') AS "utmCampaign",
          count(*)::int AS sessions,
          count(DISTINCT visitor_id)::int AS visitors,
          count(*) FILTER (WHERE converted)::int AS conversions
        FROM visitor_sessions
        WHERE started_at >= now() - (${days}::int * interval '1 day')
        GROUP BY 1, 2, 3, 4
        ORDER BY sessions DESC, visitors DESC
        LIMIT 60
      `,
      sql`
        SELECT
          coalesce(nullif(device->>'deviceType', ''), 'unknown') AS "deviceType",
          coalesce(nullif(device->>'browser', ''), 'unknown') AS browser,
          coalesce(nullif(device->>'os', ''), 'unknown') AS os,
          count(*)::int AS sessions,
          count(DISTINCT visitor_id)::int AS visitors
        FROM visitor_sessions
        WHERE started_at >= now() - (${days}::int * interval '1 day')
        GROUP BY 1, 2, 3
        ORDER BY visitors DESC, sessions DESC
        LIMIT 40
      `,
      sql`
        SELECT
          coalesce(geo->>'country', '') AS country,
          coalesce(geo->>'region', '') AS region,
          coalesce(geo->>'city', '') AS city,
          coalesce(device->>'timezone', '') AS timezone,
          count(*)::int AS sessions,
          count(DISTINCT visitor_id)::int AS visitors
        FROM visitor_sessions
        WHERE started_at >= now() - (${days}::int * interval '1 day')
        GROUP BY 1, 2, 3, 4
        ORDER BY visitors DESC, sessions DESC
        LIMIT 40
      `,
      sql`
        SELECT dimensions->>'path' AS path, dimensions->>'target' AS field, sum(event_count)::bigint AS interactions
        FROM visitor_analytics_hourly
        WHERE bucket_start >= now() - (${days}::int * interval '1 day')
          AND event_type = 'form_interaction'
          AND coalesce(dimensions->>'target', '') <> ''
        GROUP BY 1, 2
        ORDER BY interactions DESC
        LIMIT 40
      `,
      sql`
        SELECT
          s.id,
          s.visitor_id AS "visitorId",
          s.started_at AS "startedAt",
          s.last_seen_at AS "lastSeenAt",
          s.landing_path AS "landingPath",
          s.last_path AS "lastPath",
          s.referrer_host AS "referrerHost",
          s.acquisition,
          s.device,
          s.geo,
          s.converted,
          s.converted_at AS "convertedAt",
          (s.last_seen_at < now() - interval '30 minutes' AND NOT s.converted) AS "likelyDropoff",
          (s.last_seen_at >= now() - interval '2 minutes') AS "activeNow",
          EXISTS (
            SELECT 1 FROM visitor_sessions earlier
            WHERE earlier.visitor_id = s.visitor_id AND earlier.started_at < s.started_at
          ) AS "isReturning",
          extract(epoch FROM (s.last_seen_at - s.started_at))::double precision AS "durationSeconds",
          (SELECT count(*)::int FROM visitor_session_events e WHERE e.session_id = s.id) AS "eventCount",
          (SELECT count(*)::int FROM visitor_session_events e WHERE e.session_id = s.id AND e.event_type = 'page_view') AS "pageViews",
          (SELECT count(*)::int FROM visitor_sessions other WHERE other.visitor_id = s.visitor_id) AS "visitCount"
        FROM visitor_sessions s
        WHERE s.started_at >= now() - (${days}::int * interval '1 day')
        ORDER BY s.started_at DESC
        LIMIT 100
      `,
      sql`
        SELECT count(*)::int AS signups
        FROM users
        WHERE created_at >= now() - (${days}::int * interval '1 day')
          AND coalesce(is_deleted, false) = false
      `,
    ]);

    const summary = summaryRows[0] ?? {};
    const sessionSummary = sessionSummaryRows[0] ?? {};
    const tracking = trackingRows[0] ?? {};
    const signups = signupRows[0]?.signups ?? 0;

    const channelMap = new Map<string, { channel: string; sessions: number; visitors: number; conversions: number }>();
    for (const row of acquisitionRows as Record<string, unknown>[]) {
      const channel = channelFor(row.referrerHost, row.utmSource, row.utmMedium);
      const existing = channelMap.get(channel) ?? { channel, sessions: 0, visitors: 0, conversions: 0 };
      existing.sessions += asNumber(row.sessions);
      existing.visitors += asNumber(row.visitors);
      existing.conversions += asNumber(row.conversions);
      channelMap.set(channel, existing);
    }
    const sourceChannels = [...channelMap.values()].sort((a, b) => b.sessions - a.sessions || b.visitors - a.visitors);

    const recent = (recentSessions as Record<string, unknown>[]).map((session) => ({
      ...session,
      channel: channelFor(session.referrerHost, (session.acquisition as Record<string, unknown> | undefined)?.utmSource, (session.acquisition as Record<string, unknown> | undefined)?.utmMedium),
    }));

    return Response.json({
      storageReady: true,
      days,
      summary: { ...summary, ...sessionSummary, ...tracking, signups },
      topPages,
      topLandingPages,
      topClicks,
      acquisition: acquisitionRows,
      sourceChannels,
      devices,
      locations,
      forms,
      recentSessions: recent,
    });
  } catch (error) {
    if (missingAnalyticsStorage(error)) {
      return Response.json({
        storageReady: false,
        summary: {},
        topPages: [],
        topLandingPages: [],
        topClicks: [],
        acquisition: [],
        sourceChannels: [],
        devices: [],
        locations: [],
        forms: [],
        recentSessions: [],
      });
    }
    return jsonError(error);
  }
}
