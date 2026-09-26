import { HttpError, jsonError, authenticatedUserId, ensureDbUser } from '@/lib/server';
import { getSql } from '@/lib/sql';

export async function GET(request: Request, { id }: { id: string }) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const jobs = await getSql()`
      SELECT j.id, j.title, j.status, j.scheduled_start_at AS "scheduledStartAt", j.created_at AS "createdAt",
             j.customer_id AS "customerId", q.trader_id AS "traderId",
             q.total_amount AS "quotedTotal", q.scope, q.exclusions, q.payment_terms AS "paymentTerms",
             q.warranty_months AS "warrantyMonths", q.proposed_start_at AS "proposedStartAt",
             tp.business_name AS "businessName"
      FROM jobs j
      JOIN quotes q ON q.id = j.accepted_quote_id
      JOIN trader_profiles tp ON tp.user_id = q.trader_id
      WHERE j.id = ${id}
      LIMIT 1
    ` as unknown as {
      id:string; title:string; status:string; scheduledStartAt:string|null; createdAt:string; customerId:string; traderId:string;
      quotedTotal:number; scope:string|null; exclusions:string|null; paymentTerms:string; warrantyMonths:number|null;
      proposedStartAt:string|null; businessName:string;
    }[];
    const job = jobs[0];
    if (!job || (job.customerId !== userId && job.traderId !== userId)) throw new HttpError(403, 'Only people on this project can open its handover pack.');

    const [variations, workspace, milestones] = await Promise.all([
      getSql()`
        SELECT id, title, description, amount_delta AS "amountDelta", duration_delta_days AS "durationDeltaDays",
               responded_at AS "respondedAt"
        FROM job_variations
        WHERE job_id = ${id} AND status = 'accepted'
        ORDER BY created_at ASC
      `,
      getSql()`
        SELECT id, entry_type AS "entryType", title, body, amount, status, media_url AS "mediaUrl",
               due_at AS "dueAt", completed_at AS "completedAt", created_at AS "createdAt"
        FROM job_workspace_entries
        WHERE job_id = ${id} AND visibility = 'shared'
        ORDER BY created_at ASC
      `,
      getSql()`
        SELECT id, title, amount, kind, status, completed_at AS "completedAt", paid_at AS "paidAt",
               sort_order AS "sortOrder"
        FROM job_milestones
        WHERE job_id = ${id}
        ORDER BY sort_order ASC, created_at ASC
      `,
    ]);

    return Response.json({
      generatedAt: new Date().toISOString(),
      job: {
        id: job.id,
        title: job.title,
        status: job.status,
        scheduledStartAt: job.scheduledStartAt,
        createdAt: job.createdAt,
        businessName: job.businessName,
        quotedTotal: job.quotedTotal,
        scope: job.scope,
        exclusions: job.exclusions,
        paymentTerms: job.paymentTerms,
        warrantyMonths: job.warrantyMonths,
        proposedStartAt: job.proposedStartAt,
      },
      variations,
      workspace,
      milestones,
    });
  } catch (error) { return jsonError(error); }
}
