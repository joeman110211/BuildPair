import type Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { traderProfiles } from '@/db/schema';
import { addJobEvent, createNotification } from '@/lib/notifications';
import { isImmediatelyReleasedStage } from '@/lib/payment-protection';
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
      catch { /* Platform and Connect destinations have different signing secrets. */ }
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

async function releaseMaterialPayment(args: {
  paymentIntentId: string;
  chargeId: string;
  jobId: string;
  milestoneId: string;
  traderId: string;
  stripeAccountId: string;
  amount: number;
  transferGroup: string;
}) {
  const existing = await getSql()`SELECT stripe_transfer_id AS "transferId" FROM payments WHERE stripe_payment_intent_id = ${args.paymentIntentId} LIMIT 1` as unknown as { transferId: string | null }[];
  if (existing[0]?.transferId) return existing[0].transferId;
  const transfer = await getStripe().transfers.create({
    amount: args.amount,
    currency: 'gbp',
    destination: args.stripeAccountId,
    source_transaction: args.chargeId,
    transfer_group: args.transferGroup,
    metadata: { buildpairJobId: args.jobId, milestoneId: args.milestoneId, traderId: args.traderId, releaseReason: 'materials' },
  }, { idempotencyKey: `buildpair-materials-${args.milestoneId}-${args.paymentIntentId}` });
  return transfer.id;
}

async function handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
  const jobId = intent.metadata.buildpairJobId ?? intent.metadata.buildmateJobId;
  const { milestoneId, customerId, traderId } = intent.metadata;
  if (!jobId || !milestoneId || !customerId || !traderId) return;

  const rows = await getSql()`
    SELECT m.title, m.kind, m.status, j.title AS "jobTitle", q.total_amount AS "quoteTotal",
           tp.stripe_account_id AS "stripeAccountId"
    FROM job_milestones m
    JOIN jobs j ON j.id = m.job_id
    JOIN quotes q ON q.id = m.quote_id
    JOIN trader_profiles tp ON tp.user_id = q.trader_id
    WHERE m.id = ${milestoneId} AND m.job_id = ${jobId}
    LIMIT 1
  ` as unknown as { title: string; kind: 'materials' | 'deposit' | 'stage' | 'final'; status: string; jobTitle: string; quoteTotal: number; stripeAccountId: string | null }[];
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

  if (isImmediatelyReleasedStage(milestone.kind)) {
    if (!milestone.stripeAccountId || !chargeId) throw new Error('Materials payment cannot be released because payout details are incomplete');
    const transferId = await releaseMaterialPayment({
      paymentIntentId: intent.id,
      chargeId,
      jobId,
      milestoneId,
      traderId,
      stripeAccountId: milestone.stripeAccountId,
      amount: chargeAmount,
      transferGroup: intent.metadata.transferGroup || `buildpair_job_${jobId}`,
    });
    await getSql()`UPDATE payments SET status = 'released', stripe_transfer_id = ${transferId}, released_at = COALESCE(released_at, now()) WHERE stripe_payment_intent_id = ${intent.id}`;
    await getSql()`UPDATE job_milestones SET status = 'paid', funded_at = COALESCE(funded_at, now()), paid_at = COALESCE(paid_at, now()), payment_method = 'stripe', payment_confirmed_by = NULL WHERE id = ${milestoneId}`;
    await addJobEvent(jobId, customerId, 'materials_payment_released', `${milestone.title} paid`, `Stripe confirmed £${(chargeAmount / 100).toFixed(2)} and the agreed materials payment was released to the tradesperson.`, { milestoneId, stripePaymentIntentId: intent.id, stripeTransferId: transferId });
    await Promise.allSettled([
      createNotification(traderId, { type: 'materials_payment_received', title: `${milestone.title} received`, body: `${milestone.jobTitle}: £${(chargeAmount / 100).toFixed(2)} was paid for the agreed materials.`, href: `/trader/jobs/${jobId}`, email: true }),
      createNotification(customerId, { type: 'materials_payment_confirmed', title: 'Materials payment released', body: `${milestone.jobTitle}: your materials payment was processed and released to the tradesperson for the agreed materials.`, href: `/customer/jobs/${jobId}` }),
    ]);
    return;
  }

  await getSql()`UPDATE job_milestones SET status = 'funded', funded_at = COALESCE(funded_at, now()), payment_method = 'stripe', payment_confirmed_by = NULL WHERE id = ${milestoneId} AND status = 'pending'`;
  await addJobEvent(jobId, customerId, 'payment_stage_funded', `${milestone.title} funded`, `Stripe confirmed £${(chargeAmount / 100).toFixed(2)} for this stage. It has not yet been transferred to the tradesperson.`, { milestoneId, stripePaymentIntentId: intent.id, platformFee });
  await Promise.allSettled([
    createNotification(traderId, { type: 'payment_stage_funded', title: `${milestone.title} is funded`, body: `${milestone.jobTitle}: the homeowner funded £${(chargeAmount / 100).toFixed(2)}. Complete the agreed trigger before requesting release.`, href: `/trader/jobs/${jobId}`, email: true }),
    createNotification(customerId, { type: 'payment_stage_funded', title: `${milestone.title} funded`, body: `${milestone.jobTitle}: Stripe confirmed your payment. It has not yet been transferred to the tradesperson.`, href: `/customer/jobs/${jobId}` }),
  ]);
}

