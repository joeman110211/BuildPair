import { afterEach, describe, expect, it } from 'vitest';
import { appUrl, providerReturnUrl } from '@/lib/stripe';

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
