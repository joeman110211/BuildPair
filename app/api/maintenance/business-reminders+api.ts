import { randomUUID } from 'node:crypto';
import { HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { appUrl } from '@/lib/stripe';

function esc(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
}
function money(value: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value / 100);
}
async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INVOICE_FROM_EMAIL;
  if (!apiKey || !from) throw new HttpError(503, 'Email delivery is not configured.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!response.ok) throw new Error(`Reminder email failed with ${response.status}`);
}
async function record(traderId: string, kind: 'quote'|'invoice', id: string, email: string, key: string) {
  await getSql()`
    INSERT INTO business_reminder_log(trader_id, reminder_kind, entity_id, recipient_email, reminder_key)
    VALUES (${traderId}, ${kind}, ${id}, ${email}, ${key})
    ON CONFLICT (reminder_kind, entity_id, reminder_key) DO NOTHING
  `;
}

export async function GET(request: Request) {
  try {
    const expected = process.env.CRON_SECRET;
    const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!expected || provided !== expected) throw new HttpError(401, 'Maintenance authentication required');

    const sql = getSql();
    const quotes = await sql`
      SELECT q.id, q.trader_id AS "traderId", q.quote_number AS "quoteNumber",
             q.customer_name AS "customerName", q.customer_email AS "customerEmail",
             q.job_title AS "jobTitle", q.share_token AS "shareToken", tp.business_name AS "businessName",
             r.quote_after_days AS "afterDays"
      FROM business_quotes q
      JOIN trader_reminder_rules r ON r.trader_id = q.trader_id AND r.quote_reminders_enabled = true
      JOIN trader_profiles tp ON tp.user_id = q.trader_id
      WHERE q.status IN ('sent','viewed')
        AND q.customer_email IS NOT NULL
        AND coalesce(q.sent_at, q.created_at) <= now() - (r.quote_after_days::text || ' days')::interval
        AND NOT EXISTS (
          SELECT 1 FROM business_reminder_log l
          WHERE l.trader_id = q.trader_id AND l.reminder_kind = 'quote' AND l.entity_id = q.id::text
            AND l.sent_at > now() - interval '48 hours'
        )
        AND NOT EXISTS (
          SELECT 1 FROM business_reminder_log l
          WHERE l.reminder_kind = 'quote' AND l.entity_id = q.id::text
            AND l.reminder_key = ('auto:quote:' || r.quote_after_days::text)
        )
      ORDER BY coalesce(q.sent_at, q.created_at)
      LIMIT 100
    ` as unknown as { id:string; traderId:string; quoteNumber:string; customerName:string; customerEmail:string; jobTitle:string; shareToken:string; businessName:string; afterDays:number }[];

    const dueInvoices = await sql`
      SELECT i.id, i.trader_id AS "traderId", i.invoice_number AS "invoiceNumber",
             i.customer_name AS "customerName", i.customer_email AS "customerEmail",
             i.total_amount AS "totalAmount", i.due_at AS "dueAt", tp.business_name AS "businessName",
             r.invoice_due_before_days AS "beforeDays"
      FROM invoices i
      JOIN trader_reminder_rules r ON r.trader_id = i.trader_id AND r.invoice_due_reminders_enabled = true
      JOIN trader_profiles tp ON tp.user_id = i.trader_id
      WHERE i.status = 'sent' AND i.due_at IS NOT NULL
        AND i.due_at <= now() + (r.invoice_due_before_days::text || ' days')::interval
        AND i.due_at >= now() - interval '12 hours'
        AND NOT EXISTS (
          SELECT 1 FROM business_reminder_log l
          WHERE l.trader_id = i.trader_id AND l.reminder_kind = 'invoice' AND l.entity_id = i.id::text
            AND l.sent_at > now() - interval '48 hours'
        )
        AND NOT EXISTS (
          SELECT 1 FROM business_reminder_log l
          WHERE l.reminder_kind = 'invoice' AND l.entity_id = i.id::text
            AND l.reminder_key = ('auto:due:' || to_char(i.due_at, 'YYYY-MM-DD') || ':' || r.invoice_due_before_days::text)
        )
      ORDER BY i.due_at
      LIMIT 100
    ` as unknown as { id:string; traderId:string; invoiceNumber:string; customerName:string; customerEmail:string; totalAmount:number; dueAt:string; businessName:string; beforeDays:number }[];

    const overdueInvoices = await sql`
      SELECT i.id, i.trader_id AS "traderId", i.invoice_number AS "invoiceNumber",
             i.customer_name AS "customerName", i.customer_email AS "customerEmail",
             i.total_amount AS "totalAmount", i.due_at AS "dueAt", tp.business_name AS "businessName",
             r.invoice_overdue_after_days AS "afterDays"
      FROM invoices i
      JOIN trader_reminder_rules r ON r.trader_id = i.trader_id AND r.invoice_overdue_reminders_enabled = true
      JOIN trader_profiles tp ON tp.user_id = i.trader_id
      WHERE i.status IN ('sent','overdue') AND i.due_at IS NOT NULL
        AND i.due_at <= now() - (r.invoice_overdue_after_days::text || ' days')::interval
        AND NOT EXISTS (
          SELECT 1 FROM business_reminder_log l
          WHERE l.trader_id = i.trader_id AND l.reminder_kind = 'invoice' AND l.entity_id = i.id::text
            AND l.sent_at > now() - interval '48 hours'
        )
        AND NOT EXISTS (
          SELECT 1 FROM business_reminder_log l
          WHERE l.reminder_kind = 'invoice' AND l.entity_id = i.id::text
            AND l.reminder_key = ('auto:overdue:' || to_char(i.due_at, 'YYYY-MM-DD') || ':' || r.invoice_overdue_after_days::text)
        )
      ORDER BY i.due_at
      LIMIT 100
    ` as unknown as { id:string; traderId:string; invoiceNumber:string; customerName:string; customerEmail:string; totalAmount:number; dueAt:string; businessName:string; afterDays:number }[];

    let sent = 0;
    const failures: string[] = [];
    for (const quote of quotes) {
      try {
        const url = `${appUrl()}/quote/${encodeURIComponent(quote.shareToken)}`;
        await sendEmail(quote.customerEmail, `Reminder: quote ${quote.quoteNumber} from ${quote.businessName}`,
          `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><p>Hi ${esc(quote.customerName)},</p><p>A friendly reminder that your quote for <strong>${esc(quote.jobTitle)}</strong> is still waiting for a decision.</p><p><a href="${esc(url)}">Review the quote in BuildPair</a></p><p>No action is needed if you are still deciding.</p><p>${esc(quote.businessName)} · sent via BuildPair</p></div>`);
        await record(quote.traderId, 'quote', quote.id, quote.customerEmail, `auto:quote:${quote.afterDays}`);
        sent += 1;
      } catch (error) { failures.push(`quote:${quote.id}:${error instanceof Error ? error.message : 'failed'}`); }
    }

    for (const invoice of dueInvoices) {
      try {
        const due = new Date(invoice.dueAt).toLocaleDateString('en-GB');
        await sendEmail(invoice.customerEmail, `Reminder: invoice ${invoice.invoiceNumber} from ${invoice.businessName}`,
          `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><p>Hi ${esc(invoice.customerName)},</p><p>A friendly reminder that invoice <strong>${esc(invoice.invoiceNumber)}</strong> for <strong>${esc(money(invoice.totalAmount))}</strong> is due on ${esc(due)}.</p><p>If you have already paid, please ignore this message and the tradesperson can update the record.</p><p>${esc(invoice.businessName)} · sent via BuildPair</p></div>`);
        await record(invoice.traderId, 'invoice', invoice.id, invoice.customerEmail, `auto:due:${invoice.dueAt.slice(0,10)}:${invoice.beforeDays}`);
        sent += 1;
      } catch (error) { failures.push(`invoice-due:${invoice.id}:${error instanceof Error ? error.message : 'failed'}`); }
    }

    for (const invoice of overdueInvoices) {
      try {
        const due = new Date(invoice.dueAt).toLocaleDateString('en-GB');
        await sendEmail(invoice.customerEmail, `Overdue invoice reminder: ${invoice.invoiceNumber} from ${invoice.businessName}`,
          `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><p>Hi ${esc(invoice.customerName)},</p><p>A friendly reminder that invoice <strong>${esc(invoice.invoiceNumber)}</strong> for <strong>${esc(money(invoice.totalAmount))}</strong> is still marked as outstanding. It was due on ${esc(due)}.</p><p>If you have already paid, please ignore this message and the tradesperson can update the record.</p><p>${esc(invoice.businessName)} · sent via BuildPair</p></div>`);
        await record(invoice.traderId, 'invoice', invoice.id, invoice.customerEmail, `auto:overdue:${invoice.dueAt.slice(0,10)}:${invoice.afterDays}`);
        sent += 1;
      } catch (error) { failures.push(`invoice-overdue:${invoice.id}:${error instanceof Error ? error.message : 'failed'}`); }
    }

    return Response.json({ ok: true, candidates: quotes.length + dueInvoices.length + overdueInvoices.length, sent, failures: failures.slice(0, 20), runId: randomUUID() });
  } catch (error) {
    return jsonError(error);
  }
}
