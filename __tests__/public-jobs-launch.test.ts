import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LAUNCH_DATE_ISO } from '@/lib/launch-config';

describe('Public jobs after marketplace opening', () => {
  it('has a valid regional marketplace launch date', () => {
    expect(Number.isFinite(Date.parse(LAUNCH_DATE_ISO))).toBe(true);
  });

  it('does not advertise prelaunch test jobs as live homeowner requests', () => {
    const api = readFileSync('app/api/public/jobs+api.ts', 'utf8');
    const homepage = readFileSync('components/LatestJobsHero.tsx', 'utf8');
    expect(api).toContain('gte(jobs.createdAt, new Date(LAUNCH_DATE_ISO))');
    expect(api).toContain('isNull(jobs.targetTraderId)');
    expect(api).toContain("inArray(jobs.status, ['open', 'quoted'])");
    expect(homepage).toContain('new Date(job.createdAt).getTime() >= new Date(LAUNCH_DATE_ISO).getTime()');
  });
});
