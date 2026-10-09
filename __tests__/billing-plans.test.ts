import type Stripe from 'stripe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { subscriptionProduct } from '@/lib/billing-plans';

function subscription(price: Record<string, unknown>, quantity = 1) {
  return { metadata: { tier: 'core' }, items: { data: [{ quantity, price: { id: 'price_pro', active: true, currency: 'gbp', unit_amount: 2999, recurring: { interval: 'month', interval_count: 1 }, ...price } }] } } as unknown as Stripe.Subscription;
}
afterEach(() => vi.unstubAllEnvs());
describe('subscription entitlements follow billed prices', () => {
  it('recognises a Pro portal upgrade despite stale Core metadata', () => {
    vi.stubEnv('STRIPE_FEATURED_PRICE_ID', 'price_pro');
    expect(subscriptionProduct(subscription({}))).toBe('featured');
  });
  it.each([{ currency: 'usd' }, { unit_amount: 1 }, { recurring: { interval: 'year', interval_count: 1 } }, { id: 'unknown' }])('rejects unexpected price %j', (price) => {
    vi.stubEnv('STRIPE_FEATURED_PRICE_ID', 'price_pro');
    expect(subscriptionProduct(subscription(price))).toBeNull();
  });
  it('rejects multiple billed units', () => {
    vi.stubEnv('STRIPE_FEATURED_PRICE_ID', 'price_pro');
    expect(subscriptionProduct(subscription({}, 2))).toBeNull();
  });
});
