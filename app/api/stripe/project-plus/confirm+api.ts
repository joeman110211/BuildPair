import type Stripe from 'stripe';
import { authenticatedUserId, ensureDbUser, jsonError } from '@/lib/server';
import { appUrl, getStripe } from '@/lib/stripe';
import { getSql } from '@/lib/sql';

function subscriptionObject(value: string | Stripe.Subscription | null) {
  return value && typeof value !== 'string' ? value : null;
}

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const sessionId = new URL(request.url).searchParams.get('session_id')?.trim();
    if (!sessionId) return Response.redirect(`${appUrl()}/customer/project-plus`, 303);
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
    if (session.client_reference_id !== userId) return Response.redirect(`${appUrl()}/customer/project-plus?subscription=invalid`, 303);
    let subscription = subscriptionObject(session.subscription);
    if (!subscription && typeof session.subscription === 'string') subscription = await stripe.subscriptions.retrieve(session.subscription);
    if (subscription?.metadata.buildpairProduct === 'project_plus' && ['active','trialing'].includes(subscription.status)) {
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
      await getSql()`
        UPDATE users SET project_plus_active = true,
                         project_plus_stripe_subscription_id = ${subscription.id},
                         project_plus_stripe_customer_id = coalesce(${customerId}, project_plus_stripe_customer_id),
                         updated_at = now()
        WHERE id = ${userId}
      `;
    }
    return Response.redirect(`${appUrl()}/customer/project-plus?subscription=complete`, 303);
  } catch (error) { return jsonError(error); }
}
