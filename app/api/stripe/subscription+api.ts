import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db/client';
import { traderProfiles } from '@/db/schema';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getStripe, providerReturnUrl } from '@/lib/stripe';

const inputSchema = z.object({ tier: z.enum(['core', 'basic', 'featured']) });

const plans = {
  core: { name: 'BuildPair Core', unitAmount: 999, priceEnv: 'STRIPE_CORE_PRICE_ID' },
  basic: { name: 'BuildPair Plus', unitAmount: 1999, priceEnv: 'STRIPE_BASIC_PRICE_ID' },
  featured: { name: 'BuildPair Pro', unitAmount: 2999, priceEnv: 'STRIPE_FEATURED_PRICE_ID' },
} as const;

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const { tier } = inputSchema.parse(await request.json());
    const db = getDb();
    const [profile] = await db.select({
      stripeCustomerId: traderProfiles.stripeCustomerId,
    }).from(traderProfiles).where(eq(traderProfiles.userId, trader.id)).limit(1);
    if (!profile) throw new HttpError(409, 'Complete your profile first');

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
      success_url: providerReturnUrl('subscription', 'complete'),
      cancel_url: providerReturnUrl('subscription', 'cancelled'),
      metadata: { buildpairUserId: trader.id, tier },
      subscription_data: { metadata: { buildpairUserId: trader.id, tier } },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    return jsonError(error);
  }
}
