import type Stripe from 'stripe';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { isImmediatelyReleasedStage } from '@/lib/payment-protection';
import { getSql } from '@/lib/sql';
import { getStripe } from '@/lib/stripe';
import { subscriptionProduct } from '@/lib/billing-plans';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  if (!signature || secrets.length === 0) return new Response('Webhook not configured', { status: 400 });

  try {
    const payload = await request.text();
    const stripe = getStripe();
    let event: Stripe.Event | undefined;
    for (const secret of secrets) {
      try { event = await stripe.webhooks.constructEventAsync(payload, signature, secret); break; }
      catch { /* Platform and Connect destinations have different signing secrets. */ }
    }
    if (!event) return new Response('Invalid webhook', { status: 400 });
    // Never allow a test-mode Stripe event to grant production memberships (or vice versa).
    // The current API key defines the connected Stripe account mode, not any client metadata.
    const apiKey = process.env.STRIPE_SECRET_KEY?.trim() ?? '';
    const expectedLive = /^(sk|rk)_live_/.test(apiKey) ? true : /^(sk|rk)_test_/.test(apiKey) ? false : null;
    if (expectedLive !== null && event.livemode !== expectedLive) {
      return new Response('Stripe webhook mode mismatch', { status: 400 });
    }
    await handleEvent(event);
    return Response.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook processing failed', error instanceof Error ? error.name : 'unknown');
    return new Response('Webhook processing failed', { status: 500 });
  }
}

type PaidTier = 'core' | 'basic' | 'featured';
function effectiveTier(paidTier: PaidTier | null, complimentaryTier: PaidTier | null): 'free' | PaidTier {
  if (paidTier === 'featured' || complimentaryTier === 'featured') return 'featured';
  if (paidTier === 'basic' || complimentaryTier === 'basic') return 'basic';
  if (paidTier === 'core' || complimentaryTier === 'core') return 'core';
  return 'free';
}

async function syncSubscriptionState(userId: string, subscription: Stripe.Subscription, tier: PaidTier) {
  const active = ['active', 'trialing'].includes(subscription.status);
  const paidTier = active ? tier : null;
  const rows = await getSql()`SELECT complimentary_tier AS "complimentaryTier", trial_ends_at > now() AS "introductoryAccess", stripe_subscription_id AS "subscriptionId" FROM trader_profiles WHERE user_id = ${userId} LIMIT 1` as { complimentaryTier: PaidTier | null; introductoryAccess: boolean; subscriptionId?: string | null }[];
  // A delayed cancellation for an older contract must not revoke its replacement.
  if (!active && rows[0]?.subscriptionId && rows[0].subscriptionId !== subscription.id) return;
  const complimentaryTier = rows[0]?.complimentaryTier ?? null;
  const effective = effectiveTier(paidTier, rows[0]?.introductoryAccess ? 'featured' : complimentaryTier);
  await getSql()`UPDATE trader_profiles SET stripe_subscription_id = ${subscription.id}, paid_subscription_tier = ${paidTier}::subscription_tier, subscription_tier = ${effective}::subscription_tier, is_subscription_active = ${Boolean(paidTier || complimentaryTier)}, updated_at = now() WHERE user_id = ${userId}`;
}

async function clearPaidSubscription(subscriptionId: string) {
  const rows = await getSql()`SELECT user_id AS "userId", complimentary_tier AS "complimentaryTier", trial_ends_at > now() AS "introductoryAccess" FROM trader_profiles WHERE stripe_subscription_id = ${subscriptionId} LIMIT 1` as { userId: string; complimentaryTier: PaidTier | null; introductoryAccess: boolean }[];
  const profile = rows[0];
  if (!profile) return;
  const effective = effectiveTier(null, profile.introductoryAccess ? 'featured' : profile.complimentaryTier);
  await getSql()`UPDATE trader_profiles SET stripe_subscription_id = NULL, paid_subscription_tier = NULL, subscription_tier = ${effective}::subscription_tier, is_subscription_active = ${Boolean(profile.complimentaryTier)}, updated_at = now() WHERE user_id = ${profile.userId}`;
}

