import { z } from 'zod';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { transferAmountForStage } from '@/lib/payment-protection';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { getStripe } from '@/lib/stripe';

const schema = z.discriminatedUnion('action', [
  z.object({ milestoneId: z.uuid(), action: z.literal('release') }),
  z.object({ milestoneId: z.uuid(), action: z.literal('dispute'), reason: z.string().trim().min(10).max(1000) }),
]);

type ReleaseRow = {
  milestoneId: string;
  milestoneTitle: string;
  milestoneAmount: number;
  milestoneStatus: 'pending' | 'funded' | 'completed' | 'paid' | 'disputed';
  milestoneKind: 'materials' | 'deposit' | 'stage' | 'final';
  jobId: string;
  jobTitle: string;
  customerId: string;
  traderId: string;
  quoteTotal: number;
  stripeAccountId: string | null;
  stripePayoutsEnabled: boolean;
  paymentId: string | null;
  paymentStatus: 'requires_payment' | 'processing' | 'funded' | 'released' | 'disputed' | 'paid' | 'failed' | 'refunded' | null;
  paymentAmount: number | null;
  platformFee: number | null;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  stripeTransferId: string | null;
};

export async function POST(request: Request) {
  try {
    const customer = await requireRole(request, 'customer');
    const input = schema.parse(await request.json());
    const rows = await getSql()`
      SELECT m.id AS "milestoneId", m.title AS "milestoneTitle", m.amount AS "milestoneAmount", m.status AS "milestoneStatus", m.kind AS "milestoneKind",
             j.id AS "jobId", j.title AS "jobTitle", j.customer_id AS "customerId",
             q.trader_id AS "traderId", q.total_amount AS "quoteTotal",
             tp.stripe_account_id AS "stripeAccountId", tp.stripe_payouts_enabled AS "stripePayoutsEnabled",
             p.id AS "paymentId", p.status AS "paymentStatus", p.amount AS "paymentAmount", p.platform_fee AS "platformFee",
             p.stripe_payment_intent_id AS "stripePaymentIntentId", p.stripe_charge_id AS "stripeChargeId", p.stripe_transfer_id AS "stripeTransferId"
      FROM job_milestones m
      JOIN jobs j ON j.id = m.job_id
      JOIN quotes q ON q.id = m.quote_id
      JOIN trader_profiles tp ON tp.user_id = q.trader_id
      LEFT JOIN LATERAL (
        SELECT * FROM payments px
        WHERE px.milestone_id = m.id AND px.status IN ('funded', 'disputed', 'released', 'paid')
        ORDER BY px.created_at DESC LIMIT 1
      ) p ON true
      WHERE m.id = ${input.milestoneId}
      LIMIT 1
    ` as unknown as ReleaseRow[];
    const row = rows[0];
    if (!row || row.customerId !== customer.id) throw new HttpError(404, 'Payment stage not found');
    if (!row.paymentId || !row.stripePaymentIntentId) throw new HttpError(409, 'This stage has not been funded through BuildPair');

    if (input.action === 'dispute') {
      if (!['funded', 'completed'].includes(row.milestoneStatus) || row.paymentStatus !== 'funded') throw new HttpError(409, 'This payment stage cannot be paused at its current state');
      await getSql()`UPDATE job_milestones SET status = 'disputed', disputed_at = now(), dispute_reason = ${input.reason} WHERE id = ${row.milestoneId}`;
      await getSql()`UPDATE payments SET status = 'disputed', disputed_at = now() WHERE id = ${row.paymentId}`;
      await addJobEvent(row.jobId, customer.id, 'payment_release_paused', `${row.milestoneTitle} release paused`, input.reason, { milestoneId: row.milestoneId });
      await createNotification(row.traderId, {
        type: 'payment_release_paused',
        title: `${row.milestoneTitle} release paused`,
        body: `${row.jobTitle}: the homeowner raised an issue before release. Keep all discussion and evidence in BuildPair while it is resolved.`,
        href: `/trader/jobs/${row.jobId}`,
        email: true,
      });
      return Response.json({ disputed: true });
    }

    if (row.milestoneStatus !== 'completed') throw new HttpError(409, 'The tradesperson must mark the agreed stage complete before you can release it');
    if (row.paymentStatus !== 'funded') throw new HttpError(409, 'This stage is not waiting for release');
    if (!row.stripeAccountId || !row.stripePayoutsEnabled) throw new HttpError(409, 'The tradesperson payout account is not ready for release');
    if (!row.stripeChargeId) throw new HttpError(409, 'Stripe charge reference is not ready yet. Refresh and try again.');
    if (row.stripeTransferId) throw new HttpError(409, 'This stage has already been released');

    let transferAmount: number;
    try { transferAmount = transferAmountForStage(row.milestoneKind, row.paymentAmount ?? row.milestoneAmount, row.quoteTotal); }
    catch (error) { throw new HttpError(409, error instanceof Error ? error.message : 'Payment schedule cannot be released'); }
    if (transferAmount <= 0) throw new HttpError(409, 'The final payment does not leave a positive tradesperson payout after the BuildPair fee');

    const transfer = await getStripe().transfers.create({
      amount: transferAmount,
      currency: 'gbp',
      destination: row.stripeAccountId,
      source_transaction: row.stripeChargeId,
      transfer_group: `buildpair_job_${row.jobId}`,
      metadata: { buildpairJobId: row.jobId, milestoneId: row.milestoneId, traderId: row.traderId, approvedBy: customer.id },
    }, { idempotencyKey: `buildpair-release-${row.milestoneId}-${row.stripePaymentIntentId}` });

    await getSql()`UPDATE payments SET status = 'released', stripe_transfer_id = ${transfer.id}, released_at = now() WHERE id = ${row.paymentId} AND status = 'funded'`;
    await getSql()`UPDATE job_milestones SET status = 'paid', paid_at = now(), release_approved_at = now(), release_approved_by = ${customer.id}, payment_method = 'stripe', payment_confirmed_by = ${customer.id} WHERE id = ${row.milestoneId}`;
    await addJobEvent(row.jobId, customer.id, 'payment_stage_released', `${row.milestoneTitle} approved and released`, `The homeowner approved release of £${((row.paymentAmount ?? row.milestoneAmount) / 100).toFixed(2)} through Stripe.`, { milestoneId: row.milestoneId, stripeTransferId: transfer.id, platformFee: row.platformFee ?? 0 });
    await Promise.allSettled([
      createNotification(row.traderId, { type: 'payment_released', title: `${row.milestoneTitle} released`, body: `${row.jobTitle}: the homeowner approved this stage and BuildPair instructed Stripe to transfer your payout.`, href: `/trader/jobs/${row.jobId}`, email: true }),
      createNotification(customer.id, { type: 'payment_released', title: 'Stage payment released', body: `${row.jobTitle}: ${row.milestoneTitle.toLowerCase()} is recorded as approved and released.`, href: `/customer/jobs/${row.jobId}` }),
    ]);
    return Response.json({ released: true, transferId: transfer.id });
  } catch (error) { return jsonError(error); }
}
