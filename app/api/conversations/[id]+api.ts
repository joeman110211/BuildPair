import { authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';
import type { ConversationStatus } from '@/types/conversations';


export async function GET(request: Request, { id }: { id: string }) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const rows = await getSql()`
      SELECT c.id,
             c.job_id AS "jobId",
             j.title AS "jobTitle",
             j.status AS "jobStatus",
             j.accepted_quote_id AS "acceptedQuoteId",
             c.customer_id AS "customerId",
             c.trader_id AS "traderId",
             q.id AS "quoteId",
             q.status AS "quoteStatus",
             sv.id AS "siteVisitId",
             sv.status AS "siteVisitStatus",
             sv.proposed_at AS "siteVisitProposedAt",
             sv.note AS "siteVisitNote",
             c.moderation_status AS "moderationStatus",
             c.moderation_reason AS "moderationReason",
             c.moderation_updated_at AS "moderationUpdatedAt"
      FROM conversations c
      JOIN jobs j ON j.id = c.job_id
      LEFT JOIN quotes q ON q.job_id = c.job_id AND q.trader_id = c.trader_id
      LEFT JOIN LATERAL (
        SELECT v.id, v.status, v.proposed_at, v.note
        FROM job_site_visits v
        WHERE v.job_id = c.job_id AND v.trader_id = c.trader_id
        ORDER BY v.created_at DESC
        LIMIT 1
      ) sv ON true
      WHERE c.id = ${id}
        AND (c.customer_id = ${userId} OR c.trader_id = ${userId})
      LIMIT 1
    ` as unknown as ConversationStatus[];
    if (!rows[0]) throw new HttpError(404, 'Conversation not found');
    return Response.json(rows[0]);
  } catch (error) { return jsonError(error); }
}
