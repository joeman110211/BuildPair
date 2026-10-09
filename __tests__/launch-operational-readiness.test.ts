import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(path, 'utf8');

describe('open marketplace operational readiness', () => {
  it('checks the latest whole-job tables before reporting production ready', () => {
    const readiness = source('app/api/readiness+api.ts');
    for (const table of [
      'job_workspace_entries',
      'customer_properties',
      'customer_property_jobs',
      'project_plus_usage',
      'business_reminder_log',
      'business_quote_options',
    ]) expect(readiness).toContain(table);
    expect(readiness).toContain('0054_retention_property_attention.sql');
  });

  it('grants capped homeowner Project+ access while paid plans are closed', () => {
    const entitlement = source('lib/project-plus.ts');
    expect(entitlement).toContain('MARKETPLACE_OPEN && !PAID_PROJECT_PLUS_OPEN && row?.customerEnabled');
    expect(entitlement).toContain('imageLimit: complimentaryOnly ? 2 : PROJECT_PLUS_IMAGE_LIMIT');
    expect(entitlement).toContain('plannerLimit: complimentaryOnly ? 10 : PROJECT_PLUS_PLANNER_LIMIT');
    const studio = source('components/ProjectPlusStudio.tsx');
    expect(studio).toContain('Complimentary launch access');
  });

  it('removes outdated beta and membership sales messaging from trader onboarding', () => {
    const onboarding = source('app/trader/onboarding.tsx');
    expect(onboarding).toContain('eligible tradespeople receive three months of BuildPair Pro at no charge');
    expect(onboarding).not.toContain('There is no trial during beta testing');
    expect(onboarding).toContain('useState<number>(6)');
    const welcome = source('lib/transactional-email.ts');
    expect(welcome).toContain('activate your free Pro access');
    expect(welcome).toContain('No paid subscription starts automatically');
  });
});