async function syncProjectPlusSubscription(userId: string, subscription: Stripe.Subscription) {
  const active = ['active', 'trialing'].includes(subscription.status);
  await getSql()`
    UPDATE users
    SET project_plus_active = ${active},
        project_plus_stripe_subscription_id = ${active ? subscription.id : null},
        updated_at = now()
    WHERE id = ${userId}
      AND (${active} OR project_plus_stripe_subscription_id IS NULL OR project_plus_stripe_subscription_id = ${subscription.id})
  `;
}

async function clearProjectPlusSubscription(subscriptionId: string) {
  await getSql()`
    UPDATE users
    SET project_plus_active = false,
        project_plus_stripe_subscription_id = NULL,
        updated_at = now()
    WHERE project_plus_stripe_subscription_id = ${subscriptionId}
  `;
}

function chargeIdFromIntent(intent: Stripe.PaymentIntent) {
  return typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id ?? null;
}

async function resolveChargeId(intent: Stripe.PaymentIntent) {
  const direct = chargeIdFromIntent(intent);
  if (direct) return direct;
  const expanded = await getStripe().paymentIntents.retrieve(intent.id, { expand: ['latest_charge'] });
  return chargeIdFromIntent(expanded);
}

function formatPence(value: number) { return `£${(value / 100).toFixed(2)}`; }

type FundingBatch = {
  id: string;
  jobId: string;
  jobTitle: string;
  quoteId: string;
  customerId: string;
  traderId: string;
  totalAmount: number;
  customerFeeAmount: number;
  checkoutAmount: number;
  status: string;
};
type FundingAllocation = {
  milestoneId: string;
  title: string;
  amount: number;
  kind: 'materials' | 'deposit' | 'stage' | 'final';
  platformFee: number;
  customerFee: number;
  sortOrder: number;
};

