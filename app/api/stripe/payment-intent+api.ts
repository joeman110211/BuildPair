import { z } from 'zod';
import { allocateCustomerBuildPayFee } from '@/lib/buildpay-fees';
import { stagePlatformFee, validateStripeStageAmount, type FeeStage } from '@/lib/payment-protection';
import { platformFeePercent } from '@/lib/platform-fee';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { getStripe, providerReturnUrl } from '@/lib/stripe';

const schema = z.object({
  milestoneId: z.uuid().optional(),
  milestoneIds: z.array(z.uuid()).min(1).max(2).optional(),
  platform: z.enum(['native', 'web']).default('native'),
}).refine((value) => Boolean(value.milestoneId || value.milestoneIds?.length), { message: 'At least one payment stage is required' });

type StageRow = {
  milestoneId: string;
  milestoneTitle: string;
  milestoneAmount: number;
  milestoneStatus: 'pending' | 'funded' | 'completed' | 'paid' | 'disputed';
  milestoneKind: 'materials' | 'deposit' | 'stage' | 'final';
  sortOrder: number;
  jobId: string;
  jobTitle: string;
  customerId: string;
  paymentMode: 'undecided' | 'buildpair' | 'external';
  buildPayFeeMode: 'trader_absorbs' | 'customer_pays' | null;
  buildPayCustomerFeeTotal: number;
  startAgreedAt: string | null;
  traderId: string;
  quoteId: string;
  quoteTotal: number;
  laborCost: number;
  materialsCost: number;
  stripeAccountId: string | null;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
};

type BatchRow = { id: string };

