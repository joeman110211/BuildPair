import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { traderProfiles } from '@/db/schema';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { getStripe, providerReturnUrl } from '@/lib/stripe';

async function createHostedOnboardingLink(request: Request) {
  const trader = await requireRole(request, 'trader');
  const db = getDb();
  const profile = await db.query.traderProfiles.findFirst({ where: eq(traderProfiles.userId, trader.id) });
  if (!profile) throw new HttpError(409, 'Complete your profile first');
  const stripe = getStripe();
  let accountId = profile.stripeAccountId;

  if (!accountId) {
    // Stripe idempotency is the source-of-truth guard here. If two requests race
    // before stripe_account_id is saved, both calls use the same key and Stripe
    // returns the same connected account instead of creating duplicates.
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'GB',
      email: trader.email ?? undefined,
      capabilities: { transfers: { requested: true } },
      metadata: { buildpairUserId: trader.id, buildpairRole: 'tradesperson_recipient' },
    }, { idempotencyKey: `buildpair-connect-v1-${trader.id}` });
    accountId = account.id;
    await db.update(traderProfiles).set({ stripeAccountId: accountId }).where(eq(traderProfiles.userId, trader.id));
  }

  const account = await stripe.accounts.retrieve(accountId);
  await getSql()`
    UPDATE trader_profiles
    SET stripe_charges_enabled = ${Boolean(account.charges_enabled)},
        stripe_payouts_enabled = ${Boolean(account.payouts_enabled)},
        updated_at = now()
    WHERE user_id = ${trader.id}
  `;

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: providerReturnUrl('connect', 'retry'),
    return_url: providerReturnUrl('connect', 'complete'),
  });

  return { url: link.url, payoutsReady: Boolean(account.payouts_enabled) };
}

export async function POST(request: Request) {
  try {
    return Response.json(await createHostedOnboardingLink(request));
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(request: Request) {
  const fallback = new URL('/trader/subscription', request.url);
  try {
    const { url } = await createHostedOnboardingLink(request);
    return Response.redirect(url, 303);
  } catch (error) {
    // Preserve normal API logging/redaction while returning a useful browser destination.
    void jsonError(error);
    fallback.searchParams.set('payouts', 'start-error');
    return Response.redirect(fallback.toString(), 303);
  }
}
