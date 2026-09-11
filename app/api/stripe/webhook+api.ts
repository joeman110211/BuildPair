import type Stripe from 'stripe';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { isImmediatelyReleasedStage, stagePlatformFee, type FeeStage } from '@/lib/payment-protection';
import { getSql } from '@/lib/sql';
import { getStripe } from '@/lib/stripe';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  if (!signature || secrets.length === 0) return new Response('Webhook not configured', { status: 400 });

  try {
    const payload = await request.text();
    const stripe = getStripe();
    let event: Stripe.Event | undefined;
    for (const secret of secrets) {
      try { event = await stripe.webhooks.constructEventAsync(payload, signature, secret); break; }
      catch { /* Platform and Connect webhook destinations have different signing secrets. */ }
    }
    if (!event) return new Response('Invalid webhook', { status: 400 });
    await handleEvent(event);
    return Response.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook failure', error);
    return new Response('Invalid webhook', { status: 400 });
  }
}

type PaidTier = 'basic' | 'featured';
type MilestoneKind = 'materials' | 'deposit' | 'stage' | 'final';
type MilestoneRow = {
  id: string;
  title: string;
  kind: MilestoneKind;
  status: string;
  amount: number;
  sortOrder: number;
  jobId: string;
  jobTitle: string;
  customerId: string;
  traderId: string;
  laborCost: number;
  stripeAccountId: string | null;
};

function effectiveTier(paidTier: PaidTier | null, complimentaryTier: PaidTier | null): 'free' | PaidTier {
  if (paidTier === 'featured' || complimentaryTier === 'featured') return 'featured';
  if (paidTier === 'basic' || complimentaryTier === 'basic') return 'basic';
  return 'free';
}

async function syncSubscriptionState(userId: string, subscription: Stripe.Subscription, tier: PaidTier) {
  const active = ['active', 'trialing'].includes(subscription.status);
  const paidTier = active ? tier : null;
  const rows = await getSql()`SELECT complimentary_tier AS "complimentaryTier" FROM trader_profiles WHERE user_id = ${userId} LIMIT 1` as { complimentaryTier: PaidTier | null }[];
  const complimentaryTier = rows[0]?.complimentaryTier ?? null;
  const effective = effectiveTier(paidTier, complimentaryTier);
  await getSql()`UPDATE trader_profiles SET stripe_subscription_id = ${subscription.id}, paid_subscription_tier = ${paidTier}::subscription_tier, subscription_tier = ${effective}::subscription_tier, is_subscription_active = ${effective !== 'free'}, updated_at = now() WHERE user_id = ${userId}`;
}

async function clearPaidSubscription(subscriptionId: string) {
  const rows = await getSql()`SELECT user_id AS "userId", complimentary_tier AS "complimentaryTier" FROM trader_profiles WHERE stripe_subscription_id = ${subscriptionId} LIMIT 1` as { userId: string; complimentaryTier: PaidTier | null }[];
  const profile = rows[0];
  if (!profile) return;
  const effective = effectiveTier(null, profile.complimentaryTier);
  await getSql()`UPDATE trader_profiles SET stripe_subscription_id = NULL, paid_subscription_tier = NULL, subscription_tier = ${effective}::subscription_tier, is_subscription_active = ${effective !== 'free'}, updated_at = now() WHERE user_id = ${profile.userId}`;
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
  const existing = await getSql()`
    SELECT stripe_transfer_id AS "transferId"
    FROM payments
    WHERE stripe_payment_intent_id = ${args.paymentIntentId} AND milestone_id = ${args.milestoneId}
    LIMIT 1
  ` as unknown as { transferId: string | null }[];
  if (existing[0]?.transferId) return existing[0].transferId;

  const transfer = await getStripe().transfers.create({
    amount: args.contractAmount,
    currency: 'gbp',
    destination: args.stripeAccountId,
    source_transaction: args.chargeId,
    transfer_group: args.transferGroup,
    metadata: {
      jobId: args.jobId,
      milestoneId: args.milestoneId,
      traderId: args.traderId,
      releaseReason: 'materials',
      contractAmount: String(args.contractAmount),
    },
  }, { idempotencyKey: `buildpair-materials-v4-${args.milestoneId}-${args.paymentIntentId}` });
  return transfer.id;
}

