import { describe, expect, it } from 'vitest';
import { classifyPayoutStatus } from '@/lib/payout-status';

describe('payout status classification', () => {
  it('keeps an account not started separate from verification', () => {
    expect(classifyPayoutStatus({ hasAccount: false, payoutsEnabled: false }).key).toBe('not_started');
  });

  it('reports outstanding Stripe requirements as action required', () => {
    const status = classifyPayoutStatus({
      hasAccount: true,
      payoutsEnabled: false,
      detailsSubmitted: false,
      currentlyDue: ['external_account'],
    });
    expect(status.key).toBe('action_required');
    expect(status.requirements).toContain('Bank account');
  });

  it('distinguishes submitted verification from payout readiness', () => {
    expect(classifyPayoutStatus({
      hasAccount: true,
      payoutsEnabled: false,
      detailsSubmitted: true,
    }).key).toBe('pending_verification');
  });

  it('only reports ready when Stripe payouts are enabled', () => {
    const status = classifyPayoutStatus({
      hasAccount: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
    });
    expect(status.key).toBe('ready');
    expect(status.ready).toBe(true);
  });
});
