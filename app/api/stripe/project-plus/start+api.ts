import { z } from 'zod';
import { MARKETPLACE_OPEN, PAID_PLANS_OPEN } from '@/lib/launch-config';
import { PROJECT_PLUS_PRICE_PENCE, projectPlusEntitlement } from '@/lib/project-plus';
import { accountModes, authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { appUrl, getStripe } from '@/lib/stripe';

const requestSchema = z.object({ audience: z.enum(['customer','trader']).default('customer') });

export async function POST(request: Request) {
  try {
    if (!MARKETPLACE_OPEN || !PAID_PLANS_OPEN) throw new HttpError(423, 'Project+ paid checkout is unavailable during complimentary launch access.');
    const userId = await authenticatedUserId(request);
    const user = await ensureDbUser(userId);
    const modes = await accountModes(userId);
    const { audience } = requestSchema.parse(await request.json().catch(() => ({})));
    if (audience === 'customer' && !modes.customerEnabled) throw new HttpError(403, 'Enable homeowner mode to subscribe to Project+.');
    if (audience === 'trader' && !modes.traderEnabled) throw new HttpError(403, 'Enable tradesperson mode to add Project+.');
    const entitlement = await projectPlusEntitlement(userId);
    const returnPath = audience === 'trader' ? '/trader/project-plus' : '/customer/project-plus';
    if (entitlement.active) return Response.json({ url: `${appUrl()}${returnPath}?subscription=active`, active: true });

    const rows = await getSql()`
      SELECT email, project_plus_stripe_customer_id AS "customerId"
      FROM users WHERE id = ${userId} LIMIT 1
    ` as unknown as { email: string | null; customerId: string | null }[];
    const stripe = getStripe();
    let customerId = rows[0]?.customerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: rows[0]?.email || user.email || undefined, metadata: { buildpairUserId: userId, buildpairProduct: 'project_plus' } });
      customerId = customer.id;
      await getSql()`UPDATE users SET project_plus_stripe_customer_id = ${customerId}, updated_at = now() WHERE id = ${userId}`;
    }
    const configuredPriceId = process.env.STRIPE_PROJECT_PLUS_PRICE_ID?.trim();
    const lineItem = configuredPriceId
      ? { price: configuredPriceId, quantity: 1 }
      : { price_data: { currency: 'gbp', unit_amount: PROJECT_PLUS_PRICE_PENCE, recurring: { interval: 'month' as const }, product_data: { name: 'BuildPair Project+' } }, quantity: 1 };

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: userId,
      line_items: [lineItem],
      allow_promotion_codes: true,
      success_url: `${appUrl()}/api/stripe/project-plus/confirm?session_id={CHECKOUT_SESSION_ID}&audience=${audience}`,
      cancel_url: `${appUrl()}${returnPath}?subscription=cancelled`,
      metadata: { buildpairUserId: userId, buildpairProduct: 'project_plus', audience },
      subscription_data: { metadata: { buildpairUserId: userId, buildpairProduct: 'project_plus', audience } },
    });
    if (!session.url) throw new Error('Stripe did not return a Project+ checkout URL');
    return Response.json({ url: session.url });
  } catch (error) { return jsonError(error); }
}
