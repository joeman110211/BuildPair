import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  HOMEOWNER_REGISTRATION_OPEN,
  MARKETPLACE_OPEN,
  TRADER_PRELAUNCH_REGISTRATION_OPEN,
} from '@/lib/launch-config';

describe('BuildPair prelaunch gates', () => {
  it('opens trade setup while keeping homeowner registration and the marketplace closed', () => {
    expect(TRADER_PRELAUNCH_REGISTRATION_OPEN).toBe(true);
    expect(HOMEOWNER_REGISTRATION_OPEN).toBe(false);
    expect(MARKETPLACE_OPEN).toBe(false);
  });

  it('keeps a server-side marketplace lock around transactional API families', () => {
    const server = readFileSync('server.mjs', 'utf8');
    for (const path of [
      '/api/jobs',
      '/api/quotes',
      '/api/buildpay',
      '/api/payments',
      '/api/conversations',
      '/api/stripe/subscription',
      '/api/stripe/payment-intent',
      '/api/stripe/connect',
    ]) {
      expect(server).toContain(path);
    }
    expect(server).toContain('marketplace_prelaunch');
    expect(server).not.toContain("'/api/stripe/webhook'");
  });
});
