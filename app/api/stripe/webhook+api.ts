import type Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { jobMilestones, payments, traderProfiles } from '@/db/schema';
import { addJobEvent, createNotification } from '@/lib/notifications';
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

async function recordStripeMilestoneAudit(milestoneId: string) {
  try { await getSql()`UPDATE job_milestones SET payment_method = 'stripe', payment_confirmed_by = NULL WHERE id = ${milestoneId}`; }
  catch { /* Payment success must not be lost merely because audit columns lag. */ }
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

async function handleEvent(event: Stripe.Event) {
  const db = getDb();
  if (event.type === 'account.updated') {
    const account = event.data.object;
    await db.update(traderProfiles).set({ stripeChargesEnabled: Boolean(account.charges_enabled), updatedAt: new Date() }).where(eq(traderProfiles.stripeAccountId, account.id));
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

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const jobId = intent.metadata.buildpairJobId ?? intent.metadata.buildmateJobId;
    const { milestoneId, customerId, traderId } = intent.metadata;
    if (!jobId || !milestoneId || !customerId || !traderId) return;
    const milestone = await db.query.jobMilestones.findFirst({ where: eq(jobMilestones.id, milestoneId) });
    if (!milestone) return;
    const chargeAmount = intent.amount_received || intent.amount;
    await db.insert(payments).values({ jobId, milestoneId, customerId, traderId, amount: chargeAmount, platformFee: intent.application_fee_amount ?? 0, stripePaymentIntentId: intent.id, status: 'paid', paidAt: new Date() }).onConflictDoUpdate({ target: payments.stripePaymentIntentId, set: { status: 'paid', paidAt: new Date(), platformFee: intent.application_fee_amount ?? 0 } });
    await db.update(jobMilestones).set({ status: 'paid', paidAt: new Date(), completedAt: milestone.completedAt ?? new Date() }).where(eq(jobMilestones.id, milestoneId));
    await recordStripeMilestoneAudit(milestoneId);

    const jobRows = await getSql()`SELECT title FROM jobs WHERE id = ${jobId} LIMIT 1` as unknown as { title: string }[];
    const jobTitle = jobRows[0]?.title ?? 'BuildPair job';
    await addJobEvent(jobId, customerId, 'payment_received', `${milestone.title} paid`, `BuildPair recorded a successful payment of £${(chargeAmount / 100).toFixed(2)}.`, { milestoneId, stripePaymentIntentId: intent.id, platformFee: intent.application_fee_amount ?? 0 });
    await Promise.allSettled([
      createNotification(traderId, { type: 'payment_received', title: `${milestone.title} paid`, body: `${jobTitle}: £${(chargeAmount / 100).toFixed(2)} was paid through BuildPair.`, href: `/trader/jobs/${jobId}`, email: true }),
      createNotification(customerId, { type: 'payment_confirmed', title: 'Payment confirmed', body: `${jobTitle}: your ${milestone.title.toLowerCase()} payment was recorded successfully.`, href: `/customer/jobs/${jobId}` }),
    ]);
    return;
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object;
    await db.update(payments).set({ status: 'failed' }).where(eq(payments.stripePaymentIntentId, intent.id));
  }
}
