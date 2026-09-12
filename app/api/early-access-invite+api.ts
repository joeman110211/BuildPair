import { ensureEarlyAccessInviteTable, hashEarlyAccessToken } from '@/lib/early-access-store';
import { getSql } from '@/lib/sql';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('invite')?.trim() ?? '';
  if (!token) return Response.json({ valid: false }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

  try {
    await ensureEarlyAccessInviteTable();
    const sql = getSql();
    const tokenHash = hashEarlyAccessToken(token);
    const rows = await sql`
      SELECT id, email, audience, revoked_at AS "revokedAt", used_at AS "usedAt"
      FROM early_access_invites
      WHERE token_hash = ${tokenHash}
      LIMIT 1
    ` as unknown as { id: string; email: string; audience: 'homeowner' | 'trader'; revokedAt: string | null; usedAt: string | null }[];
    const invite = rows[0];
    if (!invite || invite.revokedAt) {
      return Response.json({ valid: false }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }

    const users = await sql`
      SELECT id
      FROM users
      WHERE lower(coalesce(email, '')) = lower(${invite.email})
        AND coalesce(is_deleted, false) = false
      LIMIT 1
    ` as unknown as { id: string }[];

    if (invite.usedAt || users.length) {
      if (!invite.usedAt) await sql`UPDATE early_access_invites SET used_at = now(), updated_at = now() WHERE id = ${invite.id}::uuid`;
      return Response.json({ valid: false, claimed: true, email: invite.email, mode: invite.audience }, {
        status: 410,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    return Response.json({ valid: true, claimed: false, email: invite.email, mode: invite.audience }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ valid: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
