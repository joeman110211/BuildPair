import { MARKETPLACE_OPEN } from '@/lib/launch-config';
import { PROJECT_PLUS_PRICE_PENCE, projectPlusEntitlement } from '@/lib/project-plus';
import { accountModes, authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { appUrl, getStripe } from '@/lib/stripe';

export async function GET(request: Request) {
  try {
    if (!MARKETPLACE_OPEN) throw new HttpError(423, 'Project+ subscriptions open with the homeowner marketplace on 15 October 2026.');
    const userId = await authenticatedUserId(request);
    const user = await ensureDbUser(userId);
    const modes = await accountModes(userId);
    if (!modes.customerEnabled) throw new HttpError(403, 'Enable homeowner mode to subscribe to Project+.');
    const entitlement = await projectPlusEntitlement(userId);
    if (entitlement.active) return Response.redirect(`${appUrl()}/customer/project-plus?subscription=active`, 303);

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
      success_url: `${appUrl()}/api/stripe/project-plus/confirm?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/customer/project-plus?subscription=cancelled`,
      metadata: { buildpairUserId: userId, buildpairProduct: 'project_plus' },
      subscription_data: { metadata: { buildpairUserId: userId, buildpairProduct: 'project_plus' } },
    });
    if (!session.url) throw new Error('Stripe did not return a Project+ checkout URL');
    return Response.redirect(session.url, 303);
  } catch (error) { return jsonError(error); }
}
