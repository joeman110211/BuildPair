import { z } from 'zod';
import { jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';

const schema = z.object({
  quoteEnabled: z.boolean(),
  quoteAfterDays: z.number().int().min(2).max(30),
  invoiceDueEnabled: z.boolean(),
  invoiceOverdueEnabled: z.boolean(),
  overdueAfterDays: z.number().int().min(1).max(30),
});

async function read(traderId: string) {
  await getSql()`
    INSERT INTO trader_reminder_preferences(trader_id)
    VALUES (${traderId})
    ON CONFLICT (trader_id) DO NOTHING
  `;
  const rows = await getSql()`
    SELECT quote_enabled AS "quoteEnabled", quote_after_days AS "quoteAfterDays",
           invoice_due_enabled AS "invoiceDueEnabled", invoice_overdue_enabled AS "invoiceOverdueEnabled",
           overdue_after_days AS "overdueAfterDays", updated_at AS "updatedAt"
    FROM trader_reminder_preferences
    WHERE trader_id = ${traderId}
    LIMIT 1
  `;
  return rows[0];
}

export async function GET(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    return Response.json(await read(trader.id));
  } catch (error) { return jsonError(error); }
}

export async function PUT(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const input = schema.parse(await request.json());
    await getSql()`
      INSERT INTO trader_reminder_preferences(
        trader_id, quote_enabled, quote_after_days, invoice_due_enabled, invoice_overdue_enabled, overdue_after_days, updated_at
      ) VALUES (
        ${trader.id}, ${input.quoteEnabled}, ${input.quoteAfterDays}, ${input.invoiceDueEnabled},
        ${input.invoiceOverdueEnabled}, ${input.overdueAfterDays}, now()
      )
      ON CONFLICT (trader_id) DO UPDATE SET
        quote_enabled = EXCLUDED.quote_enabled,
        quote_after_days = EXCLUDED.quote_after_days,
        invoice_due_enabled = EXCLUDED.invoice_due_enabled,
        invoice_overdue_enabled = EXCLUDED.invoice_overdue_enabled,
        overdue_after_days = EXCLUDED.overdue_after_days,
        updated_at = now()
    `;
    return Response.json(await read(trader.id));
  } catch (error) { return jsonError(error); }
}
