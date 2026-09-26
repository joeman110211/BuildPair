import { z } from 'zod';
import { assertRateLimit } from '@/lib/rate-limit';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { sendInvoiceReminderOnce } from '@/lib/transactional-email';

const schema = z.object({
  invoiceId: z.string().uuid(),
  action: z.enum(['send', 'configure']),
  enabled: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const input = schema.parse(await request.json());
    const rows = await getSql()`
      SELECT i.id, i.invoice_number AS "invoiceNumber", i.customer_name AS "customerName",
             i.customer_email AS "customerEmail", i.total_amount AS "totalAmount", i.due_at AS "dueAt",
             i.status, i.reminder_enabled AS "reminderEnabled", i.reminder_last_sent_at AS "reminderLastSentAt",
             i.reminder_count AS "reminderCount", tp.business_name AS "businessName"
      FROM invoices i
      JOIN trader_profiles tp ON tp.user_id = i.trader_id
      WHERE i.id = ${input.invoiceId} AND i.trader_id = ${trader.id}
      LIMIT 1
    ` as unknown as {
      id: string; invoiceNumber: string; customerName: string; customerEmail: string; totalAmount: number;
      dueAt: string | null; status: string; reminderEnabled: boolean; reminderLastSentAt: string | null;
      reminderCount: number; businessName: string;
    }[];
    const invoice = rows[0];
    if (!invoice) throw new HttpError(404, 'Invoice not found.');

    if (input.action === 'configure') {
      if (invoice.status !== 'sent') throw new HttpError(409, 'Automatic reminders only apply to sent outstanding invoices.');
      const enabled = input.enabled ?? true;
      const updated = await getSql()`
        UPDATE invoices
        SET reminder_enabled = ${enabled}, updated_at = now()
        WHERE id = ${invoice.id} AND trader_id = ${trader.id}
        RETURNING reminder_enabled AS "reminderEnabled", reminder_last_sent_at AS "reminderLastSentAt",
                  reminder_count AS "reminderCount"
      `;
      return Response.json(updated[0]);
    }

    if (invoice.status !== 'sent') throw new HttpError(409, 'Only a sent outstanding invoice can be reminded.');
    if (invoice.reminderCount >= 3) throw new HttpError(429, 'BuildPair limits an invoice to three reminders so customers are not pestered.');
    if (invoice.reminderLastSentAt && Date.now() - new Date(invoice.reminderLastSentAt).getTime() < 24 * 60 * 60 * 1000) {
      throw new HttpError(429, 'Wait at least 24 hours between invoice reminders.');
    }

    await assertRateLimit(request, 'invoice-reminder', 20, 86400, trader.id);
    const overdue = Boolean(invoice.dueAt && new Date(invoice.dueAt).getTime() < Date.now());
    const nextCount = invoice.reminderCount + 1;
    await sendInvoiceReminderOnce({
      eventKey: `invoice-reminder:${invoice.id}:${nextCount}`,
      email: invoice.customerEmail,
      customerName: invoice.customerName,
      businessName: invoice.businessName,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      dueAt: invoice.dueAt,
      overdue,
    });
    const updated = await getSql()`
      UPDATE invoices
      SET reminder_last_sent_at = now(), reminder_count = reminder_count + 1, updated_at = now()
      WHERE id = ${invoice.id} AND trader_id = ${trader.id}
      RETURNING reminder_enabled AS "reminderEnabled", reminder_last_sent_at AS "reminderLastSentAt",
                reminder_count AS "reminderCount"
    `;
    return Response.json(updated[0]);
  } catch (error) {
    return jsonError(error);
  }
}
