import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(path, 'utf8');

describe('progressive dashboard flow and route safety', () => {
  it('prioritises useful homeowner actions without showing empty job statistics', () => {
    const home = source('app/customer/dashboard.tsx');
    expect(home).toContain('const hasJobs = jobs.length > 0');
    expect(home).toContain('<Button mode="contained" contentStyle={styles.actionButton}>Post a job</Button>');
    expect(home).toContain('href="/(public)/directory"');
    expect(home).toContain('{hasJobs ? <View style={styles.stats}>');
    expect(home).toContain('{job.status === \'quoted\' ? <Button mode="contained"');
    expect(home.indexOf('{attentionJob && attention ?')).toBeLessThan(home.indexOf('{hasJobs ? <View style={styles.stats}>'));
  });

  it('shows immediate trade actions before optional profile improvements', () => {
    const trade = source('app/trader/dashboard.tsx');
    expect(trade.indexOf('<AppCard style={styles.nextActionCard}>')).toBeLessThan(trade.indexOf('Optional profile improvements'));
    expect(trade.indexOf('Quick actions')).toBeLessThan(trade.indexOf('CURRENT MEMBERSHIP'));
    expect(trade).toContain('{jobs.length || quotes.length ? <View style={styles.stats}>');
    expect(trade).toContain('href="/trader/quotes/new" asChild><Button mode="outlined"');
    expect(trade).toContain('{activeJobs.length ? <>');
    expect(trade).toContain('PartnerSuggestion placement="trader-after-onboarding"');
  });

  it('keeps all main account navigation destinations implemented', () => {
    const routes = [
      'app/customer/dashboard.tsx',
      'app/customer/jobs.tsx',
      'app/customer/new-job.tsx',
      'app/customer/saved-trades.tsx',
      'app/customer/home-record.tsx',
      'app/customer/project-plus.tsx',
      'app/trader/dashboard.tsx',
      'app/trader/job-board.tsx',
      'app/trader/my-jobs.tsx',
      'app/trader/quotes/index.tsx',
      'app/trader/customers.tsx',
      'app/trader/calendar.tsx',
      'app/trader/project-plus.tsx',
    ];
    for (const route of routes) expect(existsSync(route), route).toBe(true);
    const nav = source('components/DashboardHeader.tsx');
    expect(nav).toContain("label: 'Saved trades'");
    expect(nav).toContain("label: 'Home Record'");
    expect(nav).toContain("label: 'Customer book', sectionLabel: 'Business tools'");
  });

  it('retains the approved homepage while keeping public pages indexable', () => {
    const home = source('components/LandingPageRefined.tsx');
    expect(home).toContain('bp-home-project-plus-section');
    expect(home).toContain('bp-home-advice-hub');
    const robots = source('public/robots.txt');
    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Disallow: /admin/');
    const sitemap = source('public/sitemap-pages.xml');
    expect(sitemap).toContain('https://www.buildpair.co.uk/partners/advertise');
    expect(sitemap).toContain('https://www.buildpair.co.uk/directory');
    expect(sitemap).not.toContain('https://www.buildpair.co.uk/customer/');
  });
});
