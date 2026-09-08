import { z } from 'zod';
import { feeableQuoteAmount, STRIPE_GBP_MINIMUM } from '@/lib/payment-protection';
import { platformFeeAmount } from '@/lib/platform-fee';

export const paymentStageKindSchema = z.enum(['materials', 'deposit', 'stage', 'final']);

export const paymentStagePlanSchema = z.object({
  key: z.string().trim().min(1).max(80),
  title: z.string().trim().min(2).max(120),
  amount: z.number().int().positive(),
  kind: paymentStageKindSchema,
  trigger: z.string().trim().max(500).default(''),
  sortOrder: z.number().int().min(1).max(20),
});

export const paymentScheduleSchema = z.array(paymentStagePlanSchema).min(1).max(10);

export type PaymentStagePlan = z.infer<typeof paymentStagePlanSchema>;

export function validatePaymentSchedule(schedule: PaymentStagePlan[], totalAmount: number) {
  const sorted = [...schedule].sort((a, b) => a.sortOrder - b.sortOrder).map((stage, index) => ({ ...stage, sortOrder: index + 1 }));
  const sum = sorted.reduce((total, stage) => total + stage.amount, 0);
  if (sum !== totalAmount) throw new Error(`Payment stages must add up exactly to the quote total (${totalAmount}p).`);
  const finalStages = sorted.filter((stage) => stage.kind === 'final');
  if (finalStages.length !== 1) throw new Error('Payment plan must contain exactly one final payment stage.');
  const finalStage = finalStages[0];
  if (!finalStage) throw new Error('Payment plan must contain a final payment stage.');
  if (sorted.at(-1)?.kind !== 'final') throw new Error('The final payment must be the last payment stage.');
  if (sorted.some((stage) => stage.amount < STRIPE_GBP_MINIMUM)) throw new Error('Each payment stage must be at least £0.30 if the job may use BuildPair payments.');
  const depositTotal = sorted.filter((stage) => stage.kind === 'deposit').reduce((total, stage) => total + stage.amount, 0);
  const fee = platformFeeAmount(feeableQuoteAmount(totalAmount, depositTotal));
  if (finalStage.amount <= fee) throw new Error(`The final payment must be more than the BuildPair transaction fee (£${(fee / 100).toFixed(2)}) so a positive final payout remains.`);
  const workStages = sorted.filter((stage) => stage.kind === 'stage');
  if (workStages.some((stage) => stage.trigger.trim().length < 3)) throw new Error('Each progress stage needs a clear completion point before it can be funded and released.');
  return sorted;
}
