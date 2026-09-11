import { z } from 'zod';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

const openSchema = z.object({ action: z.literal('open'), milestoneId: z.uuid(), reason: z.string().trim().min(10).max(1000) });
const respondSchema = z.object({ action: z.literal('respond'), milestoneId: z.uuid(), response: z.string().trim().min(10).max(1500) });
const escalateSchema = z.object({ action: z.literal('escalate'), milestoneId: z.uuid(), note: z.string().trim().min(10).max(1500) });
const resolveSchema = z.object({ action: z.literal('resolve_release'), milestoneId: z.uuid(), note: z.string().trim().max(1000).optional() });
const actionSchema = z.discriminatedUnion('action', [openSchema, respondSchema, escalateSchema, resolveSchema]);

type DisputeRow = {
  id: string;
  jobId: string;
  milestoneId: string;
  paymentId: string;
  customerId: string;
  traderId: string;
  status: 'open' | 'responded' | 'escalated' | 'resolved_release';
  reason: string;
  traderResponse: string | null;
  escalationNote: string | null;
  resolutionNote: string | null;
  createdAt: string;
  respondedAt: string | null;
  escalatedAt: string | null;
  resolvedAt: string | null;
  jobTitle?: string;
  milestoneTitle?: string;
};

async function activeDispute(milestoneId: string) {
  const rows = await getSql()`
    SELECT d.id, d.job_id AS "jobId", d.milestone_id AS "milestoneId", d.payment_id AS "paymentId",
           d.customer_id AS "customerId", d.trader_id AS "traderId", d.status, d.reason,
           d.trader_response AS "traderResponse", d.escalation_note AS "escalationNote", d.resolution_note AS "resolutionNote",
           d.created_at AS "createdAt", d.responded_at AS "respondedAt", d.escalated_at AS "escalatedAt", d.resolved_at AS "resolvedAt",
           j.title AS "jobTitle", m.title AS "milestoneTitle"
    FROM payment_disputes d
    JOIN jobs j ON j.id = d.job_id
    JOIN job_milestones m ON m.id = d.milestone_id
    WHERE d.milestone_id = ${milestoneId} AND d.status IN ('open', 'responded', 'escalated')
    ORDER BY d.created_at DESC LIMIT 1
  ` as unknown as DisputeRow[];
  return rows[0];
}

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const url = new URL(request.url);
    const jobId = z.uuid().parse(url.searchParams.get('jobId'));
    const access = await getSql()`
      SELECT j.customer_id AS "customerId", q.trader_id AS "traderId"
      FROM jobs j LEFT JOIN quotes q ON q.id = j.accepted_quote_id
      WHERE j.id = ${jobId} LIMIT 1
    ` as unknown as { customerId: string; traderId: string | null }[];
    const job = access[0];
    if (!job || (job.customerId !== userId && job.traderId !== userId)) throw new HttpError(404, 'Job not found');

    const rows = await getSql()`
      SELECT d.id, d.job_id AS "jobId", d.milestone_id AS "milestoneId", d.payment_id AS "paymentId",
             d.customer_id AS "customerId", d.trader_id AS "traderId", d.status, d.reason,
             d.trader_response AS "traderResponse", d.escalation_note AS "escalationNote", d.resolution_note AS "resolutionNote",
             d.created_at AS "createdAt", d.responded_at AS "respondedAt", d.escalated_at AS "escalatedAt", d.resolved_at AS "resolvedAt"
      FROM payment_disputes d
      WHERE d.job_id = ${jobId}
      ORDER BY d.created_at DESC
    ` as unknown as DisputeRow[];
    return Response.json({ disputes: rows });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const input = actionSchema.parse(await request.json());

    if (input.action === 'open') {
      const rows = await getSql()`
        SELECT m.id AS "milestoneId", m.title AS "milestoneTitle", m.status AS "milestoneStatus",
               j.id AS "jobId", j.title AS "jobTitle", j.customer_id AS "customerId", q.trader_id AS "traderId",
               p.id AS "paymentId", p.status AS "paymentStatus"
        FROM job_milestones m
        JOIN jobs j ON j.id = m.job_id
        JOIN quotes q ON q.id = m.quote_id
        LEFT JOIN LATERAL (
          SELECT * FROM payments px WHERE px.milestone_id = m.id AND px.status IN ('funded', 'disputed') ORDER BY px.created_at DESC LIMIT 1
        ) p ON true
        WHERE m.id = ${input.milestoneId} LIMIT 1
      ` as unknown as { milestoneId: string; milestoneTitle: string; milestoneStatus: string; jobId: string; jobTitle: string; customerId: string; traderId: string; paymentId: string | null; paymentStatus: string | null }[];
      const row = rows[0];
      if (!row || row.customerId !== userId) throw new HttpError(404, 'Payment stage not found');
      if (!row.paymentId || !['funded', 'completed'].includes(row.milestoneStatus) || row.paymentStatus !== 'funded') {
        throw new HttpError(409, 'This stage cannot be disputed at its current state');
      }
      const existing = await activeDispute(input.milestoneId);
      if (existing) return Response.json({ dispute: existing, alreadyOpen: true });

      const created = await getSql()`
        INSERT INTO payment_disputes(job_id, milestone_id, payment_id, customer_id, trader_id, reason)
        VALUES (${row.jobId}, ${row.milestoneId}, ${row.paymentId}, ${row.customerId}, ${row.traderId}, ${input.reason})
        RETURNING id, job_id AS "jobId", milestone_id AS "milestoneId", payment_id AS "paymentId", customer_id AS "customerId", trader_id AS "traderId", status, reason, trader_response AS "traderResponse", escalation_note AS "escalationNote", resolution_note AS "resolutionNote", created_at AS "createdAt", responded_at AS "respondedAt", escalated_at AS "escalatedAt", resolved_at AS "resolvedAt"
      ` as unknown as DisputeRow[];
      await getSql()`UPDATE payments SET status = 'disputed', disputed_at = now() WHERE id = ${row.paymentId} AND status = 'funded'`;
      await getSql()`UPDATE job_milestones SET status = 'disputed', disputed_at = now(), dispute_reason = ${input.reason} WHERE id = ${row.milestoneId}`;
      await addJobEvent(row.jobId, userId, 'buildpay_dispute_opened', `${row.milestoneTitle} release paused`, input.reason, { milestoneId: row.milestoneId, disputeId: created[0]?.id });
      await createNotification(row.traderId, { type: 'payment_release_paused', title: `${row.milestoneTitle} release paused`, body: `${row.jobTitle}: the homeowner raised an issue. Reply in BuildPair before the payment is released.`, href: `/trader/jobs/${row.jobId}`, email: true });
      return Response.json({ dispute: created[0] });
    }

    const dispute = await activeDispute(input.milestoneId);
    if (!dispute) throw new HttpError(404, 'No active dispute was found for this stage');

    if (input.action === 'respond') {
      if (dispute.traderId !== userId) throw new HttpError(403, 'Only the awarded tradesperson can respond to this issue');
      const updated = await getSql()`
        UPDATE payment_disputes SET status = 'responded', trader_response = ${input.response}, responded_at = now()
        WHERE id = ${dispute.id}
        RETURNING id, job_id AS "jobId", milestone_id AS "milestoneId", payment_id AS "paymentId", customer_id AS "customerId", trader_id AS "traderId", status, reason, trader_response AS "traderResponse", escalation_note AS "escalationNote", resolution_note AS "resolutionNote", created_at AS "createdAt", responded_at AS "respondedAt", escalated_at AS "escalatedAt", resolved_at AS "resolvedAt"
      ` as unknown as DisputeRow[];
      await addJobEvent(dispute.jobId, userId, 'buildpay_dispute_response', `${dispute.milestoneTitle ?? 'Payment stage'} issue response`, input.response, { milestoneId: dispute.milestoneId, disputeId: dispute.id });
      await createNotification(dispute.customerId, { type: 'payment_dispute_response', title: 'Tradesperson responded to your payment issue', body: `${dispute.jobTitle ?? 'Your job'}: review the response. You can resolve the issue and continue release, or escalate it.`, href: `/customer/jobs/${dispute.jobId}`, email: true });
      return Response.json({ dispute: updated[0] });
    }

    if (input.action === 'escalate') {
      if (userId !== dispute.customerId && userId !== dispute.traderId) throw new HttpError(403, 'Only a party to this job can escalate the issue');
      const updated = await getSql()`
        UPDATE payment_disputes SET status = 'escalated', escalation_note = ${input.note}, escalated_at = now()
        WHERE id = ${dispute.id}
        RETURNING id, job_id AS "jobId", milestone_id AS "milestoneId", payment_id AS "paymentId", customer_id AS "customerId", trader_id AS "traderId", status, reason, trader_response AS "traderResponse", escalation_note AS "escalationNote", resolution_note AS "resolutionNote", created_at AS "createdAt", responded_at AS "respondedAt", escalated_at AS "escalatedAt", resolved_at AS "resolvedAt"
      ` as unknown as DisputeRow[];
      await addJobEvent(dispute.jobId, userId, 'buildpay_dispute_escalated', `${dispute.milestoneTitle ?? 'Payment stage'} issue escalated`, input.note, { milestoneId: dispute.milestoneId, disputeId: dispute.id });
      const otherParty = userId === dispute.customerId ? dispute.traderId : dispute.customerId;
      await createNotification(otherParty, { type: 'payment_dispute_escalated', title: 'BuildPay issue escalated', body: `${dispute.jobTitle ?? 'The job'}: the payment issue remains paused while it is escalated for review.`, href: userId === dispute.customerId ? `/trader/jobs/${dispute.jobId}` : `/customer/jobs/${dispute.jobId}`, email: true });
      return Response.json({ dispute: updated[0] });
    }

    if (dispute.customerId !== userId) throw new HttpError(403, 'Only the homeowner can resolve the issue and continue release');
    const note = input.note?.trim() || 'The homeowner confirmed the issue is resolved and returned the stage to release approval.';
    const updated = await getSql()`
      UPDATE payment_disputes SET status = 'resolved_release', resolution_note = ${note}, resolved_at = now()
      WHERE id = ${dispute.id}
      RETURNING id, job_id AS "jobId", milestone_id AS "milestoneId", payment_id AS "paymentId", customer_id AS "customerId", trader_id AS "traderId", status, reason, trader_response AS "traderResponse", escalation_note AS "escalationNote", resolution_note AS "resolutionNote", created_at AS "createdAt", responded_at AS "respondedAt", escalated_at AS "escalatedAt", resolved_at AS "resolvedAt"
    ` as unknown as DisputeRow[];
    await getSql()`UPDATE payments SET status = 'funded', disputed_at = NULL WHERE id = ${dispute.paymentId} AND status = 'disputed'`;
    await getSql()`UPDATE job_milestones SET status = 'completed', disputed_at = NULL, dispute_reason = NULL, release_requested_at = COALESCE(release_requested_at, now()) WHERE id = ${dispute.milestoneId}`;
    await addJobEvent(dispute.jobId, userId, 'buildpay_dispute_resolved', `${dispute.milestoneTitle ?? 'Payment stage'} issue resolved`, note, { milestoneId: dispute.milestoneId, disputeId: dispute.id });
    await createNotification(dispute.traderId, { type: 'payment_dispute_resolved', title: 'Payment issue resolved', body: `${dispute.jobTitle ?? 'The job'}: the homeowner resolved the issue and the stage is back at release approval.`, href: `/trader/jobs/${dispute.jobId}`, email: true });
    return Response.json({ dispute: updated[0], readyForRelease: true });
  } catch (error) { return jsonError(error); }
}
