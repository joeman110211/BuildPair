import { platformFeeAmount } from '@/lib/platform-fee';

export const STRIPE_GBP_MINIMUM = 30;
export const STRIPE_PROCESSING_MAX_PERCENT = 3.15;
export const STRIPE_PROCESSING_FIXED_PENCE = 20;

export type MilestonePaymentKind = 'materials' | 'deposit' | 'stage' | 'final';
export type FeeStage = { id: string; amount: number; kind: MilestonePaymentKind; sortOrder: number };

/** BuildPair's 1% fee base. Materials and VAT are deliberately excluded. */
export function feeableQuoteAmount(laborServiceAmount: number) {
  return Math.max(0, laborServiceAmount);
}

/** Conservative affordability estimate used before a job can use protected payments. */
export function estimatedStripeProcessingCost(totalAmount: number, chargeCount: number) {
  const variable = Math.ceil(Math.max(0, totalAmount) * STRIPE_PROCESSING_MAX_PERCENT / 100);
  return variable + Math.max(0, chargeCount) * STRIPE_PROCESSING_FIXED_PENCE;
}

export function totalPlatformFee(laborServiceAmount: number) {
  return platformFeeAmount(feeableQuoteAmount(laborServiceAmount));
}

/**
 * Allocate the labour-only BuildPair fee across controlled service payouts.
 * Materials never carry platform commission. The final eligible stage receives
 * the rounding remainder so the allocations always equal the exact total fee.
 */
export function allocatePlatformFees(stages: FeeStage[], laborServiceAmount: number) {
  const result = new Map<string, number>();
  for (const stage of stages) result.set(stage.id, 0);

  const eligible = [...stages]
    .filter((stage) => stage.kind !== 'materials')
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const fee = totalPlatformFee(laborServiceAmount);
  const weightTotal = eligible.reduce((sum, stage) => sum + Math.max(0, stage.amount), 0);
  if (!fee || !weightTotal || !eligible.length) return result;

  let allocated = 0;
  eligible.forEach((stage, index) => {
    const value = index === eligible.length - 1
      ? fee - allocated
      : Math.floor(fee * Math.max(0, stage.amount) / weightTotal);
    result.set(stage.id, Math.max(0, value));
    allocated += Math.max(0, value);
  });
  return result;
}

export function stagePlatformFee(stageId: string, stages: FeeStage[], laborServiceAmount: number) {
  return allocatePlatformFees(stages, laborServiceAmount).get(stageId) ?? 0;
}

export function validateStripeStageAmount(amount: number) {
  if (!Number.isInteger(amount) || amount < STRIPE_GBP_MINIMUM) {
    throw new Error('BuildPair card payments must be at least £0.30');
  }
  return amount;
}

/** Only materials bypass protected release. Deposits are controlled funds. */
export function isImmediatelyReleasedStage(kind: MilestonePaymentKind) {
  return kind === 'materials';
}

/**
 * Recover Stripe's actual costs as early as possible without ever making a
 * negative trader transfer. Non-final stages can carry a shortfall forward;
 * the final stage must be able to clear everything still outstanding.
 */
export function processingRecoveryForRelease(args: {
  milestoneAmount: number;
  platformFee: number;
  outstandingStripeFees: number;
  isFinal: boolean;
}) {
  const availableAfterPlatformFee = Math.max(0, args.milestoneAmount - Math.max(0, args.platformFee));
  const recoverable = Math.min(Math.max(0, args.outstandingStripeFees), Math.max(0, availableAfterPlatformFee - 1));
  const remaining = Math.max(0, args.outstandingStripeFees - recoverable);
  if (args.isFinal && remaining > 0) {
    throw new Error('The final service payment is too small to recover the remaining Stripe processing costs. Revise the payment schedule before release.');
  }
  return { recovered: recoverable, remaining };
}

export function validateProtectedPaymentEconomics(args: {
  totalAmount: number;
  materialsAmount: number;
  laborServiceAmount: number;
  chargeCount: number;
}) {
  const servicePayoutPool = Math.max(0, args.totalAmount - Math.max(0, args.materialsAmount));
  const platformFee = totalPlatformFee(args.laborServiceAmount);
  const estimatedProcessing = estimatedStripeProcessingCost(args.totalAmount, args.chargeCount);
  if (servicePayoutPool <= platformFee + estimatedProcessing) {
    throw new Error('The service portion of this quote is too small to cover BuildPair payment processing safely. Use a private payment route or revise the quote/payment stages.');
  }
  return { servicePayoutPool, platformFee, estimatedProcessing };
}
