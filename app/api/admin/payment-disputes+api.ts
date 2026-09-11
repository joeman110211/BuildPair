import { z } from 'zod';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { HttpError, jsonError, requireAdmin } from '@/lib/server';
import { getSql } from '@/lib/sql';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('note'), disputeId: z.uuid(), note: z.string().trim().min(3).max(2000) }),
  z.object({ action: z.literal('return_to_release_review'), disputeId: z.uuid(), note: z.string().trim().min(10).max(2000) }),
]);

type AdminDispute = {
  id: string;
  jobId: string;
  jobTitle: string;
  milestoneId: string;
  milestoneTitle: string;
  milestoneAmount: number;
  milestoneStatus: string;
  paymentId: string;
  paymentStatus: string;
  customerId: string;
  customerEmail: string | null;
  traderId: string;
  traderEmail: string | null;
  status: 'open' | 'responded' | 'escalated' | 'resolved_release';
  reason: string;
  traderResponse: string | null;
  escalationNote: string | null;
  adminNote: string | null;
  resolutionNote: string | null;
  createdAt: string;
  respondedAt: string | null;
  escalatedAt: string | null;
  reviewedAt: string | null;
  resolvedAt: string | null;
};

async function getDispute(disputeId: string) {
  const rows = await getSql()`
    SELECT d.id, d.job_id AS "jobId", j.title AS "jobTitle", d.milestone_id AS "milestoneId", m.title AS "milestoneTitle",
           m.amount AS "milestoneAmount", m.status AS "milestoneStatus", d.payment_id AS "paymentId", p.status AS "paymentStatus",
           d.customer_id AS "customerId", cu.email AS "customerEmail", d.trader_id AS "traderId", tu.email AS "traderEmail",
           d.status, d.reason, d.trader_response AS "traderResponse", d.escalation_note AS "escalationNote",
           d.admin_note AS "adminNote", d.resolution_note AS "resolutionNote", d.created_at AS "createdAt",
           d.responded_at AS "respondedAt", d.escalated_at AS "escalatedAt", d.reviewed_at AS "reviewedAt", d.resolved_at AS "resolvedAt"
    FROM payment_disputes d
    JOIN jobs j ON j.id = d.job_id
    JOIN job_milestones m ON m.id = d.milestone_id
    JOIN payments p ON p.id = d.payment_id
    JOIN users cu ON cu.id = d.customer_id
    JOIN users tu ON tu.id = d.trader_id
    WHERE d.id = ${disputeId}
    LIMIT 1
  ` as unknown as AdminDispute[];
  return rows[0];
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const rows = await getSql()`
      SELECT d.id, d.job_id AS "jobId", j.title AS "jobTitle", d.milestone_id AS "milestoneId", m.title AS "milestoneTitle",
             m.amount AS "milestoneAmount", m.status AS "milestoneStatus", d.payment_id AS "paymentId", p.status AS "paymentStatus",
             d.customer_id AS "customerId", cu.email AS "customerEmail", d.trader_id AS "traderId", tu.email AS "traderEmail",
             d.status, d.reason, d.trader_response AS "traderResponse", d.escalation_note AS "escalationNote",
             d.admin_note AS "adminNote", d.resolution_note AS "resolutionNote", d.created_at AS "createdAt",
             d.responded_at AS "respondedAt", d.escalated_at AS "escalatedAt", d.reviewed_at AS "reviewedAt", d.resolved_at AS "resolvedAt"
      FROM payment_disputes d
      JOIN jobs j ON j.id = d.job_id
      JOIN job_milestones m ON m.id = d.milestone_id
      JOIN payments p ON p.id = d.payment_id
      JOIN users cu ON cu.id = d.customer_id
      JOIN users tu ON tu.id = d.trader_id
      ORDER BY CASE d.status WHEN 'escalated' THEN 0 WHEN 'open' THEN 1 WHEN 'responded' THEN 2 ELSE 3 END, d.created_at DESC
      LIMIT 250
    ` as unknown as AdminDispute[];
    return Response.json(rows);
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const input = actionSchema.parse(await request.json());
    const dispute = await getDispute(input.disputeId);
    if (!dispute) throw new HttpError(404, 'BuildPay dispute not found');
    if (dispute.status === 'resolved_release') throw new HttpError(409, 'This dispute has already been resolved');

    if (input.action === 'note') {
      await getSql()`
        UPDATE payment_disputes SET admin_note = ${input.note}, reviewed_by = ${admin.user.id}, reviewed_at = now()
        WHERE id = ${dispute.id}
      `;
      await addJobEvent(dispute.jobId, admin.user.id, 'buildpay_admin_review', `${dispute.milestoneTitle} dispute reviewed`, 'A BuildPair administrator reviewed the escalated payment issue. Funds remain paused while the issue is active.', { milestoneId: dispute.milestoneId, disputeId: dispute.id });
      return Response.json({ dispute: await getDispute(dispute.id) });
    }

    if (dispute.paymentStatus !== 'disputed' || dispute.milestoneStatus !== 'disputed') {
      throw new HttpError(409, 'The underlying payment stage is no longer paused');
    }

    await getSql()`
      UPDATE payment_disputes SET status = 'resolved_release', admin_note = ${input.note}, resolution_note = ${input.note},
        reviewed_by = ${admin.user.id}, reviewed_at = now(), resolved_at = now()
      WHERE id = ${dispute.id}
    `;
    await getSql()`UPDATE payments SET status = 'funded', disputed_at = NULL WHERE id = ${dispute.paymentId} AND status = 'disputed'`;
    await getSql()`
      UPDATE job_milestones SET status = 'completed', disputed_at = NULL, dispute_reason = NULL,
        release_requested_at = COALESCE(release_requested_at, now())
      WHERE id = ${dispute.milestoneId} AND status = 'disputed'
    `;
    await addJobEvent(dispute.jobId, admin.user.id, 'buildpay_admin_resolution', `${dispute.milestoneTitle} returned to release review`, input.note, { milestoneId: dispute.milestoneId, disputeId: dispute.id });
    await Promise.allSettled([
      createNotification(dispute.customerId, { type: 'payment_dispute_admin_reviewed', title: 'BuildPay issue reviewed', body: `${dispute.jobTitle}: the disputed stage has been returned to your release-review step. No transfer occurs until you approve release.`, href: `/customer/jobs/${dispute.jobId}`, email: true }),
      createNotification(dispute.traderId, { type: 'payment_dispute_admin_reviewed', title: 'BuildPay issue reviewed', body: `${dispute.jobTitle}: the disputed stage has been returned to homeowner release review. Funds have not yet been transferred.`, href: `/trader/jobs/${dispute.jobId}`, email: true }),
    ]);
    return Response.json({ dispute: await getDispute(dispute.id), readyForHomeownerReleaseReview: true });
  } catch (error) { return jsonError(error); }
}
