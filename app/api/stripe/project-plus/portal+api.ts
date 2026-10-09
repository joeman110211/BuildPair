import { authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { appUrl, getStripe } from '@/lib/stripe';

// Project+ uses a separate Stripe customer from trade memberships. Its owner
// needs a way to cancel or update payment details without contacting support.
export async function POST(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const [row] = await getSql()`
      SELECT project_plus_stripe_customer_id AS "customerId"
      FROM users WHERE id = ${userId} LIMIT 1
    ` as unknown as { customerId: string | null }[];
    if (!row?.customerId) throw new HttpError(409, 'No Project+ billing account exists yet');
    const body = await request.json().catch(() => ({}));
    const audience = body?.audience === 'trader' ? 'trader' : 'customer';
    const session = await getStripe().billingPortal.sessions.create({
      customer: row.customerId,
      return_url: `${appUrl()}/${audience}/project-plus`,
    });
    return Response.json({ url: session.url });
  } catch (error) {
    return jsonError(error);
  }
}
