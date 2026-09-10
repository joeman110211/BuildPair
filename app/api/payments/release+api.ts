import { z } from 'zod';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { processingRecoveryForRelease } from '@/lib/payment-protection';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { getStripe } from '@/lib/stripe';

const schema = z.discriminatedUnion('action', [
  z.object({ milestoneId: z.uuid(), action: z.literal('release'), acknowledgedReleaseResponsibility: z.literal(true) }),
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
  stripeAccountId: string | null;
  stripePayoutsEnabled: boolean;
  paymentId: string | null;
  paymentStatus: 'requires_payment' | 'processing' | 'funded' | 'released' | 'disputed' | 'paid' | 'failed' | 'refunded' | null;
  platformFee: number | null;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  stripeTransferId: string | null;
};

async function stripeProcessingFeeForCharge(chargeId: string) {
  const stripe = getStripe();
  const charge = await stripe.charges.retrieve(chargeId, { expand: ['balance_transaction'] });
  const transaction = charge.balance_transaction;
  if (!transaction) return 0;
  if (typeof transaction === 'string') return Math.max(0, (await stripe.balanceTransactions.retrieve(transaction)).fee);
  return Math.max(0, transaction.fee);
}

async function actualStripeProcessingFeesForJob(jobId: string) {
  const rows = await getSql()`SELECT DISTINCT stripe_charge_id AS "stripeChargeId" FROM payments WHERE job_id = ${jobId} AND stripe_charge_id IS NOT NULL AND status <> 'refunded'` as unknown as { stripeChargeId: string }[];
  const fees = await Promise.all(rows.map((row) => stripeProcessingFeeForCharge(row.stripeChargeId)));
  return fees.reduce((total, fee) => total + fee, 0);
}

async function processingAlreadyRecovered(jobId: string) {
  const rows = await getSql()`SELECT COALESCE(SUM(stripe_processing_fee_recovered), 0)::int AS total FROM payments WHERE job_id = ${jobId} AND status IN ('released', 'paid')` as unknown as { total: number }[];
  return Math.max(0, Number(rows[0]?.total ?? 0));
}

export async function POST(request: Request) {
  try {
    const customer = await requireRole(request, 'customer');
    const input = schema.parse(await request.json());
    const rows = await getSql()`
      SELECT m.id AS "milestoneId", m.title AS "milestoneTitle", m.amount AS "milestoneAmount", m.status AS "milestoneStatus", m.kind AS "milestoneKind",
             j.id AS "jobId", j.title AS "jobTitle", j.customer_id AS "customerId",
             q.trader_id AS "traderId", tp.stripe_account_id AS "stripeAccountId", tp.stripe_payouts_enabled AS "stripePayoutsEnabled",
             p.id AS "paymentId", p.status AS "paymentStatus", p.platform_fee AS "platformFee",
             p.stripe_payment_intent_id AS "stripePaymentIntentId", p.stripe_charge_id AS "stripeChargeId", p.stripe_transfer_id AS "stripeTransferId"
      FROM job_milestones m
      JOIN jobs j ON j.id = m.job_id
      JOIN quotes q ON q.id = m.quote_id
      JOIN trader_profiles tp ON tp.user_id = q.trader_id
      LEFT JOIN LATERAL (
        SELECT * FROM payments px WHERE px.milestone_id = m.id AND px.status IN ('funded', 'disputed', 'released', 'paid') ORDER BY px.created_at DESC LIMIT 1
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
      await createNotification(row.traderId, { type: 'payment_release_paused', title: `${row.milestoneTitle} release paused`, body: `${row.jobTitle}: the homeowner raised an issue before release. Keep all discussion and evidence in BuildPair while it is resolved.`, href: `/trader/jobs/${row.jobId}`, email: true });
      return Response.json({ disputed: true });
    }

    if (row.milestoneKind === 'materials') throw new HttpError(409, 'Materials are released automatically when their payment succeeds');
    if (row.milestoneStatus !== 'completed') throw new HttpError(409, 'The tradesperson must mark the agreed stage complete before you can release it');
    if (row.paymentStatus !== 'funded') throw new HttpError(409, 'This stage is not waiting for release');
    if (!row.stripeAccountId || !row.stripePayoutsEnabled) throw new HttpError(409, 'The tradesperson payout account is not ready for release');
    if (!row.stripeChargeId) throw new HttpError(409, 'Stripe charge reference is not ready yet. Refresh and try again.');
    if (row.stripeTransferId) throw new HttpError(409, 'This stage has already been released');

    let totalStripeFees: number;
    try { totalStripeFees = await actualStripeProcessingFeesForJob(row.jobId); }
    catch (error) {
      console.error('Unable to calculate actual Stripe processing fees before release', error);
      throw new HttpError(503, 'Stripe fee information is not available yet. Refresh and try this release again shortly.');
    }
    const recoveredPreviously = await processingAlreadyRecovered(row.jobId);
    const outstandingStripeFees = Math.max(0, totalStripeFees - recoveredPreviously);
    const buildPairFee = Math.max(0, row.platformFee ?? 0);
    let processing;
    try {
      processing = processingRecoveryForRelease({ milestoneAmount: row.milestoneAmount, platformFee: buildPairFee, outstandingStripeFees, isFinal: row.milestoneKind === 'final' });
    } catch (error) {
      throw new HttpError(409, error instanceof Error ? error.message : 'The final payout cannot cover the remaining processing costs.');
    }
    const transferAmount = row.milestoneAmount - buildPairFee - processing.recovered;
    if (transferAmount <= 0) throw new HttpError(409, 'This payment stage is too small to leave a positive tradesperson payout after the agreed fees. Revise the payment schedule.');

    const stripe = getStripe();
    const transfer = await stripe.transfers.create({
      amount: transferAmount,
      currency: 'gbp',
      destination: row.stripeAccountId,
      source_transaction: row.stripeChargeId,
      transfer_group: `buildpair_job_${row.jobId}`,
      metadata: {
        buildpairJobId: row.jobId,
        milestoneId: row.milestoneId,
        traderId: row.traderId,
        approvedBy: customer.id,
        approvalTermsVersion: '2026-09-10-v3',
        homeownerAcknowledgedReleaseResponsibility: 'true',
        contractStageAmount: String(row.milestoneAmount),
        buildPairFeeAmount: String(buildPairFee),
        stripeProcessingFeesRecovered: String(processing.recovered),
        stripeProcessingFeesRemaining: String(processing.remaining),
        netTraderTransfer: String(transferAmount),
      },
    }, { idempotencyKey: `buildpair-release-v3-${row.milestoneId}-${row.stripePaymentIntentId}` });

    await getSql()`UPDATE payments SET status = 'released', stripe_transfer_id = ${transfer.id}, stripe_processing_fee_recovered = ${processing.recovered}, trader_transfer_amount = ${transferAmount}, released_at = now() WHERE id = ${row.paymentId} AND status = 'funded'`;
    await getSql()`UPDATE job_milestones SET status = 'paid', paid_at = now(), release_approved_at = now(), release_approved_by = ${customer.id}, payment_method = 'stripe', payment_confirmed_by = ${customer.id} WHERE id = ${row.milestoneId}`;

    await addJobEvent(row.jobId, customer.id, 'payment_stage_released', `${row.milestoneTitle} approved and released`, `The homeowner approved the ${formatPence(row.milestoneAmount)} contract stage. BuildPair instructed Stripe to transfer ${formatPence(transferAmount)} to the tradesperson after ${formatPence(processing.recovered)} of actual Stripe processing cost and ${formatPence(buildPairFee)} BuildPair service fee.`, {
      milestoneId: row.milestoneId, stripeTransferId: transfer.id, contractStageAmount: row.milestoneAmount,
      platformFee: buildPairFee, stripeProcessingFees: processing.recovered, stripeProcessingFeesRemaining: processing.remaining,
      netTraderTransfer: transferAmount, approvalTermsVersion: '2026-09-10-v3', homeownerAcknowledgedReleaseResponsibility: true,
    });

    await Promise.allSettled([
      createNotification(row.traderId, { type: 'payment_released', title: `${row.milestoneTitle} released`, body: `${row.jobTitle}: ${formatPence(transferAmount)} was released after the recorded Stripe processing cost and BuildPair labour/service fee.`, href: `/trader/jobs/${row.jobId}`, email: true }),
      createNotification(customer.id, { type: 'payment_released', title: 'Stage payment released', body: `${row.jobTitle}: ${row.milestoneTitle.toLowerCase()} is recorded as approved and released on your instruction.`, href: `/customer/jobs/${row.jobId}` }),
    ]);

    const remaining = await getSql()`SELECT 1 FROM job_milestones WHERE job_id = ${row.jobId} AND status <> 'paid' LIMIT 1`;
    if (!remaining.length) {
      await getSql()`UPDATE jobs SET status = 'completed', updated_at = now() WHERE id = ${row.jobId} AND status = 'in_progress'`;
      await addJobEvent(row.jobId, customer.id, 'protected_job_completed', 'Project payments complete', 'The final protected payment stage was approved and released. The homeowner has been invited to leave a verified review.', { finalMilestoneId: row.milestoneId });
      await Promise.allSettled([
        createNotification(customer.id, { type: 'review_requested', title: `How did ${row.jobTitle} go?`, body: 'The final payment is released. Rate the tradesperson and leave a verified review while the job is fresh in your mind.', href: `/customer/jobs/${row.jobId}`, email: true }),
        createNotification(row.traderId, { type: 'project_completed', title: 'Project payment schedule complete', body: `${row.jobTitle}: every protected stage has been released and the homeowner has been invited to review the work.`, href: `/trader/jobs/${row.jobId}`, email: true }),
      ]);
    }

    return Response.json({ released: true, transferId: transfer.id, contractStageAmount: row.milestoneAmount, buildPairFee, stripeProcessingFees: processing.recovered, stripeProcessingFeesRemaining: processing.remaining, netTraderTransfer: transferAmount, projectCompleted: !remaining.length });
  } catch (error) { return jsonError(error); }
}

function formatPence(value: number) { return `£${(value / 100).toFixed(2)}`; }
