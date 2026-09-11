export type FundingStage = {
  id: string;
  amount: number;
  kind: 'materials' | 'deposit' | 'stage' | 'final';
  sortOrder: number;
  status: 'pending' | 'funded' | 'completed' | 'paid' | 'disputed';
};

/**
 * BuildPay keeps the opening action deliberately simple:
 * - if materials are first, offer materials + the next work stage in one charge;
 * - otherwise fund the first outstanding deposit/stage/final on its own.
 */
export function openingFundingStages<T extends FundingStage>(stages: T[]) {
  const ordered = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
  const firstOutstandingIndex = ordered.findIndex((stage) => stage.status !== 'paid');
  if (firstOutstandingIndex < 0) return [] as T[];
  const first = ordered[firstOutstandingIndex]!;
  if (first.status !== 'pending') return [] as T[];
  const next = ordered[firstOutstandingIndex + 1];
  if (first.kind === 'materials' && next?.status === 'pending') return [first, next];
  return [first];
}

export function fundingTotal(stages: Pick<FundingStage, 'amount'>[]) {
  return stages.reduce((total, stage) => total + Math.max(0, stage.amount), 0);
}

/** One materials + first-work charge saves one Stripe charge compared with stage-by-stage funding. */
export function plannedBuildPayChargeCount(stages: Pick<FundingStage, 'kind'>[]) {
  if (!stages.length) return 0;
  return Math.max(1, stages.length - (stages.length > 1 && stages[0]?.kind === 'materials' ? 1 : 0));
}
