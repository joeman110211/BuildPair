import { getSql } from '@/lib/sql';

const INVITE_TOKEN = 'mke_aL_BpOXenKcr0zuG0tbozCetCf7h_Rwd';
const INVITED_EMAIL = 'info@mkepropertymaintenanceltd.co.uk';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('invite')?.trim() ?? '';

  if (token !== INVITE_TOKEN) {
    return Response.json({ valid: false }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id
      FROM users
      WHERE lower(coalesce(email, '')) = ${INVITED_EMAIL.toLowerCase()}
        AND coalesce(is_deleted, false) = false
      LIMIT 1
    ` as unknown as { id: string }[];

    if (rows.length) {
      return Response.json({ valid: false, claimed: true, email: INVITED_EMAIL, mode: 'trader' }, {
        status: 410,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    return Response.json({ valid: true, claimed: false, email: INVITED_EMAIL, mode: 'trader' }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ valid: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
