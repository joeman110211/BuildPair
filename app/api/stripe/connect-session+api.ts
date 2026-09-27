import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { traderProfiles } from '@/db/schema';
import { HttpError, jsonError, requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { getStripe } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const trader = await requireRole(request, 'trader');
    const db = getDb();
    const profile = await db.query.traderProfiles.findFirst({ where: eq(traderProfiles.userId, trader.id) });
    if (!profile) throw new HttpError(409, 'Complete your profile first');

    const stripe = getStripe();
    let accountId = profile.stripeAccountId;

    if (!accountId) {
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

    const session = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: { enabled: true },
      },
    });

    if (!session.client_secret) throw new HttpError(503, 'Stripe could not start payout onboarding. Please try again.');

    return Response.json({
      clientSecret: session.client_secret,
      accountId,
      payoutsReady: Boolean(account.payouts_enabled),
    });
  } catch (error) { return jsonError(error); }
}
