import { jsonError, requireAdmin } from '@/lib/server';
import { getSql } from '@/lib/sql';

// Aggregate, privacy-respecting reporting. This does not pretend that anonymous
// page views and clicks are individual users or attributed completed jobs.
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const params = new URL(request.url).searchParams;
    const requestedDays = Number(params.get('days') || 7);
    const days = [1, 7, 30, 90].includes(requestedDays) ? requestedDays : 7;
    const trafficMode = params.get('traffic') === 'all' ? 'all' : 'filtered';
    const filterTraffic = trafficMode === 'filtered';
    const sql = getSql();

    const [summaryRows, guideRows] = await Promise.all([
      sql`
        SELECT
          coalesce(sum(event_count) FILTER (
            WHERE event_type = 'page_view'
            AND dimensions->>'path' = '/advice'
          ), 0)::bigint AS "hubViews",
          coalesce(sum(event_count) FILTER (
            WHERE event_type = 'page_view'
            AND dimensions->>'path' LIKE '/advice/%'
          ), 0)::bigint AS "guideViews",
          coalesce(sum(event_count) FILTER (
            WHERE event_type = 'click'
            AND dimensions->>'path' LIKE '/advice/%'
            AND dimensions->>'targetPath' LIKE '%source=advice%'
          ), 0)::bigint AS "nextStepClicks",
          coalesce(sum(event_count) FILTER (
            WHERE event_type = 'click'
            AND dimensions->>'path' LIKE '/advice/%'
            AND dimensions->>'targetPath' LIKE '%/directory?%'
            AND dimensions->>'targetPath' LIKE '%source=advice%'
          ), 0)::bigint AS "tradeSearchClicks"
        FROM visitor_analytics_hourly
        WHERE bucket_start >= now() - (${days}::int * interval '1 day')
          AND (${!filterTraffic} OR NOT coalesce((
            dimensions->>'automationHint' = 'true'
            OR (
              dimensions->>'platform' = 'Linux x86_64'
              AND (
                (dimensions->>'browser' = 'Chrome'
                  AND dimensions->>'language' LIKE 'en-US%'
                  AND dimensions->>'timezone' IN ('UTC','America/New_York','America/Chicago','America/Los_Angeles'))
                OR (coalesce(dimensions->>'os', '') NOT IN ('', 'Linux'))
              )
            )
            OR (dimensions->>'deviceType' = 'tablet'
              AND dimensions->>'touch' = 'false'
              AND dimensions->>'countryCode' = 'US'
              AND dimensions->>'timezone' IN ('America/Los_Angeles','Etc/Unknown'))
          ), false))
      `,
      sql`
        SELECT dimensions->>'path' AS path,
          coalesce(sum(event_count) FILTER (WHERE event_type = 'page_view'), 0)::bigint AS views,
          coalesce(sum(event_count) FILTER (
            WHERE event_type = 'click' AND dimensions->>'targetPath' LIKE '%source=advice%'
          ), 0)::bigint AS "nextStepClicks"
        FROM visitor_analytics_hourly
        WHERE bucket_start >= now() - (${days}::int * interval '1 day')
          AND dimensions->>'path' LIKE '/advice/%'
          AND (${!filterTraffic} OR NOT coalesce((
            dimensions->>'automationHint' = 'true'
            OR (
              dimensions->>'platform' = 'Linux x86_64'
              AND (
                (dimensions->>'browser' = 'Chrome'
                  AND dimensions->>'language' LIKE 'en-US%'
                  AND dimensions->>'timezone' IN ('UTC','America/New_York','America/Chicago','America/Los_Angeles'))
                OR (coalesce(dimensions->>'os', '') NOT IN ('', 'Linux'))
              )
            )
            OR (dimensions->>'deviceType' = 'tablet'
              AND dimensions->>'touch' = 'false'
              AND dimensions->>'countryCode' = 'US'
              AND dimensions->>'timezone' IN ('America/Los_Angeles','Etc/Unknown'))
          ), false))
        GROUP BY dimensions->>'path'
        ORDER BY views DESC, "nextStepClicks" DESC
        LIMIT 12
      `,
    ]);

    return Response.json({
      storageReady: true,
      days,
      trafficMode,
      summary: summaryRows[0] ?? {},
      topGuides: guideRows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? '');
    if (/visitor_analytics_hourly.*does not exist|relation .*visitor_analytics_hourly.*does not exist/i.test(message)) {
      return Response.json({ storageReady: false, summary: {}, topGuides: [] });
    }
    return jsonError(error);
  }
}
