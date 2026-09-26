import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
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
  sourceParam: text(150),
  referralCode: text(40),
}).default({});

const eventSchema = z.object({
  action: z.literal('event').default('event'),
  mode: z.enum(['aggregate', 'detailed', 'anonymous']),
  eventType: z.enum(['visit_start', 'page_view', 'click', 'scroll', 'page_time', 'form_interaction', 'form_submit', 'heartbeat']),
  path: text(500),
  target: text(200),
  targetPath: text(500),
  value: z.number().finite().min(0).max(86400).optional().nullable(),
  device: clientInfoSchema,
  acquisition: acquisitionSchema,
  sessionId: z.string().uuid().optional().nullable(),
  visitorId: z.string().uuid().optional().nullable(),
  firstSeenAt: z.string().datetime().optional().nullable(),
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

type CoarseGeo = {
  country: string;
  countryCode: string;
  region: string;
  regionCode: string;
  city: string;
  timezone: string;
  source: string;
};

const GEO_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const GEO_CACHE_MAX = 2048;
const geoCache = new Map<string, { expiresAt: number; geo: CoarseGeo }>();

function edgeGeo(request: Request): CoarseGeo {
  const headers = request.headers;
  const countryCode = safe(headers.get('cf-ipcountry') || headers.get('x-vercel-ip-country') || headers.get('x-country-code'), 10);
  return {
    country: safe(headers.get('cf-country') || headers.get('x-country'), 80),
    countryCode,
    region: safe(headers.get('cf-region') || headers.get('x-vercel-ip-country-region') || headers.get('x-region'), 100),
    regionCode: safe(headers.get('cf-region-code') || headers.get('x-region-code'), 30),
    city: safe(headers.get('cf-ipcity') || headers.get('x-vercel-ip-city') || headers.get('x-city'), 120),
    timezone: safe(headers.get('cf-timezone') || headers.get('x-timezone'), 100),
    source: 'edge',
  };
}

function isPublicAddress(value: string) {
  if (!isIP(value)) return false;
  const lower = value.toLowerCase();
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80:')) return false;
  if (!value.includes(':')) {
    const parts = value.split('.').map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
    if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) return false;
    if (parts[0] === 169 && parts[1] === 254) return false;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
    if (parts[0] === 192 && parts[1] === 168) return false;
  }
  return true;
}

function requestIp(request: Request) {
  const direct = safe(request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip'), 80);
  if (isPublicAddress(direct)) return direct;

  const forwarded = String(request.headers.get('x-forwarded-for') || '');
  for (const candidate of forwarded.split(',').map((value) => value.trim())) {
    if (isPublicAddress(candidate)) return candidate;
  }
  return '';
}

function cachedGeo(key: string) {
  const cached = geoCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    geoCache.delete(key);
    return null;
  }
  return cached.geo;
}

function rememberGeo(key: string, geo: CoarseGeo) {
  if (geoCache.size >= GEO_CACHE_MAX) {
    const oldestKey = geoCache.keys().next().value as string | undefined;
    if (oldestKey) geoCache.delete(oldestKey);
  }
  geoCache.set(key, { expiresAt: Date.now() + GEO_CACHE_TTL_MS, geo });
}

async function coarseGeoForRequest(request: Request): Promise<CoarseGeo> {
  const edge = edgeGeo(request);
  if (edge.city && (edge.country || edge.countryCode)) return edge;

  const ip = requestIp(request);
  if (!ip) return edge;

  const cacheKey = createHash('sha256').update(ip).digest('hex');
  const cached = cachedGeo(cacheKey);
  if (cached) return {
    ...cached,
    country: edge.country || cached.country,
    countryCode: edge.countryCode || cached.countryCode,
    region: edge.region || cached.region,
    regionCode: edge.regionCode || cached.regionCode,
    city: edge.city || cached.city,
    timezone: edge.timezone || cached.timezone,
  };

  try {
    const endpoint = `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,country_code,region,region_code,city,timezone.id`;
    const response = await fetch(endpoint, {
      headers: { Accept: 'application/json', 'User-Agent': 'BuildPair visitor analytics' },
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return edge;
    const data = await response.json() as {
      success?: boolean;
      country?: string;
      country_code?: string;
      region?: string;
      region_code?: string;
      city?: string;
      timezone?: { id?: string };
    };
    if (data.success === false) return edge;

    const lookup: CoarseGeo = {
      country: safe(data.country, 80),
      countryCode: safe(data.country_code, 10),
      region: safe(data.region, 100),
      regionCode: safe(data.region_code, 30),
      city: safe(data.city, 120),
      timezone: safe(data.timezone?.id, 100),
      source: 'ipwhois',
    };
    rememberGeo(cacheKey, lookup);
    return {
      ...lookup,
      country: edge.country || lookup.country,
      countryCode: edge.countryCode || lookup.countryCode,
      region: edge.region || lookup.region,
      regionCode: edge.regionCode || lookup.regionCode,
      city: edge.city || lookup.city,
      timezone: edge.timezone || lookup.timezone,
      source: edge.city ? 'edge' : 'ipwhois',
    };
  } catch {
    return edge;
  }
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

    const geo = await coarseGeoForRequest(request);
    const dimensions = {
      path: safe(payload.path, 500),
      target: safe(payload.target, 200),
      targetPath: safe(payload.targetPath, 500),
      referrerHost: safe(payload.acquisition.referrerHost, 200),
      utmSource: safe(payload.acquisition.utmSource, 150),
      utmMedium: safe(payload.acquisition.utmMedium, 150),
      utmCampaign: safe(payload.acquisition.utmCampaign, 200),
      utmContent: safe(payload.acquisition.utmContent, 200),
      utmTerm: safe(payload.acquisition.utmTerm, 200),
      sourceParam: safe(payload.acquisition.sourceParam, 150),
      referralCode: safe(payload.acquisition.referralCode, 40),
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
      country: geo.country,
      countryCode: geo.countryCode,
      region: geo.region,
      regionCode: geo.regionCode,
      city: geo.city,
      geoTimezone: geo.timezone,
      locationSource: geo.source,
    };

    const sessionTracked = payload.mode !== 'aggregate';
    if (sessionTracked) {
      const firstSeenAt = payload.firstSeenAt || payload.consentedAt;
      if (!payload.sessionId || !payload.visitorId || !firstSeenAt) {
        return Response.json({ error: 'Anonymous session analytics requires visitor and session identifiers' }, { status: 400 });
      }
      const firstSeen = new Date(firstSeenAt);
      if (Number.isNaN(firstSeen.getTime()) || firstSeen.getTime() > Date.now() + 60_000) {
        return Response.json({ error: 'Invalid anonymous visitor timestamp' }, { status: 400 });
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
        sourceParam: safe(payload.acquisition.sourceParam, 150),
        referralCode: safe(payload.acquisition.referralCode, 40),
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

      // The existing consented_at column is retained for database compatibility;
      // for anonymous analytics it stores when this anonymous browser identifier
      // was first created, not a claim that a consent prompt was shown.
      await sql`
        INSERT INTO visitor_sessions(id, visitor_id, consented_at, landing_path, last_path, referrer_host, acquisition, device, geo)
        VALUES (${payload.sessionId}::uuid, ${payload.visitorId}::uuid, ${firstSeenAt}::timestamptz,
          ${dimensions.path}, ${dimensions.path}, ${acquisition.referrerHost}, ${JSON.stringify(acquisition)}::jsonb,
          ${JSON.stringify(device)}::jsonb, ${JSON.stringify(geo)}::jsonb)
        ON CONFLICT (id) DO UPDATE SET
          last_seen_at = now(),
          last_path = EXCLUDED.last_path,
          device = EXCLUDED.device,
          geo = EXCLUDED.geo
      `;
    }

    // Heartbeats exist only to make the live visitor count accurate. Keeping
    // them out of aggregate/event tables prevents a quiet page from producing
    // thousands of meaningless analytics rows.
    if (payload.eventType === 'heartbeat') {
      return Response.json({ accepted: true });
    }

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

    if (sessionTracked && payload.sessionId) {
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
