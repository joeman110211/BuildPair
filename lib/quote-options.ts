export const QUOTE_SCOPE_MIN_LENGTH = 50;

export const QUOTE_DURATION_OPTIONS = [
  { value: 1, label: '1 day' },
  { value: 2, label: '2 days' },
  { value: 3, label: '3 days' },
  { value: 4, label: '4 days' },
  { value: 5, label: '5 days' },
  { value: 7, label: '1 week' },
  { value: 10, label: '10 days' },
  { value: 14, label: '2 weeks' },
  { value: 21, label: '3 weeks' },
  { value: 28, label: '4 weeks' },
  { value: 42, label: '6 weeks' },
  { value: 56, label: '8 weeks' },
  { value: 84, label: '12 weeks' },
  { value: 112, label: '16 weeks' },
  { value: 168, label: '24 weeks' },
  { value: 365, label: 'Up to 1 year' },
] as const;

export const QUOTE_DURATION_VALUES: readonly number[] = QUOTE_DURATION_OPTIONS.map((option) => option.value);

export function closestQuoteDuration(days: number) {
  return QUOTE_DURATION_VALUES.reduce((closest, value) => (
    Math.abs(value - days) < Math.abs(closest - days) ? value : closest
  ), 1);
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildQuoteStartDateOptions(daysAhead = 365, from = new Date()) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Array.from({ length: daysAhead }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index + 1);
    const value = toDateValue(date);
    return {
      value,
      label: date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    };
  });
}
