import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { sendAdminInviteEmail } from '@/lib/admin-invite-email';
import { buildPairOwnerUserId, requireOwnerAdmin } from '@/lib/admin-owner';
import { HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

const createSchema = z.object({ email: z.string().trim().email().max(320) });
const revokeSchema = z.object({ inviteId: z.string().uuid() });
const removeSchema = z.object({ userId: z.string().min(1) });

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function GET(request: Request) {
  try {
    await requireOwnerAdmin(request);
    const sql = getSql();
    const [admins, invites] = await Promise.all([
      sql`
        SELECT id, email, created_at AS "createdAt"
        FROM users
        WHERE coalesce(is_admin, false) = true
          AND coalesce(is_deleted, false) = false
        ORDER BY CASE WHEN id = ${buildPairOwnerUserId()} THEN 0 ELSE 1 END, created_at ASC
      `,
      sql`
        SELECT id, email, expires_at AS "expiresAt", accepted_at AS "acceptedAt",
               revoked_at AS "revokedAt", accepted_user_id AS "acceptedUserId", created_at AS "createdAt"
        FROM admin_access_invites
        ORDER BY created_at DESC
        LIMIT 100
      `,
    ]);
    return Response.json({ admins, invites, ownerUserId: buildPairOwnerUserId() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user: owner } = await requireOwnerAdmin(request);
    const { email } = createSchema.parse(await request.json());
    const normalizedEmail = email.toLowerCase();
    const sql = getSql();

    const existingAdmin = await sql`
      SELECT id FROM users
      WHERE lower(email) = ${normalizedEmail}
        AND coalesce(is_admin, false) = true
        AND coalesce(is_deleted, false) = false
      LIMIT 1
    ` as unknown as { id: string }[];
    if (existingAdmin.length) throw new HttpError(409, 'That email already has administrator access');

    await sql`
      UPDATE admin_access_invites
      SET revoked_at = coalesce(revoked_at, now()), updated_at = now()
      WHERE lower(email) = ${normalizedEmail}
        AND accepted_at IS NULL
        AND revoked_at IS NULL
    `;

    const token = randomBytes(32).toString('base64url');
    const hash = tokenHash(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const rows = await sql`
      INSERT INTO admin_access_invites(email, token_hash, invited_by, expires_at)
      VALUES (${normalizedEmail}, ${hash}, ${owner.id}, ${expiresAt.toISOString()}::timestamptz)
      RETURNING id, email, expires_at AS "expiresAt", created_at AS "createdAt"
    ` as unknown as { id: string; email: string; expiresAt: string; createdAt: string }[];
    const invite = rows[0];
    if (!invite) throw new Error('Unable to create administrator invitation');

    try {
      const inviteUrl = await sendAdminInviteEmail({ email: normalizedEmail, token, expiresAt });
      return Response.json({ invite, inviteUrl }, { status: 201 });
    } catch (error) {
      await sql`UPDATE admin_access_invites SET revoked_at = now(), updated_at = now() WHERE id = ${invite.id}::uuid`;
      throw error;
    }
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireOwnerAdmin(request);
    const { inviteId } = revokeSchema.parse(await request.json());
    const rows = await getSql()`
      UPDATE admin_access_invites
      SET revoked_at = coalesce(revoked_at, now()), updated_at = now()
      WHERE id = ${inviteId}::uuid AND accepted_at IS NULL
      RETURNING id
    ` as unknown as { id: string }[];
    if (!rows.length) throw new HttpError(404, 'Active invitation not found');
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { user: owner } = await requireOwnerAdmin(request);
    const { userId } = removeSchema.parse(await request.json());
    if (userId === owner.id || userId === buildPairOwnerUserId()) {
      throw new HttpError(400, 'The BuildPair owner cannot remove their own administrator access');
    }
    const rows = await getSql()`
      UPDATE users
      SET is_admin = false, updated_at = now()
      WHERE id = ${userId}
        AND coalesce(is_admin, false) = true
      RETURNING id
    ` as unknown as { id: string }[];
    if (!rows.length) throw new HttpError(404, 'Administrator not found');
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
