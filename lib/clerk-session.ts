import { createPublicKey } from 'node:crypto';
import { verifyToken } from '@clerk/backend';

const JWKS_CACHE_MS = 10 * 60 * 1000;

type TokenHeader = {
  alg?: string;
  kid?: string;
};

type TokenPayload = {
  iss?: string;
  azp?: string;
};

type ClerkJwk = Record<string, string | undefined> & {
  kid?: string;
  alg?: string;
  use?: string;
  kty?: string;
};

type CachedPem = {
  pem: string;
  expiresAt: number;
};

const pemCache = new Map<string, CachedPem>();

function decodeBase64UrlJson<T>(value: string): T {
  const decoded = Buffer.from(value, 'base64url').toString('utf8');
  return JSON.parse(decoded) as T;
}

function tokenMetadata(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed Clerk session token');

  const header = decodeBase64UrlJson<TokenHeader>(parts[0]!);
  const payload = decodeBase64UrlJson<TokenPayload>(parts[1]!);
  if (header.alg !== 'RS256') throw new Error('Unexpected Clerk token algorithm');
  if (!header.kid) throw new Error('Clerk token is missing a signing key id');
  if (!payload.iss) throw new Error('Clerk token is missing an issuer');

  return { header, payload };
}

export function clerkFrontendApiFromPublishableKey(publishableKey: string) {
  const match = publishableKey.trim().match(/^pk_(?:test|live)_(.+)$/);
  if (!match?.[1]) throw new Error('Invalid Clerk publishable key');

  const decoded = Buffer.from(match[1], 'base64url').toString('utf8').replace(/\$$/, '').trim();
  if (!decoded || decoded.includes('/') || decoded.includes('\\') || decoded.includes('@')) {
    throw new Error('Invalid Clerk frontend API hostname');
  }
  return decoded;
}

function normalizedOrigin(value: string | undefined) {
  if (!value?.trim()) return null;
  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

function configuredAuthorizedParties() {
  const origins = new Set<string>();
  for (const value of [
    process.env.APP_URL,
    process.env.EXPO_PUBLIC_API_URL,
    process.env.BUILDPAIR_PUBLIC_ORIGIN,
    'https://staging.buildpair.co.uk',
    'https://www.buildpair.co.uk',
    'https://buildpair.co.uk',
  ]) {
    const origin = normalizedOrigin(value);
    if (origin) origins.add(origin);
  }
  return [...origins];
}

async function pemForSessionToken(token: string, publishableKey: string) {
  const { header, payload } = tokenMetadata(token);
  const frontendApi = clerkFrontendApiFromPublishableKey(publishableKey);
  const expectedIssuer = `https://${frontendApi}`;
  const actualIssuer = payload.iss!.replace(/\/$/, '');
  if (actualIssuer !== expectedIssuer) throw new Error('Clerk token issuer does not match the configured BuildPair instance');

  const authorizedParties = configuredAuthorizedParties();
  if (payload.azp && !authorizedParties.includes(payload.azp)) {
    throw new Error('Clerk token authorized party is not permitted for BuildPair');
  }

  const cacheKey = `${expectedIssuer}:${header.kid}`;
  const cached = pemCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { pem: cached.pem, authorizedParties: payload.azp ? authorizedParties : undefined };
  }

  const response = await fetch(`${expectedIssuer}/.well-known/jwks.json`, {
    signal: AbortSignal.timeout(5000),
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Unable to load Clerk signing keys: HTTP ${response.status}`);

  const body = await response.json() as { keys?: ClerkJwk[] };
  const jwk = body.keys?.find((candidate) => candidate.kid === header.kid && candidate.kty === 'RSA');
  if (!jwk) throw new Error('Clerk signing key was not found');

  const key = createPublicKey({ key: jwk, format: 'jwk' });
  const exported = key.export({ type: 'spki', format: 'pem' });
  const pem = typeof exported === 'string' ? exported : exported.toString('utf8');
  pemCache.set(cacheKey, { pem, expiresAt: Date.now() + JWKS_CACHE_MS });

  return { pem, authorizedParties: payload.azp ? authorizedParties : undefined };
}

function withBuildPairUserId<T extends { sub?: string | null }>(payload: T) {
  const claimedUserId = (payload as T & { userId?: unknown }).userId;
  if (typeof claimedUserId === 'string' && claimedUserId.trim()) {
    return { ...payload, sub: claimedUserId.trim() };
  }
  return payload;
}

export async function verifyBuildPairClerkSession(token: string) {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  if (!secretKey) throw new Error('CLERK_SECRET_KEY is not configured');
  if (!publishableKey) throw new Error('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not configured');

  try {
    return withBuildPairUserId(await verifyToken(token, { secretKey }));
  } catch (primaryError) {
    const { pem, authorizedParties } = await pemForSessionToken(token, publishableKey);
    try {
      return withBuildPairUserId(await verifyToken(token, {
        jwtKey: pem,
        authorizedParties,
      }));
    } catch (fallbackError) {
      const primaryName = primaryError instanceof Error ? primaryError.name : typeof primaryError;
      const fallbackName = fallbackError instanceof Error ? fallbackError.name : typeof fallbackError;
      throw new Error(`Clerk session verification failed (${primaryName}; ${fallbackName})`);
    }
  }
}
