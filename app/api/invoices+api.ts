import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { invoices } from '@/db/schema';
import { assertRateLimit } from '@/lib/rate-limit';
import { getSql } from '@/lib/sql';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { invoiceSchema } from '@/lib/validation';
import { hasPlanSetupAccess, tierAtLeast } from '@/lib/subscription';


async function hasPaidBusinessTools(traderId: string) {
  const rows = await getSql()`
    SELECT subscription_tier AS "subscriptionTier",
           is_subscription_active AS "isSubscriptionActive",
           trial_ends_at AS "trialEndsAt"
    FROM trader_profiles
    WHERE user_id = ${traderId}
    LIMIT 1
  ` as unknown as { subscriptionTier: 'free' | 'core' | 'basic' | 'featured'; isSubscriptionActive: boolean; trialEndsAt: string | null }[];
  const profile = rows[0];
  return Boolean(profile && tierAtLeast(profile.subscriptionTier, 'core') && hasPlanSetupAccess(profile, 'core'));
}

export async function GET(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    return Response.json(await getDb().select().from(invoices).where(eq(invoices.traderId, trader.id)).orderBy(desc(invoices.createdAt)));
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    await assertRateLimit(request, 'create-invoice', 60, 3600, trader.id);
    const payload = invoiceSchema.parse(await request.json());
    const { sendNow, dueAt, customerId, jobId, ...invoiceFields } = payload;

    let linkedCustomerEmail: string | null = null;
    if (jobId) {
      const relationships = await getSql()`
        SELECT j.customer_id AS "customerId", u.email AS "customerEmail"
        FROM jobs j
        JOIN quotes q ON q.id = j.accepted_quote_id
        JOIN users u ON u.id = j.customer_id
        WHERE j.id = ${jobId}
          AND q.trader_id = ${trader.id}
        LIMIT 1
      ` as unknown as { customerId: string; customerEmail: string | null }[];
      const relationship = relationships[0];
      if (!relationship) throw new HttpError(403, 'Invoices can only be linked to BuildPair jobs you have won');
      if (customerId && relationship.customerId !== customerId) throw new HttpError(400, 'Invoice customer does not match the selected job');
      linkedCustomerEmail = relationship.customerEmail;
    } else if (customerId) {
      const relationships = await getSql()`
        SELECT u.email AS "customerEmail"
        FROM jobs j
        JOIN quotes q ON q.id = j.accepted_quote_id
        JOIN users u ON u.id = j.customer_id
        WHERE j.customer_id = ${customerId}
          AND q.trader_id = ${trader.id}
        LIMIT 1
      ` as unknown as { customerEmail: string | null }[];
      const relationship = relationships[0];
      if (!relationship) throw new HttpError(403, 'Invoices can only be linked to BuildPair customers you have worked with');
      linkedCustomerEmail = relationship.customerEmail;
    }

    if (!jobId && !customerId && !(await hasPaidBusinessTools(trader.id))) {
      throw new HttpError(402, 'Standalone invoicing is included with BuildPair Core, Plus and Pro. Invoices for BuildPair jobs you have already won remain available regardless of a later plan change.');
    }

    if (sendNow) {
      if (jobId || customerId) {
        if (!jobId || !customerId) throw new HttpError(400, 'A linked BuildPair invoice must include both the job and customer');
        if (!linkedCustomerEmail || linkedCustomerEmail.toLowerCase() !== payload.customerEmail.toLowerCase()) {
          throw new HttpError(400, 'Invoice email must match the customer email on the BuildPair account');
        }
      } else if (!(await hasPaidBusinessTools(trader.id))) {
        throw new HttpError(402, 'Sending standalone customer invoices is included with BuildPair Core, Plus and Pro.');
      }
      await assertRateLimit(request, 'send-invoice-email', 20, 86400, trader.id);
    }

    const subtotal = invoiceFields.items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPrice), 0);
    const totalAmount = subtotal + invoiceFields.vatAmount;
    const db = getDb();
    const [invoice] = await db.insert(invoices).values({
      ...invoiceFields,
      traderId: trader.id,
      customerId: customerId ?? null,
      jobId: jobId ?? null,
      dueAt: dueAt ? new Date(dueAt) : null,
      subtotal,
      totalAmount,
      status: 'draft',
    }).returning();
    if (!invoice) throw new Error('Invoice could not be created');

    let savedInvoice = invoice;
    let deliveryWarning: string | undefined;
    if (sendNow) {
      const apiKey = process.env.RESEND_API_KEY;
      const from = process.env.INVOICE_FROM_EMAIL;
      if (!apiKey || !from) deliveryWarning = 'Invoice saved as a draft because email delivery is not configured';
      else {
        const money = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value / 100);
        const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
        const rows = payload.items.map((item) => `<tr><td>${escape(item.description)}</td><td>${item.quantity}</td><td>${money(item.unitPrice)}</td><td>${money(Math.round(item.quantity * item.unitPrice))}</td></tr>`).join('');
        const dueText = dueAt ? new Date(dueAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : null;
        const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [payload.customerEmail], subject: `BuildPair invoice ${payload.invoiceNumber}`, html: `<h1>Invoice ${escape(payload.invoiceNumber)}</h1><p>For ${escape(payload.customerName)}</p><table cellpadding="8" border="1" cellspacing="0"><thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><p>Subtotal: ${money(subtotal)}<br>VAT: ${money(payload.vatAmount)}<br><strong>Total: ${money(totalAmount)}</strong><br>Deposit: ${money(payload.depositAmount)}${dueText ? `<br><strong>Due: ${escape(dueText)}</strong>` : ''}</p>${payload.notes ? `<p>${escape(payload.notes)}</p>` : ''}<p>Sent via BuildPair.</p>` }) });
        if (!response.ok) deliveryWarning = 'Invoice saved as a draft because the email provider rejected delivery';
        else {
          const [sentInvoice] = await db.update(invoices).set({ status: 'sent', updatedAt: new Date() }).where(eq(invoices.id, invoice.id)).returning();
          savedInvoice = sentInvoice ?? invoice;
        }
      }
    }
    return Response.json({ ...savedInvoice, deliveryWarning }, { status: 201 });
  } catch (error) { return jsonError(error); }
}
