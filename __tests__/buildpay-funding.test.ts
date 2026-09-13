import { describe, expect, it } from 'vitest';
import { fundingTotal, openingFundingStages, plannedBuildPayChargeCount } from '@/lib/buildpay-funding';

describe('BuildPay funding flow', () => {
  it('bundles £50 materials and £50 stage one into one £100 opening payment', () => {
    const stages = [
      { id: 'materials', amount: 5_000, kind: 'materials' as const, sortOrder: 1, status: 'pending' as const },
      { id: 'stage-1', amount: 5_000, kind: 'stage' as const, sortOrder: 2, status: 'pending' as const },
      { id: 'final', amount: 5_000, kind: 'final' as const, sortOrder: 3, status: 'pending' as const },
    ];
    const opening = openingFundingStages(stages);
    expect(opening.map((stage) => stage.id)).toEqual(['materials', 'stage-1']);
    expect(fundingTotal(opening)).toBe(10_000);
    expect(plannedBuildPayChargeCount(stages)).toBe(2);
  });

  it('matches the planned live £3 smoke test: £1 materials plus £1 stage one opens as one £2 contract payment', () => {
    const stages = [
      { id: 'materials', amount: 100, kind: 'materials' as const, sortOrder: 1, status: 'pending' as const },
      { id: 'stage-1', amount: 100, kind: 'stage' as const, sortOrder: 2, status: 'pending' as const },
      { id: 'final', amount: 100, kind: 'final' as const, sortOrder: 3, status: 'pending' as const },
    ];
    const opening = openingFundingStages(stages);
    expect(opening.map((stage) => stage.id)).toEqual(['materials', 'stage-1']);
    expect(fundingTotal(opening)).toBe(200);
    expect(plannedBuildPayChargeCount(stages)).toBe(2);
  });

  it('supports a materials-only job when there is no protected work stage to bundle', () => {
    const materialsOnly = [{ id: 'materials', amount: 5_000, kind: 'materials' as const, sortOrder: 1, status: 'pending' as const }];
    expect(openingFundingStages(materialsOnly).map((stage) => stage.id)).toEqual(['materials']);
    expect(fundingTotal(materialsOnly)).toBe(5_000);
  });

  it('supports jobs with no materials using a protected deposit then balance', () => {
    const stages = [
      { id: 'deposit', amount: 3_000, kind: 'deposit' as const, sortOrder: 1, status: 'pending' as const },
      { id: 'final', amount: 7_000, kind: 'final' as const, sortOrder: 2, status: 'pending' as const },
    ];
    expect(openingFundingStages(stages).map((stage) => stage.id)).toEqual(['deposit']);
    expect(plannedBuildPayChargeCount(stages)).toBe(2);
  });

  it('supports a small no-material job as one protected final payment', () => {
    const stages = [{ id: 'final', amount: 8_000, kind: 'final' as const, sortOrder: 1, status: 'pending' as const }];
    expect(openingFundingStages(stages).map((stage) => stage.id)).toEqual(['final']);
    expect(plannedBuildPayChargeCount(stages)).toBe(1);
  });
});
