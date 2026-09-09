import { jsonError, requireAdmin } from '@/lib/server';
import { getSql } from '@/lib/sql';

function missingAnalyticsStorage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /visitor_(analytics_hourly|sessions|session_events).*does not exist|relation .*visitor_.* does not exist/i.test(message);
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

    const [summaryRows, sessionSummaryRows, topPages, topClicks, acquisition, devices, locations, forms, recentSessions, signupRows] = await Promise.all([
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
        SELECT
          count(*)::int AS "detailedSessions",
          count(DISTINCT visitor_id)::int AS "detailedVisitors",
          count(*) FILTER (WHERE converted)::int AS "convertedSessions",
          count(*) FILTER (WHERE NOT converted AND last_seen_at < now() - interval '30 minutes')::int AS "likelyNonConversions",
          coalesce(avg(extract(epoch FROM (last_seen_at - started_at))), 0)::double precision AS "avgSessionSeconds"
        FROM visitor_sessions
        WHERE started_at >= now() - (${days}::int * interval '1 day')
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
          coalesce(nullif(dimensions->>'referrerHost', ''), 'Direct / unknown') AS "referrerHost",
          coalesce(dimensions->>'utmSource', '') AS "utmSource",
          coalesce(dimensions->>'utmMedium', '') AS "utmMedium",
          coalesce(dimensions->>'utmCampaign', '') AS "utmCampaign",
          sum(event_count)::bigint AS views
        FROM visitor_analytics_hourly
        WHERE bucket_start >= now() - (${days}::int * interval '1 day') AND event_type = 'page_view'
        GROUP BY 1, 2, 3, 4
        ORDER BY views DESC
        LIMIT 40
      `,
      sql`
        SELECT
          coalesce(nullif(dimensions->>'deviceType', ''), 'unknown') AS "deviceType",
          coalesce(nullif(dimensions->>'browser', ''), 'unknown') AS browser,
          coalesce(nullif(dimensions->>'os', ''), 'unknown') AS os,
          sum(event_count)::bigint AS views
        FROM visitor_analytics_hourly
        WHERE bucket_start >= now() - (${days}::int * interval '1 day') AND event_type = 'page_view'
        GROUP BY 1, 2, 3
        ORDER BY views DESC
        LIMIT 40
      `,
      sql`
        SELECT
          coalesce(dimensions->>'country', '') AS country,
          coalesce(dimensions->>'region', '') AS region,
          coalesce(dimensions->>'city', '') AS city,
          coalesce(dimensions->>'timezone', '') AS timezone,
          sum(event_count)::bigint AS views
        FROM visitor_analytics_hourly
        WHERE bucket_start >= now() - (${days}::int * interval '1 day') AND event_type = 'page_view'
        GROUP BY 1, 2, 3, 4
        ORDER BY views DESC
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
          extract(epoch FROM (s.last_seen_at - s.started_at))::double precision AS "durationSeconds",
          (SELECT count(*)::int FROM visitor_session_events e WHERE e.session_id = s.id) AS "eventCount",
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
    const signups = signupRows[0]?.signups ?? 0;

    return Response.json({
      storageReady: true,
      days,
      summary: { ...summary, ...sessionSummary, signups },
      topPages,
      topClicks,
      acquisition,
      devices,
      locations,
      forms,
      recentSessions,
    });
  } catch (error) {
    if (missingAnalyticsStorage(error)) {
      return Response.json({
        storageReady: false,
        summary: {},
        topPages: [],
        topClicks: [],
        acquisition: [],
        devices: [],
        locations: [],
        forms: [],
        recentSessions: [],
      });
    }
    return jsonError(error);
  }
}
