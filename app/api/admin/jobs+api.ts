import { jsonError, requireAdmin } from '@/lib/server';
import { getSql } from '@/lib/sql';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    const status = (url.searchParams.get('status') ?? 'all').trim();
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 200) || 200, 1), 500);
    const like = `%${q}%`;

    const rows = await getSql()`
      SELECT
        j.id,
        j.title,
        j.category,
        j.property_type AS "propertyType",
        j.postcode,
        j.location_label AS "locationLabel",
        j.urgency,
        j.description,
        j.ai_generated_spec AS "aiGeneratedSpec",
        j.budget_range AS "budgetRange",
        j.photos,
        j.is_emergency AS "isEmergency",
        j.status::text AS status,
        j.created_at AS "createdAt",
        j.updated_at AS "updatedAt",
        j.customer_id AS "customerId",
        customer.email AS "customerEmail",
        target.email AS "targetTraderEmail",
        (SELECT count(*)::int FROM quotes q2 WHERE q2.job_id = j.id) AS "quotesCount",
        (SELECT count(*)::int FROM conversations c WHERE c.job_id = j.id) AS "conversationsCount",
        (SELECT count(*)::int FROM moderation_reports mr WHERE mr.job_id = j.id) AS "reportsCount"
      FROM jobs j
      LEFT JOIN users customer ON customer.id = j.customer_id
      LEFT JOIN users target ON target.id = j.target_trader_id
      WHERE (${q} = '' OR j.title ILIKE ${like} OR j.description ILIKE ${like} OR j.category ILIKE ${like} OR coalesce(customer.email, '') ILIKE ${like})
        AND (${status} = 'all' OR j.status::text = ${status})
      ORDER BY j.created_at DESC
      LIMIT ${limit}
    `;

    return Response.json(rows);
  } catch (error) {
    return jsonError(error);
  }
}
