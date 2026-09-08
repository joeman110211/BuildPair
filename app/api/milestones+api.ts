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
  status: 'pending' | 'completed' | 'paid';
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
    if (milestone.status === 'paid') throw new HttpError(409, 'This payment stage is already paid');
    if (milestone.kind === 'materials' || milestone.kind === 'deposit') throw new HttpError(409, 'Upfront materials and deposits do not need a work-complete confirmation');
    if (milestone.paymentMode === 'undecided') throw new HttpError(409, 'The homeowner must choose how payments will be managed before stages can progress');

    if (milestone.paymentMode === 'buildpair') {
      const earlier = await getSql()`
        SELECT title, status FROM job_milestones
        WHERE job_id = ${milestone.jobId} AND sort_order < ${milestone.sortOrder}
        ORDER BY sort_order ASC
      ` as unknown as { title: string; status: string }[];
      const unpaid = earlier.find((stage) => stage.status !== 'paid');
      if (unpaid) throw new HttpError(409, `${unpaid.title} must be paid before this stage can be completed`);
    }

    await getSql()`
      UPDATE job_milestones
      SET status = 'completed', completed_at = COALESCE(completed_at, now())
      WHERE id = ${milestone.id} AND status = 'pending'
    `;
    await addJobEvent(milestone.jobId, trader.id, 'payment_stage_completed', `${milestone.title} marked complete`, 'The tradesperson marked this agreed payment stage complete.', { milestoneId: milestone.id });
    await createNotification(milestone.customerId, {
      type: 'payment_stage_completed',
      title: `${milestone.title} is ready for review`,
      body: `${milestone.jobTitle}: the tradesperson says this stage is complete. Review it before making the stage payment.`,
      href: `/customer/jobs/${milestone.jobId}`,
      email: true,
    });
    return Response.json({ completed: true });
  } catch (error) { return jsonError(error); }
}
