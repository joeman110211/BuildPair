import { randomUUID } from 'node:crypto';

export function createBusinessQuoteId() {
  return randomUUID();
}

export function createBusinessQuoteNumber() {
  const date = new Date();
  const stamp = `${String(date.getFullYear()).slice(-2)}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return `BP-${stamp}-${randomUUID().replace(/-/g, '').slice(0, 5).toUpperCase()}`;
}

export function createBusinessQuoteShareToken() {
  return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
}
