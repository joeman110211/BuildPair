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
  if (!response.ok) throw new HttpError(502, 'The email provider rejected an automatic reminder.');
}
async function log(traderId: string, kind: 'quote' | 'invoice', id: string, email: string, key: string) {
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

    const quoteRows = await sql`
      SELECT q.id, q.trader_id AS "traderId", q.quote_number AS "quoteNumber",
             q.customer_name AS "customerName", q.customer_email AS "customerEmail",
             q.job_title AS "jobTitle", q.share_token AS "shareToken",
             tp.business_name AS "businessName", rp.quote_after_days AS "quoteAfterDays"
      FROM business_quotes q
      JOIN trader_profiles tp ON tp.user_id = q.trader_id
      JOIN trader_reminder_preferences rp ON rp.trader_id = q.trader_id
      WHERE rp.quote_enabled = true
        AND q.status IN ('sent','viewed')
        AND q.customer_email IS NOT NULL
        AND q.sent_at IS NOT NULL
        AND q.sent_at <= now() - make_interval(days => rp.quote_after_days)
        AND NOT EXISTS (
          SELECT 1 FROM business_reminder_log l
          WHERE l.trader_id = q.trader_id
            AND l.reminder_kind = 'quote'
            AND l.entity_id = q.id::text
            AND l.reminder_key LIKE 'auto:quote:%'
        )
      ORDER BY q.sent_at ASC
      LIMIT 100
    ` as unknown as {
      id:string; traderId:string; quoteNumber:string; customerName:string; customerEmail:string; jobTitle:string;
      shareToken:string; businessName:string; quoteAfterDays:number;
    }[];

    let quotesSent = 0;
    for (const quote of quoteRows) {
      const url = `${appUrl()}/quote/${encodeURIComponent(quote.shareToken)}`;
      await sendEmail(quote.customerEmail, `Reminder: quote ${quote.quoteNumber} from ${quote.businessName}`,
        `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><p>Hi ${esc(quote.customerName)},</p><p>A friendly reminder that your quote for <strong>${esc(quote.jobTitle)}</strong> is still waiting for a decision.</p><p><a href="${esc(url)}">Review the quote in BuildPair</a></p><p>No action is needed if you are still deciding.</p><p>${esc(quote.businessName)} · sent via BuildPair</p></div>`);
      await log(quote.traderId, 'quote', quote.id, quote.customerEmail, `auto:quote:${quote.quoteAfterDays}:${randomUUID()}`);
      quotesSent += 1;
    }

    const dueRows = await sql`
      SELECT i.id, i.trader_id AS "traderId", i.invoice_number AS "invoiceNumber",
             i.customer_name AS "customerName", i.customer_email AS "customerEmail",
             i.total_amount AS "totalAmount", i.due_at AS "dueAt",
             tp.business_name AS "businessName"
      FROM invoices i
      JOIN trader_profiles tp ON tp.user_id = i.trader_id
      JOIN trader_reminder_preferences rp ON rp.trader_id = i.trader_id
      WHERE rp.invoice_due_enabled = true
        AND i.status IN ('sent','overdue')
        AND i.due_at IS NOT NULL
        AND i.due_at::date <= current_date
        AND i.due_at::date >= current_date - 1
        AND NOT EXISTS (
          SELECT 1 FROM business_reminder_log l
          WHERE l.trader_id = i.trader_id
            AND l.reminder_kind = 'invoice'
            AND l.entity_id = i.id::text
            AND l.reminder_key LIKE 'auto:invoice-due:%'
        )
      ORDER BY i.due_at ASC
      LIMIT 100
    ` as unknown as { id:string; traderId:string; invoiceNumber:string; customerName:string; customerEmail:string; totalAmount:number; dueAt:string; businessName:string }[];

    let dueSent = 0;
    for (const invoice of dueRows) {
      const due = new Date(invoice.dueAt).toLocaleDateString('en-GB');
      await sendEmail(invoice.customerEmail, `Invoice ${invoice.invoiceNumber} is due · ${invoice.businessName}`,
        `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><p>Hi ${esc(invoice.customerName)},</p><p>A friendly reminder that invoice <strong>${esc(invoice.invoiceNumber)}</strong> for <strong>${esc(money(invoice.totalAmount))}</strong> is due on ${esc(due)}.</p><p>If you have already paid, please ignore this message and the tradesperson can update the record.</p><p>${esc(invoice.businessName)} · sent via BuildPair</p></div>`);
      await log(invoice.traderId, 'invoice', invoice.id, invoice.customerEmail, `auto:invoice-due:${randomUUID()}`);
      dueSent += 1;
    }

    const overdueRows = await sql`
      SELECT i.id, i.trader_id AS "traderId", i.invoice_number AS "invoiceNumber",
             i.customer_name AS "customerName", i.customer_email AS "customerEmail",
             i.total_amount AS "totalAmount", i.due_at AS "dueAt",
             tp.business_name AS "businessName", rp.overdue_after_days AS "overdueAfterDays"
      FROM invoices i
      JOIN trader_profiles tp ON tp.user_id = i.trader_id
      JOIN trader_reminder_preferences rp ON rp.trader_id = i.trader_id
      WHERE rp.invoice_overdue_enabled = true
        AND i.status IN ('sent','overdue')
        AND i.due_at IS NOT NULL
        AND i.due_at <= now() - make_interval(days => rp.overdue_after_days)
        AND NOT EXISTS (
          SELECT 1 FROM business_reminder_log l
          WHERE l.trader_id = i.trader_id
            AND l.reminder_kind = 'invoice'
            AND l.entity_id = i.id::text
            AND l.reminder_key LIKE 'auto:invoice-overdue:%'
        )
      ORDER BY i.due_at ASC
      LIMIT 100
    ` as unknown as {
      id:string; traderId:string; invoiceNumber:string; customerName:string; customerEmail:string;
      totalAmount:number; dueAt:string; businessName:string; overdueAfterDays:number;
    }[];

    let overdueSent = 0;
    for (const invoice of overdueRows) {
      const due = new Date(invoice.dueAt).toLocaleDateString('en-GB');
      await sendEmail(invoice.customerEmail, `Reminder: invoice ${invoice.invoiceNumber} from ${invoice.businessName}`,
        `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><p>Hi ${esc(invoice.customerName)},</p><p>A friendly reminder that invoice <strong>${esc(invoice.invoiceNumber)}</strong> for <strong>${esc(money(invoice.totalAmount))}</strong> is still marked as outstanding. It was due on ${esc(due)}.</p><p>If you have already paid, please ignore this message and the tradesperson can update the record.</p><p>${esc(invoice.businessName)} · sent via BuildPair</p></div>`);
      await log(invoice.traderId, 'invoice', invoice.id, invoice.customerEmail, `auto:invoice-overdue:${invoice.overdueAfterDays}:${randomUUID()}`);
      overdueSent += 1;
    }

    return Response.json({ quotesSent, invoiceDueSent: dueSent, invoiceOverdueSent: overdueSent });
  } catch (error) { return jsonError(error); }
}
