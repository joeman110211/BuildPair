import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('public trader profile access', () => {
  it('keeps marketplace discovery limited to active paid trader profiles', () => {
    const endpoint = source('app/api/traders+api.ts');
    expect(endpoint).toContain("tp.subscription_tier <> 'free'");
    expect(endpoint).toContain('tp.is_subscription_active = true');
  });

  it('locks an unpaid trader profile server-side for everyone except its owner', () => {
    const endpoint = source('app/api/traders/[id]+api.ts');
    expect(endpoint).toContain('if (!paidProfile && !viewerIsOwner)');
    expect(endpoint).toContain('publicLocked: true');
    expect(endpoint).toContain('contact: null');
    expect(endpoint).toContain('canRequestQuote: false');
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
