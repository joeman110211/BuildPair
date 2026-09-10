import { describe, expect, it } from 'vitest';
import { fullFundingSchedule, paymentScheduleSchema, validatePaymentSchedule } from '@/lib/payment-plan';

describe('payment plan validation', () => {
  it('accepts materials, deposit, progress and final stages that exactly match the quote total', () => {
    const schedule = paymentScheduleSchema.parse([
      { key: 'materials', title: 'Materials payment', amount: 10000, kind: 'materials', trigger: 'Before materials are ordered', sortOrder: 1 },
      { key: 'deposit', title: 'Project deposit', amount: 5000, kind: 'deposit', trigger: 'Before work starts', sortOrder: 2 },
      { key: 'stage-1', title: 'First fix', amount: 15000, kind: 'stage', trigger: 'First fix complete', sortOrder: 3 },
      { key: 'final', title: 'Final payment', amount: 20000, kind: 'final', trigger: 'Job complete', sortOrder: 4 },
    ]);
    expect(validatePaymentSchedule(schedule, 50000, 10000)).toHaveLength(4);
  });

  it('rejects a materials stage that differs from the quoted materials amount', () => {
    const schedule = paymentScheduleSchema.parse([
      { key: 'materials', title: 'Materials payment', amount: 9000, kind: 'materials', trigger: 'Materials', sortOrder: 1 },
      { key: 'final', title: 'Final payment', amount: 41000, kind: 'final', trigger: 'Job complete', sortOrder: 2 },
    ]);
    expect(() => validatePaymentSchedule(schedule, 50000, 10000)).toThrow(/materials stages must equal/i);
  });

  it('builds full funding as exact materials plus one protected service balance', () => {
    expect(fullFundingSchedule(50000, 12000)).toEqual([
      { key: 'materials', title: 'Materials payment', amount: 12000, kind: 'materials', trigger: 'Paid when the quote is accepted so materials can be ordered.', sortOrder: 1 },
      { key: 'final', title: 'Protected service balance', amount: 38000, kind: 'final', trigger: 'Funded after materials and released only after final completion is approved.', sortOrder: 2 },
    ]);
  });

  it('rejects a stage split that changes the tradesperson quote total', () => {
    const schedule = paymentScheduleSchema.parse([
      { key: 'stage-1', title: 'First stage', amount: 10000, kind: 'stage', trigger: 'Stage complete', sortOrder: 1 },
      { key: 'final', title: 'Final payment', amount: 10000, kind: 'final', trigger: 'Job complete', sortOrder: 2 },
    ]);
    expect(() => validatePaymentSchedule(schedule, 25000)).toThrow(/add up exactly/i);
  });

  it('requires the final payment to be the last stage', () => {
    const schedule = paymentScheduleSchema.parse([
      { key: 'final', title: 'Final payment', amount: 10000, kind: 'final', trigger: 'Job complete', sortOrder: 1 },
      { key: 'stage-1', title: 'Later stage', amount: 10000, kind: 'stage', trigger: 'Later', sortOrder: 2 },
    ]);
    expect(() => validatePaymentSchedule(schedule, 20000)).toThrow(/final payment must be the last/i);
  });
});
