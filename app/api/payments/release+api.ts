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
  buildPayFeeMode: 'trader_absorbs' | 'customer_pays' | null;
  traderId: string;
  stripeAccountId: string | null;
  stripePayoutsEnabled: boolean;
  allocationId: string | null;
  allocationStatus: 'pending' | 'funded' | 'released' | 'disputed' | 'refunded' | null;
  allocationPlatformFee: number | null;
  allocationTransferId: string | null;
  fundingBatchId: string | null;
  batchPaymentIntentId: string | null;
  batchChargeId: string | null;
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
  const newRows = await getSql()`
    SELECT COALESCE(SUM(a.stripe_processing_fee_recovered), 0)::int AS total
    FROM buildpay_funding_allocations a
    JOIN buildpay_funding_batches b ON b.id = a.batch_id
    WHERE b.job_id = ${jobId} AND a.status = 'released'
  ` as unknown as { total: number }[];
  const legacyRows = await getSql()`
    SELECT COALESCE(SUM(stripe_processing_fee_recovered), 0)::int AS total
    FROM payments
    WHERE job_id = ${jobId} AND funding_batch_id IS NULL AND status IN ('released','paid')
  ` as unknown as { total: number }[];
  return Math.max(0, Number(newRows[0]?.total ?? 0)) + Math.max(0, Number(legacyRows[0]?.total ?? 0));
}

async function releaseRow(milestoneId: string) {
  const rows = await getSql()`
    SELECT m.id AS "milestoneId", m.title AS "milestoneTitle", m.amount AS "milestoneAmount", m.status AS "milestoneStatus", m.kind AS "milestoneKind",
           j.id AS "jobId", j.title AS "jobTitle", j.customer_id AS "customerId", j.buildpay_fee_mode AS "buildPayFeeMode",
           q.trader_id AS "traderId", tp.stripe_account_id AS "stripeAccountId", tp.stripe_payouts_enabled AS "stripePayoutsEnabled",
           a.id AS "allocationId", a.status AS "allocationStatus", a.platform_fee AS "allocationPlatformFee", a.stripe_transfer_id AS "allocationTransferId",
           b.id AS "fundingBatchId", b.stripe_payment_intent_id AS "batchPaymentIntentId", b.stripe_charge_id AS "batchChargeId",
           COALESCE(bp.id, lp.id) AS "paymentId", COALESCE(bp.status, lp.status) AS "paymentStatus",
           lp.platform_fee AS "platformFee", COALESCE(bp.stripe_payment_intent_id, lp.stripe_payment_intent_id) AS "stripePaymentIntentId",
           COALESCE(bp.stripe_charge_id, lp.stripe_charge_id) AS "stripeChargeId", lp.stripe_transfer_id AS "stripeTransferId"
    FROM job_milestones m
    JOIN jobs j ON j.id = m.job_id
    JOIN quotes q ON q.id = m.quote_id
    JOIN trader_profiles tp ON tp.user_id = q.trader_id
    LEFT JOIN buildpay_funding_allocations a ON a.milestone_id = m.id
    LEFT JOIN buildpay_funding_batches b ON b.id = a.batch_id
    LEFT JOIN LATERAL (
      SELECT * FROM payments px WHERE px.funding_batch_id = b.id ORDER BY px.created_at DESC LIMIT 1
    ) bp ON b.id IS NOT NULL
    LEFT JOIN LATERAL (
      SELECT * FROM payments px WHERE px.milestone_id = m.id AND px.funding_batch_id IS NULL AND px.status IN ('funded','disputed','released','paid') ORDER BY px.created_at DESC LIMIT 1
    ) lp ON true
    WHERE m.id = ${milestoneId}
    LIMIT 1
  ` as unknown as ReleaseRow[];
  return rows[0];
}