async function handleFundingBatchSucceeded(intent: Stripe.PaymentIntent, batchId: string) {
  const batches = await getSql()`
    SELECT b.id, b.job_id AS "jobId", j.title AS "jobTitle", b.quote_id AS "quoteId",
           b.customer_id AS "customerId", b.trader_id AS "traderId", b.total_amount AS "totalAmount",
           b.customer_fee_amount AS "customerFeeAmount", b.checkout_amount AS "checkoutAmount", b.status
    FROM buildpay_funding_batches b
    JOIN jobs j ON j.id = b.job_id
    WHERE b.id = ${batchId}
    LIMIT 1
  ` as unknown as FundingBatch[];
  const batch = batches[0];
  if (!batch) return;

  const allocations = await getSql()`
    SELECT a.milestone_id AS "milestoneId", m.title, a.amount, m.kind,
           a.platform_fee AS "platformFee", a.customer_fee AS "customerFee", m.sort_order AS "sortOrder"
    FROM buildpay_funding_allocations a
    JOIN job_milestones m ON m.id = a.milestone_id
    WHERE a.batch_id = ${batch.id}
    ORDER BY m.sort_order ASC
  ` as unknown as FundingAllocation[];
  if (!allocations.length) return;

  const chargeAmount = intent.amount_received || intent.amount;
  if (chargeAmount !== batch.checkoutAmount) throw new Error(`BuildPay funding batch ${batch.id} amount mismatch`);
  const chargeId = await resolveChargeId(intent);
  if (!chargeId) throw new Error(`BuildPay funding batch ${batch.id} has no Stripe charge`);
  const platformFee = allocations.reduce((sum, allocation) => sum + Math.max(0, allocation.platformFee), 0);

  await getSql()`
    UPDATE buildpay_funding_batches
    SET status = CASE WHEN status = 'released' THEN status ELSE 'funded' END,
        stripe_payment_intent_id = ${intent.id}, stripe_charge_id = ${chargeId}, funded_at = COALESCE(funded_at, now()), updated_at = now()
    WHERE id = ${batch.id}
  `;
  await getSql()`UPDATE buildpay_funding_allocations SET status = CASE WHEN status = 'released' THEN status ELSE 'funded' END, updated_at = now() WHERE batch_id = ${batch.id}`;
  await getSql()`
    UPDATE job_milestones m
    SET status = 'funded', funded_at = COALESCE(funded_at, now()), payment_method = 'stripe', payment_confirmed_by = NULL
    WHERE m.id IN (SELECT milestone_id FROM buildpay_funding_allocations WHERE batch_id = ${batch.id})
      AND m.status = 'pending'
  `;
  await getSql()`
    INSERT INTO payments(job_id, milestone_id, customer_id, trader_id, amount, platform_fee, customer_fee_amount, stripe_payment_intent_id, stripe_charge_id, funding_batch_id, status, funded_at, paid_at)
    VALUES (${batch.jobId}, NULL, ${batch.customerId}, ${batch.traderId}, ${batch.totalAmount}, ${platformFee}, ${batch.customerFeeAmount}, ${intent.id}, ${chargeId}, ${batch.id}, 'funded', now(), now())
    ON CONFLICT (stripe_payment_intent_id) DO UPDATE SET
      amount = EXCLUDED.amount,
      platform_fee = EXCLUDED.platform_fee,
      customer_fee_amount = EXCLUDED.customer_fee_amount,
      stripe_charge_id = COALESCE(EXCLUDED.stripe_charge_id, payments.stripe_charge_id),
      funding_batch_id = EXCLUDED.funding_batch_id,
      status = CASE WHEN payments.status = 'released' THEN payments.status ELSE 'funded'::payment_status END,
      funded_at = COALESCE(payments.funded_at, now()),
      paid_at = COALESCE(payments.paid_at, now())
  `;

  const materials = allocations.find((allocation) => allocation.kind === 'materials');
  const controlled = allocations.filter((allocation) => allocation.kind !== 'materials');
  const allocationSummary = allocations.map((allocation) => `${allocation.title} ${formatPence(allocation.amount)}`).join(' + ');
  const feeCopy = batch.customerFeeAmount > 0 ? ` BuildPay service fee collected with this payment: ${formatPence(batch.customerFeeAmount)}.` : '';
  const nextCopy = materials
    ? `${allocationSummary} is funded in BuildPay.${feeCopy} ${formatPence(materials.amount)} for materials is waiting for your acknowledgement before release; ${controlled.map((stage) => `${stage.title} stays protected at ${formatPence(stage.amount)}`).join(' and ')}.`
    : `${allocationSummary} is funded in BuildPay and stays protected until the agreed release step.${feeCopy}`;

  await addJobEvent(batch.jobId, batch.customerId, 'buildpay_funding_received', `BuildPay received ${formatPence(batch.checkoutAmount)}`, nextCopy, {
    fundingBatchId: batch.id,
    stripePaymentIntentId: intent.id,
    contractAmount: batch.totalAmount,
    buildPayServiceFee: batch.customerFeeAmount,
    checkoutAmount: batch.checkoutAmount,
    allocations: allocations.map((allocation) => ({ milestoneId: allocation.milestoneId, title: allocation.title, amount: allocation.amount, customerFee: allocation.customerFee, kind: allocation.kind })),
  });
  await Promise.allSettled([
    createNotification(batch.traderId, {
      type: materials ? 'buildpay_first_payment_received' : 'payment_stage_funded',
      title: materials ? `First BuildPay contract payment funded · ${formatPence(batch.totalAmount)}` : `BuildPay contract stage funded · ${formatPence(batch.totalAmount)}`,
      body: materials
        ? `${batch.jobTitle}: the homeowner funded ${allocationSummary}. Open the job and acknowledge the payment when you are ready to order the quoted materials and start the job. The materials amount will then be released; work-stage money stays protected.`
        : `${batch.jobTitle}: ${allocationSummary} is funded. Reach the agreed completion point before requesting release.`,
      href: `/trader/jobs/${batch.jobId}`,
      email: true,
    }),
    createNotification(batch.customerId, {
      type: 'buildpay_payment_confirmed',
      title: `BuildPay payment confirmed · ${formatPence(batch.checkoutAmount)}`,
      body: materials
        ? `${batch.jobTitle}: ${allocationSummary} is funded${batch.customerFeeAmount > 0 ? ` plus ${formatPence(batch.customerFeeAmount)} of the agreed BuildPay service fee` : ''}. Materials are not released until the tradesperson acknowledges the first payment; the work-stage money remains protected.`
        : `${batch.jobTitle}: ${allocationSummary} is funded and protected until the agreed release step${batch.customerFeeAmount > 0 ? `; this payment also included ${formatPence(batch.customerFeeAmount)} of the agreed BuildPay service fee` : ''}.`,
      href: `/customer/jobs/${batch.jobId}`,
    }),
  ]);
}

