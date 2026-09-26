import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string) { return readFileSync(path, 'utf8'); }

describe('legacy trade category entitlement enforcement', () => {
  it('caps public directory and profile output to current plan categories', () => {
    expect(source('app/api/traders+api.ts')).toContain('effectiveTraderCategories');
    expect(source('app/api/traders/[id]+api.ts')).toContain('effectiveTraderCategories');
    expect(source('app/api/featured-trader+api.ts')).toContain('effectiveTraderCategories');
  });

  it('caps marketplace job visibility and quoting for old oversized profiles', () => {
    expect(source('app/api/jobs+api.ts')).toContain('effectiveTraderCategories');
    expect(source('app/api/quotes+api.ts')).toContain('effectiveTraderCategories');
  });

  it('caps SQL-side public search and job-match notifications before results are emitted', () => {
    const traders = source('app/api/traders+api.ts');
    const jobs = source('app/api/jobs+api.ts');
    expect(traders).toContain('array_position(');
    expect(traders).toContain("WHEN 'featured' THEN 6");
    expect(traders).toContain("WHEN 'basic' THEN 4");
    expect(jobs).toContain('array_position(');
    expect(jobs).toContain("WHEN 'featured' THEN 6");
    expect(jobs).toContain("WHEN 'basic' THEN 4");
  });
});
