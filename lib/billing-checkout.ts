import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { traderProfiles } from '@/db/schema';
import { billingPlans } from '@/lib/billing-plans';
import { HttpError } from '@/lib/server';
import { appUrl, getStripe, providerReturnUrl } from '@/lib/stripe';

export async function tradeCheckout(trader: { id: string; email?: string | null; phone?: string | null }, tier: 'core' | 'basic' | 'featured') {
  const plan = billingPlans[tier];
  const priceId = process.env[plan.priceEnv]?.trim();
  if (!priceId || !process.env.STRIPE_WEBHOOK_SECRET?.trim()) throw new HttpError(503, 'Subscription billing is temporarily unavailable.');
  const db = getDb();
  const [profile] = await db.select({ stripeCustomerId: traderProfiles.stripeCustomerId }).from(traderProfiles).where(eq(traderProfiles.userId, trader.id)).limit(1);
  if (!profile) throw new HttpError(409, 'Complete your profile first');
  const stripe = getStripe();
  const price = await stripe.prices.retrieve(priceId);
  if (!price.active || price.currency !== 'gbp' || price.unit_amount !== plan.unitAmount || price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1) throw new HttpError(503, 'Subscription price configuration needs attention.');
  let customerId = profile.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: trader.email ?? undefined, phone: trader.phone ?? undefined, metadata: { buildpairUserId: trader.id } }, { idempotencyKey: `buildpair-trade-customer-${trader.id}` });
    customerId = customer.id;
    await db.update(traderProfiles).set({ stripeCustomerId: customerId }).where(eq(traderProfiles.userId, trader.id));
  }
  const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
  if (subscriptions.data.some((subscription) => subscription.metadata.buildpairUserId === trader.id && subscription.metadata.buildpairProduct !== 'project_plus' && !['canceled', 'incomplete_expired'].includes(subscription.status))) {
    const portal = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${appUrl()}/trader/subscription` });
    return portal.url;
  }
  const sessions = await stripe.checkout.sessions.list({ customer: customerId, limit: 100 });
  for (const session of sessions.data) {
    if (session.status !== 'open' || session.client_reference_id !== trader.id || session.metadata?.buildpairProduct === 'project_plus') continue;
    if (session.metadata?.tier === tier && session.url) return session.url;
    await stripe.checkout.sessions.expire(session.id);
  }
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription', customer: customerId, client_reference_id: trader.id,
    line_items: [{ price: priceId, quantity: 1 }], allow_promotion_codes: true,
    success_url: `${appUrl()}/api/stripe/subscription-confirm?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: providerReturnUrl('subscription', 'cancelled'),
    metadata: { buildpairUserId: trader.id, tier, buildpairProduct: 'trade' },
    subscription_data: { metadata: { buildpairUserId: trader.id, tier, buildpairProduct: 'trade' } },
  }, { idempotencyKey: `buildpair-trade-checkout-${trader.id}-${tier}-${sessions.data[0]?.id ?? 'first'}-${Math.floor(Date.now() / 1_800_000)}` });
  if (!session.url) throw new HttpError(502, 'Stripe did not return a checkout link.');
  return session.url;
}
