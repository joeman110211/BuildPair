import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BUILDPAY_OPEN, HOMEOWNER_REGISTRATION_OPEN, MARKETPLACE_OPEN, PAID_PLANS_OPEN, PAID_PROJECT_PLUS_OPEN, REGISTRATION_OPEN } from '@/lib/launch-config';

describe('Public marketplace launch safety', () => {
  it('enables both account types and ordinary jobs', () => {
    expect(REGISTRATION_OPEN).toBe(true);
    expect(HOMEOWNER_REGISTRATION_OPEN).toBe(true);
    expect(MARKETPLACE_OPEN).toBe(true);
  });

  it('opens live trade and Project+ subscriptions while keeping BuildPay unavailable', () => {
    expect(BUILDPAY_OPEN).toBe(false);
    expect(PAID_PLANS_OPEN).toBe(true);
    expect(PAID_PROJECT_PLUS_OPEN).toBe(true);
  });

  it('blocks BuildPay at the server boundary while leaving normal jobs allowed', () => {
    const server = readFileSync('server.mjs', 'utf8');
    expect(server).toContain('function isBlockedBuildPayApi(');
    expect(server).toContain('if (isBlockedBuildPayApi(pathName, req.method))');
    expect(server).toContain('buildpay_unavailable');
    expect(server).toContain("'/api/stripe/payment-intent'");
    expect(server).toContain("'/api/stripe/connect'");
    const guarded = server.slice(server.indexOf('function isBlockedBuildPayApi('), server.indexOf('function sendBuildPayLocked('));
    expect(guarded).not.toContain("'/api/jobs'");
    expect(guarded).not.toContain("'/api/conversations'");
  });

  it('does not allow BuildPay selections via other quote and job APIs', () => {
    for (const path of [
      'app/api/quotes+api.ts', 'app/api/quotes/[id]+api.ts',
      'app/api/business-quotes+api.ts', 'app/api/jobs/[id]+api.ts',
    ]) {
      const route = readFileSync(path, 'utf8');
      expect(route).toContain('BUILDPAY_OPEN');
      expect(route).toContain('HttpError(423');
    }
  });

  it('sends live web visitors to working registration rather than the old waitlist', () => {
    const signup = readFileSync('app/auth/sign-up.web.tsx', 'utf8');
    const waitlist = readFileSync('app/(public)/waitlist.tsx', 'utf8');
    expect(signup).toContain('SignUp');
    expect(signup).toContain('forceRedirectUrl');
    expect(signup).not.toContain("waitlistHref(mode, 'direct-signup')");
    expect(waitlist).toContain('<Redirect href="/auth/sign-up?mode=customer" />');
  });

  it('rejects oversized request URLs before Expo query decoders run', () => {
    const server = readFileSync('server.mjs', 'utf8');
    expect(server).toContain('MAX_REQUEST_TARGET_LENGTH = 8192');
    expect(server).toContain('req.url.length > MAX_REQUEST_TARGET_LENGTH');
    expect(server).toContain('res.statusCode = 414');
    const guard = server.indexOf('req.url.length > MAX_REQUEST_TARGET_LENGTH');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(server.indexOf('handleAdminHostRouting(req, res)', guard));
    expect(guard).toBeLessThan(server.indexOf('await expoHandler(req, res', guard));
  });

  it('permits normal public signup without an invite link', () => {
    const signup = readFileSync('app/auth/sign-up.tsx', 'utf8');
    expect(signup).toContain('emailInput');
    expect(signup).toContain('if (inviteToken && (checkingInvite || !inviteStatus))');
    expect(signup).not.toContain('if (!inviteToken) return <Redirect');
  });
});
