import { jsonError, requireAdmin } from '@/lib/server';
import { getSql } from '@/lib/sql';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    const risk = (url.searchParams.get('risk') ?? 'all').trim();
    const like = `%${q}%`;
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 300) || 300, 1), 1000);

    const rows = await getSql()`
      SELECT
        m.id,
        m.conversation_id AS "conversationId",
        m.sender_id AS "senderId",
        m.body,
        m.read_at AS "readAt",
        m.created_at AS "createdAt",
        coalesce(m.ai_risk_level, 'none') AS "riskLevel",
        m.ai_moderation_reason AS "moderationReason",
        sender.email AS "senderEmail",
        c.customer_id AS "customerId",
        customer.email AS "customerEmail",
        c.trader_id AS "traderId",
        trader.email AS "traderEmail",
        c.moderation_status AS "conversationStatus",
        c.moderation_reason AS "conversationReason",
        j.id AS "jobId",
        j.title AS "jobTitle"
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      LEFT JOIN users sender ON sender.id = m.sender_id
      LEFT JOIN users customer ON customer.id = c.customer_id
      LEFT JOIN users trader ON trader.id = c.trader_id
      LEFT JOIN jobs j ON j.id = c.job_id
      WHERE (${q} = '' OR m.body ILIKE ${like} OR coalesce(sender.email, '') ILIKE ${like} OR coalesce(customer.email, '') ILIKE ${like} OR coalesce(trader.email, '') ILIKE ${like} OR coalesce(j.title, '') ILIKE ${like})
        AND (${risk} = 'all' OR coalesce(m.ai_risk_level, 'none') = ${risk})
      ORDER BY m.created_at DESC
      LIMIT ${limit}
    `;

    return Response.json(rows);
  } catch (error) {
    return jsonError(error);
  }
}
