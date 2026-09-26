import { randomUUID } from 'node:crypto';
import { jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { loadTraderCalendar } from '@/lib/trader-calendar';

function baseUrl() {
  return (process.env.APP_URL || 'https://www.buildpair.co.uk').replace(/\/$/, '');
}

function tokenValue() {
  return `${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '')}`;
}

async function ensureFeed(traderId: string) {
  await loadTraderCalendar(traderId);
  let rows = await getSql()`
    SELECT token, enabled FROM trader_calendar_feeds WHERE trader_id = ${traderId} LIMIT 1
  ` as unknown as { token: string; enabled: boolean }[];
  if (!rows.length) {
    const token = tokenValue();
    rows = await getSql()`
      INSERT INTO trader_calendar_feeds(trader_id, token, enabled)
      VALUES (${traderId}, ${token}, true)
      ON CONFLICT (trader_id) DO UPDATE SET enabled = true, updated_at = now()
      RETURNING token, enabled
    ` as unknown as { token: string; enabled: boolean }[];
  }
  return rows[0]!;
}

function response(row: { token: string; enabled: boolean }) {
  const feedUrl = `${baseUrl()}/api/public/calendar/${row.token}`;
  return {
    enabled: row.enabled,
    feedUrl,
    webcalUrl: feedUrl.replace(/^https:/, 'webcal:').replace(/^http:/, 'webcal:'),
    googleUrl: `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(feedUrl)}`,
  };
}

export async function GET(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    return Response.json(response(await ensureFeed(trader.id)));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    await loadTraderCalendar(trader.id);
    const body = await request.json().catch(() => ({})) as { action?: 'reset' | 'enable' | 'disable' };
    const action = body.action ?? 'enable';

    if (action === 'reset') {
      const token = tokenValue();
      const rows = await getSql()`
        INSERT INTO trader_calendar_feeds(trader_id, token, enabled)
        VALUES (${trader.id}, ${token}, true)
        ON CONFLICT (trader_id) DO UPDATE SET token = EXCLUDED.token, enabled = true, updated_at = now()
        RETURNING token, enabled
      ` as unknown as { token: string; enabled: boolean }[];
      return Response.json(response(rows[0]!));
    }

    const enabled = action !== 'disable';
    const current = await ensureFeed(trader.id);
    const rows = await getSql()`
      UPDATE trader_calendar_feeds
      SET enabled = ${enabled}, updated_at = now()
      WHERE trader_id = ${trader.id}
      RETURNING token, enabled
    ` as unknown as { token: string; enabled: boolean }[];
    return Response.json(response(rows[0] ?? { ...current, enabled }));
  } catch (error) {
    return jsonError(error);
  }
}
