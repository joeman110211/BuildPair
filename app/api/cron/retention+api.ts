import { sendAftercareReminderOnce, sendInvoiceReminderOnce, sendQuoteReminderOnce } from '@/lib/transactional-email';
import { getSql } from '@/lib/sql';

function baseUrl() {
  return (process.env.APP_URL || 'https://www.buildpair.co.uk').replace(/\/$/, '');
}

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorised(request)) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const result = { quoteReminders: 0, invoiceReminders: 0, aftercareReminders: 0, failures: 0 };

  const quotes = await getSql()`
    SELECT q.id, q.quote_number AS "quoteNumber", q.customer_name AS "customerName",
           q.customer_email AS "customerEmail", q.job_title AS "jobTitle",
           q.total_amount AS "totalAmount", q.valid_until AS "validUntil", q.share_token AS "shareToken",
           q.reminder_count AS "reminderCount", tp.business_name AS "businessName"
    FROM business_quotes q
    JOIN trader_profiles tp ON tp.user_id = q.trader_id
    WHERE q.reminder_enabled = true
      AND q.status IN ('sent','viewed')
      AND q.customer_email IS NOT NULL
      AND q.reminder_count < 3
      AND (q.valid_until IS NULL OR q.valid_until > now())
      AND coalesce(q.reminder_last_sent_at, q.sent_at, q.created_at) <= now() - (q.reminder_days::text || ' days')::interval
    ORDER BY coalesce(q.reminder_last_sent_at, q.sent_at, q.created_at) ASC
    LIMIT 50
  ` as unknown as {
    id: string; quoteNumber: string; customerName: string; customerEmail: string; jobTitle: string;
    totalAmount: number; validUntil: string | null; shareToken: string; reminderCount: number; businessName: string;
  }[];

  for (const quote of quotes) {
    try {
      const nextCount = quote.reminderCount + 1;
      await sendQuoteReminderOnce({
        eventKey: `quote-reminder:${quote.id}:${nextCount}`,
        email: quote.customerEmail,
        customerName: quote.customerName,
        businessName: quote.businessName,
        quoteNumber: quote.quoteNumber,
        jobTitle: quote.jobTitle,
        totalAmount: quote.totalAmount,
        shareUrl: `${baseUrl()}/quote/${encodeURIComponent(quote.shareToken)}`,
        validUntil: quote.validUntil,
      });
      await getSql()`
        UPDATE business_quotes
        SET reminder_last_sent_at = now(), reminder_count = reminder_count + 1, updated_at = now()
        WHERE id = ${quote.id} AND status IN ('sent','viewed')
      `;
      result.quoteReminders += 1;
    } catch {
      result.failures += 1;
    }
  }

  const invoices = await getSql()`
    SELECT i.id, i.invoice_number AS "invoiceNumber", i.customer_name AS "customerName",
           i.customer_email AS "customerEmail", i.total_amount AS "totalAmount", i.due_at AS "dueAt",
           i.reminder_count AS "reminderCount", tp.business_name AS "businessName"
    FROM invoices i
    JOIN trader_profiles tp ON tp.user_id = i.trader_id
    WHERE i.reminder_enabled = true
      AND i.status = 'sent'
      AND i.reminder_count < 3
      AND i.due_at IS NOT NULL
      AND i.due_at <= now() + interval '2 days'
      AND (i.reminder_last_sent_at IS NULL OR i.reminder_last_sent_at <= now() - interval '3 days')
    ORDER BY i.due_at ASC
    LIMIT 50
  ` as unknown as {
    id: string; invoiceNumber: string; customerName: string; customerEmail: string; totalAmount: number;
    dueAt: string; reminderCount: number; businessName: string;
  }[];

  for (const invoice of invoices) {
    try {
      const nextCount = invoice.reminderCount + 1;
      await sendInvoiceReminderOnce({
        eventKey: `invoice-reminder:${invoice.id}:${nextCount}`,
        email: invoice.customerEmail,
        customerName: invoice.customerName,
        businessName: invoice.businessName,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        dueAt: invoice.dueAt,
        overdue: new Date(invoice.dueAt).getTime() < Date.now(),
      });
      await getSql()`
        UPDATE invoices
        SET reminder_last_sent_at = now(), reminder_count = reminder_count + 1, updated_at = now()
        WHERE id = ${invoice.id} AND status = 'sent'
      `;
      result.invoiceReminders += 1;
    } catch {
      result.failures += 1;
    }
  }

  const aftercare = await getSql()`
    SELECT a.id, a.title, a.note, a.job_id AS "jobId", a.send_count AS "sendCount",
           j.title AS "jobTitle", u.email AS "customerEmail", tp.business_name AS "businessName"
    FROM project_aftercare_reminders a
    JOIN jobs j ON j.id = a.job_id
    JOIN users u ON u.id = a.customer_id
    JOIN trader_profiles tp ON tp.user_id = a.trader_id
    WHERE a.status = 'pending'
      AND a.due_at <= now()
      AND u.email IS NOT NULL
    ORDER BY a.due_at ASC
    LIMIT 50
  ` as unknown as {
    id: string; title: string; note: string; jobId: string; sendCount: number;
    jobTitle: string; customerEmail: string; businessName: string;
  }[];

  for (const reminder of aftercare) {
    try {
      await sendAftercareReminderOnce({
        eventKey: `aftercare:${reminder.id}:1`,
        email: reminder.customerEmail,
        businessName: reminder.businessName,
        jobTitle: reminder.jobTitle,
        title: reminder.title,
        note: reminder.note,
        projectUrl: `${baseUrl()}/customer/jobs/${reminder.jobId}`,
      });
      await getSql()`
        UPDATE project_aftercare_reminders
        SET status = 'sent', last_sent_at = now(), send_count = send_count + 1, updated_at = now()
        WHERE id = ${reminder.id} AND status = 'pending'
      `;
      result.aftercareReminders += 1;
    } catch {
      result.failures += 1;
    }
  }

  return Response.json(result);
}
