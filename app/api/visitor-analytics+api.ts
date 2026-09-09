import { createHash } from 'node:crypto';
import { z } from 'zod';
import { getSql } from '@/lib/sql';

const text = (max: number) => z.string().trim().max(max).optional().nullable();
const clientInfoSchema = z.object({
  deviceType: text(40),
  browser: text(80),
  os: text(80),
  platform: text(80),
  language: text(40),
  timezone: text(100),
  viewport: text(40),
  screen: text(40),
  connection: text(40),
  touch: z.boolean().optional(),
}).default({});
const acquisitionSchema = z.object({
  referrerHost: text(200),
  utmSource: text(150),
  utmMedium: text(150),
  utmCampaign: text(200),
  utmContent: text(200),
  utmTerm: text(200),
}).default({});

const eventSchema = z.object({
  action: z.literal('event').default('event'),
  mode: z.enum(['aggregate', 'detailed']),
  eventType: z.enum(['page_view', 'click', 'scroll', 'page_time', 'form_interaction', 'form_submit']),
  path: text(500),
  target: text(200),
  targetPath: text(500),
  value: z.number().finite().min(0).max(86400).optional().nullable(),
  device: clientInfoSchema,
  acquisition: acquisitionSchema,
  sessionId: z.string().uuid().optional().nullable(),
  visitorId: z.string().uuid().optional().nullable(),
  consentedAt: z.string().datetime().optional().nullable(),
  details: z.record(z.string(), z.union([z.string().max(300), z.number().finite(), z.boolean(), z.null()])).default({}),
});

const convertSchema = z.object({
  action: z.literal('convert'),
  sessionId: z.string().uuid(),
  conversionType: z.enum(['signup', 'signin']).default('signup'),
});

const withdrawSchema = z.object({
  action: z.literal('withdraw'),
  visitorId: z.string().uuid(),
});

const requestSchema = z.discriminatedUnion('action', [eventSchema, convertSchema, withdrawSchema]);

type JsonMap = Record<string, string | number | boolean | null>;

function safe(value: unknown, max = 200) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '';
}

function geoFromHeaders(request: Request) {
  const headers = request.headers;
  return {
    country: safe(headers.get('cf-ipcountry') || headers.get('x-vercel-ip-country') || headers.get('x-country-code'), 80),
    region: safe(headers.get('x-vercel-ip-country-region') || headers.get('x-region') || headers.get('x-region-code'), 100),
    city: safe(headers.get('x-vercel-ip-city') || headers.get('x-city'), 120),
  };
}

function normaliseDetails(input: JsonMap) {
  const output: JsonMap = {};
  for (const [key, value] of Object.entries(input).slice(0, 20)) {
    const cleanKey = safe(key, 80);
    if (!cleanKey) continue;
    output[cleanKey] = typeof value === 'string' ? safe(value, 300) : value;
  }
  return output;
}