function paymentMetadata(intent: Stripe.PaymentIntent) {
  const jobId = intent.metadata.jobId ?? intent.metadata.buildpairJobId ?? intent.metadata.buildmateJobId;
  const milestoneIds = (intent.metadata.milestoneIds ?? intent.metadata.milestoneId ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return {
    jobId,
    milestoneIds,
    customerId: intent.metadata.customerId,
    traderId: intent.metadata.traderId,
    transferGroup: intent.metadata.transferGroup || (jobId ? `buildpair_job_${jobId}` : ''),
  };
}

async function loadMilestone(jobId: string, milestoneId: string) {
  const rows = await getSql()`
    SELECT m.id, m.title, m.kind, m.status, m.amount, m.sort_order AS "sortOrder",
           j.id AS "jobId", j.title AS "jobTitle", j.customer_id AS "customerId",
           q.trader_id AS "traderId", q.labor_cost AS "laborCost",
           tp.stripe_account_id AS "stripeAccountId"
    FROM job_milestones m
    JOIN jobs j ON j.id = m.job_id
    JOIN quotes q ON q.id = m.quote_id
    JOIN trader_profiles tp ON tp.user_id = q.trader_id
    WHERE m.id = ${milestoneId} AND m.job_id = ${jobId}
    LIMIT 1
  ` as unknown as MilestoneRow[];
  return rows[0];
}

async function handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
  const metadata = paymentMetadata(intent);
  if (!metadata.jobId || !metadata.milestoneIds.length || !metadata.customerId || !metadata.traderId) return;

  const milestones = (await Promise.all(metadata.milestoneIds.map((id) => loadMilestone(metadata.jobId, id))))
    .filter(Boolean)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (milestones.length !== metadata.milestoneIds.length) throw new Error('BuildPay funding references an unknown milestone');
  if (milestones.some((stage) => stage.customerId !== metadata.customerId || stage.traderId !== metadata.traderId)) {
    throw new Error('BuildPay funding metadata does not match the accepted job');
  }

  const allStages = await getSql()`
    SELECT id, amount, kind, sort_order AS "sortOrder"
    FROM job_milestones WHERE job_id = ${metadata.jobId}
    ORDER BY sort_order ASC
  ` as unknown as FeeStage[];
  const chargeId = await resolveChargeId(intent);

  for (const milestone of milestones) {
    const platformFee = stagePlatformFee(milestone.id, allStages, milestone.laborCost);
    await getSql()`
      INSERT INTO payments(job_id, milestone_id, customer_id, trader_id, amount, platform_fee, stripe_payment_intent_id, stripe_charge_id, status, funded_at)
      VALUES (${metadata.jobId}, ${milestone.id}, ${metadata.customerId}, ${metadata.traderId}, ${milestone.amount}, ${platformFee}, ${intent.id}, ${chargeId}, 'funded', now())
      ON CONFLICT (stripe_payment_intent_id, milestone_id) DO UPDATE SET
        amount = EXCLUDED.amount,
        platform_fee = EXCLUDED.platform_fee,
        stripe_charge_id = COALESCE(EXCLUDED.stripe_charge_id, payments.stripe_charge_id),
        status = CASE WHEN payments.status IN ('released', 'paid') THEN payments.status ELSE 'funded'::payment_status END,
        funded_at = COALESCE(payments.funded_at, now())
    `;

    if (isImmediatelyReleasedStage(milestone.kind)) {
      if (!milestone.stripeAccountId || !chargeId) throw new Error('Materials payment cannot be released because payout details are incomplete');
      const transferId = await releaseMaterialsPayment({
        paymentIntentId: intent.id,
        chargeId,
        jobId: metadata.jobId,
        milestoneId: milestone.id,
        traderId: metadata.traderId,
        stripeAccountId: milestone.stripeAccountId,
        contractAmount: milestone.amount,
        transferGroup: metadata.transferGroup,
      });
      await getSql()`
        UPDATE payments SET status = 'released', stripe_transfer_id = ${transferId}, stripe_processing_fee_recovered = 0,
          trader_transfer_amount = ${milestone.amount}, released_at = COALESCE(released_at, now()), paid_at = COALESCE(paid_at, now())
        WHERE stripe_payment_intent_id = ${intent.id} AND milestone_id = ${milestone.id}
      `;
      await getSql()`
        UPDATE job_milestones SET status = 'paid', funded_at = COALESCE(funded_at, now()), paid_at = COALESCE(paid_at, now()),
          payment_method = 'stripe', payment_confirmed_by = NULL
        WHERE id = ${milestone.id}
      `;
      await addJobEvent(
        metadata.jobId,
        metadata.customerId,
        'materials_payment_released',
        `${milestone.title} released`,
        `Stripe confirmed the £${(milestone.amount / 100).toFixed(2)} materials payment and BuildPair released that exact amount to the tradesperson's connected Stripe account. Bank payout timing is handled by Stripe.`,
        { milestoneId: milestone.id, stripePaymentIntentId: intent.id, stripeTransferId: transferId, milestoneKind: milestone.kind, contractMaterialsAmount: milestone.amount },
      );
      await Promise.allSettled([
        createNotification(metadata.traderId, { type: 'materials_payment_received', title: `${milestone.title} released`, body: `${milestone.jobTitle}: £${(milestone.amount / 100).toFixed(2)} was released to your connected Stripe account for the quoted materials.`, href: `/trader/jobs/${metadata.jobId}`, email: true }),
        createNotification(metadata.customerId, { type: 'materials_payment_confirmed', title: 'Materials payment released', body: `${milestone.jobTitle}: £${(milestone.amount / 100).toFixed(2)} was released to the tradesperson's connected Stripe account for materials.`, href: `/customer/jobs/${metadata.jobId}` }),
      ]);
      continue;
    }

    await getSql()`
      UPDATE job_milestones SET status = 'funded', funded_at = COALESCE(funded_at, now()), payment_method = 'stripe', payment_confirmed_by = NULL
      WHERE id = ${milestone.id} AND status = 'pending'
    `;
    await addJobEvent(metadata.jobId, metadata.customerId, 'payment_stage_funded', `${milestone.title} secured`, `Stripe confirmed £${(milestone.amount / 100).toFixed(2)} for this stage. The money is secured in BuildPay and has not been transferred to the tradesperson.`, { milestoneId: milestone.id, stripePaymentIntentId: intent.id, platformFee });
    await Promise.allSettled([
      createNotification(metadata.traderId, { type: 'payment_stage_funded', title: `${milestone.title} is secured`, body: `${milestone.jobTitle}: the homeowner funded £${(milestone.amount / 100).toFixed(2)}. Complete the agreed trigger before requesting release.`, href: `/trader/jobs/${metadata.jobId}`, email: true }),
      createNotification(metadata.customerId, { type: 'payment_stage_funded', title: `${milestone.title} secured`, body: `${milestone.jobTitle}: £${(milestone.amount / 100).toFixed(2)} is funded and will not be transferred until you approve release.`, href: `/customer/jobs/${metadata.jobId}` }),
    ]);
  }
}

