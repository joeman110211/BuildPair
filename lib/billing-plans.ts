import type Stripe from 'stripe';

export const billingPlans = {
  core: { name: 'BuildPair Core', unitAmount: 999, priceEnv: 'STRIPE_CORE_PRICE_ID' },
  basic: { name: 'BuildPair Plus', unitAmount: 1999, priceEnv: 'STRIPE_BASIC_PRICE_ID' },
  featured: { name: 'BuildPair Pro', unitAmount: 2999, priceEnv: 'STRIPE_FEATURED_PRICE_ID' },
  project_plus: { name: 'BuildPair Project+', unitAmount: 499, priceEnv: 'STRIPE_PROJECT_PLUS_PRICE_ID' },
} as const;

export function subscriptionProduct(subscription: Stripe.Subscription) {
  const item = subscription.items.data.length === 1 ? subscription.items.data[0] : undefined;
  if (!item || item.quantity !== 1) return null;
  // Stripe Portal changes prices without updating our original checkout metadata.
  // Resolve entitlements from the actual billed price, never the stale tier label.
  for (const [product, plan] of Object.entries(billingPlans)) {
    const price = item.price;
    if (process.env[plan.priceEnv]?.trim() === price.id
      && price.currency === 'gbp' && price.unit_amount === plan.unitAmount
      && price.recurring?.interval === 'month' && price.recurring.interval_count === 1) {
      return product as keyof typeof billingPlans;
    }
  }
  return null;
}