function missingAnalyticsStorage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /visitor_(analytics_hourly|sessions|session_events).*does not exist|relation .*visitor_.* does not exist/i.test(message);
}

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const sql = getSql();

    if (payload.action === 'withdraw') {
      await sql`DELETE FROM visitor_sessions WHERE visitor_id = ${payload.visitorId}::uuid`;
      return Response.json({ accepted: true, detailedRecordsDeleted: true });
    }

    if (payload.action === 'convert') {
      await sql`
        UPDATE visitor_sessions
        SET converted = true, converted_at = coalesce(converted_at, now()), last_seen_at = now()
        WHERE id = ${payload.sessionId}::uuid
      `;
      await sql`
        INSERT INTO visitor_session_events(session_id, event_type, path, target, details)
        SELECT id, 'conversion', last_path, ${payload.conversionType}, ${JSON.stringify({ conversionType: payload.conversionType })}::jsonb
        FROM visitor_sessions WHERE id = ${payload.sessionId}::uuid
      `;
      return Response.json({ accepted: true });
    }

    const geo = geoFromHeaders(request);
    const dimensions = {
      path: safe(payload.path, 500),
      target: safe(payload.target, 200),
      targetPath: safe(payload.targetPath, 500),
      referrerHost: safe(payload.acquisition.referrerHost, 200),
      utmSource: safe(payload.acquisition.utmSource, 150),
      utmMedium: safe(payload.acquisition.utmMedium, 150),
      utmCampaign: safe(payload.acquisition.utmCampaign, 200),
      deviceType: safe(payload.device.deviceType, 40),
      browser: safe(payload.device.browser, 80),
      os: safe(payload.device.os, 80),
      platform: safe(payload.device.platform, 80),
      language: safe(payload.device.language, 40),
      timezone: safe(payload.device.timezone, 100),
      viewport: safe(payload.device.viewport, 40),
      screen: safe(payload.device.screen, 40),
      connection: safe(payload.device.connection, 40),
      country: geo.country,
      region: geo.region,
      city: geo.city,
    };
    const dimensionKey = createHash('sha256').update(JSON.stringify(dimensions)).digest('hex').slice(0, 40);
    const value = payload.value ?? 0;

    await sql`
      INSERT INTO visitor_analytics_hourly(bucket_start, event_type, dimension_key, dimensions, event_count, total_value, max_value)
      VALUES (date_trunc('hour', now()), ${payload.eventType}, ${dimensionKey}, ${JSON.stringify(dimensions)}::jsonb, 1, ${value}, ${payload.value ?? null})
      ON CONFLICT (bucket_start, event_type, dimension_key)
      DO UPDATE SET
        event_count = visitor_analytics_hourly.event_count + 1,
        total_value = visitor_analytics_hourly.total_value + EXCLUDED.total_value,
        max_value = CASE
          WHEN EXCLUDED.max_value IS NULL THEN visitor_analytics_hourly.max_value
          WHEN visitor_analytics_hourly.max_value IS NULL THEN EXCLUDED.max_value
          ELSE greatest(visitor_analytics_hourly.max_value, EXCLUDED.max_value)
        END
    `;

    if (payload.mode === 'detailed') {
      if (!payload.sessionId || !payload.visitorId || !payload.consentedAt) {
        return Response.json({ error: 'Detailed analytics requires explicit consent and session identifiers' }, { status: 400 });
      }
      const consentedAt = new Date(payload.consentedAt);
      if (Number.isNaN(consentedAt.getTime()) || consentedAt.getTime() > Date.now() + 60_000) {
        return Response.json({ error: 'Invalid analytics consent timestamp' }, { status: 400 });
      }

      if (payload.eventType === 'page_view') {
        await sql`DELETE FROM visitor_sessions WHERE last_seen_at < now() - interval '90 days'`;
      }

      const acquisition = {
        referrerHost: safe(payload.acquisition.referrerHost, 200),
        utmSource: safe(payload.acquisition.utmSource, 150),
        utmMedium: safe(payload.acquisition.utmMedium, 150),
        utmCampaign: safe(payload.acquisition.utmCampaign, 200),
        utmContent: safe(payload.acquisition.utmContent, 200),
        utmTerm: safe(payload.acquisition.utmTerm, 200),
      };
      const device = {
        deviceType: safe(payload.device.deviceType, 40),
        browser: safe(payload.device.browser, 80),
        os: safe(payload.device.os, 80),
        platform: safe(payload.device.platform, 80),
        language: safe(payload.device.language, 40),
        timezone: safe(payload.device.timezone, 100),
        viewport: safe(payload.device.viewport, 40),
        screen: safe(payload.device.screen, 40),
        connection: safe(payload.device.connection, 40),
        touch: Boolean(payload.device.touch),
      };

      await sql`
        INSERT INTO visitor_sessions(id, visitor_id, consented_at, landing_path, last_path, referrer_host, acquisition, device, geo)
        VALUES (${payload.sessionId}::uuid, ${payload.visitorId}::uuid, ${payload.consentedAt}::timestamptz,
          ${dimensions.path}, ${dimensions.path}, ${acquisition.referrerHost}, ${JSON.stringify(acquisition)}::jsonb,
          ${JSON.stringify(device)}::jsonb, ${JSON.stringify(geo)}::jsonb)
        ON CONFLICT (id) DO UPDATE SET
          last_seen_at = now(),
          last_path = EXCLUDED.last_path,
          device = EXCLUDED.device,
          geo = EXCLUDED.geo
      `;

      await sql`
        INSERT INTO visitor_session_events(session_id, event_type, path, target, value, details)
        VALUES (${payload.sessionId}::uuid, ${payload.eventType}, ${dimensions.path}, ${dimensions.target}, ${payload.value ?? null}, ${JSON.stringify({ ...normaliseDetails(payload.details), targetPath: dimensions.targetPath })}::jsonb)
      `;
    }

    return Response.json({ accepted: true });
  } catch (error) {
    if (missingAnalyticsStorage(error)) return Response.json({ accepted: false, storageReady: false }, { status: 202 });
    if (error && typeof error === 'object' && 'issues' in error) return Response.json({ error: 'Invalid analytics event' }, { status: 400 });
    console.error('[visitor-analytics]', error instanceof Error ? error.message : String(error));
    return Response.json({ error: 'Analytics event could not be recorded' }, { status: 500 });
  }
}