async function handleStripeDispute(charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return;
  const rows = await getSql()`
    SELECT p.id AS "paymentId", p.milestone_id AS "milestoneId", p.status AS "paymentStatus", p.job_id AS "jobId",
           p.customer_id AS "customerId", p.trader_id AS "traderId", j.title AS "jobTitle", m.status AS "milestoneStatus"
    FROM payments p JOIN jobs j ON j.id = p.job_id LEFT JOIN job_milestones m ON m.id = p.milestone_id
    WHERE p.stripe_payment_intent_id = ${paymentIntentId}
  ` as unknown as { paymentId: string; milestoneId: string | null; paymentStatus: string; jobId: string; customerId: string; traderId: string; jobTitle: string; milestoneStatus: string | null }[];
  if (!rows.length) return;

  for (const payment of rows) {
    if (!payment.milestoneId || payment.paymentStatus === 'released' || payment.paymentStatus === 'paid' || payment.paymentStatus === 'refunded') continue;
    await getSql()`UPDATE payments SET status = 'disputed', disputed_at = COALESCE(disputed_at, now()) WHERE id = ${payment.paymentId}`;
    if (payment.milestoneStatus !== 'paid') {
      await getSql()`UPDATE job_milestones SET status = 'disputed', disputed_at = COALESCE(disputed_at, now()), dispute_reason = COALESCE(dispute_reason, 'Stripe card dispute opened') WHERE id = ${payment.milestoneId}`;
    }
  }

  const first = rows[0];
  await addJobEvent(first.jobId, first.customerId, 'stripe_payment_disputed', 'Stripe card dispute opened', 'Stripe reported a card dispute on a BuildPay charge. Any unreleased stage funded by that charge has been paused while it is reviewed.', { stripeDisputeId: charge.id, stripePaymentIntentId: paymentIntentId });
  await Promise.allSettled([
    createNotification(first.customerId, { type: 'payment_disputed', title: 'Stripe payment dispute opened', body: `${first.jobTitle}: unreleased funds linked to the disputed card charge have been paused.`, href: `/customer/jobs/${first.jobId}`, email: true }),
    createNotification(first.traderId, { type: 'payment_disputed', title: 'Stripe payment dispute opened', body: `${first.jobTitle}: unreleased funds linked to the disputed card charge have been paused.`, href: `/trader/jobs/${first.jobId}`, email: true }),
  ]);
}

