import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('public surface hardening', () => {
  it('does not ship the temporary full-source export API', () => {
    const route = new URL('../app/api/internal-source-export-20260912+api.ts', import.meta.url);
    expect(existsSync(route)).toBe(false);
  });

  it('does not advertise an admin sign-in entry point in the public footer', () => {
    const footer = source('components/PublicFooter.tsx');
    expect(footer).not.toContain('Admin sign in');
    expect(footer).not.toContain('admin=1');
  });

  it('keeps directory capability labels informational rather than disabled-looking controls', () => {
    const directory = source('app/(public)/directory.tsx');
    expect(directory).toContain('BuildPair search');
    expect(directory).toContain('capabilityPill');
    expect(directory).not.toContain('<Chip>Smart intent matching</Chip>');
  });

  it('avoids the broken third-party embedded map marker tooltip', () => {
    const map = source('components/ServiceAreaMap.tsx');
    expect(map).toContain('export/embed.html?bbox=${bbox}&layer=mapnik`');
    expect(map).not.toContain('export/embed.html?bbox=${bbox}&layer=mapnik&marker=');
  });
});
