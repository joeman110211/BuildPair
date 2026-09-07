import { jsonError, requireAdmin } from '@/lib/server';
import { getSql } from '@/lib/sql';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 500) || 500, 1), 1000);

    const rows = await getSql()`
      WITH activity AS (
        SELECT q.id::text AS id, 'quote'::text AS kind, ('Quote for ' || coalesce(j.title, 'job'))::text AS title,
               coalesce(q.notes, q.scope, '')::text AS detail, u.email::text AS "actorEmail", q.status::text AS status,
               q.total_amount::int AS amount, q.created_at AS "createdAt"
        FROM quotes q LEFT JOIN jobs j ON j.id = q.job_id LEFT JOIN users u ON u.id = q.trader_id

        UNION ALL
        SELECT r.id::text, 'review', ('Review ' || r.rating::text || '/5 for ' || coalesce(j.title, 'job')),
               r.comment, u.email, CASE WHEN r.verified_completion THEN 'verified' ELSE 'unverified' END, NULL::int, r.created_at
        FROM reviews r LEFT JOIN jobs j ON j.id = r.job_id LEFT JOIN users u ON u.id = r.customer_id

        UNION ALL
        SELECT i.id::text, 'invoice', ('Invoice ' || i.invoice_number), coalesce(i.notes, ''), u.email, i.status::text,
               i.total_amount::int, i.created_at
        FROM invoices i LEFT JOIN users u ON u.id = i.trader_id

        UNION ALL
        SELECT p.id::text, 'payment', ('Payment for ' || coalesce(j.title, 'job')), p.stripe_payment_intent_id, u.email, p.status::text,
               p.amount::int, p.created_at
        FROM payments p LEFT JOIN jobs j ON j.id = p.job_id LEFT JOIN users u ON u.id = p.customer_id

        UNION ALL
        SELECT v.id::text, 'variation', v.title, v.description, u.email, v.status::text, v.amount_delta::int, v.created_at
        FROM job_variations v LEFT JOIN users u ON u.id = v.trader_id

        UNION ALL
        SELECT e.id::text, 'job_event', e.title, coalesce(e.description, ''), u.email, e.event_type, NULL::int, e.created_at
        FROM job_events e LEFT JOIN users u ON u.id = e.actor_id

        UNION ALL
        SELECT n.id::text, 'notification', n.title, n.body, u.email, CASE WHEN n.read_at IS NULL THEN 'unread' ELSE 'read' END, NULL::int, n.created_at
        FROM notifications n LEFT JOIN users u ON u.id = n.user_id

        UNION ALL
        SELECT o.id::text, 'job_offer', ('Job offer: ' || coalesce(j.title, 'job')), '', u.email, 'created', NULL::int, o.created_at
        FROM trader_job_offers o LEFT JOIN jobs j ON j.id = o.job_id LEFT JOIN users u ON u.id = o.trader_id

        UNION ALL
        SELECT s.id::text, 'saved_search', ('Saved search: ' || s.name), coalesce(s.keywords, ''), u.email,
               CASE WHEN s.enabled THEN 'enabled' ELSE 'disabled' END, NULL::int, s.created_at
        FROM saved_job_searches s LEFT JOIN users u ON u.id = s.trader_id

        UNION ALL
        SELECT (st.customer_id || ':' || st.trader_id)::text, 'saved_trader', 'Saved tradesperson', '', u.email, 'saved', NULL::int, st.created_at
        FROM saved_traders st LEFT JOIN users u ON u.id = st.customer_id

        UNION ALL
        SELECT a.id::text, 'admin_action', replace(a.action_type, '_', ' '), coalesce(a.details->>'reason', ''), admin.email,
               'admin', NULL::int, a.created_at
        FROM admin_user_actions a LEFT JOIN users admin ON admin.id = a.admin_id
      )
      SELECT * FROM activity ORDER BY "createdAt" DESC LIMIT ${limit}
    `;

    return Response.json(rows);
  } catch (error) {
    return jsonError(error);
  }
}
