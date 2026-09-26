import { z } from 'zod';
import { assertRateLimit } from '@/lib/rate-limit';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { sendQuoteReminderOnce } from '@/lib/transactional-email';

const schema = z.object({
  quoteId: z.string().uuid(),
  action: z.enum(['send', 'configure']),
  enabled: z.boolean().optional(),
  days: z.number().int().min(1).max(14).optional(),
});

function quoteUrl(token: string) {
  const base = (process.env.APP_URL || 'https://www.buildpair.co.uk').replace(/\/$/, '');
  return `${base}/quote/${encodeURIComponent(token)}`;
}

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const input = schema.parse(await request.json());
    const rows = await getSql()`
      SELECT q.id, q.quote_number AS "quoteNumber", q.customer_name AS "customerName",
             q.customer_email AS "customerEmail", q.job_title AS "jobTitle",
             q.total_amount AS "totalAmount", q.valid_until AS "validUntil", q.status,
             q.share_token AS "shareToken", q.reminder_enabled AS "reminderEnabled",
             q.reminder_days AS "reminderDays", q.reminder_last_sent_at AS "reminderLastSentAt",
             q.reminder_count AS "reminderCount", tp.business_name AS "businessName"
      FROM business_quotes q
      JOIN trader_profiles tp ON tp.user_id = q.trader_id
      WHERE q.id = ${input.quoteId} AND q.trader_id = ${trader.id}
      LIMIT 1
    ` as unknown as {
      id: string; quoteNumber: string; customerName: string; customerEmail: string | null; jobTitle: string;
      totalAmount: number; validUntil: string | null; status: string; shareToken: string; reminderEnabled: boolean;
      reminderDays: number; reminderLastSentAt: string | null; reminderCount: number; businessName: string;
    }[];
    const quote = rows[0];
    if (!quote) throw new HttpError(404, 'Quote not found.');

    if (input.action === 'configure') {
      if (!['sent', 'viewed'].includes(quote.status)) throw new HttpError(409, 'Automatic reminders only apply while a sent quote is waiting for a decision.');
      const enabled = input.enabled ?? true;
      const days = input.days ?? quote.reminderDays ?? 3;
      const updated = await getSql()`
        UPDATE business_quotes
        SET reminder_enabled = ${enabled}, reminder_days = ${days}, updated_at = now()
        WHERE id = ${quote.id} AND trader_id = ${trader.id}
        RETURNING reminder_enabled AS "reminderEnabled", reminder_days AS "reminderDays",
                  reminder_last_sent_at AS "reminderLastSentAt", reminder_count AS "reminderCount"
      `;
      return Response.json(updated[0]);
    }

    if (!['sent', 'viewed'].includes(quote.status)) throw new HttpError(409, 'Only a quote waiting for a customer decision can be reminded.');
    if (!quote.customerEmail) throw new HttpError(400, 'Add the customer email before sending a BuildPair reminder.');
    if (quote.validUntil && new Date(quote.validUntil).getTime() < Date.now()) throw new HttpError(409, 'This quote has expired. Create a revision instead of reminding the customer.');
    if (quote.reminderCount >= 3) throw new HttpError(429, 'BuildPair limits a quote to three reminders so customers are not pestered.');
    if (quote.reminderLastSentAt && Date.now() - new Date(quote.reminderLastSentAt).getTime() < 24 * 60 * 60 * 1000) {
      throw new HttpError(429, 'Wait at least 24 hours between quote reminders.');
    }

    await assertRateLimit(request, 'quote-reminder', 20, 86400, trader.id);
    const nextCount = quote.reminderCount + 1;
    await sendQuoteReminderOnce({
      eventKey: `quote-reminder:${quote.id}:${nextCount}`,
      email: quote.customerEmail,
      customerName: quote.customerName,
      businessName: quote.businessName,
      quoteNumber: quote.quoteNumber,
      jobTitle: quote.jobTitle,
      totalAmount: quote.totalAmount,
      shareUrl: quoteUrl(quote.shareToken),
      validUntil: quote.validUntil,
    });
    const updated = await getSql()`
      UPDATE business_quotes
      SET reminder_last_sent_at = now(), reminder_count = reminder_count + 1, updated_at = now()
      WHERE id = ${quote.id} AND trader_id = ${trader.id}
      RETURNING reminder_enabled AS "reminderEnabled", reminder_days AS "reminderDays",
                reminder_last_sent_at AS "reminderLastSentAt", reminder_count AS "reminderCount"
    `;
    return Response.json(updated[0]);
  } catch (error) {
    return jsonError(error);
  }
}
