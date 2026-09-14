import { createHmac, timingSafeEqual } from 'node:crypto';

function signingSecret(override?: string) {
  const secret = override?.trim() || process.env.CLERK_SECRET_KEY?.trim();
  if (!secret) throw new Error('Waitlist update signing is not configured');
  return secret;
}

function signature(id: string, secret?: string) {
  return createHmac('sha256', signingSecret(secret))
    .update(`buildpair-waitlist-update:v1:${id}`)
    .digest('base64url');
}

export function issueWaitlistUpdateToken(id: string, secret?: string) {
  return `${id}.${signature(id, secret)}`;
}

export function verifyWaitlistUpdateToken(token: string | undefined, id: string, secret?: string) {
  if (!token) return false;
  const separator = token.indexOf('.');
  if (separator <= 0) return false;
  const tokenId = token.slice(0, separator);
  const suppliedSignature = token.slice(separator + 1);
  if (tokenId !== id || !suppliedSignature) return false;

  const expectedSignature = signature(id, secret);
  const supplied = Buffer.from(suppliedSignature, 'utf8');
  const expected = Buffer.from(expectedSignature, 'utf8');
  if (supplied.length !== expected.length) return false;
  return timingSafeEqual(supplied, expected);
}
