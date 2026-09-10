import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { paymentScheduleSchema, validatePaymentSchedule } from '@/lib/payment-plan';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { appUrl } from '@/lib/stripe';

const itemSchema = z.object({
  description: z.string().trim().min(1).max(300),
  category: z.enum(['labour', 'materials', 'other']).default('other'),
  quantity: z.number().positive().max(10000).default(1),
  unitPrice: z.number().int().nonnegative(),
});

const businessQuoteSchema = z.object({
  quoteId: z.string().uuid().optional(),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().or(z.literal('')).optional(),
  customerPhone: z.string().trim().max(40).optional(),
  jobTitle: z.string().trim().min(2).max(160),
  jobAddress: z.string().trim().max(500).optional(),
  workIncluded: z.string().trim().min(10).max(5000),
  notIncluded: z.string().trim().max(3000).optional(),
  expectedStart: z.string().trim().max(120).optional(),
  durationText: z.string().trim().max(120).optional(),
  warrantyText: z.string().trim().max(160).optional(),
  items: z.array(itemSchema).min(1).max(100),
  vatRate: z.number().int().min(0).max(100).default(0),
  paymentMethod: z.enum(['undecided', 'buildpair', 'external']).default('undecided'),
  paymentTerms: z.string().trim().min(5).max(2000),
  paymentSchedule: paymentScheduleSchema,
  notes: z.string().trim().max(3000).optional(),
  showBreakdown: z.boolean().default(true),
  validUntil: z.string().datetime().optional(),
  status: z.enum(['draft', 'sent']).default('draft'),
});

type QuoteRow = {
  id: string;
  traderId: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  jobTitle: string;
  jobAddress: string | null;
  workIncluded: string;
  notIncluded: string | null;
  expectedStart: string | null;
  durationText: string | null;
  warrantyText: string | null;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  paymentMethod: 'undecided' | 'buildpair' | 'external';
  paymentTerms: string;
  paymentSchedule: unknown[];
  notes: string | null;
  showBreakdown: boolean;
  validUntil: string | null;
  status: string;
  shareToken: string;
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: unknown[];
};

function shareUrl(token: string) {
  return `${appUrl()}/quote/${encodeURIComponent(token)}`;
}