export async function POST(request: Request) {
  try {
    const customer = await requireRole(request, 'customer');
    const input = schema.parse(await request.json());
    const row = await releaseRow(input.milestoneId);
    if (!row || row.customerId !== customer.id) throw new HttpError(404, 'Payment stage not found');
    if (!row.paymentId || !row.stripePaymentIntentId) throw new HttpError(409, 'This stage has not been funded through BuildPay');

    const usesFundingBatch = Boolean(row.allocationId && row.fundingBatchId);
    const effectivePaymentStatus = usesFundingBatch ? row.allocationStatus : row.paymentStatus;

    if (input.action === 'dispute') {
      if (!['funded', 'completed'].includes(row.milestoneStatus) || effectivePaymentStatus !== 'funded') throw new HttpError(409, 'This payment stage cannot be paused at its current state');
      await getSql()`UPDATE job_milestones SET status = 'disputed', disputed_at = now(), dispute_reason = ${input.reason}, dispute_status = 'open' WHERE id = ${row.milestoneId}`;
      if (usesFundingBatch) {
        await getSql()`UPDATE buildpay_funding_allocations SET status = 'disputed', updated_at = now() WHERE id = ${row.allocationId}`;
        await getSql()`UPDATE buildpay_funding_batches SET status = 'disputed', updated_at = now() WHERE id = ${row.fundingBatchId}`;
      } else {
        await getSql()`UPDATE payments SET status = 'disputed', disputed_at = now() WHERE id = ${row.paymentId}`;
      }
      await addJobEvent(row.jobId, customer.id, 'payment_release_paused', `${row.milestoneTitle} release paused`, input.reason, { milestoneId: row.milestoneId, fundingBatchId: row.fundingBatchId });
      await createNotification(row.traderId, { type: 'payment_release_paused', title: `${row.milestoneTitle} release paused`, body: `${row.jobTitle}: the homeowner raised an issue before release. Keep all discussion and evidence in BuildPair while it is resolved.`, href: `/trader/jobs/${row.jobId}`, email: true });
      return Response.json({ disputed: true });
    }

    if (row.milestoneKind === 'materials') throw new HttpError(409, 'Materials are released only after you fund the opening BuildPay payment and the tradesperson acknowledges it');
    const earlierStages = await getSql()`
      SELECT title, status
      FROM job_milestones
      WHERE job_id = ${row.jobId}
        AND sort_order < (SELECT sort_order FROM job_milestones WHERE id = ${row.milestoneId})
      ORDER BY sort_order ASC
    ` as unknown as { title: string; status: string }[];
    const unfinishedEarlierStage = earlierStages.find((stage) => stage.status !== 'paid');
    if (unfinishedEarlierStage) throw new HttpError(409, `${unfinishedEarlierStage.title} must be released before this stage can be released`);
    if (row.milestoneStatus !== 'completed') throw new HttpError(409, 'The tradesperson must mark the agreed stage complete before you can release it');
    if (effectivePaymentStatus !== 'funded') throw new HttpError(409, 'This stage is not waiting for release');
    if (!row.stripeAccountId || !row.stripePayoutsEnabled) throw new HttpError(409, 'The tradesperson payout account is not ready for release');
    const chargeId = usesFundingBatch ? row.batchChargeId : row.stripeChargeId;
    const paymentIntentId = usesFundingBatch ? row.batchPaymentIntentId : row.stripePaymentIntentId;
    if (!chargeId || !paymentIntentId) throw new HttpError(409, 'Stripe charge reference is not ready yet. Refresh and try again.');
    if ((usesFundingBatch && row.allocationTransferId) || (!usesFundingBatch && row.stripeTransferId)) throw new HttpError(409, 'This stage has already been released');

    const buildPairFee = Math.max(0, usesFundingBatch ? row.allocationPlatformFee ?? 0 : row.platformFee ?? 0);
    const customerPaysBuildPay = row.buildPayFeeMode === 'customer_pays';
    let processing = { recovered: 0, remaining: 0 };
    let transferAmount = row.milestoneAmount;

    if (!customerPaysBuildPay) {
      let totalStripeFees: number;
      try { totalStripeFees = await actualStripeProcessingFeesForJob(row.jobId); }
      catch (error) {
        console.error('Unable to calculate actual Stripe processing fees before release', error);
        throw new HttpError(503, 'Stripe fee information is not available yet. Refresh and try this release again shortly.');
      }
      const recoveredPreviously = await processingAlreadyRecovered(row.jobId);
      const outstandingStripeFees = Math.max(0, totalStripeFees - recoveredPreviously);
      try {
        processing = processingRecoveryForRelease({ milestoneAmount: row.milestoneAmount, platformFee: buildPairFee, outstandingStripeFees, isFinal: row.milestoneKind === 'final' });
      } catch (error) {
        throw new HttpError(409, error instanceof Error ? error.message : 'The final payout cannot cover the remaining processing costs.');
      }
      transferAmount = row.milestoneAmount - buildPairFee - processing.recovered;
      if (transferAmount <= 0) throw new HttpError(409, 'This payment stage is too small to leave a positive tradesperson payout after the agreed fees. Revise the payment schedule.');
    }

    const stripe = getStripe();
    const transfer = await stripe.transfers.create({
      amount: transferAmount,
      currency: 'gbp',
      destination: row.stripeAccountId,
      source_transaction: chargeId,
      transfer_group: `buildpair_job_${row.jobId}`,
      metadata: {
        buildpairJobId: row.jobId,
        fundingBatchId: row.fundingBatchId ?? '',
        milestoneId: row.milestoneId,
        traderId: row.traderId,
        approvedBy: customer.id,
        approvalTermsVersion: '2026-09-13-v5',
        homeownerAcknowledgedReleaseResponsibility: 'true',
        contractStageAmount: String(row.milestoneAmount),
        buildPayFeeMode: row.buildPayFeeMode ?? 'trader_absorbs',
        buildPairFeeAmount: String(buildPairFee),
        buildPairFeeDeductedFromTrader: String(customerPaysBuildPay ? 0 : buildPairFee),
        stripeProcessingFeesRecoveredFromTrader: String(processing.recovered),
        stripeProcessingFeesRemainingToRecoverFromTrader: String(processing.remaining),
        netTraderTransfer: String(transferAmount),
      },
    }, { idempotencyKey: `buildpay-release-v5-${row.milestoneId}-${paymentIntentId}` });

    if (usesFundingBatch) {
      await getSql()`
        UPDATE buildpay_funding_allocations
        SET status = 'released', stripe_transfer_id = ${transfer.id}, stripe_processing_fee_recovered = ${processing.recovered},
            trader_transfer_amount = ${transferAmount}, released_at = now(), updated_at = now()
        WHERE id = ${row.allocationId} AND status = 'funded'
      `;
      await getSql()`
        UPDATE payments
        SET stripe_processing_fee_recovered = COALESCE(stripe_processing_fee_recovered, 0) + ${processing.recovered},
            trader_transfer_amount = COALESCE(trader_transfer_amount, 0) + ${transferAmount}
        WHERE id = ${row.paymentId}
      `;
      const remainingAllocations = await getSql()`SELECT status FROM buildpay_funding_allocations WHERE batch_id = ${row.fundingBatchId} AND status IN ('pending','funded','disputed') LIMIT 1` as unknown as { status: string }[];
      const nextBatchStatus = remainingAllocations[0]?.status === 'disputed' ? 'disputed' : remainingAllocations.length ? 'partially_released' : 'released';
      await getSql()`UPDATE buildpay_funding_batches SET status = ${nextBatchStatus}, updated_at = now() WHERE id = ${row.fundingBatchId}`;
      if (!remainingAllocations.length) await getSql()`UPDATE payments SET status = 'released', released_at = COALESCE(released_at, now()) WHERE id = ${row.paymentId}`;
    } else {
      await getSql()`UPDATE payments SET status = 'released', stripe_transfer_id = ${transfer.id}, stripe_processing_fee_recovered = ${processing.recovered}, trader_transfer_amount = ${transferAmount}, released_at = now() WHERE id = ${row.paymentId} AND status = 'funded'`;
    }
    await getSql()`UPDATE job_milestones SET status = 'paid', paid_at = now(), release_approved_at = now(), release_approved_by = ${customer.id}, payment_method = 'stripe', payment_confirmed_by = ${customer.id} WHERE id = ${row.milestoneId}`;

    const releaseDescription = customerPaysBuildPay
      ? `The homeowner approved the ${formatPence(row.milestoneAmount)} contract stage. Because the homeowner is paying the agreed BuildPay service fee separately, the full ${formatPence(transferAmount)} contract stage was instructed for transfer to the tradesperson with no BuildPair or Stripe fee deducted from this payout.`
      : `The homeowner approved the ${formatPence(row.milestoneAmount)} contract stage. BuildPair instructed Stripe to transfer ${formatPence(transferAmount)} to the tradesperson after ${formatPence(processing.recovered)} of actual Stripe processing cost and ${formatPence(buildPairFee)} BuildPair service fee.`;
    await addJobEvent(row.jobId, customer.id, 'payment_stage_released', `${row.milestoneTitle} approved and released`, releaseDescription, {
      milestoneId: row.milestoneId, fundingBatchId: row.fundingBatchId, stripeTransferId: transfer.id, contractStageAmount: row.milestoneAmount,
      buildPayFeeMode: row.buildPayFeeMode ?? 'trader_absorbs', platformFee: buildPairFee,
      platformFeeDeductedFromTrader: customerPaysBuildPay ? 0 : buildPairFee,
      stripeProcessingFeesRecovered: processing.recovered, stripeProcessingFeesRemaining: processing.remaining,
      netTraderTransfer: transferAmount, approvalTermsVersion: '2026-09-13-v5', homeownerAcknowledgedReleaseResponsibility: true,
    });

    const nextRows = await getSql()`SELECT id, title, amount, kind FROM job_milestones WHERE job_id = ${row.jobId} AND status <> 'paid' ORDER BY sort_order ASC LIMIT 1` as unknown as { id: string; title: string; amount: number; kind: string }[];
    const next = nextRows[0];
    await Promise.allSettled([
      createNotification(row.traderId, { type: 'payment_released', title: `${row.milestoneTitle} released`, body: customerPaysBuildPay
        ? `${row.jobTitle}: the full contract stage of ${formatPence(transferAmount)} was released. The homeowner is covering the agreed BuildPay service fee separately.`
        : `${row.jobTitle}: ${formatPence(transferAmount)} was released after the recorded Stripe processing cost and BuildPair labour/service fee.`, href: `/trader/jobs/${row.jobId}`, email: true }),
      createNotification(customer.id, { type: 'payment_released', title: next ? `${row.milestoneTitle} released · next payment ready` : 'Final payment released', body: next ? `${row.jobTitle}: ${row.milestoneTitle.toLowerCase()} is released. You can now fund ${next.title} (${formatPence(next.amount)}) without leaving the project flow.` : `${row.jobTitle}: the final payment is released and the BuildPay schedule is complete.`, href: `/customer/jobs/${row.jobId}` }),
    ]);

    if (!next) {
      await getSql()`UPDATE jobs SET status = 'completed', updated_at = now() WHERE id = ${row.jobId} AND status = 'in_progress'`;
      await addJobEvent(row.jobId, customer.id, 'protected_job_completed', 'BuildPay project complete', 'The final protected payment stage was approved and released. The project is complete and the homeowner has been invited to leave a verified review.', { finalMilestoneId: row.milestoneId });
      await Promise.allSettled([
        createNotification(customer.id, { type: 'review_requested', title: `How did ${row.jobTitle} go?`, body: 'The final BuildPay payment is released. Rate the tradesperson and leave a verified review while the job is fresh in your mind.', href: `/customer/jobs/${row.jobId}`, email: true }),
        createNotification(row.traderId, { type: 'project_completed', title: 'BuildPay project complete', body: `${row.jobTitle}: every agreed BuildPay stage has been released and the homeowner has been invited to review the work.`, href: `/trader/jobs/${row.jobId}`, email: true }),
      ]);
    }

    return Response.json({ released: true, transferId: transfer.id, contractStageAmount: row.milestoneAmount, buildPayFeeMode: row.buildPayFeeMode ?? 'trader_absorbs', buildPairFee, buildPairFeeDeductedFromTrader: customerPaysBuildPay ? 0 : buildPairFee, stripeProcessingFees: processing.recovered, stripeProcessingFeesRemaining: processing.remaining, netTraderTransfer: transferAmount, projectCompleted: !next, nextMilestone: next ?? null });
  } catch (error) { return jsonError(error); }
}

function formatPence(value: number) { return `£${(value / 100).toFixed(2)}`; }