async function handleEvent(event: Stripe.Event) {
  const db = getDb();
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
    await getSql()`UPDATE payments SET status = 'failed' WHERE stripe_payment_intent_id = ${intent.id}`;
    return;
  }

  if (event.type === 'charge.dispute.created') {
    const charge = event.data.object;
    const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
    if (!paymentIntentId) return;
    const rows = await getSql()`
      SELECT p.milestone_id AS "milestoneId", p.job_id AS "jobId", p.customer_id AS "customerId", p.trader_id AS "traderId", j.title AS "jobTitle"
      FROM payments p JOIN jobs j ON j.id = p.job_id
      WHERE p.stripe_payment_intent_id = ${paymentIntentId} LIMIT 1
    ` as unknown as { milestoneId: string; jobId: string; customerId: string; traderId: string; jobTitle: string }[];
    const payment = rows[0];
    if (!payment) return;
    await getSql()`UPDATE payments SET status = 'disputed', disputed_at = COALESCE(disputed_at, now()) WHERE stripe_payment_intent_id = ${paymentIntentId}`;
    await getSql()`UPDATE job_milestones SET status = 'disputed', disputed_at = COALESCE(disputed_at, now()), dispute_reason = COALESCE(dispute_reason, 'Stripe payment dispute opened') WHERE id = ${payment.milestoneId}`;
    await addJobEvent(payment.jobId, payment.customerId, 'payment_disputed', 'Payment dispute opened', 'Stripe reported a payment dispute. Further release actions are paused while it is reviewed.', { milestoneId: payment.milestoneId, disputeId: charge.id });
    await Promise.allSettled([
      createNotification(payment.customerId, { type: 'payment_disputed', title: 'Payment dispute opened', body: `${payment.jobTitle}: the disputed stage is paused while the payment issue is reviewed.`, href: `/customer/jobs/${payment.jobId}`, email: true }),
      createNotification(payment.traderId, { type: 'payment_disputed', title: 'Payment dispute opened', body: `${payment.jobTitle}: a payment dispute was opened. Further release of this stage is paused.`, href: `/trader/jobs/${payment.jobId}`, email: true }),
    ]);
    return;
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    if (!charge.refunded) return;
    const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
    if (!paymentIntentId) return;
    const rows = await getSql()`SELECT milestone_id AS "milestoneId" FROM payments WHERE stripe_payment_intent_id = ${paymentIntentId} LIMIT 1` as unknown as { milestoneId: string }[];
    await getSql()`UPDATE payments SET status = 'refunded', refunded_at = COALESCE(refunded_at, now()) WHERE stripe_payment_intent_id = ${paymentIntentId}`;
    if (rows[0]?.milestoneId) await getSql()`UPDATE job_milestones SET status = 'pending', funded_at = NULL, release_requested_at = NULL, release_approved_at = NULL, release_approved_by = NULL WHERE id = ${rows[0].milestoneId} AND status <> 'paid'`;
  }

  void db;
}
