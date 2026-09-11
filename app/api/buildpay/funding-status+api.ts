import { authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

type AccessRow = { customerId: string; traderId: string };

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const jobId = new URL(request.url).searchParams.get('jobId');
    if (!jobId) throw new HttpError(400, 'Job id is required');
    const accessRows = await getSql()`
      SELECT j.customer_id AS "customerId", q.trader_id AS "traderId"
      FROM jobs j JOIN quotes q ON q.id = j.accepted_quote_id
      WHERE j.id = ${jobId}
      LIMIT 1
    ` as unknown as AccessRow[];
    const access = accessRows[0];
    if (!access || (access.customerId !== userId && access.traderId !== userId)) throw new HttpError(404, 'Project not found');

    const batches = await getSql()`
      SELECT b.id, b.total_amount AS "totalAmount", b.status, b.funded_at AS "fundedAt", b.acknowledged_at AS "acknowledgedAt",
             COALESCE(json_agg(json_build_object(
               'milestoneId', m.id,
               'title', m.title,
               'kind', m.kind,
               'amount', a.amount,
               'status', a.status,
               'stripeTransferId', a.stripe_transfer_id
             ) ORDER BY m.sort_order) FILTER (WHERE m.id IS NOT NULL), '[]'::json) AS allocations
      FROM buildpay_funding_batches b
      LEFT JOIN buildpay_funding_allocations a ON a.batch_id = b.id
      LEFT JOIN job_milestones m ON m.id = a.milestone_id
      WHERE b.job_id = ${jobId} AND b.status <> 'failed'
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `;
    return Response.json(batches);
  } catch (error) { return jsonError(error); }
}
