import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createNotification } from '@/lib/notifications';
import { assertRateLimit } from '@/lib/rate-limit';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { appUrl } from '@/lib/stripe';

const schema = z.object({
  kind: z.enum(['quote','invoice','aftercare']),
  id: z.string().uuid(),
});

function esc(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
}
function money(value: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value / 100);
}

async function throttle(traderId: string, kind: string, id: string) {
  const recent = await getSql()`
    SELECT sent_at AS "sentAt"
    FROM business_reminder_log
    WHERE trader_id = ${traderId} AND reminder_kind = ${kind} AND entity_id = ${id}
      AND sent_at > now() - interval '48 hours'
    ORDER BY sent_at DESC LIMIT 1
  ` as unknown as { sentAt: string }[];
  if (recent.length) throw new HttpError(429, 'A reminder was already sent for this item in the last 48 hours.');
}
async function log(traderId: string, kind: 'quote'|'invoice'|'aftercare', id: string, email?: string | null) {
  await getSql()`
    INSERT INTO business_reminder_log(trader_id, reminder_kind, entity_id, recipient_email, reminder_key)
    VALUES (${traderId}, ${kind}, ${id}, ${email ?? null}, ${`manual:${randomUUID()}`})
  `;
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
  if (!response.ok) throw new HttpError(502, 'The email provider rejected the reminder.');
}

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    await assertRateLimit(request, 'business-reminder', 30, 86400, trader.id);
    const input = schema.parse(await request.json());
    await throttle(trader.id, input.kind, input.id);

    if (input.kind === 'quote') {
      const rows = await getSql()`
        SELECT q.id, q.quote_number AS "quoteNumber", q.customer_name AS "customerName",
               q.customer_email AS "customerEmail", q.job_title AS "jobTitle", q.share_token AS "shareToken",
               q.status, tp.business_name AS "businessName"
        FROM business_quotes q JOIN trader_profiles tp ON tp.user_id = q.trader_id
        WHERE q.id = ${input.id} AND q.trader_id = ${trader.id} LIMIT 1
      ` as unknown as { id:string; quoteNumber:string; customerName:string; customerEmail:string|null; jobTitle:string; shareToken:string; status:string; businessName:string }[];
      const quote = rows[0];
      if (!quote) throw new HttpError(404, 'Quote not found.');
      if (!['sent','viewed'].includes(quote.status)) throw new HttpError(409, 'Only quotes awaiting a decision can be reminded.');
      if (!quote.customerEmail) throw new HttpError(409, 'Add a customer email before sending a reminder.');
      const url = `${appUrl()}/quote/${encodeURIComponent(quote.shareToken)}`;
      await sendEmail(quote.customerEmail, `Reminder: quote ${quote.quoteNumber} from ${quote.businessName}`,
        `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><p>Hi ${esc(quote.customerName)},</p><p>A friendly reminder that your quote for <strong>${esc(quote.jobTitle)}</strong> is still waiting for a decision.</p><p><a href="${esc(url)}">Review the quote in BuildPair</a></p><p>No action is needed if you are still deciding.</p><p>${esc(quote.businessName)} · sent via BuildPair</p></div>`);
      await log(trader.id, 'quote', quote.id, quote.customerEmail);
      return Response.json({ ok: true });
    }

    if (input.kind === 'invoice') {
      const rows = await getSql()`
        SELECT i.id, i.invoice_number AS "invoiceNumber", i.customer_name AS "customerName",
               i.customer_email AS "customerEmail", i.total_amount AS "totalAmount", i.due_at AS "dueAt",
               i.status, tp.business_name AS "businessName"
        FROM invoices i JOIN trader_profiles tp ON tp.user_id = i.trader_id
        WHERE i.id = ${input.id} AND i.trader_id = ${trader.id} LIMIT 1
      ` as unknown as { id:string; invoiceNumber:string; customerName:string; customerEmail:string; totalAmount:number; dueAt:string|null; status:string; businessName:string }[];
      const invoice = rows[0];
      if (!invoice) throw new HttpError(404, 'Invoice not found.');
      if (invoice.status !== 'sent' && invoice.status !== 'overdue') throw new HttpError(409, 'Only outstanding invoices can be reminded.');
      const due = invoice.dueAt ? ` It was due on ${new Date(invoice.dueAt).toLocaleDateString('en-GB')}.` : '';
      await sendEmail(invoice.customerEmail, `Reminder: invoice ${invoice.invoiceNumber} from ${invoice.businessName}`,
        `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><p>Hi ${esc(invoice.customerName)},</p><p>A friendly reminder that invoice <strong>${esc(invoice.invoiceNumber)}</strong> for <strong>${esc(money(invoice.totalAmount))}</strong> is still marked as outstanding.${esc(due)}</p><p>If you have already paid, please ignore this message and the tradesperson can update the record.</p><p>${esc(invoice.businessName)} · sent via BuildPair</p></div>`);
      await log(trader.id, 'invoice', invoice.id, invoice.customerEmail);
      return Response.json({ ok: true });
    }

    const rows = await getSql()`
      SELECT e.id, e.job_id AS "jobId", e.title, e.body, e.due_at AS "dueAt",
             j.customer_id AS "customerId", u.email AS "customerEmail", tp.business_name AS "businessName"
      FROM job_workspace_entries e
      JOIN jobs j ON j.id = e.job_id
      JOIN quotes q ON q.id = j.accepted_quote_id
      JOIN trader_profiles tp ON tp.user_id = q.trader_id
      JOIN users u ON u.id = j.customer_id
      WHERE e.id = ${input.id} AND e.entry_type = 'aftercare' AND e.visibility = 'shared'
        AND q.trader_id = ${trader.id}
      LIMIT 1
    ` as unknown as { id:string; jobId:string; title:string; body:string; dueAt:string|null; customerId:string; customerEmail:string|null; businessName:string }[];
    const item = rows[0];
    if (!item) throw new HttpError(404, 'Aftercare reminder not found.');
    await createNotification(item.customerId, {
      type: 'aftercare_reminder',
      title: `Aftercare reminder · ${item.title}`,
      body: [item.body, item.dueAt ? `Due ${new Date(item.dueAt).toLocaleDateString('en-GB')}` : ''].filter(Boolean).join(' · '),
      href: `/customer/jobs/${item.jobId}`,
      email: true,
    });
    await log(trader.id, 'aftercare', item.id, item.customerEmail);
    return Response.json({ ok: true });
  } catch (error) { return jsonError(error); }
}
