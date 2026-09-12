import { ensureEarlyAccessInviteTable, hashEarlyAccessToken } from '@/lib/early-access-store';
import { getSql } from '@/lib/sql';

function inviteToken(request: Request) {
  return new URL(request.url).searchParams.get('invite')?.trim() ?? '';
}

function maskPhone(phone: string | null) {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 4 ? `•••• ${digits.slice(-4)}` : 'your mobile';
}

export async function GET(request: Request) {
  const token = inviteToken(request);
  if (!token) return Response.json({ valid: false }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

  try {
    await ensureEarlyAccessInviteTable();
    const sql = getSql();
    const tokenHash = hashEarlyAccessToken(token);
    const rows = await sql`
      SELECT id, email, phone, audience, revoked_at AS "revokedAt", used_at AS "usedAt"
      FROM early_access_invites
      WHERE token_hash = ${tokenHash}
      LIMIT 1
    ` as unknown as { id: string; email: string | null; phone: string | null; audience: 'homeowner' | 'trader'; revokedAt: string | null; usedAt: string | null }[];
    const invite = rows[0];
    if (!invite || invite.revokedAt) {
      return Response.json({ valid: false }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }

    const users = invite.email ? await sql`
      SELECT id
      FROM users
      WHERE lower(coalesce(email, '')) = lower(${invite.email})
        AND coalesce(is_deleted, false) = false
      LIMIT 1
    ` as unknown as { id: string }[] : [];

    if (invite.usedAt || users.length) {
      if (!invite.usedAt) await sql`UPDATE early_access_invites SET used_at = now(), updated_at = now() WHERE id = ${invite.id}::uuid`;
      return Response.json({ valid: false, claimed: true, email: invite.email ?? undefined, phoneHint: maskPhone(invite.phone), mode: invite.audience }, {
        status: 410,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    return Response.json({ valid: true, claimed: false, email: invite.email ?? undefined, needsEmail: !invite.email, phoneHint: maskPhone(invite.phone), mode: invite.audience }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ valid: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { invite?: string; email?: string };
    const token = body.invite?.trim() ?? '';
    const email = body.email?.trim().toLowerCase() ?? '';
    if (!token || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Enter a valid email address.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    await ensureEarlyAccessInviteTable();
    const sql = getSql();
    const tokenHash = hashEarlyAccessToken(token);
    const rows = await sql`
      SELECT id, waitlist_id AS "waitlistId", email, revoked_at AS "revokedAt", used_at AS "usedAt", audience
      FROM early_access_invites
      WHERE token_hash = ${tokenHash}
      LIMIT 1
    ` as unknown as { id: string; waitlistId: string | null; email: string | null; revokedAt: string | null; usedAt: string | null; audience: 'homeowner' | 'trader' }[];
    const invite = rows[0];
    if (!invite || invite.revokedAt || invite.usedAt) {
      return Response.json({ error: 'This early-access invite is no longer available.' }, { status: 410, headers: { 'Cache-Control': 'no-store' } });
    }
    if (invite.email && invite.email.toLowerCase() !== email) {
      return Response.json({ error: 'This invitation is already tied to a different email address.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }

    const existingUser = await sql`
      SELECT id FROM users
      WHERE lower(coalesce(email, '')) = lower(${email}) AND coalesce(is_deleted, false) = false
      LIMIT 1
    ` as unknown as { id: string }[];
    if (existingUser.length) {
      return Response.json({ error: 'That email already has a BuildPair account. Sign in instead.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }

    const otherInvite = await sql`
      SELECT id FROM early_access_invites
      WHERE lower(coalesce(email, '')) = lower(${email}) AND id <> ${invite.id}::uuid AND revoked_at IS NULL
      LIMIT 1
    ` as unknown as { id: string }[];
    if (otherInvite.length) {
      return Response.json({ error: 'That email is already linked to another early-access invitation.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }

    if (invite.waitlistId) {
      const otherWaitlist = await sql`
        SELECT id FROM launch_waitlist
        WHERE lower(coalesce(email, '')) = lower(${email}) AND id <> ${invite.waitlistId}::uuid AND status <> 'removed'
        LIMIT 1
      ` as unknown as { id: string }[];
      if (otherWaitlist.length) {
        return Response.json({ error: 'That email is already on the launch list. Contact info@buildpair.co.uk so we can merge the entries safely.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
      }
    }

    await sql`UPDATE early_access_invites SET email = ${email}, updated_at = now() WHERE id = ${invite.id}::uuid`;
    if (invite.waitlistId) {
      await sql`UPDATE launch_waitlist SET email = ${email}, updated_at = now() WHERE id = ${invite.waitlistId}::uuid AND (email IS NULL OR email = '')`;
    }

    return Response.json({ valid: true, email, mode: invite.audience }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'BuildPair could not update this invitation right now.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
