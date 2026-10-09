import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { traderProfiles } from '@/db/schema';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { appUrl, getStripe, providerReturnUrl } from '@/lib/stripe';
import { PAID_PLANS_OPEN } from '@/lib/launch-config';

const plans = {
  core: { name: 'BuildPair Core', unitAmount: 999, priceEnv: 'STRIPE_CORE_PRICE_ID' },
  basic: { name: 'BuildPair Plus', unitAmount: 1999, priceEnv: 'STRIPE_BASIC_PRICE_ID' },
  featured: { name: 'BuildPair Pro', unitAmount: 2999, priceEnv: 'STRIPE_FEATURED_PRICE_ID' },
} as const;

type Tier = keyof typeof plans;

export async function GET(request: Request) {
  try {
    if (!PAID_PLANS_OPEN) throw new HttpError(423, 'Paid trade subscriptions are coming later. Three months of BuildPair Pro is included for eligible newly activated profiles.');
    const trader = await requireRole(request, 'trader');
    const tierParam = new URL(request.url).searchParams.get('tier');
    if (tierParam !== 'core' && tierParam !== 'basic' && tierParam !== 'featured') {
      throw new HttpError(400, 'Choose a valid BuildPair plan');
    }
    const tier = tierParam as Tier;

    const db = getDb();
    const [profile] = await db.select({
      stripeCustomerId: traderProfiles.stripeCustomerId,
      stripeSubscriptionId: traderProfiles.stripeSubscriptionId,
    }).from(traderProfiles).where(eq(traderProfiles.userId, trader.id)).limit(1);
    if (!profile) throw new HttpError(409, 'Complete your profile first');
    if (profile.stripeSubscriptionId) throw new HttpError(409, 'A trade subscription already exists. Manage or cancel it using your BuildPair billing portal before starting another.');

    const stripe = getStripe();
    let customerId = profile.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: trader.email ?? undefined,
        phone: trader.phone ?? undefined,
        metadata: { buildpairUserId: trader.id },
      });
      customerId = customer.id;
      await db.update(traderProfiles).set({ stripeCustomerId: customerId }).where(eq(traderProfiles.userId, trader.id));
    }

    const plan = plans[tier];
    const configuredPriceId = process.env[plan.priceEnv]?.trim();
    const lineItem = configuredPriceId
      ? { price: configuredPriceId, quantity: 1 }
      : {
          price_data: {
            currency: 'gbp',
            unit_amount: plan.unitAmount,
            recurring: { interval: 'month' as const },
            product_data: { name: plan.name },
          },
          quantity: 1,
        };

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: trader.id,
      line_items: [lineItem],
      allow_promotion_codes: true,
      success_url: `${appUrl()}/api/stripe/subscription-confirm?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: providerReturnUrl('subscription', 'cancelled'),
      metadata: { buildpairUserId: trader.id, tier },
      subscription_data: { metadata: { buildpairUserId: trader.id, tier } },
    });

    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return Response.redirect(session.url, 303);
  } catch (error) {
    return jsonError(error);
  }
}
