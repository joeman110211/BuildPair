import { z } from 'zod';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { getStripe } from '@/lib/stripe';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ milestoneId: z.uuid(), action: z.literal('respond'), note: z.string().trim().min(10).max(1500) }),
  z.object({ milestoneId: z.uuid(), action: z.literal('escalate'), note: z.string().trim().min(10).max(1500) }),
  z.object({ milestoneId: z.uuid(), action: z.literal('resolve'), note: z.string().trim().min(5).max(1500) }),
  z.object({ milestoneId: z.uuid(), action: z.literal('request_refund'), note: z.string().trim().min(10).max(1500) }),
  z.object({ milestoneId: z.uuid(), action: z.literal('agree_refund'), note: z.string().trim().min(5).max(1500) }),
]);

type DisputeRow = {
  milestoneId: string;
  milestoneTitle: string;
  milestoneAmount: number;
  milestoneStatus: 'pending' | 'funded' | 'completed' | 'paid' | 'disputed';
  disputeReason: string | null;
  disputeStatus: 'none' | 'open' | 'trader_response' | 'escalated' | 'resolved';
  disputeResponse: string | null;
  disputeResponseAt: string | null;
  disputeEscalatedAt: string | null;
  disputeResolvedAt: string | null;
  disputeResolutionNote: string | null;
  refundRequestedAt: string | null;
  refundApprovedAt: string | null;
  jobId: string;
  jobTitle: string;
  customerId: string;
  traderId: string;
  paymentMode: 'undecided' | 'buildpair' | 'external';
  allocationId: string | null;
  allocationStatus: string | null;
  allocationTransferId: string | null;
  fundingBatchId: string | null;
  paymentId: string | null;
  paymentStatus: string | null;
  stripePaymentIntentId: string | null;
  stripeTransferId: string | null;
};

