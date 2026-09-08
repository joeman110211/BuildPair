import { platformFeeAmount } from '@/lib/platform-fee';

export const STRIPE_GBP_MINIMUM = 30;

export type MilestonePaymentKind = 'materials' | 'deposit' | 'stage' | 'final';

export function stagePlatformFee(kind: MilestonePaymentKind, quoteTotal: number) {
  return kind === 'final' ? platformFeeAmount(quoteTotal) : 0;
}

export function transferAmountForStage(kind: MilestonePaymentKind, milestoneAmount: number, quoteTotal: number) {
  const fee = stagePlatformFee(kind, quoteTotal);
  if (fee > milestoneAmount) throw new Error('The final payment must be large enough to cover the BuildPair transaction fee');
  return milestoneAmount - fee;
}

export function validateStripeStageAmount(amount: number) {
  if (!Number.isInteger(amount) || amount < STRIPE_GBP_MINIMUM) {
    throw new Error('BuildPair card payments must be at least £0.30');
  }
  return amount;
}

export function isImmediatelyReleasedStage(kind: MilestonePaymentKind) {
  return kind === 'materials';
}