async function releaseMaterialsPayment(args: {
  paymentIntentId: string;
  chargeId: string;
  jobId: string;
  milestoneId: string;
  traderId: string;
  stripeAccountId: string;
  contractAmount: number;
  transferGroup: string;
}) {
  const existing = await getSql()`SELECT stripe_transfer_id AS "transferId" FROM payments WHERE stripe_payment_intent_id = ${args.paymentIntentId} LIMIT 1` as unknown as { transferId: string | null }[];
  if (existing[0]?.transferId) return existing[0].transferId;
  const transfer = await getStripe().transfers.create({
    amount: args.contractAmount,
    currency: 'gbp',
    destination: args.stripeAccountId,
    source_transaction: args.chargeId,
    transfer_group: args.transferGroup,
    metadata: { buildpairJobId: args.jobId, milestoneId: args.milestoneId, traderId: args.traderId, releaseReason: 'materials', contractAmount: String(args.contractAmount) },
  }, { idempotencyKey: `buildpair-materials-v3-${args.milestoneId}-${args.paymentIntentId}` });
  return transfer.id;
}

async function handleLegacyPaymentSucceeded(intent: Stripe.PaymentIntent) {
  const jobId = intent.metadata.buildpairJobId ?? intent.metadata.buildmateJobId;
  const { milestoneId, customerId, traderId } = intent.metadata;
  if (!jobId || !milestoneId || !customerId || !traderId) return;

  const rows = await getSql()`
    SELECT m.title, m.kind, m.status, m.amount, j.title AS "jobTitle", tp.stripe_account_id AS "stripeAccountId"
    FROM job_milestones m
    JOIN jobs j ON j.id = m.job_id
    JOIN quotes q ON q.id = m.quote_id
    JOIN trader_profiles tp ON tp.user_id = q.trader_id
    WHERE m.id = ${milestoneId} AND m.job_id = ${jobId}
    LIMIT 1
  ` as unknown as { title: string; kind: 'materials' | 'deposit' | 'stage' | 'final'; status: string; amount: number; jobTitle: string; stripeAccountId: string | null }[];
  const milestone = rows[0];
  if (!milestone) return;

  const chargeAmount = intent.amount_received || intent.amount;
  const platformFee = Math.max(0, Number(intent.metadata.platformFeeAmount ?? 0) || 0);
  const chargeId = await resolveChargeId(intent);
  await getSql()`
    INSERT INTO payments(job_id, milestone_id, customer_id, trader_id, amount, platform_fee, stripe_payment_intent_id, stripe_charge_id, status, funded_at, paid_at)
    VALUES (${jobId}, ${milestoneId}, ${customerId}, ${traderId}, ${chargeAmount}, ${platformFee}, ${intent.id}, ${chargeId}, 'funded', now(), now())
    ON CONFLICT (stripe_payment_intent_id) DO UPDATE SET
      amount = EXCLUDED.amount,
      platform_fee = EXCLUDED.platform_fee,
      stripe_charge_id = COALESCE(EXCLUDED.stripe_charge_id, payments.stripe_charge_id),
      status = CASE WHEN payments.status = 'released' THEN payments.status ELSE 'funded'::payment_status END,
      funded_at = COALESCE(payments.funded_at, now()),
      paid_at = COALESCE(payments.paid_at, now())
  `;

  // Old single-stage payment intents are kept working for already-open beta jobs.
  if (isImmediatelyReleasedStage(milestone.kind)) {
    if (!milestone.stripeAccountId || !chargeId) throw new Error('Materials payment cannot be released because payout details are incomplete');
    const transferId = await releaseMaterialsPayment({ paymentIntentId: intent.id, chargeId, jobId, milestoneId, traderId, stripeAccountId: milestone.stripeAccountId, contractAmount: milestone.amount, transferGroup: intent.metadata.transferGroup || `buildpair_job_${jobId}` });
    await getSql()`UPDATE payments SET status = 'released', stripe_transfer_id = ${transferId}, stripe_processing_fee_recovered = 0, trader_transfer_amount = ${milestone.amount}, released_at = COALESCE(released_at, now()) WHERE stripe_payment_intent_id = ${intent.id}`;
    await getSql()`UPDATE job_milestones SET status = 'paid', funded_at = COALESCE(funded_at, now()), paid_at = COALESCE(paid_at, now()), payment_method = 'stripe', payment_confirmed_by = NULL WHERE id = ${milestoneId}`;
    await addJobEvent(jobId, customerId, 'materials_payment_released', `${milestone.title} paid`, `Stripe confirmed ${formatPence(chargeAmount)} and BuildPair instructed an exact ${formatPence(milestone.amount)} materials transfer to the tradesperson.`, { milestoneId, stripePaymentIntentId: intent.id, stripeTransferId: transferId, milestoneKind: milestone.kind, contractMaterialsAmount: milestone.amount });
    return;
  }

  await getSql()`UPDATE job_milestones SET status = 'funded', funded_at = COALESCE(funded_at, now()), payment_method = 'stripe', payment_confirmed_by = NULL WHERE id = ${milestoneId} AND status = 'pending'`;
}

