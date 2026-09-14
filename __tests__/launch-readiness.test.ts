import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('launch-readiness guards', () => {
  it('does not ship the temporary source-export backup endpoint', () => {
    expect(existsSync(new URL('../app/api/internal-source-export-20260912+api.ts', import.meta.url))).toBe(false);
  });

  it('does not advertise the admin sign-in route in the public footer', () => {
    const footer = source('components/PublicFooter.tsx');
    expect(footer).not.toContain('Admin sign in');
    expect(footer).not.toContain('admin=1');
  });

  it('keeps building-regulations navigation consistent with public information pages', () => {
    const page = source('app/(public)/building-regulations.tsx');
    expect(page).toContain('router.canGoBack()');
    expect(page).toContain('← Back');
  });

  it('does not allow an unproven repeat waitlist submission to modify an existing record', () => {
    const endpoint = source('app/api/waitlist+api.ts');
    expect(endpoint).toContain('existingId && !mayUpdateExisting');
    expect(endpoint).toContain("return waitlistResponse({ ok: true, alreadyJoined: true });");
    expect(endpoint.indexOf('existingId && !mayUpdateExisting')).toBeLessThan(endpoint.indexOf('UPDATE launch_waitlist'));
  });

  it('uses explicit narrow-screen layouts for pricing and trader cards', () => {
    expect(source('components/PricingCards.tsx')).toContain('narrow && styles.cardNarrow');
    expect(source('components/TraderCard.tsx')).toContain('narrow && styles.cardNarrow');
  });
});
