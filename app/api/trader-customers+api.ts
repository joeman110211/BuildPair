import { jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { hasPlanSetupAccess } from '@/lib/subscription';

export async function GET(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const plans = await getSql()`
      SELECT subscription_tier AS "subscriptionTier", is_subscription_active AS "isSubscriptionActive", trial_ends_at AS "trialEndsAt"
      FROM trader_profiles WHERE user_id = ${trader.id} LIMIT 1
    ` as unknown as { subscriptionTier: 'free' | 'core' | 'basic' | 'featured'; isSubscriptionActive: boolean; trialEndsAt: string | null }[];
    const plan = plans[0];
    if (!plan || !hasPlanSetupAccess(plan, 'core')) return Response.json([]);

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
                 AND coalesce(nullif(lower(trim(i.customer_email)), ''), lower(trim(i.customer_name)) || ':') = k.contact_key) AS "invoicedValue"
      FROM keys k
      ORDER BY k.last_activity DESC
      LIMIT 250
    `;
    return Response.json(rows);
  } catch (error) { return jsonError(error); }
}
