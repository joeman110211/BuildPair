import { z } from 'zod';
import { createBusinessQuoteId, createBusinessQuoteNumber, createBusinessQuoteShareToken } from '@/lib/business-quote-id';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { hasPlanSetupAccess, tierAtLeast } from '@/lib/subscription';

const schema = z.object({ quoteId: z.string().uuid() });


export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const planRows = await getSql()`
      SELECT subscription_tier AS "subscriptionTier", is_subscription_active AS "isSubscriptionActive", trial_ends_at AS "trialEndsAt"
      FROM trader_profiles WHERE user_id = ${trader.id} LIMIT 1
    ` as unknown as { subscriptionTier: 'free' | 'core' | 'basic' | 'featured'; isSubscriptionActive: boolean; trialEndsAt: string | null }[];
    const plan = planRows[0];
    if (!plan || !tierAtLeast(plan.subscriptionTier, 'basic') || !hasPlanSetupAccess(plan, 'basic')) throw new HttpError(402, 'Quote revisions are included with BuildPair Plus and Pro.');

    const { quoteId } = schema.parse(await request.json());
    const sourceRows = await getSql()`
      SELECT * FROM business_quotes WHERE id = ${quoteId} AND trader_id = ${trader.id} LIMIT 1
    ` as unknown as Record<string, unknown>[];
    const source = sourceRows[0] as (Record<string, unknown> & { status?: string; revision_number?: number; managed_job_id?: string | null }) | undefined;
    if (!source) throw new HttpError(404, 'Quote not found.');
    if (source.status === 'accepted' || source.managed_job_id) throw new HttpError(409, 'An accepted quote is part of the agreed project. Use a project variation for changes after acceptance.');
    if (source.status === 'draft') throw new HttpError(409, 'Edit the existing draft instead of creating a revision.');

    const id = createBusinessQuoteId();
    const token = createBusinessQuoteShareToken();
    const number = createBusinessQuoteNumber();
    await getSql()`
      INSERT INTO business_quotes(
        id, trader_id, quote_number, customer_name, customer_email, customer_phone, job_title, trade_category, job_address,
        work_included, not_included, expected_start, duration_text, warranty_text, subtotal, vat_rate, vat_amount, total_amount,
        payment_method, payment_terms, payment_schedule, notes, show_breakdown, valid_until, status, share_token,
        revision_number, supersedes_quote_id, managed_project_eligible, updated_at
      )
      SELECT ${id}, trader_id, ${number}, customer_name, customer_email, customer_phone, job_title, trade_category, job_address,
             work_included, not_included, expected_start, duration_text, warranty_text, subtotal, vat_rate, vat_amount, total_amount,
             payment_method, payment_terms, payment_schedule, notes, show_breakdown, valid_until, 'draft', ${token},
             revision_number + 1, id, true, now()
      FROM business_quotes WHERE id = ${quoteId} AND trader_id = ${trader.id}
    `;
    await getSql()`
      INSERT INTO business_quote_items(quote_id, description, category, quantity, unit_price, line_total, sort_order)
      SELECT ${id}, description, category, quantity, unit_price, line_total, sort_order
      FROM business_quote_items WHERE quote_id = ${quoteId}
    `;
    await getSql()`
      INSERT INTO business_quote_options(quote_id, kind, title, description, price_delta, sort_order)
      SELECT ${id}, kind, title, description, price_delta, sort_order
      FROM business_quote_options WHERE quote_id = ${quoteId}
    `;
    return Response.json({ id, revisionNumber: Number(source.revision_number ?? 1) + 1 }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
