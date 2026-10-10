import { describe, expect, it } from 'vitest';
import { requiredStripeEnvironment } from '@/lib/billing-readiness';

describe('independent Stripe product readiness', () => {
  it('does not require Stripe while all payment products are closed', () => {
    expect(requiredStripeEnvironment({ trade: false, projectPlus: false, buildPay: false })).toEqual([]);
  });
  it('requires all three trade prices without requiring Connect for memberships', () => {
    expect(requiredStripeEnvironment({ trade: true, projectPlus: false, buildPay: false })).toEqual(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_CORE_PRICE_ID', 'STRIPE_BASIC_PRICE_ID', 'STRIPE_FEATURED_PRICE_ID']);
  });
  it('requires Project+ credentials independently of trade memberships', () => {
    expect(requiredStripeEnvironment({ trade: false, projectPlus: true, buildPay: false })).toEqual(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PROJECT_PLUS_PRICE_ID', 'STRIPE_PROJECT_PLUS_PORTAL_CONFIG_ID']);
  });
  it('requires connected-account and embedded checkout configuration for BuildPay', () => {
    expect(requiredStripeEnvironment({ trade: false, projectPlus: false, buildPay: true })).toEqual(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_CONNECT_WEBHOOK_SECRET']);
  });
});
