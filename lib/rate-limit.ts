import { createHash } from 'node:crypto';
import { HttpError } from '@/lib/server';
import { getSql } from '@/lib/sql';

function stableHash(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

function fingerprint(request: Request, scope: string, userId?: string | null) {
  if (userId) {
    // An authenticated user must not be able to evade limits by rotating
    // User-Agent or forwarding headers. Identity is the stable abuse boundary.
    return `${scope}:user:${stableHash(userId)}`;
  }

  // Anonymous/public limits deliberately use the network identity only. Including
  // User-Agent here would let a bot create a fresh bucket simply by changing one
  // header while staying on the same connection/IP.
  const realIp = request.headers.get('x-real-ip')?.trim() ?? '';
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const sourceIp = realIp || forwarded || 'unknown';
  return `${scope}:anon:${stableHash(sourceIp)}`;
}

async function incrementBucket(bucketKey: string, limit: number, windowSeconds: number) {
  const sql = getSql();
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs).toISOString();

  const rows = await sql`
    INSERT INTO api_rate_limits(bucket_key, window_start, request_count)
    VALUES (${bucketKey}, ${windowStart}::timestamptz, 1)
    ON CONFLICT (bucket_key, window_start)
    DO UPDATE SET request_count = api_rate_limits.request_count + 1
    RETURNING request_count AS "requestCount"
  ` as unknown as { requestCount: number }[];

  const count = Number(rows[0]?.requestCount ?? 1);
  if (count > limit) throw new HttpError(429, 'Too many requests. Please try again shortly.');

  // Opportunistic cleanup keeps the table small without requiring another service.
  if (Math.random() < 0.01) {
    void sql`DELETE FROM api_rate_limits WHERE window_start < now() - interval '2 days'`.catch(() => undefined);
  }

  return { remaining: Math.max(0, limit - count), limit, windowSeconds, count };
}

export async function assertRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowSeconds: number,
  userId?: string | null,
) {
  return incrementBucket(fingerprint(request, scope, userId), limit, windowSeconds);
}

export async function assertGlobalRateLimit(scope: string, limit: number, windowSeconds: number) {
  // One fixed bucket across every visitor/account. This is intended for expensive
  // shared resources such as paid AI provider calls, not ordinary endpoint limits.
  return incrementBucket(`${scope}:global`, limit, windowSeconds);
}
