import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { users } from '@/db/schema';
import { verifyBuildPairClerkSession } from '@/lib/clerk-session';
import { ensureEarlyAccessInviteTable } from '@/lib/early-access-store';
import { REGISTRATION_OPEN, TRADER_PRELAUNCH_REGISTRATION_OPEN } from '@/lib/launch-config';
import { getSql } from '@/lib/sql';
import { ensureLaunchWaitlistTable } from '@/lib/waitlist-store';
import { sendWelcomeEmailOnce } from '@/lib/transactional-email';

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

type ClerkSignupIdentity = {
  email: string | null;
  name: string | null;
  mode: AccountMode | null;
  acquisitionSource: string | null;
  referralCode: string | null;
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

function metadataString(metadata: Record<string, unknown> | null | undefined, key: string, maxLength: number) {
  const value = metadata?.[key];
  return typeof value === 'string' ? value.trim().slice(0, maxLength) || null : null;
}

async function clerkSignupIdentity(userId: string): Promise<ClerkSignupIdentity> {
  const secret = process.env.CLERK_SECRET_KEY?.trim();
  if (!secret) return { email: null, name: null, mode: null, acquisitionSource: null, referralCode: null };
  try {
    const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${secret}`, Accept: 'application/json' },
    });
    if (!response.ok) return { email: null, name: null, mode: null };
    const data = await response.json() as {
      primary_email_address_id?: string | null;
      email_addresses?: { id: string; email_address: string }[];
      first_name?: string | null;
      last_name?: string | null;
      unsafe_metadata?: Record<string, unknown> | null;
      public_metadata?: Record<string, unknown> | null;
    };
    const primary = data.email_addresses?.find((item) => item.id === data.primary_email_address_id)
      ?? data.email_addresses?.[0];
    const rawMode = data.unsafe_metadata?.buildpairMode ?? data.public_metadata?.buildpairMode;
    const mode: AccountMode | null = rawMode === 'customer' || rawMode === 'trader' ? rawMode : null;
    const name = [data.first_name, data.last_name].filter(Boolean).join(' ').trim() || null;
    const acquisitionSource = metadataString(data.unsafe_metadata, 'buildpairAcquisitionSource', 80)
      ?? metadataString(data.public_metadata, 'buildpairAcquisitionSource', 80);
    const referralCode = (
      metadataString(data.unsafe_metadata, 'buildpairReferralCode', 24)
      ?? metadataString(data.public_metadata, 'buildpairReferralCode', 24)
    )?.toUpperCase() ?? null;
    return {
      email: primary?.email_address?.trim().toLowerCase() || null,
      name,
      mode,
      acquisitionSource,
      referralCode,
    };
  } catch {
    return { email: null, name: null, mode: null, acquisitionSource: null, referralCode: null };
  }
}

async function activeEarlyAccessEmail(email: string | null) {
  if (!email) return null;
  await ensureEarlyAccessInviteTable();
  const rows = await getSql()`
    SELECT id
    FROM early_access_invites
    WHERE lower(email) = lower(${email})
      AND revoked_at IS NULL
      AND used_at IS NULL
    LIMIT 1
  ` as unknown as { id: string }[];
  return rows.length ? email : null;
}

async function recordPrelaunchTraderRegistration(userId: string, identity: ClerkSignupIdentity) {
  if (!identity.email) return;

  await ensureLaunchWaitlistTable();
  const sql = getSql();
  const referrerRows = identity.referralCode ? await sql`
    SELECT id
    FROM launch_waitlist
    WHERE upper(referral_code) = ${identity.referralCode}
      AND status <> 'removed'
    LIMIT 1
  ` as unknown as { id: string }[] : [];
  const referredById = referrerRows[0]?.id ?? null;
  const source = identity.acquisitionSource || 'founding-trade-signup';

  await sql`
    INSERT INTO launch_waitlist (
      name, email, phone, postcode, audience, trade, tester_interest,
      sms_opt_in, marketing_opt_in, preferred_contact, source,
      referral_code, referred_by_id, status, registered_user_id, registered_at
    )
    VALUES (
      ${identity.name || ''}, ${identity.email}, NULL, '', 'trader', NULL, true,
      false, false, 'email', ${source},
      'BP' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
      ${referredById}::uuid, 'registered', ${userId}, now()
    )
    ON CONFLICT (email) DO UPDATE SET
      audience = 'trader',
      tester_interest = true,
      source = ${source},
      status = 'registered',
      registered_user_id = ${userId},
      registered_at = coalesce(launch_waitlist.registered_at, now()),
      referred_by_id = CASE
        WHEN ${referredById}::uuid IS NULL OR launch_waitlist.id = ${referredById}::uuid
          THEN launch_waitlist.referred_by_id
        ELSE coalesce(launch_waitlist.referred_by_id, ${referredById}::uuid)
      END,
      updated_at = now()
  `;

  await ensureEarlyAccessInviteTable();
  await sql`
    UPDATE early_access_invites
    SET used_at = coalesce(used_at, now()), updated_at = now()
    WHERE lower(email) = lower(${identity.email})
      AND revoked_at IS NULL
  `;
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

  const identity = await clerkSignupIdentity(userId);
  const prelaunchTraderAllowed = !REGISTRATION_OPEN
    && TRADER_PRELAUNCH_REGISTRATION_OPEN
    && identity.mode === 'trader';
  let earlyAccessEmail: string | null = null;
  if (!REGISTRATION_OPEN && !bootstrapAdminIds().has(userId) && !prelaunchTraderAllowed) {
    earlyAccessEmail = await activeEarlyAccessEmail(identity.email);
    if (!earlyAccessEmail) {
      throw new HttpError(403, 'New homeowner registrations are paused until launch. Surrey tradespeople can create a launch-ready profile now.');
    }
  }

  const [created] = await db.insert(users).values({ id: userId, email: identity.email }).onConflictDoNothing().returning();
  const user = created ?? await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new Error('Unable to synchronize user');

  if (prelaunchTraderAllowed) {
    await recordPrelaunchTraderRegistration(userId, identity);
  }

  if (earlyAccessEmail) {
    const sql = getSql();
    await sql`UPDATE users SET email = coalesce(email, ${earlyAccessEmail}), updated_at = now() WHERE id = ${userId}`;
    const inviteRows = await sql`
      UPDATE early_access_invites
      SET used_at = coalesce(used_at, now()), updated_at = now()
      WHERE lower(email) = lower(${earlyAccessEmail})
        AND revoked_at IS NULL
      RETURNING waitlist_id AS "waitlistId"
    ` as unknown as { waitlistId: string | null }[];
    const waitlistId = inviteRows[0]?.waitlistId;
    if (waitlistId) {
      await sql`
        UPDATE launch_waitlist
        SET status = 'registered', registered_user_id = ${userId}, registered_at = coalesce(registered_at, now()), updated_at = now()
        WHERE id = ${waitlistId}::uuid
      `;
    }
  }

  if (created && identity.email) {
    try {
      await sendWelcomeEmailOnce({
        userId,
        email: identity.email,
        name: identity.name,
        mode: identity.mode ?? (earlyAccessEmail ? 'trader' : null),
      });
    } catch (error) {
      console.error('[welcome-email]', error instanceof Error ? redactServerError(error.message) : typeof error);
    }
  }

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
