import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { traderProfiles } from '@/db/schema';
import { classifyPayoutStatus } from '@/lib/payout-status';
import { requireRole } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { getStripe } from '@/lib/stripe';

export async function GET(request: Request) {
  const destination = new URL('/trader/subscription', request.url);

  try {
    const trader = await requireRole(request, 'trader');
    const db = getDb();
    const profile = await db.query.traderProfiles.findFirst({
      where: eq(traderProfiles.userId, trader.id),
    });

    if (!profile?.stripeAccountId) {
      destination.searchParams.set('payouts', 'not_started');
      return Response.redirect(destination.toString(), 303);
    }

    const account = await getStripe().accounts.retrieve(profile.stripeAccountId);
    const payoutsReady = Boolean(account.payouts_enabled);
    const chargesReady = Boolean(account.charges_enabled);

    await getSql()`
      UPDATE trader_profiles
      SET stripe_charges_enabled = ${chargesReady},
          stripe_payouts_enabled = ${payoutsReady},
          updated_at = now()
      WHERE user_id = ${trader.id}
    `;

    const status = classifyPayoutStatus({
      hasAccount: true,
      payoutsEnabled: payoutsReady,
      detailsSubmitted: Boolean(account.details_submitted),
      currentlyDue: account.requirements?.currently_due ?? [],
      pastDue: account.requirements?.past_due ?? [],
      disabledReason: account.requirements?.disabled_reason ?? null,
    });

    destination.searchParams.set('payouts', status.key);
    return Response.redirect(destination.toString(), 303);
  } catch (error) {
    console.error('[stripe-connect] failed to refresh payout status on return', error);
    destination.searchParams.set('payouts', 'status_error');
    return Response.redirect(destination.toString(), 303);
  }
}
