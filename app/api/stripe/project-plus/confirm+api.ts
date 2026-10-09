import type Stripe from 'stripe';
import { authenticatedUserId, ensureDbUser, jsonError } from '@/lib/server';
import { appUrl, getStripe } from '@/lib/stripe';

function subscriptionObject(value: string | Stripe.Subscription | null) {
  return value && typeof value !== 'string' ? value : null;
}

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    await ensureDbUser(userId);
    const params = new URL(request.url).searchParams;
    const audience = params.get('audience') === 'trader' ? 'trader' : 'customer';
    const returnPath = audience === 'trader' ? '/trader/project-plus' : '/customer/project-plus';
    const sessionId = params.get('session_id')?.trim();
    if (!sessionId) return Response.redirect(`${appUrl()}${returnPath}`, 303);
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
    if (session.client_reference_id !== userId) return Response.redirect(`${appUrl()}${returnPath}?subscription=invalid`, 303);
    let subscription = subscriptionObject(session.subscription);
    if (!subscription && typeof session.subscription === 'string') subscription = await stripe.subscriptions.retrieve(session.subscription);
    // Webhooks own entitlement changes; a redirect must never grant access.
    const complete = session.status === 'complete'
      && subscription?.metadata.buildpairProduct === 'project_plus'
      && subscription.metadata.buildpairUserId === userId
      && ['active', 'trialing'].includes(subscription.status);
    return Response.redirect(`${appUrl()}${returnPath}?subscription=${complete ? 'complete' : 'pending'}`, 303);
  } catch (error) { return jsonError(error); }
}
