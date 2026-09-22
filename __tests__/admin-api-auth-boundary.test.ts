import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const adminApiRoot = fileURLToPath(new URL('../app/api/admin', import.meta.url));

function apiFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) return apiFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('+api.ts') ? [fullPath] : [];
  });
}

describe('admin API authorization boundary', () => {
  it('keeps every admin API route behind requireAdmin', () => {
    const routes = apiFiles(adminApiRoot);
    expect(routes.length).toBeGreaterThan(0);

    for (const route of routes) {
      const source = readFileSync(route, 'utf8');
      expect(source, `${route} must call requireAdmin before serving admin data or actions`).toContain('requireAdmin(');
    }
  });
});
