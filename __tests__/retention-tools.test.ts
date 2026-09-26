import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCalendarFeed } from '@/lib/calendar-feed';

describe('whole-job retention tools', () => {
  it('builds a standards-based private calendar feed without inventing customer address data', () => {
    const feed = buildCalendarFeed([{
      id: 'job:123',
      type: 'job',
      title: 'Bathroom refurbishment',
      startsAt: '2026-10-20T08:00:00.000Z',
      endsAt: null,
      status: 'in_progress',
      href: '/trader/jobs/123',
    }], 'https://www.buildpair.co.uk');
    expect(feed).toContain('BEGIN:VCALENDAR');
    expect(feed).toContain('SUMMARY:Bathroom refurbishment');
    expect(feed).toContain('URL:https://www.buildpair.co.uk/trader/jobs/123');
    expect(feed).not.toContain('address');
  });

  it('stores the reminder, quote-choice, aftercare, calendar-feed and add-on records in one migration', () => {
    const migration = readFileSync('db/migrations/0053_retention_tools.sql', 'utf8');
    for (const name of [
      'business_quote_options',
      'project_aftercare_reminders',
      'trader_calendar_feeds',
      'trader_addon_requests',
      'reminder_enabled',
    ]) {
      expect(migration).toContain(name);
    }
  });

  it('keeps reminders deliberately bounded', () => {
    const quote = readFileSync('app/api/business-quotes/reminders+api.ts', 'utf8');
    const invoice = readFileSync('app/api/invoices/reminders+api.ts', 'utf8');
    const cron = readFileSync('app/api/cron/retention+api.ts', 'utf8');
    expect(quote).toContain('quote.reminderCount >= 3');
    expect(quote).toContain('24 * 60 * 60 * 1000');
    expect(invoice).toContain('invoice.reminderCount >= 3');
    expect(cron).toContain("i.reminder_count < 3");
    expect(cron).toContain("a.status = 'pending'");
  });

  it('writes selected quote choices into the accepted commercial record', () => {
    const route = readFileSync('app/api/public/quotes/[token]+api.ts', 'utf8');
    expect(route).toContain('selectedOptionIds');
    expect(route).toContain('business_quote_options');
    expect(route).toContain('INSERT INTO business_quote_items');
    expect(route).toContain('payment_schedule');
    expect(route).toContain("status = 'accepted'");
  });

  it('exposes aftercare and grouped handover records inside both sides of a managed project', () => {
    const workspace = readFileSync('components/ProjectWorkspace.tsx', 'utf8');
    const customer = readFileSync('app/customer/jobs/[id].tsx', 'utf8');
    const trader = readFileSync('app/trader/jobs/[id].tsx', 'utf8');
    expect(workspace).toContain('Documents & handover');
    expect(workspace).toContain("['document', 'handover', 'warranty']");
    expect(customer).toContain('ProjectAftercare');
    expect(trader).toContain('ProjectAftercare');
  });

  it('only presents shipped capabilities as recently added', () => {
    const updates = readFileSync('app/(public)/updates.tsx', 'utf8');
    expect(updates).toContain("['Calendar sync'");
    expect(updates).toContain("['Aftercare'");
    expect(updates).toContain("['Quote choices & optional extras'");
    expect(updates).toContain("['Self-serve add-on checkout'");
    expect(updates).toContain("['Richer file formats'");
  });
});
