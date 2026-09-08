import Stripe from 'stripe';

let stripeClient: Stripe | undefined;
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  stripeClient ??= new Stripe(key);
  return stripeClient;
}

export function appUrl() {
  const explicit = process.env.APP_URL ?? process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost}`.replace(/\/$/, '');

  return 'http://localhost:8081';
}

export function providerReturnUrl(
  type: 'subscription' | 'connect' | 'payment',
  state: 'complete' | 'cancelled' | 'retry',
  context?: { jobId?: string },
) {
  if (type === 'payment' && context?.jobId) {
    const url = new URL(`/customer/jobs/${encodeURIComponent(context.jobId)}`, `${appUrl()}/`);
    url.searchParams.set('payment', state);
    return url.toString();
  }

  if (type === 'subscription' || type === 'connect') {
    const url = new URL('/trader/subscription', `${appUrl()}/`);
    url.searchParams.set(type === 'subscription' ? 'subscription' : 'payouts', state);
    return url.toString();
  }

  const url = new URL('/status', `${appUrl()}/`);
  url.searchParams.set('type', type);
  url.searchParams.set('state', state);
  return url.toString();
}
