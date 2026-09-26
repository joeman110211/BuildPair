import { buildCalendarFeed } from '@/lib/calendar-feed';
import { getSql } from '@/lib/sql';
import { loadTraderCalendar } from '@/lib/trader-calendar';

function baseUrl() {
  return (process.env.APP_URL || 'https://www.buildpair.co.uk').replace(/\/$/, '');
}

export async function GET(_request: Request, { token }: { token: string }) {
  if (!token || token.length < 40) return new Response('Calendar not found', { status: 404 });
  try {
    const rows = await getSql()`
      SELECT trader_id AS "traderId", enabled
      FROM trader_calendar_feeds
      WHERE token = ${token}
      LIMIT 1
    ` as unknown as { traderId: string; enabled: boolean }[];
    const feed = rows[0];
    if (!feed?.enabled) return new Response('Calendar not found', { status: 404 });
    const calendar = await loadTraderCalendar(feed.traderId);
    const body = buildCalendarFeed(calendar.events, baseUrl());
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="buildpair-calendar.ics"',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    return new Response('Calendar unavailable', { status: 404 });
  }
}
