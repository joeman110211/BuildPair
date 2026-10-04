import { z } from 'zod';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { hasPlanSetupAccess } from '@/lib/subscription';

const schema = z.object({
  quoteRemindersEnabled: z.boolean(),
  quoteAfterDays: z.number().int().min(2).max(30),
  invoiceDueRemindersEnabled: z.boolean(),
  invoiceDueBeforeDays: z.number().int().min(0).max(14),
  invoiceOverdueRemindersEnabled: z.boolean(),
  invoiceOverdueAfterDays: z.number().int().min(1).max(30),
});

async function entitlement(traderId: string) {
  const rows = await getSql()`
    SELECT subscription_tier AS "subscriptionTier", is_subscription_active AS "isSubscriptionActive",
           trial_ends_at AS "trialEndsAt"
    FROM trader_profiles WHERE user_id = ${traderId} LIMIT 1
  ` as unknown as { subscriptionTier:'free'|'core'|'basic'|'featured'; isSubscriptionActive:boolean; trialEndsAt:string|null }[];
  if (!rows[0] || !hasPlanSetupAccess(rows[0], 'core')) throw new HttpError(402, 'Automatic reminders are available with BuildPair Core, Plus and Pro.');
}

async function read(traderId: string) {
  const rows = await getSql()`
    SELECT quote_reminders_enabled AS "quoteRemindersEnabled",
           quote_after_days AS "quoteAfterDays",
           invoice_due_reminders_enabled AS "invoiceDueRemindersEnabled",
           invoice_due_before_days AS "invoiceDueBeforeDays",
           invoice_overdue_reminders_enabled AS "invoiceOverdueRemindersEnabled",
           invoice_overdue_after_days AS "invoiceOverdueAfterDays",
           updated_at AS "updatedAt"
    FROM trader_reminder_rules WHERE trader_id = ${traderId} LIMIT 1
  ` as unknown as {
    quoteRemindersEnabled:boolean; quoteAfterDays:number;
    invoiceDueRemindersEnabled:boolean; invoiceDueBeforeDays:number;
    invoiceOverdueRemindersEnabled:boolean; invoiceOverdueAfterDays:number; updatedAt:string;
  }[];
  return rows[0] ?? {
    quoteRemindersEnabled: false,
    quoteAfterDays: 3,
    invoiceDueRemindersEnabled: false,
    invoiceDueBeforeDays: 0,
    invoiceOverdueRemindersEnabled: false,
    invoiceOverdueAfterDays: 1,
    updatedAt: null,
  };
}

export async function GET(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    await entitlement(trader.id);
    return Response.json(await read(trader.id), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    await entitlement(trader.id);
    const input = schema.parse(await request.json());
    await getSql()`
      INSERT INTO trader_reminder_rules(
        trader_id, quote_reminders_enabled, quote_after_days,
        invoice_due_reminders_enabled, invoice_due_before_days,
        invoice_overdue_reminders_enabled, invoice_overdue_after_days, updated_at
      )
      VALUES (
        ${trader.id}, ${input.quoteRemindersEnabled}, ${input.quoteAfterDays},
        ${input.invoiceDueRemindersEnabled}, ${input.invoiceDueBeforeDays},
        ${input.invoiceOverdueRemindersEnabled}, ${input.invoiceOverdueAfterDays}, now()
      )
      ON CONFLICT (trader_id)
      DO UPDATE SET quote_reminders_enabled = excluded.quote_reminders_enabled,
                    quote_after_days = excluded.quote_after_days,
                    invoice_due_reminders_enabled = excluded.invoice_due_reminders_enabled,
                    invoice_due_before_days = excluded.invoice_due_before_days,
                    invoice_overdue_reminders_enabled = excluded.invoice_overdue_reminders_enabled,
                    invoice_overdue_after_days = excluded.invoice_overdue_after_days,
                    updated_at = now()
    `;
    return Response.json(await read(trader.id));
  } catch (error) {
    return jsonError(error);
  }
}
