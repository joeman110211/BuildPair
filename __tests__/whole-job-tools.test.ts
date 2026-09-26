import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string) { return readFileSync(path, 'utf8'); }

describe('whole-job BuildPair tools', () => {
  it('lets accepted outside quotes become normal managed BuildPair projects', () => {
    const migration = source('db/migrations/0050_external_quote_projects.sql');
    expect(migration).toContain('claim_external_business_quote');
    expect(migration).toContain("'external_quote'");
    expect(migration).toContain('managed_job_id');
    expect(migration).toContain('job_milestones');
    expect(source('app/api/external-projects/claim+api.ts')).toContain('claim_external_business_quote');
  });

  it('keeps external quote revisions instead of overwriting sent versions', () => {
    const api = source('app/api/business-quotes/revise+api.ts');
    expect(api).toContain('revision_number + 1');
    expect(api).toContain('supersedes_quote_id');
    expect(api).toContain('Use a project variation');
  });

  it('supports the in-between project record', () => {
    const migration = source('db/migrations/0051_job_workspace.sql');
    for (const type of ['task','note','progress','material','expense','snag','document','handover','warranty']) {
      expect(migration).toContain(`'${type}'`);
    }
    const workspace = source('app/api/jobs/workspace+api.ts');
    expect(workspace).toContain('assertApprovedMediaUrls');
    expect(workspace).toContain('media_url');
  });

  it('gives Plus and Pro a combined working calendar', () => {
    const calendar = source('app/api/trader-calendar+api.ts');
    expect(calendar).toContain("tierAtLeast(plan.subscriptionTier, 'basic')");
    expect(calendar).toContain("plan.subscriptionTier === 'featured' ? 183 : 84");
    expect(calendar).toContain('job_site_visits');
    expect(calendar).toContain('trader_availability');
  });

  it('includes Project+ with Pro and meters customer AI usage', () => {
    const projectPlus = source('lib/project-plus.ts');
    expect(projectPlus).toContain('PROJECT_PLUS_PRICE_PENCE = 499');
    expect(projectPlus).toContain('PROJECT_PLUS_IMAGE_LIMIT = 10');
    expect(projectPlus).toContain('imageLimit: PROJECT_PLUS_IMAGE_LIMIT');
    expect(projectPlus).toContain("row?.subscriptionTier === 'featured'");
    expect(source('app/api/project-plus/image+api.ts')).toContain('consumeProjectPlusImage');
    expect(source('app/api/project-plus/plan+api.ts')).toContain('consumeProjectPlusPlanner');
  });

  it('uses authenticated checkout creation rather than a protected redirect URL', () => {
    expect(source('app/api/stripe/project-plus/start+api.ts')).toContain('export async function POST');
    const studio = source('components/ProjectPlusStudio.tsx');
    expect(studio).toContain("apiFetch<{ url: string }>('/api/stripe/project-plus/start'");
    expect(studio).not.toContain("Linking.openURL(`${baseUrl()}/api/stripe/project-plus/start`)");
  });

  it('keeps Core useful while reserving advanced outside-project tools for Plus and Pro', () => {
    const quotes = source('app/api/business-quotes+api.ts');
    expect(quotes).toContain("tierAtLeast(plan.subscriptionTier, 'basic')");
    expect(quotes).toContain('managed_project_eligible');
    expect(quotes).toContain('Outside-customer BuildPay and managed projects are included with BuildPair Plus and Pro.');
    expect(source('app/api/business-quotes/revise+api.ts')).toContain("tierAtLeast(plan.subscriptionTier, 'basic')");
    expect(source('app/api/ai/quote-assistant+api.ts')).toContain("tierAtLeast(plan.subscriptionTier, 'basic')");
  });

  it('makes BuildPay cost responsibility follow who introduced it', () => {
    const fees = source('lib/buildpay-fees.ts');
    expect(fees).toContain("requestedBy === 'trader' ? 'trader_absorbs' : 'customer_pays'");
    const external = source('db/migrations/0050_external_quote_projects.sql');
    expect(external).toContain("CASE WHEN bq.payment_method = 'buildpair' THEN 'trader' ELSE NULL END");
    expect(external).toContain("CASE WHEN bq.payment_method = 'buildpair' THEN 'trader_absorbs' ELSE NULL END");
  });

  it('smooths the job journey with reminders, calendar subscriptions, handover and quote choices', () => {
    const migration = source('db/migrations/0053_smooth_workflow.sql');
    expect(migration).toContain('business_quote_options');
    expect(migration).toContain('trader_calendar_tokens');
    expect(migration).toContain('business_reminder_log');
    expect(migration).toContain("'aftercare'");

    const reminders = source('app/api/business-reminders+api.ts');
    expect(reminders).toContain("interval '48 hours'");
    expect(reminders).toContain("'quote','invoice','aftercare'");

    expect(source('app/api/calendar-feed/[token]+api.ts')).toContain('text/calendar');
    expect(source('app/trader/calendar.tsx')).toContain('Subscribe in calendar');
    expect(source('app/api/jobs/[id]/handover+api.ts')).toContain('job_workspace_entries');
    expect(source('components/HandoverPackScreen.tsx')).toContain('Project handover pack');

    const businessQuotes = source('app/api/business-quotes+api.ts');
    expect(businessQuotes).toContain('business_quote_options');
    expect(source('app/api/business-quotes/revise+api.ts')).toContain('INSERT INTO business_quote_options');
    expect(source('components/QuoteDocument.tsx')).toContain('Choices & optional extras');
    expect(source('app/api/public/quotes/[token]/print+api.ts')).toContain('Choices & optional extras');
  });

  it('offers Project+ as a real optional trade add-on while keeping it included with Pro', () => {
    const checkout = source('app/api/stripe/project-plus/start+api.ts');
    expect(checkout).toContain("audience: z.enum(['customer','trader'])");
    expect(checkout).toContain("audience === 'trader'");
    const studio = source('components/ProjectPlusStudio.tsx');
    expect(studio).toContain('£4.99/month');
    expect(studio).toContain('Add Project+');
    expect(source('lib/project-plus.ts')).toContain("row?.subscriptionTier === 'featured'");
  });

  it('shows an honest public recently-added and coming-soon roadmap', () => {
    const updates = source('app/(public)/updates.tsx');
    expect(updates).toContain('Recently added');
    expect(updates).toContain('Coming soon');
    expect(updates).toContain('Trade customer book');
    expect(updates).toContain('Working calendar');
    expect(updates).toContain('Optional business add-ons');
    expect(source('components/PublicHeader.tsx')).toContain("What's new");
  });
});
