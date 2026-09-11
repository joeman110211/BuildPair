import { z } from 'zod';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { getStripe } from '@/lib/stripe';

const schema = z.object({ batchId: z.uuid(), acknowledgedResponsibility: z.literal(true) });

type BatchRow = {
  id: string;
  jobId: string;
  jobTitle: string;
  customerId: string;
  traderId: string;
  status: 'requires_payment' | 'funded' | 'partially_released' | 'released' | 'disputed' | 'failed' | 'refunded';
  stripeChargeId: string | null;
  stripeAccountId: string | null;
  stripePayoutsEnabled: boolean;
  acknowledgedAt: string | null;
};

type MaterialsAllocation = {
  allocationId: string;
  milestoneId: string;
  milestoneTitle: string;
  amount: number;
  status: 'pending' | 'funded' | 'released' | 'disputed' | 'refunded';
  stripeTransferId: string | null;
};

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const input = schema.parse(await request.json());
    const rows = await getSql()`
      SELECT b.id, b.job_id AS "jobId", j.title AS "jobTitle", b.customer_id AS "customerId", b.trader_id AS "traderId",
             b.status, b.stripe_charge_id AS "stripeChargeId", b.acknowledged_at AS "acknowledgedAt",
             tp.stripe_account_id AS "stripeAccountId", tp.stripe_payouts_enabled AS "stripePayoutsEnabled"
      FROM buildpay_funding_batches b
      JOIN jobs j ON j.id = b.job_id
      JOIN trader_profiles tp ON tp.user_id = b.trader_id
      WHERE b.id = ${input.batchId}
      LIMIT 1
    ` as unknown as BatchRow[];
    const batch = rows[0];
    if (!batch || batch.traderId !== trader.id) throw new HttpError(404, 'BuildPay payment not found');
    if (!['funded', 'partially_released'].includes(batch.status)) throw new HttpError(409, 'This BuildPay payment is not waiting for acknowledgement');
    if (!batch.stripeChargeId) throw new HttpError(409, 'Stripe has not finished confirming this payment yet');
    if (!batch.stripeAccountId || !batch.stripePayoutsEnabled) throw new HttpError(409, 'Your Stripe payout account must be ready before materials can be released');

    const materialRows = await getSql()`
      SELECT a.id AS "allocationId", a.milestone_id AS "milestoneId", m.title AS "milestoneTitle", a.amount, a.status,
             a.stripe_transfer_id AS "stripeTransferId"
      FROM buildpay_funding_allocations a
      JOIN job_milestones m ON m.id = a.milestone_id
      WHERE a.batch_id = ${batch.id} AND m.kind = 'materials'
      ORDER BY m.sort_order ASC
    ` as unknown as MaterialsAllocation[];
    const materials = materialRows[0];

    if (!materials) {
      await getSql()`UPDATE buildpay_funding_batches SET acknowledged_at = COALESCE(acknowledged_at, now()), updated_at = now() WHERE id = ${batch.id}`;
      await addJobEvent(batch.jobId, trader.id, 'buildpay_funding_acknowledged', 'BuildPay funding acknowledged', 'The tradesperson confirmed they had seen the funded BuildPay stage and were ready to proceed.', { fundingBatchId: batch.id, acknowledgedResponsibility: true });
      return Response.json({ acknowledged: true, materialsReleased: false });
    }

    if (materials.status === 'released' && materials.stripeTransferId) {
      return Response.json({ acknowledged: true, materialsReleased: true, transferId: materials.stripeTransferId, amount: materials.amount });
    }
    if (materials.status !== 'funded') throw new HttpError(409, 'The materials amount is not ready to release');

    const stripe = getStripe();
    const transfer = await stripe.transfers.create({
      amount: materials.amount,
      currency: 'gbp',
      destination: batch.stripeAccountId,
      source_transaction: batch.stripeChargeId,
      transfer_group: `buildpair_job_${batch.jobId}`,
      metadata: {
        buildpairJobId: batch.jobId,
        fundingBatchId: batch.id,
        milestoneId: materials.milestoneId,
        traderId: batch.traderId,
        releaseReason: 'materials_after_trader_acknowledgement',
        contractMaterialsAmount: String(materials.amount),
      },
    }, { idempotencyKey: `buildpay-materials-v4-${materials.milestoneId}-${batch.id}` });

    await getSql()`
      UPDATE buildpay_funding_allocations
      SET status = 'released', stripe_transfer_id = ${transfer.id}, trader_transfer_amount = ${materials.amount}, released_at = now(), updated_at = now()
      WHERE id = ${materials.allocationId} AND status = 'funded'
    `;
    await getSql()`
      UPDATE job_milestones
      SET status = 'paid', paid_at = now(), payment_method = 'stripe', payment_confirmed_by = ${trader.id}
      WHERE id = ${materials.milestoneId} AND status = 'funded'
    `;
    const stillFunded = await getSql()`SELECT 1 FROM buildpay_funding_allocations WHERE batch_id = ${batch.id} AND status IN ('funded','disputed') LIMIT 1`;
    await getSql()`
      UPDATE buildpay_funding_batches
      SET acknowledged_at = COALESCE(acknowledged_at, now()), status = ${stillFunded.length ? 'partially_released' : 'released'}, updated_at = now()
      WHERE id = ${batch.id}
    `;

    await addJobEvent(batch.jobId, trader.id, 'materials_payment_released', `${materials.milestoneTitle} released`, `The tradesperson acknowledged the first BuildPay payment and accepted responsibility to obtain the quoted materials and contact the homeowner about starting the job. BuildPair instructed Stripe to transfer the exact ${formatPence(materials.amount)} materials amount to the connected payout account.`, {
      fundingBatchId: batch.id,
      milestoneId: materials.milestoneId,
      stripeTransferId: transfer.id,
      materialsAmount: materials.amount,
      acknowledgedResponsibility: true,
    });
    await Promise.allSettled([
      createNotification(batch.customerId, {
        type: 'materials_payment_released',
        title: `Materials released · ${formatPence(materials.amount)}`,
        body: `${batch.jobTitle}: the tradesperson acknowledged the first BuildPay payment. The quoted materials amount has now been released to their connected payout account; the funded work stage remains protected.`,
        href: `/customer/jobs/${batch.jobId}`,
        email: true,
      }),
      createNotification(batch.traderId, {
        type: 'materials_payment_released',
        title: `Materials released · ${formatPence(materials.amount)}`,
        body: `${batch.jobTitle}: the materials amount has been released to your connected payout account. You are now responsible for obtaining the quoted materials, contacting the homeowner and starting in line with the agreed project record.`,
        href: `/trader/jobs/${batch.jobId}`,
      }),
    ]);

    return Response.json({ acknowledged: true, materialsReleased: true, transferId: transfer.id, amount: materials.amount });
  } catch (error) { return jsonError(error); }
}

function formatPence(value: number) { return `£${(value / 100).toFixed(2)}`; }
