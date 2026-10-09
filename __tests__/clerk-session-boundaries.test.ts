import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { permitsAuthenticatedWriteOrigin, verifyBuildPairClerkSession } from '@/lib/clerk-session';
const verifyToken = vi.hoisted(() => vi.fn());
vi.mock('@clerk/backend', () => ({ verifyToken }));

function token(iss: string, azp?: string) {
  return [Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-key' })).toString('base64url'), Buffer.from(JSON.stringify({ iss, azp })).toString('base64url'), 'test-signature'].join('.');
}
beforeEach(() => {
  vi.stubEnv('CLERK_SECRET_KEY', 'mock-secret');
  vi.stubEnv('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY', `pk_test_${Buffer.from('clerk.example$').toString('base64url')}`);
  verifyToken.mockReset().mockResolvedValue({ sub: 'user_test' });
});
afterEach(() => vi.unstubAllEnvs());
describe('Clerk primary verification boundary', () => {
  it('rejects cross-site cookie writes while allowing same-site and native requests', () => {
    const request = (origin?: string, bearer?: string) => new Request('https://www.buildpair.co.uk/api/me', { method: 'POST', headers: { cookie: '__session=mock-session', ...(origin ? { origin } : {}), ...(bearer ? { authorization: bearer } : {}) } });
    expect(permitsAuthenticatedWriteOrigin(request('https://attacker.example'))).toBe(false);
    expect(permitsAuthenticatedWriteOrigin(request())).toBe(false);
    expect(permitsAuthenticatedWriteOrigin(request('https://www.buildpair.co.uk'))).toBe(true);
    expect(permitsAuthenticatedWriteOrigin(request(undefined, 'Bearer native-session'))).toBe(true);
  });
  it('rejects another instance before accepting a successfully verified token', async () => {
    await expect(verifyBuildPairClerkSession(token('https://other.example'))).rejects.toThrow('issuer');
    expect(verifyToken).not.toHaveBeenCalled();
  });
  it('rejects an unapproved browser origin on the primary path', async () => {
    await expect(verifyBuildPairClerkSession(token('https://clerk.example', 'https://attacker.example'))).rejects.toThrow('authorized party');
    expect(verifyToken).not.toHaveBeenCalled();
  });
  it('passes the production origin allowlist to Clerk verification', async () => {
    await expect(verifyBuildPairClerkSession(token('https://clerk.example', 'https://www.buildpair.co.uk'))).resolves.toEqual({ sub: 'user_test' });
    expect(verifyToken).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ authorizedParties: expect.arrayContaining(['https://www.buildpair.co.uk']) }));
  });
  it('continues to support native tokens with no browser origin', async () => {
    await expect(verifyBuildPairClerkSession(token('https://clerk.example'))).resolves.toEqual({ sub: 'user_test' });
  });
});
