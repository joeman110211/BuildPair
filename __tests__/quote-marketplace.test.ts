import { describe, expect, it } from 'vitest';
import { MAX_ACTIVE_QUOTES_PER_JOB, canAcceptNewQuote, quoteIntakeLabel } from '@/lib/quote-marketplace';

describe('quote marketplace intake', () => {
  it('accepts new quotes while intake is open and under the internal ceiling', () => {
    expect(canAcceptNewQuote({ activeQuoteCount: MAX_ACTIVE_QUOTES_PER_JOB - 1 })).toBe(true);
  });

  it('stops new traders when the internal ceiling is reached without exposing the number in copy', () => {
    expect(canAcceptNewQuote({ activeQuoteCount: MAX_ACTIVE_QUOTES_PER_JOB })).toBe(false);
    expect(quoteIntakeLabel({ activeQuoteCount: MAX_ACTIVE_QUOTES_PER_JOB })).toBe('Enough quotes received');
  });

  it('lets an existing trader revise their own pending quote after intake closes', () => {
    expect(canAcceptNewQuote({ intakeClosedAt: new Date().toISOString(), activeQuoteCount: 5, traderAlreadyQuoted: true })).toBe(true);
  });

  it('blocks a new trader when the homeowner pauses quote intake', () => {
    expect(canAcceptNewQuote({ intakeClosedAt: new Date().toISOString(), activeQuoteCount: 2 })).toBe(false);
  });
});
