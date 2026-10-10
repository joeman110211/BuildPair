import { z } from 'zod';
import { MARKETPLACE_OPEN, PAID_PROJECT_PLUS_OPEN } from '@/lib/launch-config';
import { PROJECT_PLUS_PRICE_PENCE, projectPlusEntitlement } from '@/lib/project-plus';
import { accountModes, authenticatedUserId, ensureDbUser, HttpError, jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { appUrl, getStripe } from '@/lib/stripe';

const requestSchema = z.object({ audience: z.enum(['customer','trader']).default('customer') });

export async function POST(request: Request) {
  try {
    if (!MARKETPLACE_OPEN) throw new HttpError(423, 'The homeowner marketplace is unavailable.');
    const userId = await authenticatedUserId(request);
    const user = await ensureDbUser(userId);
    const modes = await accountModes(userId);
    const { audience } = requestSchema.parse(await request.json().catch(() => ({})));
    if (audience === 'customer' && !modes.customerEnabled) throw new HttpError(403, 'Enable homeowner mode to subscribe to Project+.');
    if (audience === 'trader' && !modes.traderEnabled) throw new HttpError(403, 'Enable tradesperson mode to add Project+.');
    const entitlement = await projectPlusEntitlement(userId);
    const returnPath = audience === 'trader' ? '/trader/project-plus' : '/customer/project-plus';
    if (entitlement.active) return Response.json({ url: `${appUrl()}${returnPath}?subscription=active`, active: true });
    if (!PAID_PROJECT_PLUS_OPEN) throw new HttpError(423, 'Project+ billing is not available. Eligible accounts can use their included access without payment.');
    const configuredPriceId = process.env.STRIPE_PROJECT_PLUS_PRICE_ID?.trim();
    if (!configuredPriceId || !process.env.STRIPE_WEBHOOK_SECRET?.trim()) throw new HttpError(503, 'Project+ billing is temporarily unavailable.');

    const rows = await getSql()`
      SELECT email, project_plus_stripe_customer_id AS "customerId"
      FROM users WHERE id = ${userId} LIMIT 1
    ` as unknown as { email: string | null; customerId: string | null }[];
    const stripe = getStripe();
    let customerId = rows[0]?.customerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: rows[0]?.email || user.email || undefined, metadata: { buildpairUserId: userId, buildpairProduct: 'project_plus' } }, { idempotencyKey: `buildpair-project-plus-customer-${userId}` });
      customerId = customer.id;
      await getSql()`UPDATE users SET project_plus_stripe_customer_id = ${customerId}, updated_at = now() WHERE id = ${userId}`;
    }
    const price = await stripe.prices.retrieve(configuredPriceId);
    if (!price.active || price.currency !== 'gbp' || price.unit_amount !== PROJECT_PLUS_PRICE_PENCE || price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1) throw new HttpError(503, 'Project+ price configuration needs attention.');
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
    if (subscriptions.data.some((subscription) => subscription.metadata.buildpairUserId === userId && subscription.metadata.buildpairProduct === 'project_plus' && !['canceled', 'incomplete', 'incomplete_expired'].includes(subscription.status))) {
      const configuration = process.env.STRIPE_PROJECT_PLUS_PORTAL_CONFIG_ID?.trim();
      if (!configuration) throw new HttpError(503, 'Project+ billing management is temporarily unavailable.');
      const portal = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${appUrl()}${returnPath}`, configuration });
      return Response.json({ url: portal.url });
    }
    const sessions = await stripe.checkout.sessions.list({ customer: customerId, limit: 100 });
    const open = sessions.data.find((session) => session.status === 'open' && session.client_reference_id === userId && session.metadata?.buildpairProduct === 'project_plus');
    if (open?.url) return Response.json({ url: open.url });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: configuredPriceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appUrl()}/api/stripe/project-plus/confirm?session_id={CHECKOUT_SESSION_ID}&audience=${audience}`,
      cancel_url: `${appUrl()}${returnPath}?subscription=cancelled`,
      metadata: { buildpairUserId: userId, buildpairProduct: 'project_plus', audience },
      subscription_data: { metadata: { buildpairUserId: userId, buildpairProduct: 'project_plus', audience } },
    }, { idempotencyKey: `buildpair-project-plus-checkout-${userId}-${sessions.data[0]?.id ?? 'first'}-${Math.floor(Date.now() / 1_800_000)}` });
    if (!session.url) throw new Error('Stripe did not return a Project+ checkout URL');
    return Response.json({ url: session.url });
  } catch (error) { return jsonError(error); }
}
