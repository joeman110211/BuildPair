import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('web account route protection', () => {
  it('keeps trader web routes behind the trader RoleGate without restoring the old web dashboard wrapper', () => {
    const layout = source('app/trader/_layout.tsx');
    expect(layout).toContain('if (Platform.OS === \'web\') return <RoleGate role="trader"><Slot /></RoleGate>;');
    expect(layout).not.toContain('<DashboardHeader home="/trader/dashboard" /><Slot />');
  });

  it('keeps homeowner web routes behind the customer RoleGate without restoring the old web dashboard wrapper', () => {
    const layout = source('app/customer/_layout.tsx');
    expect(layout).toContain('if (Platform.OS === \'web\') return <RoleGate role="customer"><Slot /></RoleGate>;');
    expect(layout).not.toContain('<DashboardHeader home="/customer/dashboard" /><Slot />');
  });
});
