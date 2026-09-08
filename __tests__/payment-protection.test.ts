import { afterEach, describe, expect, it } from 'vitest';
import { feeableQuoteAmount, isImmediatelyReleasedStage, stagePlatformFee } from '@/lib/payment-protection';

const originalPlatformFeePercent = process.env.PLATFORM_FEE_PERCENT;

afterEach(() => {
  if (originalPlatformFeePercent === undefined) delete process.env.PLATFORM_FEE_PERCENT;
  else process.env.PLATFORM_FEE_PERCENT = originalPlatformFeePercent;
});

describe('BuildPair protected payment fees', () => {
  it('charges the BuildPair fee only on the quote amount after deposit stages', () => {
    process.env.PLATFORM_FEE_PERCENT = '1';
    expect(feeableQuoteAmount(500_000, 50_000)).toBe(450_000);
    expect(stagePlatformFee('final', 500_000, 50_000)).toBe(4_500);
    expect(stagePlatformFee('stage', 500_000, 50_000)).toBe(0);
  });

  it('releases materials and deposit payments immediately but holds work stages', () => {
    expect(isImmediatelyReleasedStage('materials')).toBe(true);
    expect(isImmediatelyReleasedStage('deposit')).toBe(true);
    expect(isImmediatelyReleasedStage('stage')).toBe(false);
    expect(isImmediatelyReleasedStage('final')).toBe(false);
  });
});