export async function POST(request: Request) {
  try {
    const customer = await requireRole(request, 'customer');
    const input = schema.parse(await request.json());
    const requestedIds = [...new Set(input.milestoneIds?.length ? input.milestoneIds : [input.milestoneId!])];
    const firstId = requestedIds[0]!;

    const firstRows = await getSql()`
      SELECT m.id AS "milestoneId", m.title AS "milestoneTitle", m.amount AS "milestoneAmount", m.status AS "milestoneStatus", m.kind AS "milestoneKind", m.sort_order AS "sortOrder",
             j.id AS "jobId", j.title AS "jobTitle", j.customer_id AS "customerId", j.payment_mode AS "paymentMode",
             j.buildpay_fee_mode AS "buildPayFeeMode", j.buildpay_customer_fee_total AS "buildPayCustomerFeeTotal", j.start_agreed_at AS "startAgreedAt",
             q.trader_id AS "traderId", q.id AS "quoteId", q.total_amount AS "quoteTotal", q.labor_cost AS "laborCost", q.materials_cost AS "materialsCost",
             tp.stripe_account_id AS "stripeAccountId", tp.stripe_charges_enabled AS "stripeChargesEnabled", tp.stripe_payouts_enabled AS "stripePayoutsEnabled"
      FROM job_milestones m
      JOIN jobs j ON j.id = m.job_id
      JOIN quotes q ON q.id = m.quote_id
      JOIN trader_profiles tp ON tp.user_id = q.trader_id
      WHERE m.id = ${firstId}
      LIMIT 1
    ` as unknown as StageRow[];
    const first = firstRows[0];
    if (!first || first.customerId !== customer.id) throw new HttpError(404, 'Payment stage not found');
    if (first.paymentMode !== 'buildpair') throw new HttpError(409, 'Choose BuildPay on the job before making this payment');
    if (!first.startAgreedAt) throw new HttpError(409, 'Confirm the agreed job start date and time before making the first BuildPay payment');
    if (!first.stripeAccountId || (!first.stripePayoutsEnabled && !first.stripeChargesEnabled)) throw new HttpError(409, 'The tradesperson must complete Stripe payout setup before BuildPay can take this payment');

    const allRows = await getSql()`
      SELECT m.id AS "milestoneId", m.title AS "milestoneTitle", m.amount AS "milestoneAmount", m.status AS "milestoneStatus", m.kind AS "milestoneKind", m.sort_order AS "sortOrder",
             j.id AS "jobId", j.title AS "jobTitle", j.customer_id AS "customerId", j.payment_mode AS "paymentMode",
             j.buildpay_fee_mode AS "buildPayFeeMode", j.buildpay_customer_fee_total AS "buildPayCustomerFeeTotal", j.start_agreed_at AS "startAgreedAt",
             q.trader_id AS "traderId", q.id AS "quoteId", q.total_amount AS "quoteTotal", q.labor_cost AS "laborCost", q.materials_cost AS "materialsCost",
             tp.stripe_account_id AS "stripeAccountId", tp.stripe_charges_enabled AS "stripeChargesEnabled", tp.stripe_payouts_enabled AS "stripePayoutsEnabled"
      FROM job_milestones m
      JOIN jobs j ON j.id = m.job_id
      JOIN quotes q ON q.id = m.quote_id
      JOIN trader_profiles tp ON tp.user_id = q.trader_id
      WHERE m.job_id = ${first.jobId}
      ORDER BY m.sort_order ASC
    ` as unknown as StageRow[];

    const requested = allRows.filter((stage) => requestedIds.includes(stage.milestoneId));
    if (requested.length !== requestedIds.length) throw new HttpError(400, 'All BuildPay stages in one payment must belong to the same job');
    const orderedRequested = requested.sort((a, b) => a.sortOrder - b.sortOrder);
    if (orderedRequested.some((stage) => stage.milestoneStatus !== 'pending')) throw new HttpError(409, 'One of these BuildPay stages has already been funded or completed');

    const firstOutstanding = allRows.find((stage) => stage.milestoneStatus !== 'paid');
    if (!firstOutstanding || firstOutstanding.milestoneId !== orderedRequested[0]?.milestoneId) {
      throw new HttpError(409, `${firstOutstanding?.milestoneTitle ?? 'The next agreed stage'} must be dealt with before another BuildPay payment can be taken`);
    }
    for (let index = 1; index < orderedRequested.length; index += 1) {
      if (orderedRequested[index]!.sortOrder !== orderedRequested[index - 1]!.sortOrder + 1) throw new HttpError(409, 'BuildPay can only fund consecutive agreed stages together');
    }
    if (orderedRequested.length > 1 && orderedRequested[0]?.milestoneKind !== 'materials') {
      throw new HttpError(409, 'Only the opening materials payment can be combined with the first protected work stage');
    }

    const milestoneRows: FeeStage[] = allRows.map((stage) => ({ id: stage.milestoneId, amount: stage.milestoneAmount, kind: stage.milestoneKind, sortOrder: stage.sortOrder }));
    const customerFeeByStage = allocateCustomerBuildPayFee(
      allRows.map((stage) => ({ id: stage.milestoneId, amount: stage.milestoneAmount, sortOrder: stage.sortOrder })),
      first.buildPayFeeMode === 'customer_pays' ? first.buildPayCustomerFeeTotal : 0,
    );
    const allocations = orderedRequested.map((stage) => ({
      stage,
      fee: stagePlatformFee(stage.milestoneId, milestoneRows, first.laborCost),
      customerFee: customerFeeByStage.get(stage.milestoneId) ?? 0,
    }));
    const totalAmount = allocations.reduce((sum, item) => sum + item.stage.milestoneAmount, 0);
    const totalPlatformFee = allocations.reduce((sum, item) => sum + item.fee, 0);
    const totalCustomerFee = allocations.reduce((sum, item) => sum + item.customerFee, 0);
    const checkoutAmount = totalAmount + totalCustomerFee;
    validateStripeStageAmount(checkoutAmount);
    if (first.buildPayFeeMode !== 'customer_pays' && allocations.some((item) => item.stage.milestoneKind !== 'materials' && item.fee >= item.stage.milestoneAmount)) {
      throw new HttpError(409, 'One of the work stages is too small to cover its allocated BuildPair fee. Revise the payment schedule.');
    }

    // A cancelled/unpaid checkout must not permanently lock the same milestones.
    await getSql()`
      DELETE FROM buildpay_funding_batches b
      WHERE b.job_id = ${first.jobId} AND b.status = 'requires_payment'
        AND EXISTS (
          SELECT 1 FROM buildpay_funding_allocations a
          WHERE a.batch_id = b.id AND a.milestone_id = ANY(${requestedIds}::uuid[])
        )
    `;

    const batches = await getSql()`
      INSERT INTO buildpay_funding_batches(job_id, quote_id, customer_id, trader_id, total_amount, customer_fee_amount, checkout_amount)
      VALUES (${first.jobId}, ${first.quoteId}, ${customer.id}, ${first.traderId}, ${totalAmount}, ${totalCustomerFee}, ${checkoutAmount})
      RETURNING id
    ` as unknown as BatchRow[];
    const batch = batches[0];
    if (!batch) throw new HttpError(500, 'Could not prepare the BuildPay payment');

    for (const allocation of allocations) {
      await getSql()`
        INSERT INTO buildpay_funding_allocations(batch_id, milestone_id, amount, platform_fee, customer_fee)
        VALUES (${batch.id}, ${allocation.stage.milestoneId}, ${allocation.stage.milestoneAmount}, ${allocation.fee}, ${allocation.customerFee})
      `;
    }

    const transferGroup = `buildpair_job_${first.jobId}`;
    const summary = orderedRequested.map((stage) => stage.milestoneTitle).join(' + ');
    const metadata = {
      buildpairJobId: first.jobId,
      buildpayFundingBatchId: batch.id,
      customerId: customer.id,
      traderId: first.traderId,
      fundingStageCount: String(orderedRequested.length),
      contractAmount: String(totalAmount),
      customerBuildPayFee: String(totalCustomerFee),
      checkoutAmount: String(checkoutAmount),
      buildPayFeeMode: first.buildPayFeeMode ?? 'trader_absorbs',
      platformFeeBase: String(first.laborCost),
      platformFeePercent: String(platformFeePercent()),
      platformFeeAmount: String(totalPlatformFee),
      transferGroup,
    };

    const stripe = getStripe();
    if (input.platform === 'web') {
      const lineItems = [
        { price_data: { currency: 'gbp', product_data: { name: `BuildPay: ${summary}`, description: first.jobTitle }, unit_amount: totalAmount }, quantity: 1 },
        ...(totalCustomerFee > 0 ? [{ price_data: { currency: 'gbp', product_data: { name: 'BuildPay service fee', description: 'Optional BuildPay staged-payment protection and administration' }, unit_amount: totalCustomerFee }, quantity: 1 }] : []),
      ];
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: customer.email ?? undefined,
        line_items: lineItems,
        payment_intent_data: { metadata, transfer_group: transferGroup },
        success_url: providerReturnUrl('payment', 'complete', { jobId: first.jobId }),
        cancel_url: providerReturnUrl('payment', 'cancelled', { jobId: first.jobId }),
        metadata,
      });
      await getSql()`UPDATE buildpay_funding_batches SET stripe_checkout_session_id = ${session.id}, updated_at = now() WHERE id = ${batch.id}`;
      return Response.json({ url: session.url, amount: checkoutAmount, contractAmount: totalAmount, buildPayFee: totalCustomerFee, platformFee: totalPlatformFee, batchId: batch.id });
    }

    const intent = await stripe.paymentIntents.create({
      amount: checkoutAmount,
      currency: 'gbp',
      payment_method_types: ['card'],
      transfer_group: transferGroup,
      metadata,
    });
    await getSql()`UPDATE buildpay_funding_batches SET stripe_payment_intent_id = ${intent.id}, updated_at = now() WHERE id = ${batch.id}`;
    return Response.json({ clientSecret: intent.client_secret, amount: checkoutAmount, contractAmount: totalAmount, buildPayFee: totalCustomerFee, platformFee: totalPlatformFee, batchId: batch.id });
  } catch (error) { return jsonError(error); }
}
