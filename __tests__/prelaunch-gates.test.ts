import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  HOMEOWNER_REGISTRATION_OPEN,
  MARKETPLACE_OPEN,
  TRADER_PRELAUNCH_REGISTRATION_OPEN,
} from '@/lib/launch-config';

describe('BuildPair launch gates', () => {
  it('opens trade and homeowner accounts with the marketplace', () => {
    expect(TRADER_PRELAUNCH_REGISTRATION_OPEN).toBe(true);
    expect(HOMEOWNER_REGISTRATION_OPEN).toBe(true);
    expect(MARKETPLACE_OPEN).toBe(true);
  });

  it('lets Founding Trades synchronize a real account while public registration stays closed', () => {
    const server = readFileSync('lib/server.ts', 'utf8');
    expect(server).toContain('TRADER_PRELAUNCH_REGISTRATION_OPEN');
    expect(server).toContain("identity.mode === 'trader'");
    expect(server).toContain('prelaunchTraderAllowed');
    expect(server).toContain('recordPrelaunchTraderRegistration');
  });

  it('allows public trader discovery before launch while transactional public routes stay locked', () => {
    const layout = readFileSync('app/(public)/_layout.tsx', 'utf8');
    expect(layout).toContain("const MARKETPLACE_PATHS = ['/jobs']");
    expect(layout).not.toContain("['/directory', '/jobs', '/traders', '/quote']");
    expect(layout).toContain('visitors can browse those profiles before launch');
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
