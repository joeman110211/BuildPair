import { createNotification, addJobEvent } from '@/lib/notifications';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';

type MilestoneRow = {
  id: string;
  jobId: string;
  quoteId: string;
  traderId: string;
  customerId: string;
  jobTitle: string;
  title: string;
  kind: 'materials' | 'deposit' | 'stage' | 'final';
  status: 'pending' | 'funded' | 'completed' | 'paid' | 'disputed';
  sortOrder: number;
  paymentMode: 'undecided' | 'buildpair' | 'external';
};

export async function PATCH(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const payload = await request.json() as { id?: string; action?: string };
    if (!payload.id || payload.action !== 'complete') throw new HttpError(400, 'Milestone and complete action are required');

    const rows = await getSql()`
      SELECT m.id, m.job_id AS "jobId", m.quote_id AS "quoteId", q.trader_id AS "traderId",
             j.customer_id AS "customerId", j.title AS "jobTitle", m.title, m.kind, m.status,
             m.sort_order AS "sortOrder", j.payment_mode AS "paymentMode"
      FROM job_milestones m
      JOIN quotes q ON q.id = m.quote_id
      JOIN jobs j ON j.id = m.job_id
      WHERE m.id = ${payload.id}
      LIMIT 1
    ` as unknown as MilestoneRow[];
    const milestone = rows[0];
    if (!milestone || milestone.traderId !== trader.id) throw new HttpError(404, 'Payment stage not found');
    if (milestone.status === 'paid') throw new HttpError(409, 'This payment stage is already released');
    if (milestone.status === 'disputed') throw new HttpError(409, 'This payment stage is paused because an issue has been raised');
    if (milestone.kind === 'materials') throw new HttpError(409, 'Materials payments are released when the homeowner makes the agreed materials payment');
    if (milestone.paymentMode === 'undecided') throw new HttpError(409, 'The homeowner must choose how payments will be managed before stages can progress');

    const earlier = await getSql()`
      SELECT title, status FROM job_milestones
      WHERE job_id = ${milestone.jobId} AND sort_order < ${milestone.sortOrder}
      ORDER BY sort_order ASC
    ` as unknown as { title: string; status: string }[];
    const unfinished = earlier.find((stage) => stage.status !== 'paid');
    if (unfinished) throw new HttpError(409, `${unfinished.title} must be completed before this stage can progress`);

    if (milestone.paymentMode === 'buildpair' && milestone.status !== 'funded') {
      throw new HttpError(409, 'The homeowner must fund this agreed stage through BuildPair before you can request release');
    }
    if (milestone.paymentMode === 'external' && milestone.status !== 'pending') throw new HttpError(409, 'This stage cannot be completed at its current state');

    await getSql()`
      UPDATE job_milestones
      SET status = 'completed', completed_at = COALESCE(completed_at, now()), release_requested_at = CASE WHEN ${milestone.paymentMode} = 'buildpair' THEN now() ELSE release_requested_at END
      WHERE id = ${milestone.id}
    `;
    const description = milestone.paymentMode === 'buildpair'
      ? 'The tradesperson marked the agreed trigger complete and requested release of the funded stage.'
      : 'The tradesperson marked this agreed stage complete. Payment remains a private arrangement outside BuildPair.';
    await addJobEvent(milestone.jobId, trader.id, 'payment_stage_completed', `${milestone.title} marked complete`, description, { milestoneId: milestone.id });
    await createNotification(milestone.customerId, {
      type: 'payment_stage_completed',
      title: milestone.paymentMode === 'buildpair' ? `${milestone.title} is ready for approval` : `${milestone.title} marked complete`,
      body: milestone.paymentMode === 'buildpair'
        ? `${milestone.jobTitle}: the tradesperson says the agreed trigger is complete. Review the work, then approve release or raise an issue.`
        : `${milestone.jobTitle}: the tradesperson marked this stage complete. BuildPair is not processing the private payment.`,
      href: `/customer/jobs/${milestone.jobId}`,
      email: true,
    });
    return Response.json({ completed: true, releaseRequested: milestone.paymentMode === 'buildpair' });
  } catch (error) { return jsonError(error); }
}
