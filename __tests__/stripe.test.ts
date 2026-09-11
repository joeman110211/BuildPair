import { afterEach, describe, expect, it } from 'vitest';
import { appUrl, providerReturnUrl, stripeMetadata, STRIPE_METADATA_KEY_MAX } from '@/lib/stripe';

const originalAppUrl = process.env.APP_URL;
const originalPublicApiUrl = process.env.EXPO_PUBLIC_API_URL;

afterEach(() => {
  if (originalAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = originalAppUrl;
  if (originalPublicApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalPublicApiUrl;
});

describe('Stripe return URLs', () => {
  it('normalises a trailing slash on the configured app URL', () => {
    process.env.APP_URL = 'https://buildpair.example/';
    expect(appUrl()).toBe('https://buildpair.example');
  });

  it('returns completed subscriptions to the trader subscription screen', () => {
    process.env.APP_URL = 'https://buildpair.example';
    expect(providerReturnUrl('subscription', 'complete')).toBe('https://buildpair.example/trader/subscription?subscription=complete');
  });

  it('falls back to the public API origin', () => {
    delete process.env.APP_URL;
    process.env.EXPO_PUBLIC_API_URL = 'https://api.buildpair.example/';
    expect(providerReturnUrl('payment', 'cancelled')).toBe('https://api.buildpair.example/status?type=payment&state=cancelled');
  });
});

describe('Stripe metadata guard', () => {
  it('accepts the BuildPay release metadata keys', () => {
    const metadata = stripeMetadata({
      jobId: 'job',
      milestoneId: 'milestone',
      traderId: 'trader',
      approvedBy: 'customer',
      approvalTerms: '2026-09-11-v4',
      homeownerApprovedRelease: 'true',
      contractAmount: '4750',
      buildPairFee: '48',
      stripeFeesRecovered: '20',
      stripeFeesRemaining: '0',
      netTraderTransfer: '4682',
    });
    expect(metadata.homeownerApprovedRelease).toBe('true');
  });

  it('rejects the metadata-key regression that broke stage release', () => {
    const brokenKey = 'homeownerAcknowledgedReleaseResponsibility';
    expect(brokenKey.length).toBeGreaterThan(STRIPE_METADATA_KEY_MAX);
    expect(() => stripeMetadata({ [brokenKey]: 'true' })).toThrow(/Invalid Stripe metadata key/);
  });

  it('rejects oversized metadata values', () => {
    expect(() => stripeMetadata({ note: 'x'.repeat(501) })).toThrow(/exceeds 500 characters/);
  });
});
