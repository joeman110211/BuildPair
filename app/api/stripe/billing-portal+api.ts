import { z } from 'zod';
import { authenticatedUserId, ensureDbUser, HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { appUrl, getStripe } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const { product, audience } = z.object({ product: z.enum(['trade', 'project_plus']).default('trade'), audience: z.enum(['customer', 'trader']).default('customer') }).parse(await request.json().catch(() => ({})));
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    if (product === 'trade') await requireRole(request, 'trader');
    const rows = await getSql()`SELECT u.project_plus_stripe_customer_id AS "projectPlusCustomerId", tp.stripe_customer_id AS "tradeCustomerId" FROM users u LEFT JOIN trader_profiles tp ON tp.user_id = u.id WHERE u.id = ${userId} LIMIT 1` as unknown as { projectPlusCustomerId: string | null; tradeCustomerId: string | null }[];
    const customerId = product === 'trade' ? rows[0]?.tradeCustomerId : rows[0]?.projectPlusCustomerId;
    if (!customerId) throw new HttpError(409, 'No billing account exists yet');
    const returnPath = product === 'trade' ? '/trader/subscription' : `/${audience}/project-plus`;
    const session = await getStripe().billingPortal.sessions.create({ customer: customerId, return_url: `${appUrl()}${returnPath}` });
    return Response.json({ url: session.url });
  } catch (error) { return jsonError(error); }
}