function quoteNumber() {
  const date = new Date();
  const stamp = `${String(date.getFullYear()).slice(-2)}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return `BP-${stamp}-${randomUUID().replace(/-/g, '').slice(0, 5).toUpperCase()}`;
}

async function listQuotes(traderId: string) {
  const rows = await getSql()`
    SELECT q.id,
           q.trader_id AS "traderId",
           q.quote_number AS "quoteNumber",
           q.customer_name AS "customerName",
           q.customer_email AS "customerEmail",
           q.customer_phone AS "customerPhone",
           q.job_title AS "jobTitle",
           q.job_address AS "jobAddress",
           q.work_included AS "workIncluded",
           q.not_included AS "notIncluded",
           q.expected_start AS "expectedStart",
           q.duration_text AS "durationText",
           q.warranty_text AS "warrantyText",
           q.subtotal,
           q.vat_rate AS "vatRate",
           q.vat_amount AS "vatAmount",
           q.total_amount AS "totalAmount",
           q.payment_method AS "paymentMethod",
           q.payment_terms AS "paymentTerms",
           q.payment_schedule AS "paymentSchedule",
           q.notes,
           q.show_breakdown AS "showBreakdown",
           q.valid_until AS "validUntil",
           q.status,
           q.share_token AS "shareToken",
           q.sent_at AS "sentAt",
           q.viewed_at AS "viewedAt",
           q.accepted_at AS "acceptedAt",
           q.declined_at AS "declinedAt",
           q.created_at AS "createdAt",
           q.updated_at AS "updatedAt",
           COALESCE((
             SELECT json_agg(json_build_object(
               'id', i.id,
               'description', i.description,
               'category', i.category,
               'quantity', i.quantity,
               'unitPrice', i.unit_price,
               'lineTotal', i.line_total,
               'sortOrder', i.sort_order
             ) ORDER BY i.sort_order)
             FROM business_quote_items i
             WHERE i.quote_id = q.id
           ), '[]'::json) AS items
    FROM business_quotes q
    WHERE q.trader_id = ${traderId}
    ORDER BY q.updated_at DESC
  ` as unknown as QuoteRow[];
  return rows.map((row) => ({ ...row, shareUrl: shareUrl(row.shareToken) }));
}

export async function GET(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    return Response.json(await listQuotes(trader.id));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const payload = businessQuoteSchema.parse(await request.json());
    const subtotal = payload.items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPrice), 0);
    if (subtotal <= 0) throw new HttpError(400, 'Add at least one priced item to the quote.');
    const vatAmount = Math.round(subtotal * payload.vatRate / 100);
    const totalAmount = subtotal + vatAmount;
    const paymentSchedule = validatePaymentSchedule(payload.paymentSchedule, totalAmount);
    const sentAt = payload.status === 'sent' ? new Date().toISOString() : null;

    let id = payload.quoteId;
    if (id) {
      const existing = await getSql()`
        SELECT id, status FROM business_quotes
        WHERE id = ${id} AND trader_id = ${trader.id}
        LIMIT 1
      ` as unknown as { id: string; status: string }[];
      if (!existing.length) throw new HttpError(404, 'Quote draft not found.');
      if (existing[0]!.status !== 'draft') throw new HttpError(409, 'Only draft quotes can be edited. Duplicate a sent quote instead.');

      await getSql()`
        UPDATE business_quotes
        SET customer_name = ${payload.customerName},
            customer_email = ${payload.customerEmail || null},
            customer_phone = ${payload.customerPhone || null},
            job_title = ${payload.jobTitle},
            job_address = ${payload.jobAddress || null},
            work_included = ${payload.workIncluded},
            not_included = ${payload.notIncluded || null},
            expected_start = ${payload.expectedStart || null},
            duration_text = ${payload.durationText || null},
            warranty_text = ${payload.warrantyText || null},
            subtotal = ${subtotal},
            vat_rate = ${payload.vatRate},
            vat_amount = ${vatAmount},
            total_amount = ${totalAmount},
            payment_method = ${payload.paymentMethod},
            payment_terms = ${payload.paymentTerms},
            payment_schedule = ${JSON.stringify(paymentSchedule)}::jsonb,
            notes = ${payload.notes || null},
            show_breakdown = ${payload.showBreakdown},
            valid_until = ${payload.validUntil ? new Date(payload.validUntil).toISOString() : null},
            status = ${payload.status},
            sent_at = ${sentAt},
            updated_at = now()
        WHERE id = ${id} AND trader_id = ${trader.id}
      `;
      await getSql()`DELETE FROM business_quote_items WHERE quote_id = ${id}`;
    } else {
      id = randomUUID();
      const token = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
      const number = quoteNumber();
      await getSql()`
        INSERT INTO business_quotes(
          id, trader_id, quote_number, customer_name, customer_email, customer_phone,
          job_title, job_address, work_included, not_included, expected_start, duration_text,
          warranty_text, subtotal, vat_rate, vat_amount, total_amount, payment_method,
          payment_terms, payment_schedule, notes, show_breakdown, valid_until, status,
          share_token, sent_at, updated_at
        ) VALUES (
          ${id}, ${trader.id}, ${number}, ${payload.customerName}, ${payload.customerEmail || null}, ${payload.customerPhone || null},
          ${payload.jobTitle}, ${payload.jobAddress || null}, ${payload.workIncluded}, ${payload.notIncluded || null}, ${payload.expectedStart || null}, ${payload.durationText || null},
          ${payload.warrantyText || null}, ${subtotal}, ${payload.vatRate}, ${vatAmount}, ${totalAmount}, ${payload.paymentMethod},
          ${payload.paymentTerms}, ${JSON.stringify(paymentSchedule)}::jsonb, ${payload.notes || null}, ${payload.showBreakdown}, ${payload.validUntil ? new Date(payload.validUntil).toISOString() : null}, ${payload.status},
          ${token}, ${sentAt}, now()
        )
      `;
    }

    for (let index = 0; index < payload.items.length; index += 1) {
      const item = payload.items[index]!;
      const lineTotal = Math.round(item.quantity * item.unitPrice);
      await getSql()`
        INSERT INTO business_quote_items(quote_id, description, category, quantity, unit_price, line_total, sort_order)
        VALUES (${id}, ${item.description}, ${item.category}, ${item.quantity}, ${item.unitPrice}, ${lineTotal}, ${index + 1})
      `;
    }

    const saved = (await listQuotes(trader.id)).find((quote) => quote.id === id);
    if (!saved) throw new HttpError(500, 'Quote was saved but could not be reloaded.');
    return Response.json(saved, { status: payload.quoteId ? 200 : 201 });
  } catch (error) {
    return jsonError(error);
  }
}
