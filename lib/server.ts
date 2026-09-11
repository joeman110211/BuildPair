import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { users } from '@/db/schema';
import { verifyBuildPairClerkSession } from '@/lib/clerk-session';
import { REGISTRATION_OPEN } from '@/lib/launch-config';
import { getSql } from '@/lib/sql';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type AccountMode = 'customer' | 'trader';

export type AccountModes = {
  customerEnabled: boolean;
  traderEnabled: boolean;
  activeMode: AccountMode | null;
};

function bootstrapAdminIds() {
  return new Set((process.env.ADMIN_CLERK_USER_IDS ?? '').split(',').map((value) => value.trim()).filter(Boolean));
}

function redactServerError(value: string) {
  return value
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, 'postgres://[redacted]@')
    .replace(/\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9_]+\b/g, '[redacted-key]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]');
}

function productionErrorId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function clerkSessionToken(request: Request) {
  const authorization = request.headers.get('authorization')?.trim();
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer) return bearer;

  const cookie = request.headers.get('cookie') ?? '';
  const encoded = cookie.match(/(?:^|;\s*)__session=([^;]+)/)?.[1];
  if (!encoded) return null;
  try { return decodeURIComponent(encoded); } catch { return encoded; }
}

export async function authenticatedUserId(request: Request) {
  const token = clerkSessionToken(request);
  if (!token) throw new HttpError(401, 'Authentication required');

  try {
    const payload = await verifyBuildPairClerkSession(token);
    if (!payload.sub) throw new HttpError(401, 'Invalid authentication token');
    return payload.sub;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.warn('[buildpair-auth] Clerk session token verification failed', {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? redactServerError(error.message) : undefined,
    });
    throw new HttpError(401, 'Invalid authentication token');
  }
}

export async function accountAccess(userId: string) {
  const rows = await getSql()`
    SELECT is_admin AS "isAdmin", is_suspended AS "isSuspended", suspension_reason AS "suspensionReason",
           coalesce(is_deleted, false) AS "isDeleted"
    FROM users WHERE id = ${userId} LIMIT 1
  ` as { isAdmin: boolean; isSuspended: boolean; suspensionReason: string; isDeleted: boolean }[];
  const row = rows[0];
  return {
    isAdmin: Boolean(row?.isAdmin || bootstrapAdminIds().has(userId)),
    isSuspended: Boolean(row?.isSuspended),
    isDeleted: Boolean(row?.isDeleted),
    suspensionReason: row?.suspensionReason ?? '',
  };
}

export async function accountModes(userId: string): Promise<AccountModes> {
  const rows = await getSql()`
    SELECT
      customer_enabled AS "customerEnabled",
      trader_enabled AS "traderEnabled",
      active_mode AS "activeMode"
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  ` as { customerEnabled: boolean; traderEnabled: boolean; activeMode: AccountMode | null }[];
  const row = rows[0];
  return {
    customerEnabled: Boolean(row?.customerEnabled),
    traderEnabled: Boolean(row?.traderEnabled),
    activeMode: row?.activeMode ?? null,
  };
}

async function assertAccountActive(userId: string) {
  const access = await accountAccess(userId);
  if (access.isDeleted) throw new HttpError(410, 'This BuildPair account has been deleted');
  if (access.isSuspended) throw new HttpError(403, access.suspensionReason ? `Account suspended: ${access.suspensionReason}` : 'Account suspended');
  return access;
}

export async function ensureDbUser(userId: string) {
  const db = getDb();
  const existing = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (existing) {
    await assertAccountActive(userId);
    return existing;
  }

  if (!REGISTRATION_OPEN && !bootstrapAdminIds().has(userId)) {
    throw new HttpError(403, 'New BuildPair registrations are paused until 1 October 2026. Join the launch waiting list to be notified when sign-up opens.');
  }

  const [created] = await db.insert(users).values({ id: userId }).onConflictDoNothing().returning();
  const user = created ?? await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new Error('Unable to synchronize user');
  await assertAccountActive(userId);
  return user;
}

export async function requireRole(request: Request, role: AccountMode) {
  const id = await authenticatedUserId(request);
  const user = await ensureDbUser(id);
  const modes = await accountModes(id);
  const enabled = role === 'customer' ? modes.customerEnabled : modes.traderEnabled;
  if (!enabled) throw new HttpError(403, `${role} account required`);
  return { ...user, ...modes };
}

export async function requireAdmin(request: Request) {
  const id = await authenticatedUserId(request);
  const user = await ensureDbUser(id);
  const access = await accountAccess(id);
  if (!access.isAdmin) throw new HttpError(403, 'Administrator access required');
  return { user, access };
}

export function jsonError(error: unknown) {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
  if (error && typeof error === 'object' && 'issues' in error) {
    return Response.json({ error: 'Invalid request', details: (error as { issues: unknown }).issues }, { status: 400 });
  }

  const errorId = productionErrorId();
  if (error instanceof Error) {
    console.error('[buildpair-api]', {
      errorId,
      name: error.name,
      message: redactServerError(error.message),
      stack: redactServerError(error.stack ?? ''),
    });
  } else {
    console.error('[buildpair-api]', { errorId, type: typeof error });
  }

  return Response.json({ error: 'Internal server error', errorId }, { status: 500 });
}
