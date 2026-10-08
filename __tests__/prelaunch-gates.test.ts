import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BUILDPAY_OPEN, HOMEOWNER_REGISTRATION_OPEN, MARKETPLACE_OPEN, REGISTRATION_OPEN } from '@/lib/launch-config';

describe('BuildPair regional launch gates', () => {
  it('enables genuine homeowner and tradesperson signups and marketplace activities', () => {
    expect(REGISTRATION_OPEN).toBe(true);
    expect(HOMEOWNER_REGISTRATION_OPEN).toBe(true);
    expect(MARKETPLACE_OPEN).toBe(true);
  });

  it('keeps BuildPay entirely unavailable for the launch', () => {
    expect(BUILDPAY_OPEN).toBe(false);
    const server = readFileSync('server.mjs', 'utf8');
    expect(server).toContain('function isUnavailableLaunchApi(');
    expect(server).toContain('if (unavailableFeature)');
    for (const route of ['/api/payments', '/api/stripe/payment-intent', '/api/stripe/connect', '/api/buildpay']) {
      expect(server).toContain(route);
    }
    expect(server).not.toContain("'/api/stripe/webhook',");
  });

  it('rejects selection of BuildPay inside normal marketplace jobs and quotes', () => {
    for (const path of [
      'app/api/jobs/[id]+api.ts',
      'app/api/quotes+api.ts',
      'app/api/quotes/[id]+api.ts',
      'app/api/business-quotes+api.ts',
    ]) {
      const source = readFileSync(path, 'utf8');
      expect(source).toContain('BUILDPAY_OPEN');
      expect(source).toContain('HttpError(423');
    }
  });

  it('preserves direct-payment workflows while subscription checkout is unavailable', () => {
    const server = readFileSync('server.mjs', 'utf8');
    const section = server.slice(server.indexOf('function isUnavailableLaunchApi('), server.indexOf('function sendFeatureUnavailable('));
    expect(section).not.toContain("'/api/payment-arrangement'");
    expect(section).not.toContain("'/api/external-payments'");
    expect(section).toContain('NEW_SUBSCRIPTIONS_OPEN');
  });
});
