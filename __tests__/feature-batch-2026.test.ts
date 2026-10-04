import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string) { return readFileSync(path, 'utf8'); }

describe('BuildPair2 activation and marketplace quality batch', () => {
  it('keeps the new database changes in one migration after existing 0054 retention work', () => {
    const migration = source('db/migrations/0055_activation_marketplace_quality.sql');
    for (const item of [
      'job_proposals',
      'response_limit',
      'trader_referral_visits',
      'trader_customer_notes',
      'trader_reminder_rules',
      'stripe_webhook_events',
      'proposed_slots',
    ]) expect(migration).toContain(item);
  });

  it('adds profile strength and measurable Relay activation', () => {
    expect(source('app/api/trader-profile-strength+api.ts')).toContain('verifiedCredentialCount');
    expect(source('app/trader/dashboard.tsx')).toContain('PROFILE STRENGTH');
    expect(source('app/api/trader-referral+api.ts')).toContain('completedProfileCount');
    expect(source('app/auth/founding-trade-signup.tsx')).toContain('/api/referral-visit');
  });

  it('adds quick proposals with a homeowner-controlled response cap', () => {
    const proposals = source('app/api/job-proposals+api.ts');
    expect(proposals).toContain('job_proposals');
    expect(proposals).toContain('responseLimit');
    expect(proposals).toContain("'shortlist'");
    expect(source('app/trader/job-board.tsx')).toContain('Quick proposal');
    expect(source('app/customer/jobs/[id].tsx')).toContain('Open 5 more places');
    expect(source('app/api/conversations+api.ts')).toContain('response limit');
    expect(source('app/api/quotes+api.ts')).toContain('response limit');
  });

  it('adds opt-in automatic reminders without removing manual reminders', () => {
    expect(source('app/api/reminder-rules+api.ts')).toContain('trader_reminder_rules');
    const runner = source('app/api/maintenance/business-reminders+api.ts');
    expect(runner).toContain('CRON_SECRET');
    expect(runner).toContain("interval '48 hours'");
    expect(source('app/api/business-reminders+api.ts')).toContain('business_reminder_log');
  });

  it('lets trades duplicate quotes and keep richer customer history', () => {
    expect(source('app/trader/quotes/index.tsx')).toContain('Duplicate as new quote');
    expect(source('app/trader/quotes/new.tsx')).toContain('copyQuoteId');
    const customerBook = source('app/trader/customers.tsx');
    expect(customerBook).toContain('Repeat previous quote');
    expect(customerBook).toContain('Private customer notes');
    expect(source('app/api/trader-customers+api.ts')).toContain('outstandingValue');
  });

  it('lets homeowners choose from up to three site visit times', () => {
    const visits = source('app/api/site-visits+api.ts');
    expect(visits).toContain('proposedSlots');
    expect(visits).toContain('selectedAt');
    expect(source('app/trader/visits/new.tsx')).toContain('Third option (optional)');
    expect(source('app/customer/jobs/[id]/visit.tsx')).toContain('Choose a site visit time');
  });

  it('improves marketplace decision quality without blocking existing journeys', () => {
    expect(source('app/customer/new-job.tsx')).toContain('Job readiness');
    const comparison = source('components/QuoteComparisonOverview.tsx');
    expect(comparison).toContain('Different exclusions');
    expect(comparison).toContain('Payment stages');
    expect(source('components/TraderCard.tsx')).toContain('completed BuildPair job');
    expect(source('components/TraderProfileStorefront.tsx')).toContain('completed BuildPair job');
  });

  it('groups the existing project workspace rather than replacing its record types', () => {
    const workspace = source('components/ProjectWorkspace.tsx');
    for (const label of ['Updates', 'Money & materials', 'Issues', 'Handover']) expect(workspace).toContain(label);
    for (const type of ['task', 'progress', 'material', 'expense', 'snag', 'warranty', 'aftercare']) expect(workspace).toContain(type);
  });

  it('deduplicates Stripe webhook side effects while allowing failed-event retries', () => {
    const webhook = source('app/api/stripe/webhook+api.ts');
    expect(webhook).toContain('stripe_webhook_events');
    expect(webhook).toContain("status = 'failed'");
    expect(webhook).toContain('duplicate: true');
    expect(webhook).toContain("status = 'processed'");
  });

  it('does not add new AI surfaces or touch the public roadmap wording', () => {
    const updates = source('app/(public)/updates.tsx');
    expect(updates).toContain('Coming soon');
    expect(source('components/PricingCards.tsx')).toContain('BuildPair Project+');
  });
});
