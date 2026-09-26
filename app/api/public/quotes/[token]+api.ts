import { z } from 'zod';
import { HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';

const actionSchema = z.object({ action: z.enum(['accept', 'decline']) });

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
           ), '[]'::json) AS items
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
    const { action } = actionSchema.parse(await request.json());
    const quote = await loadQuote(token);
    if (!quote || quote.status === 'draft' || quote.status === 'withdrawn') throw new HttpError(404, 'Quote not found.');
    if (quote.validUntil && new Date(quote.validUntil).getTime() < Date.now()) throw new HttpError(410, 'This quote has expired. Ask the tradesperson for an updated quote.');
    if (quote.status === 'accepted' || quote.status === 'declined') {
      return Response.json(quote, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'accept') {
      await getSql()`
        UPDATE business_quotes
        SET status = 'accepted', accepted_at = now(), declined_at = NULL, updated_at = now()
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
