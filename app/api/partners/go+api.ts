import { ensurePartnersTables, safePartnerUrl } from '@/lib/partners-store';
import { getSql } from '@/lib/sql';
import { jsonError, HttpError } from '@/lib/server';

export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id') ?? '';
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, 'Invalid partner link.');
    await ensurePartnersTables();
    const sql = getSql();
    const rows = await sql`SELECT website_url AS "websiteUrl" FROM buildpair_partners WHERE id=${id}::uuid AND status='live'
      AND (starts_on IS NULL OR starts_on <= current_date) AND (ends_on IS NULL OR ends_on >= current_date) LIMIT 1`;
    const url = rows[0] && safePartnerUrl(rows[0].websiteUrl);
    if (!url) throw new HttpError(404,'Partner link unavailable');
    // Indicative outbound clicks only. Not verified unique human visitors.
    void sql`UPDATE buildpair_partners SET click_count=click_count+1 WHERE id=${id}::uuid`.catch(() => undefined);
    return Response.redirect(url, 302);
  } catch (error) { return jsonError(error); }
}
