import { z } from 'zod';
import { jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { hasPlanSetupAccess } from '@/lib/subscription';

const noteSchema = z.object({
  contactKey: z.string().min(1).max(320),
  notes: z.string().max(4000),
});

async function hasAccess(traderId: string) {
  const plans = await getSql()`
    SELECT subscription_tier AS "subscriptionTier", is_subscription_active AS "isSubscriptionActive", trial_ends_at AS "trialEndsAt"
    FROM trader_profiles WHERE user_id = ${traderId} LIMIT 1
  ` as unknown as { subscriptionTier: 'free' | 'core' | 'basic' | 'featured'; isSubscriptionActive: boolean; trialEndsAt: string | null }[];
  return Boolean(plans[0] && hasPlanSetupAccess(plans[0], 'core'));
}

export async function GET(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    if (!await hasAccess(trader.id)) return Response.json([]);

    const rows = await getSql()`
      WITH contacts AS (
        SELECT customer_name AS name, nullif(lower(trim(customer_email)), '') AS email, nullif(trim(customer_phone), '') AS phone, updated_at AS activity_at
        FROM business_quotes WHERE trader_id = ${trader.id}
        UNION ALL
        SELECT customer_name AS name, nullif(lower(trim(customer_email)), '') AS email, NULL::text AS phone, updated_at AS activity_at
        FROM invoices WHERE trader_id = ${trader.id}
      ),
      keys AS (
        SELECT coalesce(email, lower(trim(name)) || ':' || coalesce(phone, '')) AS contact_key,
               max(name) AS name, max(email) AS email, max(phone) AS phone, max(activity_at) AS last_activity
        FROM contacts
        GROUP BY coalesce(email, lower(trim(name)) || ':' || coalesce(phone, ''))
      )
      SELECT k.contact_key AS "contactKey", k.name, k.email, k.phone, k.last_activity AS "lastActivity",
             (SELECT count(*)::int FROM business_quotes q
               WHERE q.trader_id = ${trader.id}
                 AND coalesce(nullif(lower(trim(q.customer_email)), ''), lower(trim(q.customer_name)) || ':' || coalesce(nullif(trim(q.customer_phone), ''), '')) = k.contact_key) AS "quoteCount",
             (SELECT coalesce(sum(q.total_amount) FILTER (WHERE q.status = 'accepted'), 0)::int FROM business_quotes q
               WHERE q.trader_id = ${trader.id}
                 AND coalesce(nullif(lower(trim(q.customer_email)), ''), lower(trim(q.customer_name)) || ':' || coalesce(nullif(trim(q.customer_phone), ''), '')) = k.contact_key) AS "acceptedQuoteValue",
             (SELECT count(*)::int FROM invoices i
               WHERE i.trader_id = ${trader.id}
                 AND coalesce(nullif(lower(trim(i.customer_email)), ''), lower(trim(i.customer_name)) || ':') = k.contact_key) AS "invoiceCount",
             (SELECT coalesce(sum(i.total_amount), 0)::int FROM invoices i
               WHERE i.trader_id = ${trader.id}
                 AND coalesce(nullif(lower(trim(i.customer_email)), ''), lower(trim(i.customer_name)) || ':') = k.contact_key) AS "invoicedValue",
             (SELECT coalesce(sum(i.total_amount), 0)::int FROM invoices i
               WHERE i.trader_id = ${trader.id} AND i.status IN ('sent','overdue')
                 AND coalesce(nullif(lower(trim(i.customer_email)), ''), lower(trim(i.customer_name)) || ':') = k.contact_key) AS "outstandingValue",
             (SELECT count(*)::int FROM business_quotes q
               WHERE q.trader_id = ${trader.id} AND q.managed_job_id IS NOT NULL
                 AND coalesce(nullif(lower(trim(q.customer_email)), ''), lower(trim(q.customer_name)) || ':' || coalesce(nullif(trim(q.customer_phone), ''), '')) = k.contact_key) AS "managedJobCount",
             (SELECT coalesce(array_agg(DISTINCT q.job_address) FILTER (WHERE q.job_address IS NOT NULL AND trim(q.job_address) <> ''), ARRAY[]::text[])
                FROM business_quotes q
               WHERE q.trader_id = ${trader.id}
                 AND coalesce(nullif(lower(trim(q.customer_email)), ''), lower(trim(q.customer_name)) || ':' || coalesce(nullif(trim(q.customer_phone), ''), '')) = k.contact_key) AS addresses,
             (SELECT q.id FROM business_quotes q
               WHERE q.trader_id = ${trader.id}
                 AND coalesce(nullif(lower(trim(q.customer_email)), ''), lower(trim(q.customer_name)) || ':' || coalesce(nullif(trim(q.customer_phone), ''), '')) = k.contact_key
               ORDER BY q.updated_at DESC LIMIT 1) AS "latestQuoteId",
             (SELECT count(*)::int
                FROM business_quotes q
                JOIN job_workspace_entries e ON e.job_id = q.managed_job_id
               WHERE q.trader_id = ${trader.id}
                 AND q.managed_job_id IS NOT NULL
                 AND e.entry_type IN ('warranty','aftercare')
                 AND e.status NOT IN ('done','approved','archived')
                 AND coalesce(nullif(lower(trim(q.customer_email)), ''), lower(trim(q.customer_name)) || ':' || coalesce(nullif(trim(q.customer_phone), ''), '')) = k.contact_key) AS "openAftercareCount",
             coalesce((SELECT n.notes FROM trader_customer_notes n WHERE n.trader_id = ${trader.id} AND n.contact_key = k.contact_key), '') AS notes
      FROM keys k
      ORDER BY k.last_activity DESC
      LIMIT 250
    `;
    return Response.json(rows);
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    if (!await hasAccess(trader.id)) return Response.json({ ok: false }, { status: 402 });
    const input = noteSchema.parse(await request.json());
    await getSql()`
      INSERT INTO trader_customer_notes(trader_id, contact_key, notes, updated_at)
      VALUES (${trader.id}, ${input.contactKey}, ${input.notes}, now())
      ON CONFLICT (trader_id, contact_key)
      DO UPDATE SET notes = excluded.notes, updated_at = now()
    `;
    return Response.json({ ok: true });
  } catch (error) { return jsonError(error); }
}
