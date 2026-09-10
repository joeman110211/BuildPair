import { afterEach, describe, expect, it } from 'vitest';
import {
  allocatePlatformFees,
  feeableQuoteAmount,
  isImmediatelyReleasedStage,
  processingRecoveryForRelease,
  totalPlatformFee,
} from '@/lib/payment-protection';

const originalPlatformFeePercent = process.env.PLATFORM_FEE_PERCENT;

afterEach(() => {
  if (originalPlatformFeePercent === undefined) delete process.env.PLATFORM_FEE_PERCENT;
  else process.env.PLATFORM_FEE_PERCENT = originalPlatformFeePercent;
});

describe('BuildPair protected payment fees', () => {
  it('charges exactly 1% on labour/service and never on materials', () => {
    process.env.PLATFORM_FEE_PERCENT = '1';
    expect(feeableQuoteAmount(300_000)).toBe(300_000);
    expect(totalPlatformFee(300_000)).toBe(3_000);
    const allocations = allocatePlatformFees([
      { id: 'materials', amount: 200_000, kind: 'materials', sortOrder: 1 },
      { id: 'deposit', amount: 100_000, kind: 'deposit', sortOrder: 2 },
      { id: 'stage', amount: 100_000, kind: 'stage', sortOrder: 3 },
      { id: 'final', amount: 100_000, kind: 'final', sortOrder: 4 },
    ], 300_000);
    expect(allocations.get('materials')).toBe(0);
    expect((allocations.get('deposit') ?? 0) + (allocations.get('stage') ?? 0) + (allocations.get('final') ?? 0)).toBe(3_000);
  });

  it('releases only materials immediately and protects deposits/work stages', () => {
    expect(isImmediatelyReleasedStage('materials')).toBe(true);
    expect(isImmediatelyReleasedStage('deposit')).toBe(false);
    expect(isImmediatelyReleasedStage('stage')).toBe(false);
    expect(isImmediatelyReleasedStage('final')).toBe(false);
  });

  it('recovers Stripe fees early and carries any excess to later stages', () => {
    expect(processingRecoveryForRelease({ milestoneAmount: 20_000, platformFee: 200, outstandingStripeFees: 750, isFinal: false })).toEqual({ recovered: 750, remaining: 0 });
    expect(processingRecoveryForRelease({ milestoneAmount: 500, platformFee: 100, outstandingStripeFees: 900, isFinal: false })).toEqual({ recovered: 399, remaining: 501 });
    expect(() => processingRecoveryForRelease({ milestoneAmount: 500, platformFee: 100, outstandingStripeFees: 900, isFinal: true })).toThrow(/final service payment/i);
  });
});
