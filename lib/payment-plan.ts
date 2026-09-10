import { z } from 'zod';
import { STRIPE_GBP_MINIMUM } from '@/lib/payment-protection';

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

export function fullFundingSchedule(totalAmount: number, materialsAmount: number): PaymentStagePlan[] {
  const materials = Math.max(0, Math.min(totalAmount, materialsAmount));
  const serviceBalance = totalAmount - materials;
  const stages: PaymentStagePlan[] = [];
  if (materials > 0) {
    stages.push({
      key: 'materials',
      title: 'Materials payment',
      amount: materials,
      kind: 'materials',
      trigger: 'Paid when the quote is accepted so materials can be ordered.',
      sortOrder: 1,
    });
  }
  if (serviceBalance > 0) {
    stages.push({
      key: 'final',
      title: 'Protected service balance',
      amount: serviceBalance,
      kind: 'final',
      trigger: 'Funded after materials and released only after final completion is approved.',
      sortOrder: stages.length + 1,
    });
  }
  return stages;
}

/**
 * Older BuildPair quote screens built a payment schedule against the whole job
 * and did not automatically split materials out first. This compatibility
 * normalizer converts those schedules without changing the quote total.
 *
 * If the trader explicitly supplied a materials stage, it must already equal
 * the exact quoted materials amount. We never silently rewrite an explicit
 * materials figure.
 */
export function normalizeMaterialsFirstSchedule(schedule: PaymentStagePlan[], totalAmount: number, materialsAmount: number) {
  const sorted = [...schedule].sort((a, b) => a.sortOrder - b.sortOrder).map((stage, index) => ({ ...stage, sortOrder: index + 1 }));
  const expectedMaterials = Math.max(0, materialsAmount);
  const materialStages = sorted.filter((stage) => stage.kind === 'materials');
  const explicitMaterials = materialStages.reduce((sum, stage) => sum + stage.amount, 0);

  if (materialStages.length) {
    if (explicitMaterials !== expectedMaterials) {
      throw new Error(`Materials stages must equal the quoted materials total exactly (£${(expectedMaterials / 100).toFixed(2)}).`);
    }
    return validatePaymentSchedule(sorted, totalAmount, expectedMaterials);
  }

  if (expectedMaterials === 0) return validatePaymentSchedule(sorted, totalAmount, 0);

  const adjusted = sorted.map((stage) => ({ ...stage }));
  let toCarveOut = expectedMaterials;
  for (let index = adjusted.length - 1; index >= 0 && toCarveOut > 0; index -= 1) {
    const stage = adjusted[index];
    if (!stage || stage.kind === 'materials') continue;
    const reducible = Math.max(0, stage.amount - STRIPE_GBP_MINIMUM);
    const reduction = Math.min(reducible, toCarveOut);
    stage.amount -= reduction;
    toCarveOut -= reduction;
  }
  if (toCarveOut > 0) {
    throw new Error('The proposed payment stages do not leave enough room to split out the exact materials payment. Increase the later service balance or revise the stages.');
  }

  const result: PaymentStagePlan[] = [
    {
      key: 'materials',
      title: 'Materials payment',
      amount: expectedMaterials,
      kind: 'materials',
      trigger: 'Paid first so the quoted materials can be ordered.',
      sortOrder: 1,
    },
    ...adjusted.map((stage, index) => ({ ...stage, sortOrder: index + 2 })),
  ];
  return validatePaymentSchedule(result, totalAmount, expectedMaterials);
}

export function validatePaymentSchedule(schedule: PaymentStagePlan[], totalAmount: number, materialsAmount?: number) {
  const sorted = [...schedule].sort((a, b) => a.sortOrder - b.sortOrder).map((stage, index) => ({ ...stage, sortOrder: index + 1 }));
  const sum = sorted.reduce((total, stage) => total + stage.amount, 0);
  if (sum !== totalAmount) throw new Error(`Payment stages must add up exactly to the quote total (${totalAmount}p).`);

  const finalStages = sorted.filter((stage) => stage.kind === 'final');
  if (finalStages.length !== 1) throw new Error('Payment plan must contain exactly one final payment stage.');
  if (sorted.at(-1)?.kind !== 'final') throw new Error('The final payment must be the last payment stage.');
  if (sorted.some((stage) => stage.amount < STRIPE_GBP_MINIMUM)) throw new Error('Each payment stage must be at least £0.30 if the job may use BuildPair payments.');

  if (materialsAmount != null) {
    const expectedMaterials = Math.max(0, materialsAmount);
    const materialStages = sorted.filter((stage) => stage.kind === 'materials');
    const materialTotal = materialStages.reduce((total, stage) => total + stage.amount, 0);
    if (materialTotal !== expectedMaterials) {
      throw new Error(`Materials stages must equal the quoted materials total exactly (£${(expectedMaterials / 100).toFixed(2)}).`);
    }
    if (expectedMaterials > 0 && sorted[0]?.kind !== 'materials') {
      throw new Error('The materials payment must be the first payment stage so procurement can be funded immediately.');
    }
  }

  const controlledStages = sorted.filter((stage) => stage.kind !== 'materials');
  if (controlledStages.some((stage) => stage.trigger.trim().length < 3)) {
    throw new Error('Every protected service stage needs a clear completion point before funds can be released.');
  }
  return sorted;
}
