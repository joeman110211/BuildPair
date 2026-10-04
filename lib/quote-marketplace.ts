export const MAX_ACTIVE_QUOTES_PER_JOB = 5;

export function canAcceptNewQuote(input: {
  intakeClosedAt?: string | null;
  activeQuoteCount: number;
  traderAlreadyQuoted?: boolean;
}) {
  if (input.traderAlreadyQuoted) return true;
  if (input.intakeClosedAt) return false;
  return Math.max(0, input.activeQuoteCount) < MAX_ACTIVE_QUOTES_PER_JOB;
}

export function quoteIntakeLabel(input: { intakeClosedAt?: string | null; activeQuoteCount: number }) {
  if (input.intakeClosedAt) return 'Quotes paused by homeowner';
  if (input.activeQuoteCount >= MAX_ACTIVE_QUOTES_PER_JOB) return 'Enough quotes received';
  return 'Receiving quotes';
}
