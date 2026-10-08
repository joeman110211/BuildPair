import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BUILDPAY_OPEN } from '@/lib/launch-config';

describe('BuildPay remains disabled independently of marketplace opening', () => {
  it('keeps the public feature flag disabled', () => {
    expect(BUILDPAY_OPEN).toBe(false);
  });

  it('locks payment intents, Connect and protected-payment mutations at the HTTP boundary', () => {
    const server = readFileSync('server.mjs', 'utf8');
    expect(server).toContain('const BUILDPAY_OPEN = false');
    expect(server).toContain('function isBlockedBuildPayApi(');
    expect(server).toContain('if (isBlockedBuildPayApi(pathName, req.method))');
    for (const path of ['/api/buildpay', '/api/payments', '/api/payment-disputes', '/api/stripe/payment-intent', '/api/stripe/connect']) {
      expect(server).toContain(path);
    }
    expect(server).toContain('buildpay_unavailable');
  });

  it('rejects BuildPay selection embedded in otherwise allowed quote and job API writes', () => {
    for (const path of [
      'app/api/quotes+api.ts',
      'app/api/quotes/[id]+api.ts',
      'app/api/jobs/[id]+api.ts',
      'app/api/business-quotes+api.ts',
    ]) {
      const source = readFileSync(path, 'utf8');
      expect(source).toContain('BUILDPAY_OPEN');
      expect(source).toContain('HttpError(423');
    }
  });

  it('retains direct-payment API access for the normal marketplace', () => {
    const server = readFileSync('server.mjs', 'utf8');
    const block = server.slice(server.indexOf('function isBlockedBuildPayApi('), server.indexOf('function sendBuildPayLocked('));
    expect(block).not.toContain("'/api/payment-arrangement'");
    expect(block).not.toContain("'/api/external-payments'");
  });
});
