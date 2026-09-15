import { createHash } from 'node:crypto';
import { z } from 'zod';
import { ensureAdminAccessInviteTable } from '@/lib/admin-access-store';
import { authenticatedUserId, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

const acceptSchema = z.object({ token: z.string().min(20).max(500) });

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

async function clerkEmails(userId: string) {
  const secret = process.env.CLERK_SECRET_KEY?.trim();
  if (!secret) throw new Error('CLERK_SECRET_KEY is not configured');
  const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${secret}`, Accept: 'application/json' },
  });
  if (!response.ok) throw new HttpError(401, 'Unable to verify the administrator account');
  const data = await response.json() as { email_addresses?: { email_address?: string }[] };
  return (data.email_addresses ?? [])
    .map((item) => item.email_address?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));
}

export async function GET(request: Request) {
  try {
    await ensureAdminAccessInviteTable();
    const token = new URL(request.url).searchParams.get('token')?.trim() ?? '';
    if (!token) return Response.json({ valid: false });
    const rows = await getSql()`
      SELECT email, expires_at AS "expiresAt"
      FROM admin_access_invites
      WHERE token_hash = ${tokenHash(token)}
        AND accepted_at IS NULL
        AND revoked_at IS NULL
        AND expires_at > now()
      LIMIT 1
    ` as unknown as { email: string; expiresAt: string }[];
    const invite = rows[0];
    return Response.json(invite ? { valid: true, ...invite } : { valid: false });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await ensureAdminAccessInviteTable();
    const { token } = acceptSchema.parse(await request.json());
    const userId = await authenticatedUserId(request);
    const hash = tokenHash(token);
    const sql = getSql();
    const pending = await sql`
      SELECT id, email
      FROM admin_access_invites
      WHERE token_hash = ${hash}
        AND accepted_at IS NULL
        AND revoked_at IS NULL
        AND expires_at > now()
      LIMIT 1
    ` as unknown as { id: string; email: string }[];
    const invite = pending[0];
    if (!invite) throw new HttpError(410, 'This administrator invitation is no longer valid');

    const normalizedEmail = invite.email.trim().toLowerCase();
    const emails = await clerkEmails(userId);
    if (!emails.includes(normalizedEmail)) {
      throw new HttpError(403, 'This administrator invitation belongs to a different email address');
    }

    await sql`
      INSERT INTO users(id, email, is_admin)
      VALUES (${userId}, ${normalizedEmail}, false)
      ON CONFLICT (id) DO NOTHING
    `;

    const claimed = await sql`
      UPDATE admin_access_invites
      SET accepted_at = now(), updated_at = now()
      WHERE id = ${invite.id}::uuid
        AND accepted_at IS NULL
        AND revoked_at IS NULL
        AND expires_at > now()
      RETURNING id
    ` as unknown as { id: string }[];
    if (!claimed.length) throw new HttpError(410, 'This administrator invitation has already been used');

    await sql`
      UPDATE users
      SET email = ${normalizedEmail}, is_admin = true,
          customer_enabled = false, trader_enabled = false, active_mode = NULL,
          updated_at = now()
      WHERE id = ${userId}
    `;
    await sql`
      UPDATE admin_access_invites
      SET accepted_user_id = ${userId}, updated_at = now()
      WHERE id = ${invite.id}::uuid
    `;

    return Response.json({ ok: true, redirectTo: '/admin' });
  } catch (error) {
    return jsonError(error);
  }
}