async function handleEvent(event: Stripe.Event) {
  if (event.type === 'account.updated') {
    const account = event.data.object;
    await getSql()`UPDATE trader_profiles SET stripe_charges_enabled = ${Boolean(account.charges_enabled)}, stripe_payouts_enabled = ${Boolean(account.payouts_enabled)}, updated_at = now() WHERE stripe_account_id = ${account.id}`;
    return;
  }
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
    // Stripe does not guarantee delivery order. Retrieve current state rather than
    // allowing an old "active" event to restore a cancelled or failed subscription.
    const subscription = await getStripe().subscriptions.retrieve(event.data.object.id);
    const userId = subscription.metadata.buildpairUserId ?? subscription.metadata.buildmateUserId;
    const product = subscriptionProduct(subscription);
    if (subscription.metadata.buildpairProduct === 'project_plus') {
      if (product !== 'project_plus') {
        // Reject unintended portal price migrations without leaving an old paid entitlement active.
        await clearProjectPlusSubscription(subscription.id);
        return;
      }
      if (userId) await syncProjectPlusSubscription(userId, subscription);
      return;
    }
    const tier = product;
    if (userId && tier !== 'core' && tier !== 'basic' && tier !== 'featured') {
      // An invalid/foreign price must never retain an earlier trade entitlement.
      await clearPaidSubscription(subscription.id);
      return;
    }
    if (userId && (tier === 'core' || tier === 'basic' || tier === 'featured')) await syncSubscriptionState(userId, subscription, tier);
    return;
  }
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    if (subscription.metadata.buildpairProduct === 'project_plus') await clearProjectPlusSubscription(subscription.id);
    else await clearPaidSubscription(subscription.id);
    return;
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    if (intent.metadata.buildpayFundingBatchId) await handleFundingBatchSucceeded(intent, intent.metadata.buildpayFundingBatchId);
    else await handleLegacyPaymentSucceeded(intent);
    return;
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object;
    if (intent.metadata.buildpayFundingBatchId) {
      await getSql()`UPDATE buildpay_funding_batches SET status = 'failed', updated_at = now() WHERE id = ${intent.metadata.buildpayFundingBatchId} AND status = 'requires_payment'`;
    }
    await getSql()`UPDATE payments SET status = 'failed' WHERE stripe_payment_intent_id = ${intent.id}`;
    return;
  }

  if (event.type === 'charge.dispute.created') {
    const charge = event.data.object;
    const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
    if (!paymentIntentId) return;
    const rows = await getSql()`SELECT p.funding_batch_id AS "fundingBatchId", p.milestone_id AS "milestoneId", p.job_id AS "jobId", p.customer_id AS "customerId", p.trader_id AS "traderId", j.title AS "jobTitle" FROM payments p JOIN jobs j ON j.id = p.job_id WHERE p.stripe_payment_intent_id = ${paymentIntentId} LIMIT 1` as unknown as { fundingBatchId: string | null; milestoneId: string | null; jobId: string; customerId: string; traderId: string; jobTitle: string }[];
    const payment = rows[0];
    if (!payment) return;
    await getSql()`UPDATE payments SET status = 'disputed', disputed_at = COALESCE(disputed_at, now()) WHERE stripe_payment_intent_id = ${paymentIntentId}`;
    if (payment.fundingBatchId) {
      await getSql()`UPDATE buildpay_funding_batches SET status = 'disputed', updated_at = now() WHERE id = ${payment.fundingBatchId}`;
      await getSql()`UPDATE buildpay_funding_allocations SET status = 'disputed', updated_at = now() WHERE batch_id = ${payment.fundingBatchId} AND status = 'funded'`;
      await getSql()`UPDATE job_milestones SET status = 'disputed', disputed_at = COALESCE(disputed_at, now()), dispute_reason = COALESCE(dispute_reason, 'Stripe payment dispute opened') WHERE id IN (SELECT milestone_id FROM buildpay_funding_allocations WHERE batch_id = ${payment.fundingBatchId} AND status = 'disputed')`;
    } else if (payment.milestoneId) {
      await getSql()`UPDATE job_milestones SET status = 'disputed', disputed_at = COALESCE(disputed_at, now()), dispute_reason = COALESCE(dispute_reason, 'Stripe payment dispute opened') WHERE id = ${payment.milestoneId}`;
    }
    await addJobEvent(payment.jobId, payment.customerId, 'payment_disputed', 'Payment dispute opened', 'Stripe reported a payment dispute. Further release actions linked to that charge are paused while it is reviewed.', { milestoneId: payment.milestoneId, fundingBatchId: payment.fundingBatchId, disputeId: charge.id });
    await Promise.allSettled([
      createNotification(payment.customerId, { type: 'payment_disputed', title: 'Payment dispute opened', body: `${payment.jobTitle}: the affected BuildPay funds are paused while the payment issue is reviewed.`, href: `/customer/jobs/${payment.jobId}`, email: true }),
      createNotification(payment.traderId, { type: 'payment_disputed', title: 'Payment dispute opened', body: `${payment.jobTitle}: a payment dispute was opened. Affected unreleased BuildPay funds are paused.`, href: `/trader/jobs/${payment.jobId}`, email: true }),
    ]);
    return;
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    if (!charge.refunded) return;
    const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
    if (!paymentIntentId) return;
    const rows = await getSql()`SELECT funding_batch_id AS "fundingBatchId", milestone_id AS "milestoneId" FROM payments WHERE stripe_payment_intent_id = ${paymentIntentId} LIMIT 1` as unknown as { fundingBatchId: string | null; milestoneId: string | null }[];
    const payment = rows[0];
    await getSql()`UPDATE payments SET status = 'refunded', refunded_at = COALESCE(refunded_at, now()) WHERE stripe_payment_intent_id = ${paymentIntentId}`;
    if (payment?.fundingBatchId) {
      await getSql()`UPDATE buildpay_funding_batches SET status = 'refunded', updated_at = now() WHERE id = ${payment.fundingBatchId}`;
      await getSql()`UPDATE buildpay_funding_allocations SET status = 'refunded', refunded_at = COALESCE(refunded_at, now()), updated_at = now() WHERE batch_id = ${payment.fundingBatchId} AND status <> 'released'`;
      await getSql()`UPDATE job_milestones SET status = 'pending', funded_at = NULL, release_requested_at = NULL, release_approved_at = NULL, release_approved_by = NULL WHERE id IN (SELECT milestone_id FROM buildpay_funding_allocations WHERE batch_id = ${payment.fundingBatchId} AND status = 'refunded') AND status <> 'paid'`;
    } else if (payment?.milestoneId) {
      await getSql()`UPDATE job_milestones SET status = 'pending', funded_at = NULL, release_requested_at = NULL, release_approved_at = NULL, release_approved_by = NULL WHERE id = ${payment.milestoneId} AND status <> 'paid'`;
    }
  }
}
