import { z } from 'zod';
import { HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

const actionSchema = z.object({
  action: z.enum(['accept', 'decline']),
  selectedOptionIds: z.array(z.string().uuid()).max(20).default([]),
});

type QuoteOption = {
  id: string;
  kind: 'optional' | 'alternative';
  groupKey: string | null;
  label: string;
  description: string;
  priceAdjustment: number;
  selected: boolean;
};

type PublicQuoteRow = {
  id: string;
  quoteNumber: string;
  businessName: string;
  traderEmail: string | null;
  traderPhone: string | null;
  customerName: string;
  jobTitle: string;
  tradeCategory: string | null;
  revisionNumber: number;
  managedJobId: string | null;
  managedProjectEligible: boolean;
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
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  createdAt: string;
  items: unknown[];
  options: QuoteOption[];
};

async function loadQuote(token: string) {
  const rows = await getSql()`
    SELECT q.id,
           q.quote_number AS "quoteNumber",
           tp.business_name AS "businessName",
           u.email AS "traderEmail",
           u.phone AS "traderPhone",
           q.customer_name AS "customerName",
           q.job_title AS "jobTitle",
           q.trade_category AS "tradeCategory",
           q.revision_number AS "revisionNumber",
           q.managed_job_id AS "managedJobId",
           q.managed_project_eligible AS "managedProjectEligible",
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
           q.sent_at AS "sentAt",
           q.viewed_at AS "viewedAt",
           q.accepted_at AS "acceptedAt",
           q.declined_at AS "declinedAt",
           q.created_at AS "createdAt",
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
           ), '[]'::json) AS items,
           COALESCE((
             SELECT json_agg(json_build_object(
               'id', o.id,
               'kind', o.kind,
               'groupKey', o.group_key,
               'label', o.label,
               'description', o.description,
               'priceAdjustment', o.price_adjustment,
               'selected', o.selected
             ) ORDER BY o.sort_order)
             FROM business_quote_options o
             WHERE o.quote_id = q.id
           ), '[]'::json) AS options
    FROM business_quotes q
    JOIN trader_profiles tp ON tp.user_id = q.trader_id
    JOIN users u ON u.id = q.trader_id
    WHERE q.share_token = ${token}
    LIMIT 1
  ` as unknown as PublicQuoteRow[];
  return rows[0];
}

export async function GET(_request: Request, { token }: { token: string }) {
  try {
    if (!token || token.length < 32) throw new HttpError(404, 'Quote not found.');
    const quote = await loadQuote(token);
    if (!quote || quote.status === 'draft' || quote.status === 'withdrawn') throw new HttpError(404, 'Quote not found.');

    if (quote.status === 'sent') {
      await getSql()`
        UPDATE business_quotes
        SET status = 'viewed', viewed_at = COALESCE(viewed_at, now()), updated_at = now()
        WHERE id = ${quote.id} AND status = 'sent'
      `;
      quote.status = 'viewed';
      quote.viewedAt = quote.viewedAt ?? new Date().toISOString();
    } else if (!quote.viewedAt) {
      await getSql()`UPDATE business_quotes SET viewed_at = now() WHERE id = ${quote.id} AND viewed_at IS NULL`;
      quote.viewedAt = new Date().toISOString();
    }

    return Response.json(quote, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, { token }: { token: string }) {
  try {
    const { action, selectedOptionIds } = actionSchema.parse(await request.json());
    const quote = await loadQuote(token);
    if (!quote || quote.status === 'draft' || quote.status === 'withdrawn') throw new HttpError(404, 'Quote not found.');
    if (quote.validUntil && new Date(quote.validUntil).getTime() < Date.now()) throw new HttpError(410, 'This quote has expired. Ask the tradesperson for an updated quote.');
    if (quote.status === 'accepted' || quote.status === 'declined') {
      return Response.json(quote, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'accept') {
      const chosen = quote.options.filter((option) => selectedOptionIds.includes(option.id));
      if (chosen.length !== selectedOptionIds.length) throw new HttpError(400, 'One or more selected quote options are not valid for this quote.');

      const alternativeGroups = new Map<string, number>();
      for (const option of chosen.filter((row) => row.kind === 'alternative')) {
        const group = (option.groupKey || 'Alternative').trim().toLowerCase();
        alternativeGroups.set(group, (alternativeGroups.get(group) ?? 0) + 1);
      }
      if ([...alternativeGroups.values()].some((count) => count > 1)) {
        throw new HttpError(400, 'Choose no more than one alternative from each quote option group.');
      }

      const optionSubtotal = chosen.reduce((sum, option) => sum + option.priceAdjustment, 0);
      const nextSubtotal = quote.subtotal + optionSubtotal;
      const nextVatAmount = Math.round(nextSubtotal * quote.vatRate / 100);
      const optionGross = (nextSubtotal + nextVatAmount) - quote.totalAmount;
      const schedule = Array.isArray(quote.paymentSchedule)
        ? quote.paymentSchedule.map((stage) => ({ ...(stage as Record<string, unknown>) }))
        : [];

      if (optionGross > 0) {
        const finalIndex = schedule.findIndex((stage) => stage.kind === 'final');
        const targetIndex = finalIndex >= 0 ? finalIndex : schedule.length - 1;
        if (targetIndex >= 0) {
          const stage = schedule[targetIndex]!;
          stage.amount = Number(stage.amount ?? 0) + optionGross;
        } else {
          schedule.push({
            key: 'final',
            title: 'Final balance',
            amount: quote.totalAmount + optionGross,
            kind: 'final',
            trigger: 'Due when the agreed work is complete.',
            sortOrder: 1,
          });
        }
      }

      await getSql()`
        UPDATE business_quote_options
        SET selected = (id = ANY(${selectedOptionIds}::uuid[])),
            selected_at = CASE WHEN id = ANY(${selectedOptionIds}::uuid[]) THEN now() ELSE NULL END
        WHERE quote_id = ${quote.id}
      `;

      if (chosen.length) {
        const existingCountRows = await getSql()`
          SELECT count(*)::integer AS count FROM business_quote_items WHERE quote_id = ${quote.id}
        ` as unknown as { count: number }[];
        let sortOrder = Number(existingCountRows[0]?.count ?? 0);
        for (const option of chosen) {
          sortOrder += 1;
          await getSql()`
            INSERT INTO business_quote_items(quote_id, description, category, quantity, unit_price, line_total, sort_order)
            VALUES (${quote.id}, ${option.label}, 'other', 1, ${option.priceAdjustment}, ${option.priceAdjustment}, ${sortOrder})
          `;
        }
      }

      await getSql()`
        UPDATE business_quotes
        SET subtotal = ${nextSubtotal},
            vat_amount = ${nextVatAmount},
            total_amount = ${nextSubtotal + nextVatAmount},
            payment_schedule = ${JSON.stringify(schedule)}::jsonb,
            status = 'accepted',
            accepted_at = now(),
            declined_at = NULL,
            updated_at = now()
        WHERE id = ${quote.id} AND status IN ('sent', 'viewed')
      `;
    } else {
      await getSql()`
        UPDATE business_quotes
        SET status = 'declined', declined_at = now(), accepted_at = NULL, updated_at = now()
        WHERE id = ${quote.id} AND status IN ('sent', 'viewed')
      `;
    }

    const updated = await loadQuote(token);
    if (!updated) throw new HttpError(404, 'Quote not found.');
    return Response.json(updated, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error);
  }
}
