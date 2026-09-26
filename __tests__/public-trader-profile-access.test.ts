import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('public trader profile access', () => {
  it('shows real profiles before launch but returns to paid-only discovery when the marketplace opens', () => {
    const endpoint = source('app/api/traders+api.ts');
    expect(endpoint).toContain('MARKETPLACE_OPEN');
    expect(endpoint).toContain("${MARKETPLACE_OPEN}::boolean = false");
    expect(endpoint).toContain("tp.subscription_tier <> 'free'");
    expect(endpoint).toContain('tp.is_subscription_active = true');
  });

  it('keeps unpaid profiles locked after launch while allowing safe prelaunch browsing', () => {
    const endpoint = source('app/api/traders/[id]+api.ts');
    expect(endpoint).toContain('const prelaunchProfile = !MARKETPLACE_OPEN');
    expect(endpoint).toContain('if (!paidProfile && !viewerIsOwner && !prelaunchProfile)');
    expect(endpoint).toContain('publicLocked: true');
    expect(endpoint).toContain('contact: null');
    expect(endpoint).toContain('canRequestQuote: MARKETPLACE_OPEN && paidProfile');
  });

  it('does not pretend homeowner sign-in unlocks an inactive shared profile', () => {
    const route = source('app/(public)/traders/[id].tsx');
    expect(route).toContain('Creating or signing into a homeowner account will not unlock an inactive profile.');
    expect(route).toContain('If this tradesperson activates their public profile later, this same shared link will begin showing it automatically.');
  });

  it('keeps direct contact behind an existing accepted-job relationship', () => {
    const endpoint = source('app/api/traders/[id]+api.ts');
    expect(endpoint).toContain('j.accepted_quote_id');
    expect(endpoint).toContain('mayViewContact');
    expect(endpoint).toContain('contactLocked: !contact');
  });
});
