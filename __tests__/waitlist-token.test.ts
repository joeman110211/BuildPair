import { describe, expect, it } from 'vitest';
import { issueWaitlistUpdateToken, verifyWaitlistUpdateToken } from '@/lib/waitlist-token';

const secret = 'unit-test-secret-that-is-not-production';

describe('waitlist update tokens', () => {
  it('accepts a token only for the record it was issued for', () => {
    const token = issueWaitlistUpdateToken('record-a', secret);
    expect(verifyWaitlistUpdateToken(token, 'record-a', secret)).toBe(true);
    expect(verifyWaitlistUpdateToken(token, 'record-b', secret)).toBe(false);
  });

  it('rejects missing, malformed and tampered tokens', () => {
    const token = issueWaitlistUpdateToken('record-a', secret);
    expect(verifyWaitlistUpdateToken(undefined, 'record-a', secret)).toBe(false);
    expect(verifyWaitlistUpdateToken('not-a-token', 'record-a', secret)).toBe(false);
    expect(verifyWaitlistUpdateToken(`${token}x`, 'record-a', secret)).toBe(false);
  });
});