async function handleRefund(charge: Stripe.Charge) {
  if (!charge.refunded) return;
  const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return;
  const rows = await getSql()`SELECT milestone_id AS "milestoneId", status FROM payments WHERE stripe_payment_intent_id = ${paymentIntentId}` as unknown as { milestoneId: string | null; status: string }[];
  await getSql()`UPDATE payments SET status = 'refunded', refunded_at = COALESCE(refunded_at, now()) WHERE stripe_payment_intent_id = ${paymentIntentId}`;
  for (const row of rows) {
    if (!row.milestoneId || row.status === 'released' || row.status === 'paid') continue;
    await getSql()`UPDATE job_milestones SET status = 'pending', funded_at = NULL, release_requested_at = NULL, release_approved_at = NULL, release_approved_by = NULL WHERE id = ${row.milestoneId} AND status <> 'paid'`;
  }
}

async function handleEvent(event: Stripe.Event) {
  if (event.type === 'account.updated') {
    const account = event.data.object;
    await getSql()`UPDATE trader_profiles SET stripe_charges_enabled = ${Boolean(account.charges_enabled)}, stripe_payouts_enabled = ${Boolean(account.payouts_enabled)}, updated_at = now() WHERE stripe_account_id = ${account.id}`;
    return;
  }
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
    const subscription = event.data.object;
    const userId = subscription.metadata.buildpairUserId ?? subscription.metadata.buildmateUserId;
    const tier = subscription.metadata.tier;
    if (userId && (tier === 'basic' || tier === 'featured')) await syncSubscriptionState(userId, subscription, tier);
    return;
  }
  if (event.type === 'customer.subscription.deleted') { await clearPaidSubscription(event.data.object.id); return; }
  if (event.type === 'payment_intent.succeeded') { await handlePaymentSucceeded(event.data.object); return; }
  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object;
    await getSql()`UPDATE payments SET status = 'failed' WHERE stripe_payment_intent_id = ${intent.id} AND status NOT IN ('released', 'paid')`;
    return;
  }
  if (event.type === 'charge.dispute.created') { await handleStripeDispute(event.data.object); return; }
  if (event.type === 'charge.refunded') { await handleRefund(event.data.object); }
}