async function disputeRow(milestoneId: string) {
  const rows = await getSql()`
    SELECT m.id AS "milestoneId", m.title AS "milestoneTitle", m.amount AS "milestoneAmount", m.status AS "milestoneStatus",
           m.dispute_reason AS "disputeReason", m.dispute_status AS "disputeStatus", m.dispute_response AS "disputeResponse",
           m.dispute_response_at AS "disputeResponseAt", m.dispute_escalated_at AS "disputeEscalatedAt",
           m.dispute_resolved_at AS "disputeResolvedAt", m.dispute_resolution_note AS "disputeResolutionNote",
           m.refund_requested_at AS "refundRequestedAt", m.refund_approved_at AS "refundApprovedAt",
           j.id AS "jobId", j.title AS "jobTitle", j.customer_id AS "customerId", j.payment_mode AS "paymentMode",
           q.trader_id AS "traderId",
           a.id AS "allocationId", a.status AS "allocationStatus", a.stripe_transfer_id AS "allocationTransferId", b.id AS "fundingBatchId",
           COALESCE(bp.id, lp.id) AS "paymentId", COALESCE(bp.status, lp.status) AS "paymentStatus",
           COALESCE(b.stripe_payment_intent_id, bp.stripe_payment_intent_id, lp.stripe_payment_intent_id) AS "stripePaymentIntentId",
           lp.stripe_transfer_id AS "stripeTransferId"
    FROM job_milestones m
    JOIN jobs j ON j.id = m.job_id
    JOIN quotes q ON q.id = m.quote_id
    LEFT JOIN LATERAL (
      SELECT * FROM buildpay_funding_allocations ax
      WHERE ax.milestone_id = m.id AND ax.status <> 'refunded'
      ORDER BY ax.created_at DESC LIMIT 1
    ) a ON true
    LEFT JOIN buildpay_funding_batches b ON b.id = a.batch_id
    LEFT JOIN LATERAL (
      SELECT * FROM payments px WHERE px.funding_batch_id = b.id ORDER BY px.created_at DESC LIMIT 1
    ) bp ON b.id IS NOT NULL
    LEFT JOIN LATERAL (
      SELECT * FROM payments px
      WHERE px.milestone_id = m.id AND px.funding_batch_id IS NULL AND px.status IN ('funded','disputed','released','paid','refunded')
      ORDER BY px.created_at DESC LIMIT 1
    ) lp ON true
    WHERE m.id = ${milestoneId}
    LIMIT 1
  ` as unknown as DisputeRow[];
  return rows[0];
}

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const jobId = new URL(request.url).searchParams.get('jobId');
    if (!jobId) throw new HttpError(400, 'Job id is required');
    const access = await getSql()`
      SELECT j.customer_id AS "customerId", q.trader_id AS "traderId"
      FROM jobs j JOIN quotes q ON q.id = j.accepted_quote_id WHERE j.id = ${jobId} LIMIT 1
    ` as unknown as { customerId: string; traderId: string }[];
    if (!access[0] || (access[0].customerId !== userId && access[0].traderId !== userId)) throw new HttpError(404, 'Project not found');
    const rows = await getSql()`
      SELECT id AS "milestoneId", title AS "milestoneTitle", amount AS "milestoneAmount", status AS "milestoneStatus",
             dispute_reason AS "disputeReason", dispute_status AS "disputeStatus", dispute_response AS "disputeResponse",
             dispute_response_at AS "disputeResponseAt", dispute_escalated_at AS "disputeEscalatedAt",
             dispute_resolved_at AS "disputeResolvedAt", dispute_resolution_note AS "disputeResolutionNote",
             refund_requested_at AS "refundRequestedAt", refund_approved_at AS "refundApprovedAt"
      FROM job_milestones WHERE job_id = ${jobId} AND dispute_status <> 'none' ORDER BY sort_order ASC
    `;
    return Response.json(rows);
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const input = actionSchema.parse(await request.json());
    const row = await disputeRow(input.milestoneId);
    if (!row || (row.customerId !== userId && row.traderId !== userId)) throw new HttpError(404, 'Payment issue not found');
    if (row.paymentMode !== 'buildpair') throw new HttpError(409, 'BuildPay issue controls only apply to BuildPay stages');
    if (row.milestoneStatus !== 'disputed') throw new HttpError(409, 'This stage does not currently have a paused BuildPay release');
    const usesFundingBatch = Boolean(row.allocationId && row.fundingBatchId);
    const effectiveTransferId = usesFundingBatch ? row.allocationTransferId : row.stripeTransferId;
    if (!row.paymentId || !row.stripePaymentIntentId || effectiveTransferId) throw new HttpError(409, 'This stage is not an unreleased BuildPay payment');

    const isCustomer = userId === row.customerId;
    const isTrader = userId === row.traderId;

    if (input.action === 'respond') {
      if (!isTrader) throw new HttpError(403, 'Only the tradesperson can respond to the homeowner issue');
      await getSql()`UPDATE job_milestones SET dispute_status = 'trader_response', dispute_response = ${input.note}, dispute_response_at = now() WHERE id = ${row.milestoneId}`;
      await addJobEvent(row.jobId, userId, 'payment_issue_response', `${row.milestoneTitle} issue response added`, input.note, { milestoneId: row.milestoneId });
      await createNotification(row.customerId, { type: 'payment_issue_response', title: 'Tradesperson responded to your payment issue', body: `${row.jobTitle}: review the response for ${row.milestoneTitle}, then resolve, request a refund or escalate.`, href: `/customer/jobs/${row.jobId}`, email: true });
      return Response.json({ responded: true });
    }

    if (input.action === 'escalate') {
      await getSql()`UPDATE job_milestones SET dispute_status = 'escalated', dispute_escalated_at = COALESCE(dispute_escalated_at, now()), dispute_resolution_note = ${input.note} WHERE id = ${row.milestoneId}`;
      await addJobEvent(row.jobId, userId, 'payment_issue_escalated', `${row.milestoneTitle} issue escalated`, input.note, { milestoneId: row.milestoneId });
      const otherId = isCustomer ? row.traderId : row.customerId;
      await createNotification(otherId, { type: 'payment_issue_escalated', title: 'BuildPay issue escalated', body: `${row.jobTitle}: ${row.milestoneTitle} remains paused and has been flagged for BuildPair admin attention.`, href: isCustomer ? `/trader/jobs/${row.jobId}` : `/customer/jobs/${row.jobId}`, email: true });
      return Response.json({ escalated: true });
    }

    if (input.action === 'resolve') {
      if (!isCustomer) throw new HttpError(403, 'Only the homeowner can resume a release they paused');
      await getSql()`UPDATE job_milestones SET status = 'completed', dispute_status = 'resolved', dispute_resolved_at = now(), dispute_resolved_by = ${userId}, dispute_resolution_note = ${input.note} WHERE id = ${row.milestoneId}`;
      if (usesFundingBatch) {
        await getSql()`UPDATE buildpay_funding_allocations SET status = 'funded', updated_at = now() WHERE id = ${row.allocationId} AND status = 'disputed'`;
        const otherDisputes = await getSql()`SELECT 1 FROM buildpay_funding_allocations WHERE batch_id = ${row.fundingBatchId} AND status = 'disputed' LIMIT 1`;
        await getSql()`UPDATE buildpay_funding_batches SET status = ${otherDisputes.length ? 'disputed' : 'partially_released'}, updated_at = now() WHERE id = ${row.fundingBatchId}`;
      } else {
        await getSql()`UPDATE payments SET status = 'funded' WHERE id = ${row.paymentId} AND status = 'disputed'`;
      }
      await addJobEvent(row.jobId, userId, 'payment_issue_resolved', `${row.milestoneTitle} issue resolved`, `${input.note} The stage is ready for homeowner release review again.`, { milestoneId: row.milestoneId });
      await createNotification(row.traderId, { type: 'payment_issue_resolved', title: 'BuildPay issue resolved', body: `${row.jobTitle}: ${row.milestoneTitle} is no longer paused and is back with the homeowner for release review.`, href: `/trader/jobs/${row.jobId}`, email: true });
      return Response.json({ resolved: true, nextStatus: 'completed' });
    }

    if (input.action === 'request_refund') {
      if (!isCustomer) throw new HttpError(403, 'Only the homeowner can request a refund of this unreleased stage');
      await getSql()`UPDATE job_milestones SET refund_requested_at = COALESCE(refund_requested_at, now()), dispute_resolution_note = ${input.note} WHERE id = ${row.milestoneId}`;
      await addJobEvent(row.jobId, userId, 'payment_refund_requested', `Refund requested for ${row.milestoneTitle}`, input.note, { milestoneId: row.milestoneId });
      await createNotification(row.traderId, { type: 'payment_refund_requested', title: 'Homeowner requested a BuildPay refund', body: `${row.jobTitle}: review the refund request for ${row.milestoneTitle}. The unreleased money remains paused unless the issue is resolved another way.`, href: `/trader/jobs/${row.jobId}`, email: true });
      return Response.json({ refundRequested: true });
    }

    if (!isTrader) throw new HttpError(403, 'Only the tradesperson can agree the requested refund');
    if (!row.refundRequestedAt) throw new HttpError(409, 'The homeowner has not requested a refund for this stage');
    if (usesFundingBatch && row.allocationStatus === 'refunded') throw new HttpError(409, 'This stage has already been refunded');
    if (!usesFundingBatch && row.paymentStatus === 'refunded') throw new HttpError(409, 'This stage has already been refunded');

    const stripe = getStripe();
    const refund = await stripe.refunds.create({
      payment_intent: row.stripePaymentIntentId,
      amount: row.milestoneAmount,
      metadata: { buildpairJobId: row.jobId, fundingBatchId: row.fundingBatchId ?? '', milestoneId: row.milestoneId, resolution: 'mutual_unreleased_stage_refund' },
    }, { idempotencyKey: `buildpay-mutual-refund-v4-${row.milestoneId}-${row.stripePaymentIntentId}` });

    if (usesFundingBatch) {
      await getSql()`UPDATE buildpay_funding_allocations SET status = 'refunded', refunded_at = now(), updated_at = now() WHERE id = ${row.allocationId}`;
      const active = await getSql()`SELECT status FROM buildpay_funding_allocations WHERE batch_id = ${row.fundingBatchId} AND status <> 'refunded'` as unknown as { status: string }[];
      const batchStatus = !active.length ? 'refunded' : active.some((item) => item.status === 'disputed') ? 'disputed' : active.some((item) => item.status === 'funded') ? 'partially_released' : 'released';
      await getSql()`UPDATE buildpay_funding_batches SET status = ${batchStatus}, updated_at = now() WHERE id = ${row.fundingBatchId}`;
    } else {
      await getSql()`UPDATE payments SET status = 'refunded', refunded_at = COALESCE(refunded_at, now()) WHERE id = ${row.paymentId}`;
    }
    await getSql()`
      UPDATE job_milestones
      SET status = 'pending', funded_at = NULL, release_requested_at = NULL, release_approved_at = NULL, release_approved_by = NULL,
          dispute_status = 'resolved', dispute_resolved_at = now(), dispute_resolved_by = ${userId},
          refund_approved_at = now(), dispute_resolution_note = ${input.note}
      WHERE id = ${row.milestoneId}
    `;
    await addJobEvent(row.jobId, userId, 'payment_refunded_by_agreement', `${row.milestoneTitle} refund agreed`, `The parties agreed to refund the unreleased ${formatPence(row.milestoneAmount)} BuildPay stage. Stripe refund reference ${refund.id}.`, { milestoneId: row.milestoneId, fundingBatchId: row.fundingBatchId, stripeRefundId: refund.id });
    await Promise.allSettled([
      createNotification(row.customerId, { type: 'payment_refunded_by_agreement', title: 'BuildPay refund submitted', body: `${row.jobTitle}: the ${row.milestoneTitle} refund has been submitted to Stripe. Bank/card timing is controlled by the payment network.`, href: `/customer/jobs/${row.jobId}`, email: true }),
      createNotification(row.traderId, { type: 'payment_refunded_by_agreement', title: 'Refund agreement recorded', body: `${row.jobTitle}: the unreleased ${row.milestoneTitle} payment was sent for refund.`, href: `/trader/jobs/${row.jobId}` }),
    ]);
    return Response.json({ refunded: true, stripeRefundId: refund.id });
  } catch (error) { return jsonError(error); }
}

function formatPence(value: number) { return `£${(value / 100).toFixed(2)}`; }
